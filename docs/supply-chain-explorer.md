# AtlasEye Nuclear Supply Chain Explorer

## Backend decision — AWS

Manufacturer intake uses **AWS API Gateway → Lambda → a private DynamoDB table**. The public directory stays in AtlasEye's existing website repository and hosting workflow. This resolves the new feature's provider choice; its implementation no longer depends on Supabase.

The new intake service has a public submission endpoint and no public read, administrative, or publication endpoint. It does not require access to the private Atlas pilot, its database, evidence volumes, buckets, or deployment controls. The existing website inquiry form remains untouched; this change does not claim that every legacy Supabase integration has been migrated.

The earlier, undeployed supplier-specific Supabase function and migration have been removed. There is no supplier data migration because that endpoint was never deployed. Do not reconnect Supabase for this feature.

## Product and research

`/supply-chain/` is a separate Vite entry, linked from Mission Control, with search, system/evidence filters, source links, conceptual assembly animation and a dated workbook. `?part=P006` selects a component; `?view=submit` opens intake. The cover and eye assets retain their existing behavior.

The 7 September 2026 snapshot contains 70 major component/procurement families, 52 official source records, nine groups, and two unresolved supplier allocations. It is not a complete reactor BOM. Listings do not establish endorsement, compatibility, qualification, regulatory approval, availability or delivery commitments. Preserve source-access limitations and supplier roles. Research entries are not manufacturer-approved listings.

## AWS service behavior

- The browser uses only `VITE_SUPPLIER_SUBMISSION_URL`, set to the deployed stack's `SubmissionUrl`. No AWS credentials go into the website. When that value is absent, the form visibly says submissions are opening soon and cannot submit.
- `services/supplier-intake/contract.mjs` is shared between client and server. The HTTP handler validates exact fields, body size, consent and public HTTPS links. It never fetches submitted URLs, sends email or publishes a record.
- Lambda uses its AWS execution role and the SDK included in the Node.js 22 runtime. No access keys or manually managed application secret are needed.
- Three DynamoDB writes execute in one transaction: the pending submission, its email rate counter, and the global rate counter. Limits are five per email and 100 overall in each fixed UTC-hour window. API Gateway also throttles bursts. Adjacent hour windows can each accept their limit; this is not a rolling-hour policy.
- A cryptographically hashed request UUID locates the idempotency record. Unchanged retries return the original receipt; changed content with that UUID is rejected. A timeout is checked against durable storage before a retry. Submission records have no automatic expiry. Only counters receive a 48-hour TTL.
- The table has encryption, point-in-time recovery and retention on stack deletion/replacement. The execution role can read/write only that table and write its own logs. No table policy grants public access. The function logs no payload or contact information.
- Only the existing AtlasEye website origins are accepted. The optional `PreviewOrigin` parameter can allow exactly one `https://deploy-preview-N--atlas-eye.netlify.app` origin for testing. There is no wildcard preview access. CORS is not authentication; this is intentional anonymous intake.

## Editorial review

Authorized operators review pending records using AWS IAM-protected access. Confirm company authority, facility, supplier role and product evidence before approving anything. Business email and the private payload must never be copied to the public catalog.

Record each editorial decision as a new item with key `REVIEW#<receipt>#<new UUID>`, reviewer, action, timestamp and notes. Update the submission status separately in the same operator transaction. Do not overwrite prior review events or the original submission payload. The public Lambda exposes no editorial controls.

Publish accepted information through a reviewed website change with manufacturer-submitted provenance, source review date, unresolved limitations and Git history. An accepted queue record alone does not publish a listing. Basic listings are free; any future sponsorship must be separately labeled and cannot change evidence or qualification status.

## Deployment

The operator reported successful deployment and live acceptance on 8 September 2026; see the verification record below. The following commands document the deployment process. Use an authenticated AWS CLI session in the intended account. No new AWS plugin or Supabase connection is required when using that operator session.

Build and inspect the CloudFormation template:

```bash
node scripts/build-supplier-intake.mjs /tmp/atlas-supplier-intake.json
```

The template creates one table, Lambda function, least-privilege execution role, log group, HTTP API and routes. It does not create EC2/RDS infrastructure or change existing buckets, DNS, private-pilot ingress or governed release gates. AWS usage, storage, backup and log charges apply.

Prepare a non-executing change set after substituting the intended account ID:

```bash
node scripts/deploy-supplier-intake.mjs --account ACCOUNT_ID --preview https://deploy-preview-22--atlas-eye.netlify.app
```

The command verifies the caller's account, requires committed intake source and validates the template. Review the AWS change set. Run the same command with `--apply` to activate the stack after authorization. The script reports the real `SubmissionUrl` and `RecordsTable`; it does not invent an endpoint. CloudFormation handles failed-update rollback. The retained table preserves submissions if the stack is removed.

Before configuring the website, execute the live acceptance script:

```bash
node scripts/test-supplier-intake-live.mjs --stack atlas-eye-supplier-intake --account ACCOUNT_ID --origin https://deploy-preview-22--atlas-eye.netlify.app
```

It creates one clearly labeled synthetic private record, verifies the actual stored record and retry receipt, tests conflicting/invalid input, rejects an unrelated origin, and checks that no public read route exists. It sends no messages and leaves the test record for operator review. The script requires operator permission to describe the stack and read its table. Account identity is checked before sending a test.

Set `VITE_SUPPLIER_SUBMISSION_URL` to the returned endpoint in the website's build environment, rebuild the preview, and submit one labeled browser test. After acceptance, release through the existing website workflow. Remove the optional preview origin when preview testing ends. To stop intake without deleting records, remove the public POST route or disable the endpoint in the website build and redeploy.

## Verification and release status

`npm run build`, lint, and the Node tests cover the directory, submission contract, AWS event adapter, retry behavior and existing inquiry/routes. `tests/supplier-dynamodb-local.mjs` exercises the real transaction expressions against the official DynamoDB Local service; it only accepts a loopback endpoint and deletes its disposable test table. It requires an isolated AWS SDK installation supplied by `DYNAMO_SDK_MODULE`.

AWS implementation verification on 7 September 2026: production build and lint passed; all 37 Node checks passed. The generated template passed `cfn-lint`, and its actual bundled Lambda loaded and answered the allowed preflight. Official DynamoDB Local integration passed concurrent retry identity, payload conflict, both rate limits, and exactly 100 pending records; the disposable test table and local server were removed afterward. These are local implementation checks, not proof of AWS deployment or IAM permissions.

The earlier live preview passed search, empty results, unresolved filtering, assembly-stage controls, supplier-update prefill and required-field checks. Those earlier UI checks did not verify AWS storage.

### Operator deployment report — 8 September 2026

The authenticated operator reported stack `atlas-eye-supplier-intake` in `us-east-2` reached `CREATE_COMPLETE`, with the inspected ten-resource change set at `EXECUTE_COMPLETE`. Deployed backend source: `4048b4fa5db45020750b265915d4f384eda0995e`.

The checked-in live acceptance script passed. Operator evidence confirms a private pending synthetic record, identical retry receipt, changed-payload and consent rejection, unrelated-origin rejection, no public read route, and enabled PITR. Receipt: `5534c149-7029-4c82-bd60-73666532c88e`. The operator reported one synthetic submission and its two rate counters. No customer listing was published.

Public endpoint: `https://9u7zmbfpr6.execute-api.us-east-2.amazonaws.com/supplier-submissions`.

`netlify.toml` now supplies that public endpoint to deploy-preview builds. The backend permits only the explicitly configured PR #22 preview origin in addition to production origins. Production website enablement and merge remain pending; the public endpoint contains no credential. Browser acceptance of the connected preview is recorded in PR #22. This workspace has no authenticated AWS role, so the operator's direct DynamoDB inspection is distinguished from browser-observed receipt evidence.
