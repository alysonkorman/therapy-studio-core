/* global process */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import {
  accountDataErrorCodes,
  createAccountDataAuthority,
} from "./accountDataAuthority.js";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const table = process.env.THERAPIST_DATA_TABLE;

const accountKey = (accountId) => `ACCOUNT#${accountId}`;
const recordKey = ({ entityType, id }) => `${entityType.toUpperCase()}#${id}`;

const store = {
  async get({ accountId, entityType, id }) {
    return (
      await client.send(
        new GetCommand({
          ConsistentRead: true,
          TableName: table,
          Key: { pk: accountKey(accountId), sk: recordKey({ entityType, id }) },
        })
      )
    ).Item;
  },
  async list({ accountId }) {
    const items = [];
    let ExclusiveStartKey;
    do {
      const result = await client.send(
        new QueryCommand({
          ConsistentRead: true,
          TableName: table,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: { ":pk": accountKey(accountId) },
          ExclusiveStartKey,
        })
      );
      items.push(...(result.Items ?? []));
      ExclusiveStartKey = result.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  },
  async create(record) {
    try {
      await client.send(
        new PutCommand({
          TableName: table,
          Item: { ...record, pk: accountKey(record.accountId), sk: recordKey(record) },
          ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        })
      );
      return true;
    } catch (error) {
      if (error?.name === "ConditionalCheckFailedException") return false;
      throw error;
    }
  },
  async update(record, expectedRevision) {
    try {
      await client.send(
        new PutCommand({
          TableName: table,
          Item: { ...record, pk: accountKey(record.accountId), sk: recordKey(record) },
          ConditionExpression: "attribute_exists(pk) AND revision = :expectedRevision",
          ExpressionAttributeValues: { ":expectedRevision": expectedRevision },
        })
      );
      return true;
    } catch (error) {
      if (error?.name === "ConditionalCheckFailedException") return false;
      throw error;
    }
  },
};

function response(statusCode, body = {}) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};
  return JSON.parse(event.body);
}

function errorStatus(error) {
  if (error?.code === accountDataErrorCodes.notFound) return 404;
  if (error?.code === accountDataErrorCodes.conflict) return 409;
  return 400;
}

// This handler intentionally logs no authored content, resource IDs, account IDs, or
// credentials. Infrastructure access logging must follow the same restriction.
export async function handler(event) {
  const accountId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!accountId) return response(401, { code: "unauthorized" });

  const authority = createAccountDataAuthority({ store });
  const route = event.requestContext?.routeKey ?? event.routeKey;
  const { entityType, id } = event.pathParameters ?? {};

  try {
    if (route === "GET /account-data") {
      return response(200, { records: await authority.list({ accountId }) });
    }
    if (route === "GET /account-data/{entityType}/{id}") {
      return response(200, await authority.get({ accountId, entityType, id }));
    }

    const body = parseBody(event);
    if (route === "POST /account-data") {
      return response(
        201,
        await authority.create({
          accountId,
          content: body.content,
          entityType: body.entityType,
          id: body.id,
          idempotencyId: body.idempotencyId,
        })
      );
    }
    if (route === "PUT /account-data/{entityType}/{id}") {
      return response(
        200,
        await authority.update({
          accountId,
          content: body.content,
          entityType,
          expectedRevision: body.expectedRevision,
          id,
          idempotencyId: body.idempotencyId,
        })
      );
    }
    if (route === "DELETE /account-data/{entityType}/{id}") {
      return response(
        200,
        await authority.tombstone({
          accountId,
          entityType,
          expectedRevision: body.expectedRevision,
          id,
          idempotencyId: body.idempotencyId,
        })
      );
    }
    return response(404, { code: "not-found" });
  } catch (error) {
    return response(errorStatus(error), {
      code: error?.code ?? accountDataErrorCodes.invalid,
    });
  }
}
