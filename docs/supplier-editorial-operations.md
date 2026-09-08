# Manufacturer intake: editorial operating procedure

Accountable owner: Command. Initial operator: the authorized `marty-admin` IAM user in AWS account `428521271682`, region `us-east-2`. Delegate product/technical review to a person with the relevant qualifications. This procedure does not confer supplier qualification or procurement authority.

## Queue and private inspection

Use the operator's authenticated AWS CLI profile. No console sign-in or credentials belong in website code. These commands require STS identity, CloudFormation stack read, and DynamoDB Scan/GetItem permissions; the review command additionally needs transactional PutItem/UpdateItem access to the one records table. The public Lambda has no review route or Scan permission.

```bash
AWS_PROFILE=atlas-admin node scripts/review-supplier-intake.mjs --account 428521271682
```

The bounded queue view excludes contact and payload fields and reports whether more evaluated items exist. Use the IAM-protected DynamoDB console for further pages or review history. Review keys come from the listing; do not guess them. Save a full record only to a NEW private operator path outside the checkout:

```bash
AWS_PROFILE=atlas-admin node scripts/review-supplier-intake.mjs \
  --account 428521271682 --action inspect \
  --key 'SUBMISSION#<hash-from-queue>' --output /private/operator/new-submission.json
```

Inspect company authority, facility identity, supplier role, product scope and public documentation. Retain evidence references and review reasons in the controlled operator record. Treat website claims as claims, and keep unresolved technical compatibility or qualification questions explicit. A submission asking to update an existing record does not establish control over that record. Synthetic records marked DO NOT PUBLISH must never be approved.

## Decision and audit history

Supported decisions: `needs_information`, `rejected`, `approved`. Notes are required. For approval, a private checks JSON file must contain `{"authority":true,"facility":true,"role":true,"product_evidence":true}` reflecting work actually performed. These are operator attestations, not automated fact verification.

```bash
AWS_PROFILE=atlas-admin node scripts/review-supplier-intake.mjs \
  --account 428521271682 --action review \
  --key 'SUBMISSION#<hash-from-queue>' --decision approved \
  --notes-file /private/operator/review-notes.txt \
  --checks-file /private/operator/review-checks.json
```

This prints a decision preview without writing. After checking it, repeat with `--apply`. The transaction appends a new review event and updates status together; it protects the original payload/hash and rejects concurrent or stale decisions. On a conditional conflict, inspect the new state and make a fresh decision. Never overwrite another review to force success. The authenticated IAM ARN is recorded as reviewer.

`needs_information` creates no email. Any contact requires separately authorized correspondence. Rejected records remain private with history. This release performs no record deletion and changes no retention agreement.

## Publication

Approval does not publish. Prepare a separate catalog PR containing only reviewed public company/product/facility descriptions and public source URLs. Record manufacturer-submitted provenance, review date and evidence limitations. Do not copy the stored payload, business email, request identifier, reviewer notes or account metadata into `src/supply-chain/research.json` or a public PR.

Check the catalog schema and source linkage with `node --test tests/supply-chain.test.mjs`, build the website, inspect the preview and obtain editorial review before merging. Retain the publication commit reference in a new operator review record. Updates receive the same review as new listings. Basic listings remain free; sponsorship cannot change evidence status.

## Acceptance and recovery

Preview browser receipt: `066aa74a-8aeb-47b3-ab81-f7ee1b8d8cbc`; operator database-verified receipt: `5534c149-7029-4c82-bd60-73666532c88e`. Both are synthetic and must remain unpublished. Operator review tooling has transaction/validation tests; live editorial writes have not been exercised against AWS in this workspace.

Release only through the existing Netlify/GitHub workflow. Confirm the production build commit, `/supply-chain/`, the manufacturer form and one synthetic submission receipt. Preserve the existing homepage eye and Mission Control routes. To roll back the website release, redeploy the prior successful Netlify deployment or revert the release commit through Git. The AWS table and receipts remain intact. Removing the website endpoint disables its form but does not shut down direct API intake; suspending the service itself requires removing the public POST route through the authenticated operator. Never delete the table as an intake-stop procedure.
