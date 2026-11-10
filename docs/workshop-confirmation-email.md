# Workshop confirmation email

Implemented locally; deployment, credentials and a live recipient test are separate operator steps. Tests use mocked SMTP and storage, never real email. SMTP provider acceptance does **not** prove inbox delivery.

## Production configuration

Nodemailer is pinned to 10.5.0, the stable registry release verified for this change. It requires Node.js 20 or newer; verify the deployed Functions runtime meets that requirement. The production dependency audit reports zero known advisories at verification time.

Set these in the Atlas Eye Netlify site's **production Functions runtime scope**, not in public source, a Vite variable, client JavaScript or a committed `.env` file:

- `WORKSHOP_EMAIL_ENABLED=true` enables sending. Leave absent/false until ready.
- `SMTP_HOST` provider hostname.
- `SMTP_PORT` integer port, typically `587` for STARTTLS or `465` for implicit TLS.
- `SMTP_SECURE=false` for STARTTLS, `true` for implicit TLS. TLS is always required, with normal certificate verification.
- `SMTP_USER` and `SMTP_PASS` provider credentials. Use an app password if required by the provider, never a normal account password.
- `MAIL_FROM` one verified sender email address only, without a display name. The display name is Atlas Learning. The SMTP account must be permitted to send as this address.
- `WORKSHOP_MEET_URL` the private host event's HTTPS Google Meet URL, in the standard `/xxx-xxxx-xxx` format. Do not publish it in source or screenshots.

The function additionally requires Netlify's trusted `context.deploy.context` to equal `production`. Preview and branch deployments never send. The Valley SMR transport pattern is SMTP with Nodemailer, not the unrelated Brevo contact-registry API; no Valley-specific contact code or credentials are included.

Before enabling, verify sender/domain authorization and provider sending limits; check required SPF/DKIM/DMARC configuration with the provider. Have an authorized operator set the runtime values and redeploy. Confirm the deployed commit and function settings, then use an explicitly approved test recipient. Check both the private outcome and the recipient's inbox/spam folder. No live sending or deployment was performed during implementation.

## Storage and response

Registrations stay in private Netlify Blobs `learning-workshop-signups`, keyed by the email hash; existing capacity and deduplication are retained. The sender rereads the original saved name/email, never a duplicate submission's new name. Waitlist and inquiry behavior is unchanged.

For each saved registration, private `_confirmation/<email-hash>/claim` is atomically created with `onlyIfNew` **before** contacting SMTP. Only its creator may attempt a send. `_confirmation/<email-hash>/result` records `accepted`, `not_accepted` or `uncertain`, with a timestamp. No raw provider errors, credentials, message content or Meet URL are logged or returned. Neither these records nor registration data have a public listing route.

The public response distinguishes `{ saved: true, confirmationEmail: 'accepted' }` from `unconfirmed`. It never returns the Meet URL. Unconfigured sends, store failures and ambiguous transport outcomes leave the registration saved, with a useful on-page fallback. A storage failure before registration saves returns an error and never invokes SMTP. Browser retries cannot send again once the claim exists. There is a 20-second overall SMTP deadline as well as connection/greeting/socket limits; interrupted requests are treated conservatively.

## Recovery: do not blindly resend

This intentionally favors avoiding duplicates over guaranteed automatic delivery. SMTP does not support exactly-once delivery: a timeout may occur after the provider has accepted a message. A claimed record without a result may represent a crash or a still-running send. A result-write failure can also hide an accepted message. **Never delete a claim merely because an email is missing or a request timed out.**

Inspect the saved registration and the provider's activity privately. `accepted` means the provider accepted it, not that it reached an inbox. `uncertain`, or a claim without a result, requires checking provider activity and the recipient before any authorized manual resend. `not_accepted` also requires operator review; no automatic retries occur. Keep the claim for audit and record manual follow-up privately instead of erasing history. There is no public resend endpoint or automatic backlog job.

If sending was disabled or configuration invalid, no claim was made. After configuration is fixed, a later consented registration retry can send using the stored record. Existing registrations are not bulk emailed on deployment; review any backlog and obtain authorization before a separate manual send. Disabling the flag stops new attempts but cannot retract a message already in flight.

## Verification

Run `npm run test:workshop`, `npm run lint` and `npm run build`. The focused tests cover saved-record recipients, duplicate/concurrent requests, the 25-seat cap, full/closed sessions, invalid configuration, previews, SMTP rejection/error, claim/outcome storage errors, interrupted claims, injection attempts and no send after failed writes. Live provider delivery and Netlify integration must be verified after authorized deployment.

## Temporary operator-only SMTP diagnosis

If a saved signup has an uncertain email outcome, do not retry its send or remove its claim. An operator can run a separate **no-email** connection/authentication check through the existing intake function. This does not establish whether an earlier message was accepted or delivered, or whether a future sender/recipient will be accepted.

In production Functions runtime scope only, set:

- `WORKSHOP_SMTP_DIAGNOSTIC_ENABLED=true`.
- `WORKSHOP_SMTP_DIAGNOSTIC_TOKEN`: 32 cryptographically random bytes encoded as 64 lowercase hexadecimal characters. Keep it secret; never put it in a URL, client code, logs or source.
- `WORKSHOP_SMTP_DIAGNOSTIC_ID`: a separate nonsecret random 16-byte value encoded as 32 lowercase hexadecimal characters. One verification is permitted per ID. Change it only when deliberately authorizing a new diagnostic run.
- `WORKSHOP_SMTP_DIAGNOSTIC_EMAIL`: the exact email of the already-saved operator test registration. This is not authentication; the bearer token is mandatory.

For a normal browser check, an authorized operator can open `/learn/connection-check.html`, enter the temporary verification key in the password field and click **Run connection check**. The page is noindex, stores no key, clears the field before the request, shows only generic status and makes no automatic retries. It does not invoke ordinary registration or email sending.

Alternatively, the authorized operator issues a POST to `/learn/intake` with `X-Workshop-Diagnostic: verify-smtp` and `Authorization: Bearer <token>`. Do not place the token in shell history. No request body is needed or used. Invalid/disabled/nonproduction requests return generic 404; authorized runs return generic 200 without exposing diagnostic results. The probe bypasses registration and email sending entirely, and never changes registration records or email claims.

Inspect private `learning-workshop-signups` Blobs under `_smtp_diagnostic/<ID>/claim` and `/result`. Results contain only a fixed category, elapsed milliseconds and timestamp. Categories are `verified`, `auth_failed`, `dns_failed`, `tls_failed`, `connection_failed`, `timeout`, `configuration_failed` and `other`. No provider error text, credentials, recipient or message content is saved. A claim without a result is inconclusive and is not automatically retried. The probe uses the configured SMTP settings with forced authentication and TLS; it can run while confirmation sending is disabled, but the remaining workshop configuration must still validate.

The diagnostic response has a 20-second watchdog plus SMTP connection/greeting/socket timeouts. Nodemailer's `verify()` has no per-call abort signal; after a watchdog timeout its bounded transport operation may finish later, but it cannot send a message. Normal confirmation **sending** now passes an AbortSignal at its 20-second deadline so the in-flight SMTP send is cancelled, not merely abandoned by the response handler. Cancellation still cannot retract a message already accepted by the provider.

After inspection, disable the diagnostic flag and remove its token. Keep private diagnostic and send claims for audit. Do not infer approval for a new message from a successful verification.

## Separately approved one-time owner email test

Only after SMTP verification succeeds and the owner has authorized a test message, an operator may enable `WORKSHOP_OWNER_TEST_ENABLED=true` and provide a temporary `WORKSHOP_SMTP_DIAGNOSTIC_TOKEN` for the protected owner-test action. The no-email diagnostic flag can and should remain false after diagnosis. Keep `WORKSHOP_EMAIL_ENABLED=false` so ordinary registration emails remain paused during the test.

Retain the existing verified `WORKSHOP_SMTP_DIAGNOSTIC_ID` and configured owner email. The owner-test handler requires that ID's private diagnostic result to be `verified`, uses only the existing saved owner's name/email, and accepts no recipient or message content from the browser. SMTP configuration must remain the configuration that was verified. In `/learn/connection-check.html`, deliberately select **Send one [TEST] email to the configured owner**, enter the temporary key and run the selected action. The default action remains the no-email connection check.

The test reuses the production message/SMTP code with a `[TEST]` subject and separate immutable `_confirmation_test/<diagnostic-ID>/<owner-email-hash>/claim` and `/result` records. It does not create a registration, consume a seat, alter the original send claim/result, or automatically retry. Repeated clicks or requests with the same ID cannot send another test. Do not rotate the ID or remove claims to retry an uncertain test: review provider activity and obtain fresh authorization first.

After the attempt, inspect private provider-acceptance status and verify actual inbox/spam receipt separately. Then disable `WORKSHOP_OWNER_TEST_ENABLED` and remove the temporary token. Keep the verified diagnostic ID and all claims for audit. Enabling ordinary workshop emails is a separate operator decision; this test does not enable them.
