# Project-readiness inquiry boundary

The public form sends an exact, bounded schema to one Supabase Edge Function. The function uses the existing server-side Resend account to deliver one internal notification. Browser code contains no recipient address or provider credential. Atlas stores no inquiry content and creates no lead database, Atlas Core object, Mission Control record, governed record, or evidence object.

Only SHA-256 pseudonymous client and request guards, a random correlation ID, and a timestamp are retained for up to 24 hours to enforce five attempts per hour and replay safety. Resend receives the notification content and recipient under its existing provider retention/configuration boundary; its documented idempotency key is retained for 24 hours. Logs contain only outcome, correlation ID, status, and bounded duration.

