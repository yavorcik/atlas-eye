# Demo correction verification

Repository: yavorcik/atlas-eye. Started from origin/main at
4e364a1c6222460011a4934ccf39f6abc2de7466 after verifying PR #19 was merged
with reviewed head db732fc8c001ed29ae774228ca27065dc6982adc. No applicable
AGENTS.md exists in this checkout or its parent directories. The checkout
was clean. No other repository was edited.

## Correctness and boundaries

- One shipment validator gates UI errors, the adapter, evaluation, review,
  findings, and reports. Quantity value and unit are separate; v2 quantities
  are preserved during schema-v3 migration, including invalid legacy input.
- The supplied package record covers 19.75 wt% and 12 kgU, not a range.
  Declared package identity/type/scope/facts must match. Other known samples
  use full-content matching, not keywords or filenames. Arbitrary uploads
  remain applicability-unresolved. These checks establish only bounded demo
  applicability, not document authenticity or actual authorization.
- Web Locks serialize each localStorage read/compare/write. Transactions
  compare project revisions and use a three-way merge. Conflicting fields
  fail visibly and preserve a downloadable local recovery copy. Reset epochs
  prevent stale tabs from restoring pre-reset data. Async evaluation requests
  carry a request identity and input revision; obsolete results are discarded.
- The shared report model drives lifecycle status, scope, readable facts,
  evidence versions, decisions, and actions across screen, HTML, CSV, and print.
  Current simulated decisions and historical decisions are separated.
- All fourteen questions remain editable and persisted. Skipping records a
  gap without erasing the previous answer. Guidance includes explanations,
  examples, evidence prompts, and a preview; the full register is expandable.
- Supplier review records explanations, changes requested/rejection/acceptance,
  scope and evidence versions, and stales after evidence changes. It is not
  full supplier qualification or NQA-1 certification.
- Report navigation focuses the heading and measures sticky navigation before
  scrolling. Background evaluation and persistence do not trigger scrolling.

## Baseline reproduction

Read-only use of https://deploy-preview-19--atlas-eye.netlify.app with only
browser-local sample edits reproduced acceptance for banana, 101, -5 kgU,
and a blank destination. The record is in ignored
`test-artifacts/baseline/pr19-reproductions.json`.

## Primary sources checked

Official eCFR section pages were opened and their represented subject matter
checked during implementation. These links do not imply complete compliance
or an automatic authority refresh at runtime:

- [10 CFR 53.1109](https://www.ecfr.gov/current/title-10/chapter-I/part-53/subpart-H/section-53.1109): applicant general information.
- [10 CFR 53.1413](https://www.ecfr.gov/current/title-10/chapter-I/part-53/subpart-H/section-53.1413): COL general and financial information.
- [10 CFR 53.1416](https://www.ecfr.gov/current/title-10/chapter-I/part-53/subpart-H/section-53.1416): technical/safety information.
- [10 CFR 53.1419](https://www.ecfr.gov/current/title-10/chapter-I/part-53/subpart-H/section-53.1419): other COL application content, including environmental information.
- [10 CFR 53.1118](https://www.ecfr.gov/current/title-10/chapter-I/part-53/subpart-H/section-53.1118): applicant ineligibility.
- [49 CFR 173.403](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-I/subchapter-C/part-173/subpart-I/section-173.403): radioactive-material definitions including HRCQ.
- [49 CFR 172 Subpart G](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-I/subchapter-C/part-172/subpart-G): emergency response information.

## Test scope

`node --test tests/demo-validation.test.mjs` covers validation, structured
scope mismatches, arbitrary text, merge conflicts, and migration.
`node --test tests/demo-correction-browser.test.mjs` exercises Chromium and
Firefox, desktop 1366px and mobile 390px, actual downloads, print, keyboard
focus and viewport position for all three report CTAs, all fourteen answers
including a skip/edit/reload, supplier decisions/invalidation, transportation
validation/evidence/review/invalidation, two-tab persistence, recovery, reset,
and legacy quantities.

The existing transportation suite still covers detailed route/maritime gates,
evaluator/script/hash failure and retry, delayed evaluation, and reload
interruption. Its delayed test now waits for the obsolete request to finish.
The previous assertion accepting 19.50% was replaced with a blocking assertion
and recovery at the sample's actual 19.75%; the delayed test similarly recovers
to 19.75%. Other test updates reflect the newly visible missing answer,
material/HRCQ first blocker, honest initial unsaved state, and quoted CSV
headers. No test is skipped or replaced with mocked browser success.

Artifacts are ignored and contain only synthetic sample data. No production
site, backend hosting, authentication, or customer onboarding was introduced.
The existing Netlify PR preview is identified using `/build-info.json`, whose
commit is captured from Netlify COMMIT_REF at build time.

## Remaining represented limits

Persistence requires a browser supporting Web Locks and local storage. Failure
is visible with a recovery download; no unsafe unlocked fallback is used.
Complex same-project conflicts require explicit recovery and reload. Unrelated
field edits can merge, while complex arrays may require conflict resolution.
Cross-tab changes become visible on reload or the next successful transaction.
Uploaded documents outside implemented checks require assessment outside this
demo. Carrier/route/security/execution dropdowns are explicitly labeled
scenario assumptions, not attached evidence or real review. Firefox print
styles are checked, but automated PDF file output is available in Chromium.

## Local final results

- `npm run lint`: exit 0.
- `npm run build`: exit 0.
- `node --test tests/*.test.mjs`: 51 passed, 0 failed, 0 skipped; exit 0.
- Chromium and Firefox completed the corrected core journeys. Both desktop
  and mobile report CTAs passed focus plus measured viewport assertions.
- Actual HTML and CSV files were downloaded and inspected for application,
  transportation (review-ready, accepted, stale, blocked replacement), and
  supplier (changes requested, rejected, accepted, stale). Chromium PDF
  output and both browsers' print presentation were checked. Artifacts are
  under ignored `test-artifacts/correction-local` and `test-artifacts/polish-local`.
