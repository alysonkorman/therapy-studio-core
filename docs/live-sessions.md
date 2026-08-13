# Live Sessions: Phase 1B AWS Preparation

The repository contains implementation and infrastructure-as-code preparation only. It
does not deploy AWS resources, create accounts, create user accounts, or establish HIPAA
compliance.

Remote hosting is opt-in through `VITE_LIVE_SESSION_ORIGIN`. Without it, normal local
Whiteboard use remains available; the Phase 1A BroadcastChannel harness is clearly limited
to same-origin development testing. Production never presents it as cross-device service.

Before any non-PHI test deployment, configure Cognito Hosted UI and MFA for the one host,
API Gateway Cognito authorization for host routes, API Gateway WebSocket route wiring, a
secret outside source control, CORS, TLS, least-privilege IAM, DynamoDB encryption/TTL,
and log redaction. A child receives no account: only a temporary capability link whose
fragment is exchanged for a short-lived room-scoped credential. Local media remains local
and is projected out of the participant state.
