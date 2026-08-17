# Therapy Studio Live Service — NON-PHI Development

This project prepares real cross-device Whiteboard testing. It does **not** deploy AWS,
create accounts, establish HIPAA compliance, or make Therapy Studio clinically ready.
Use fake drawings and text only. Do not enter client names, clinical content, or PHI.

## Before you start

The frontend remains separately hosted. Its clinical hosting/compliance boundary has not
been approved by this project. Do not treat this development stack as a clinical service.

## One-time AWS setup

1. Create or sign in to an AWS account, then enable MFA for the AWS root user immediately.
2. For future PHI use, accept AWS's BAA in **AWS Artifact** first. This is not required to
   experiment with fake development data, but it is required before any PHI use.
3. Choose one region, such as `us-east-1`, and use it consistently.
4. Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
   and configure it with `aws configure`. Install the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
5. Create a long random signing value locally; for example:

   ```sh
   openssl rand -base64 48
   ```

   Treat this value like a password. It is the `TokenSigningSecret` SAM parameter, never a
   Vite variable and never source-controlled. For a production design, replace this simple
   parameter with an AWS-managed secret before clinical review.

## Deploy a fake-data development stack

From the repository root, use your chosen unique stack and Cognito domain names:

```sh
npm run build:live-service
sam validate --template-file live-service/template.yaml
sam build --template-file live-service/template.yaml
sam deploy --guided --template-file live-service/template.yaml --stack-name therapy-studio-live-dev
```

Run `npm run build:live-service` again whenever Live Session server or shared protocol
code changes. It creates an ignored, deployable Lambda artifact containing the handler,
its shared validation closure, and no Therapy Studio frontend assets or test files.

During the guided prompts:

- choose your region;
- set `FrontendOrigin` to `http://127.0.0.1:5173` or your exact Vite origin;
- create a globally unique lowercase `CognitoDomainPrefix`, such as
  `therapy-studio-alys-dev-2026`;
- paste the generated `TokenSigningSecret` only when prompted;
- approve only the displayed IAM permissions after reviewing them.

After deployment, open CloudFormation **Outputs** and copy `HttpApiOrigin`,
`WebSocketOrigin`, `UserPoolClientId`, and `CognitoHostedUiBase`.

## Create the one host account

In Cognito → User pools → the deployed pool:

1. Create Alyson's host user manually. Do not create child/participant users.
2. Configure a password and add MFA before using any sensitive environment.
3. Confirm the Hosted UI callback and logout URLs exactly match your Vite origin. For local
   development that is usually `http://127.0.0.1:5173`.

## Configure Therapy Studio locally

Copy the repository's `.env.local.example` to `.env.local`. It contains public endpoint
and client configuration only. Set:

```dotenv
VITE_LIVE_SESSION_ORIGIN=<HttpApiOrigin>
VITE_ACCOUNT_DATA_ORIGIN=<HttpApiOrigin>
VITE_LIVE_SESSION_WS_ORIGIN=<WebSocketOrigin>
VITE_COGNITO_LOGIN_URL=<CognitoHostedUiBase>/login?client_id=<UserPoolClientId>&response_type=token&scope=openid+email&redirect_uri=http%3A%2F%2F127.0.0.1%3A5173
```

Restart Vite after editing `.env.local`. `VITE_LIVE_SESSION_WS_ORIGIN` is required because
HTTP and WebSocket APIs have different API IDs. Never put AWS credentials, the token
signing secret, participant capabilities, or room credentials in any `VITE_*` variable.

The Account Data proof is fake-data-only. It syncs only Prompt decks created after the
account connection is configured and authenticated; it does not scan or upload an
existing local Prompt Library. Test title, color, icon, prompt edits, archive/delete, and
the Prompt Authoring acknowledgment in two browsers signed into the same host account.

`TherapistData` is retained if this stack is deleted or the table is ever replaced. That
protects therapist-authored content, but the retained table must be deliberately removed
manually if it is no longer needed.
Existing local content remains local until a separate migration-review milestone.

## Manual two-device test — fake content only

1. On the host device, open Whiteboard and choose **Invite Child**. Sign in via Cognito.
2. Draw a simple fake mark, then copy the participant link.
3. On a second browser/device, preferably another network, open the link.
4. Confirm there is no app sidebar, library, Settings, Save/Open/New, or therapist data.
5. Add a fake drawing, text, shape, and object movement on both sides; verify both receive
   updates.
6. Refresh the participant, refresh the host, briefly interrupt a network, then reconnect.
7. End the session from the host, try an expired/invalid link, and open the link in a second
   participant tab to verify replacement behavior.

## Security and logging boundary

The room stores opaque room metadata, expiry, revision, a validated Whiteboard projection,
capability hash, host subject, and connection metadata. It excludes local media, Resource
Memory, Session Profiles, notes, resources, backups, and identifiers. TTL is eventual
cleanup; Lambda checks expiry on each request. Do not enable API Gateway access logs that
include query strings or bodies: WebSocket credentials are short-lived and query-scoped due
to browser WebSocket header limits. Do not log capabilities, credentials, room IDs,
snapshots, Whiteboard content, resource IDs, or clinical metadata.

## Troubleshooting

- **SAM deploy fails:** run `sam validate`, check the selected region/profile, then read the
  CloudFormation event that names the failed resource.
- **Login returns to the wrong page:** ensure the Cognito callback/logout URLs and
  `redirect_uri` are byte-for-byte the same Vite origin.
- **Host gets 401/403:** sign out/in again; confirm the Hosted UI returned an `id_token` and
  the deployed user-pool client ID matches the API authorizer audience.
- **Participant link is invalid:** use the full copied link, including its `#p=` fragment;
  regenerated, ended, or expired links are intentionally rejected.
- **WebSocket fails:** confirm `VITE_LIVE_SESSION_WS_ORIGIN` uses `wss://`, includes `/dev`,
  and points to the WebSocket output—not the HTTP API output.
- **Only one direction updates:** inspect the API Gateway WebSocket route integration and
  Lambda/CloudWatch operational errors without enabling payload/query logging.
- **CORS error:** set `FrontendOrigin` to the exact Vite origin; do not use `*` for host APIs.
- **Abandoning development:** delete the CloudFormation stack and confirm DynamoDB is removed.

## Cost guardrails

Create an AWS Budget alert before deployment (for example, $5/month for development), keep
DynamoDB on-demand, set short CloudWatch retention after reviewing logging, and delete the
development stack when unused. Actual costs vary; this is not a production cost estimate.
