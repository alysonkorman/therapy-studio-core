# Therapy Studio Live Service (AWS)

This is an undeployed AWS SAM service for Phase 1B. It provides Cognito-authenticated
host room operations plus a room-scoped WebSocket transport. It is not a claim of HIPAA
compliance and must not receive PHI until Alyson has completed the BAA, hosting, security,
and operational review described below.

## Local development

Copy `.env.example` into a local ignored environment file, provide only non-PHI
development values, then use SAM's local commands after installing SAM separately. The
repository intentionally does not provision or deploy AWS resources.

## Required AWS configuration before testing

1. Accept an AWS BAA in AWS Artifact and use only HIPAA-eligible services.
2. Deploy this template only to a non-PHI development account first; configure the HTTP
   API Cognito JWT authorizer on host routes and the WebSocket route integrations.
3. Create the one therapist host account in Cognito, enforce MFA, and configure Hosted UI
   redirect URLs. Do not create participant accounts.
4. Set `VITE_LIVE_SESSION_ORIGIN`, `VITE_COGNITO_LOGIN_URL`, and a public Cognito client
   ID only in the frontend environment. Keep signing secrets and AWS credentials outside
   the repository.
5. Configure API Gateway access logging to omit query strings and request bodies. Never
   log action payloads, snapshots, room IDs, resource IDs, capabilities, or credentials.
6. Set retention/access controls, encryption, monitoring, incident procedures, and have
   legal/compliance review the production configuration. The frontend hosting boundary
   remains a separate deliberate decision.

## Data boundary

The DynamoDB room item contains only opaque room metadata, expiry, revision, a validated
shared Whiteboard projection, capability hash, host subject, and connection metadata.
It never contains local media, Resource Memory, Session Profiles, notes, canonical
Resources, backups, client identifiers, or imported binaries. TTL cleans up eventually;
every request also enforces expiry immediately.

The short-lived WebSocket credential is room- and role-scoped. Browser WebSocket APIs
cannot set Authorization headers, so it travels in the connection query string. It lasts
five minutes, must be redacted from logs, and never grants another room.
