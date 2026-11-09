# Gadget workforce preview environment

This source change prepares a private Netlify preview; it does not deploy one.
Configure these server-only values in an authenticated Netlify environment:

- `GADGET_SITE_ORIGIN` — exact HTTPS Atlas Eye origin.
- `GADGET_COGNITO_DOMAIN`, `GADGET_COGNITO_CLIENT_ID`, `GADGET_SESSION_SECRET` — existing PKCE/session controls.
- `GADGET_ATLAS_API_URL` — existing exact read-only Gadget query endpoint.
- `GADGET_WORKFORCE_API_ORIGIN` — exact HTTPS private workforce gateway origin.
- `GADGET_AGENT_OBJECTIVE_INTERNAL_TOKEN` — at least 32 characters; never a `VITE_` value.

The BFF obtains Cognito `sub` at callback using `/oauth2/userInfo`, seals it in the
HttpOnly session, and forwards it with the internal token only to the exact
objective routes. Browser code has no upstream URL, token, tenant, project,
agent, approval, or direct-specialist controls. `VITE_OWNER_ACTIVITY_ENDPOINT`
is optional telemetry and is intentionally unset for local/preview browser
tests; production config supplies the allowlisted metric endpoint.
