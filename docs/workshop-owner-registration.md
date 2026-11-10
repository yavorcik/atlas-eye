# One-off owner-authorized waitlist registration

This action does not ask the attendee to consent, rewrite their waitlist entry, or send mail. It copies the original waitlist consent timestamp and purpose unchanged and records owner authorization separately. A manual-delivery flag is committed atomically with the registration, preventing SMTP from public retries and owner diagnostic tests.

## Before publication

This change is local until publication is separately authorized. Review/apply only the owner-registration commit onto the verified production main, not unrelated operator-page/cache work. If trusted production Blobs access is already available, an approved operator script reusing the same allocator would avoid adding an HTTP action. Do not bypass capacity accounting or use the public consent form.

## Deployment and one-off execution

1. After publication approval, deploy the owner-registration change. The route remains disabled unless explicitly configured.
2. In the production function environment only, configure:
   - `WORKSHOP_OWNER_REGISTRATION_ENABLED=true`
   - `WORKSHOP_OWNER_REGISTRATION_TOKEN`: freshly generated 64 lowercase hex characters, kept secret.
   - `WORKSHOP_OWNER_REGISTRATION_ID`: fresh 32 lowercase hex characters identifying this authorized operation.
   - `WORKSHOP_OWNER_REGISTRATION_EMAIL`: the exact existing waitlist email, normalized by the server.
   - Optionally, **both** `WORKSHOP_OWNER_CONFIRMATION_GMAIL_ID` and `WORKSHOP_OWNER_CONFIRMATION_SENT_AT`: independently verified Gmail Sent message ID (16–32 lowercase hex) and sent timestamp (`YYYY-MM-DDTHH:MM:SSZ`). These record an already accepted manual confirmation, not permission to send one. Without them the manual confirmation stays pending. Do not set them before verifying the email was sent.
3. Redeploy if needed for runtime environment changes. Open the deployed `/learn/owner-registration.html` page, enter the temporary token, and click **Register configured waitlist attendee** once. The page clears the token immediately and never retries. Alternatively, make one bodyless POST to the production `/learn/intake` endpoint, with `x-workshop-owner-registration: register-waitlist` and `Authorization: Bearer <token>`. Do not put the token in URLs, shell history, logs, source, or screenshots. No recipient or consent data is accepted in the body.
4. `201 {saved:true}` means this invocation saved the configured registration; `200 {saved:true}` means that same operation already saved it. Both responses have `Cache-Control: no-store`. `409` means capacity full or an existing registration belonging to another operation; do not overwrite it. `410` means the session has begun. `404` means authorization/configuration/source validation failed. `503` is uncertain: inspect stored state before any follow-up, or retry the exact same operation (same ID and email), which cannot duplicate the registration or send email.
5. Read back the registration, source waitlist record, seat and provenance using authorized owner storage access. Confirm the source waitlist was preserved. Do not claim SMTP delivery based on manual acceptance metadata.
6. Disable the route and remove its secret and one-off configuration after verification, redeploying as needed. No cleanup of stored evidence is required. The manual-delivery guard must remain while this record exists, even if the owner HTTP route is subsequently removed.

Existing records are immutable. A later run ID or changed manual provenance never overwrites them. Supplying manual provenance after an earlier pending registration also does not update it; use separately reviewed owner storage tooling if an audit correction is necessary. The one-shot scope is the configured email's immutable registration, not arbitrary caller-provided data.

## Validation

`npm run test:workshop` includes owner-route tests and the existing intake, capacity, SMTP and diagnostic tests. Also run `npm run lint` and `npm run build`. `.mjs` files are not covered by the repository's ESLint config; use `node --check` for the new module and tests.
