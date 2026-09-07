# AtlasEye Nuclear Supply Chain Explorer

The public directory helps visitors understand major SMR component families and discover candidate suppliers through traceable public sources. Manufacturers can submit a product or request a correction; submissions are stored privately for editorial review.

## Website entry points

- `/supply-chain/` is a separate Vite entry with a real static `index.html`, compatible with the repository's GitHub Pages build and Netlify redirects.
- Mission Control links to the directory. The cover, eye component, existing branding assets, and governed workspaces retain their existing behavior.
- `?part=P001` links to a component. `?view=submit` opens manufacturer intake.
- The assembly explainer and dated workbook are available from the directory.

## Research and publication boundaries

`src/supply-chain/research.json` contains the 7 September 2026 research snapshot: 70 major component/procurement families, 52 official source records, nine groups, and two unresolved supplier allocations. It is not a complete reactor BOM. No prices, capacity, compatibility, qualification or availability were verified. Preserve source-access limitations, including indexed excerpts where a direct page fetch failed. Numeric research confidence scores are intentionally absent from the public UI.

Research-origin listings are not manufacturer-submitted or manufacturer-approved. Supplier role is explicit: EPCs and services must not be presented as component manufacturers. An SMR relationship is not a delivery commitment. No technical design, construction or operating instructions are supplied.

## Private intake

The existing Supabase project hosts a new `supplier-submission` Edge Function. It validates an exact bounded payload, HTTPS document links, consent, and a honeypot. Only accepted website origins can call the browser endpoint. CORS is not authentication; this is deliberately public intake. The server never fetches submitted URLs or sends messages.

The service role calls `submit_atlas_supplier`. One atomic transaction handles durable insertion, five submissions per email per hour, an overall ceiling of 100 per hour, idempotency, and body-conflict detection. The global ceiling bounds unauthenticated abuse but can temporarily deny legitimate submissions during an attack; monitor intake before increasing it. Hashed email and request identifiers use a server-held secret. The browser retains a request ID across retries of unchanged content. Receipt is shown only after a successful database response. Errors preserve the form; no browser persistence is used for business contact information.

`atlas_supplier_submissions` and `atlas_supplier_review_events` have RLS enabled and no anonymous or authenticated-user privileges. No public read API exists. Business email and the complete intake payload must never be copied into public JSON or build assets. Service credentials remain in Supabase only. The receipt response contains only `ok` and a random reference.

## Editorial workflow

Use the access-controlled Supabase dashboard or an authorized internal database client for review. There is no public admin page and no automatic publication.

1. Inspect pending submissions. Confirm the representative's authority independently and inspect the linked public sources. Do not treat an email domain as sufficient verification.
2. Check the actual facility, supplier role, component/application scope, certificate issuer, identifier, scope and expiry. Record what was reviewed and what remains unverified.
3. In a transaction, append an `atlas_supplier_review_events` row with reviewer, decision and evidence notes and update the submission status. Retain the submitted record and review history; do not rewrite a prior decision.
4. Publish accepted information through a reviewed website change. Add explicit manufacturer-submitted provenance, submission reference (not email), source review date and scope, and preserve previous record history in Git. Extend the current research-only presentation for that published contribution; never silently relabel the research snapshot as verified or company-approved. Acceptance in the queue alone does not publish anything.
5. After the public change is released, record a `published` event referencing the release and update status. Process correction/removal requests through the same recorded review process.

Basic listings are free. Any future sponsored placement must be visibly labeled and must not change evidence or qualification status. No identity verification, certification or supplier qualification is implied by editorial acceptance.

## Release sequence — not performed by this change

The established Atlas workflow requires explicit authorization before a live database migration, Edge Function deployment, merge, or site release. This branch is prepared for review only.

1. Apply `202609070001_supplier_submissions.sql` to the intended existing Supabase project through the normal migration workflow.
2. Configure a strong random `SUPPLIER_RATE_SECRET` in the function's server environment. Preserve `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; never expose the service key to Vite.
   For live acceptance tests from PR #22, also set `SUPPLIER_PREVIEW_ORIGIN=https://deploy-preview-22--atlas-eye.netlify.app`. This allows that exact preview only; other previews stay denied. Remove this optional value when preview testing is finished.
3. Deploy `supplier-submission` using its checked-in `verify_jwt = false` configuration. The function enforces its own public-intake contract; it does not require a user login.
4. Build with the existing `VITE_SUPABASE_URL`. When absent, the frontend uses the same known public project URL as the existing inquiry form. Deploy backend before enabling the new public page.
5. Before release, submit a labeled test from an allowed website origin, confirm a private row and receipt, retry the same request, and verify denial of anonymous table reads. Delete test data only under the team's normal retention process.
6. Merge/release the site through its established hosting workflow. Do not create a replacement Sites project or change its domain. Verify direct `/supply-chain/` loading, Mission Control navigation, workbook download and form receipt on the actual host.

## Validation

Run `npm run build` then `node --test tests/supply-chain.test.mjs`, plus the existing homepage and route regression suites. `npm run lint` uses the current project configuration. Live backend receipt and hosted browser checks remain release gates; local contract tests cannot establish live deployment readiness.

The migration can also be exercised in an isolated PostgreSQL-compatible PGlite runtime without changing the website dependency tree. Set `PGLITE_MODULE` to the file URL of that installation's `dist/index.js`, then run `node tests/supplier-storage-check.mjs`. The check creates Supabase-equivalent roles, applies the actual migration, verifies denied anonymous/authenticated access, pending storage, retry identity, payload conflict and both rate limits.

Implementation verification on this branch: production build and lint passed; 33 catalog, submission, existing inquiry, and route checks passed. The actual migration passed the PGlite storage checks. Seven existing browser tests could not start because the Chromium executable is absent in this environment; they did not reach application assertions. No hosted form submission, live migration, or production browser verification was performed.

### Live preview checks — 7 September 2026

After the user authorized backend activation and live testing, the hosted PR #22 preview was exercised with the connected browser. Component search (Velan valves), empty results with hidden stale details, reset, the two unresolved suppliers, assembly navigation to the foundation and final stage, and supplier-update prefill (BWXT / P006) passed. Required-field validation blocks an empty form and does not display a success receipt.

The live `supplier-submission` preflight returned HTTP 404 with `Requested function was not found`. The CLI has no authenticated Supabase session. Supabase connection was requested; no database migration or function deployment has been performed yet. Private live receipt, retry, rate-limit and database-access tests are therefore still blocked on deployment access.

Added exact, optional `SUPPLIER_PREVIEW_ORIGIN` configuration so acceptance tests can run from the reviewed Netlify preview. There is no wildcard preview access. Local verification now passes 34 checks, including allowed preview, denied neighboring preview, invalid preview configuration and preflight behavior, plus lint.
