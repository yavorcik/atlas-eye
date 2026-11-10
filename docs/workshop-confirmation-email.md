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
