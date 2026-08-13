/* global process, Buffer */
// AWS runtime adapter. The pure authority is tested without AWS credentials; this
// module is only loaded by Lambda after SAM has packaged the service.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { createRoomAuthority } from "./roomAuthority.js";
import { issueRoomCredential, verifyRoomCredential } from "./tokens.js";
import { whiteboardLiveSessionAdapter } from "../../src/features/whiteboard/whiteboardLiveSessionAdapter.js";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const table = process.env.ROOMS_TABLE;
const secret = process.env.TOKEN_SIGNING_SECRET;
const key = (pk, sk) => ({ pk, sk });
const store = {
  async getRoom(id) {
    return (
      await client.send(
        new GetCommand({ TableName: table, Key: key(`ROOM#${id}`, "STATE") })
      )
    ).Item;
  },
  async putRoom(room) {
    await client.send(
      new PutCommand({
        TableName: table,
        Item: { ...room, pk: `ROOM#${room.id}`, sk: "STATE" },
      })
    );
  },
  async getConnection(id) {
    return (
      await client.send(
        new GetCommand({ TableName: table, Key: key(`CONNECTION#${id}`, "META") })
      )
    ).Item;
  },
  async putConnection(connection) {
    await client.send(
      new PutCommand({
        TableName: table,
        Item: { ...connection, pk: `CONNECTION#${connection.connectionId}`, sk: "META" },
      })
    );
  },
  async deleteConnection(id) {
    await client.send(
      new DeleteCommand({ TableName: table, Key: key(`CONNECTION#${id}`, "META") })
    );
  },
};

// Route integration deliberately does not log events or bodies. API Gateway access
// logs must likewise omit query strings because the short-lived WS credential is there.
export async function handler(event) {
  // Deployment wiring supplies Cognito claims for host routes. Never accept a body role.
  const route = event.requestContext?.routeKey ?? event.routeKey;
  const hostSubject = event.requestContext?.authorizer?.jwt?.claims?.sub;
  const authority = createRoomAuthority({
    adapter: whiteboardLiveSessionAdapter,
    store,
    tokenIssuer: ({ expiresAt, role, sessionId }) => ({
      token: issueRoomCredential({ expiresAt, role, secret, sessionId }),
      expiresAt,
      role,
      sessionId,
    }),
  });
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    if (route === "POST /live-sessions") {
      if (!hostSubject) return response(401);
      const created = await authority.createRoom({
        activityKind: body.activityKind,
        hostSubject,
        state: body.state,
      });
      return response(201, {
        ...created.room,
        participantUrl: `/join/${created.room.id}#p=${created.capability}`,
      });
    }
    const sessionId = event.pathParameters?.id;
    if (route === "POST /live-sessions/{id}/join")
      return response(
        200,
        await authority.join({ capability: body.capability, sessionId })
      );
    if (route === "POST /live-sessions/{id}/host-token") {
      if (!hostSubject) return response(401);
      return response(200, await authority.hostCredential({ hostSubject, sessionId }));
    }
    if (route === "POST /live-sessions/{id}/end") {
      if (!hostSubject) return response(401);
      const ended = await authority.endByHost({ hostSubject, sessionId });
      await broadcast(event, ended.room, ended.message);
      return response(200);
    }
    if (route === "$connect") {
      const credential = verifyRoomCredential({
        secret,
        token: event.queryStringParameters?.credential,
      });
      if (!credential) return { statusCode: 401 };
      const connected = await authority.connect({
        connectionId: event.requestContext.connectionId,
        credential,
      });
      await send(event, event.requestContext.connectionId, connected.snapshot);
      return { statusCode: 200 };
    }
    if (route === "$disconnect") {
      await authority.disconnect(event.requestContext.connectionId);
      return { statusCode: 200 };
    }
    if (route === "$default") {
      if (body.type === "end") {
        const ended = await authority.end({
          connectionId: event.requestContext.connectionId,
        });
        await broadcast(event, ended.room, ended.message);
      } else if (body.type === "action") {
        const result = await authority.action({
          connectionId: event.requestContext.connectionId,
          message: body,
        });
        await broadcast(event, result.room, result.snapshot);
      }
      return { statusCode: 200 };
    }
    return response(404);
  } catch (error) {
    return response(error.message === "forbidden" ? 403 : 400, { code: "invalid" });
  }
}
function response(statusCode, body = {}) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function send(event, connectionId, message) {
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  const api = new ApiGatewayManagementApiClient({ endpoint });
  try {
    await api.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(message)),
      })
    );
  } catch {
    // Stale connection. Do not log IDs or payloads.
  }
}

async function broadcast(event, room, message) {
  const ids = [room.hostConnectionId, room.participantConnectionId].filter(Boolean);
  await Promise.all(ids.map((id) => send(event, id, message)));
}
