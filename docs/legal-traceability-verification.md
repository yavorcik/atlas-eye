# Legal traceability verification

Repository: yavorcik/atlas-eye. No applicable AGENTS.md existed at the repository or ancestor paths checked. Working tree was clean. PR #20 was merged at 2026-09-07T10:13:24Z with reviewed head 45ef3d56a5f508948214158b2f6c3740376eb510. Branch feature/legal-basis-and-presenter-walkthrough starts at fetched origin/main faea837fd10763c5d0c6322f2df37c04dd25e683; no stacked dependency.

## Local results

- npm run lint and npm run build: pass.
- node --test tests/legal-basis.test.mjs tests/demo-validation.test.mjs tests/part53-integration.test.mjs tests/contact-form.test.mjs: 34 passed.
- node --test tests/demo-correction-browser.test.mjs tests/legal-basis-browser.test.mjs tests/transportation-production-demo.test.mjs tests/workspace-polish.test.mjs: 15 passed, including Chromium and Firefox journeys.
- node --test tests/mission-control-workspace-navigation.test.mjs tests/historical-atlas-eye-homepage.test.mjs: 5 passed.
- node --test tests/active-eye-homepage.test.mjs tests/part53-adversarial-runner.test.mjs: 6 passed (the active-eye suite delegates to the historical-eye regressions).
- npm run test:positioning: pass.
- After the final presentation/record-origin adjustments, targeted model and presenter suites were rerun; 9 passed.

New deterministic tests verify missing references, source category preservation, proposed/future/superseded status, missing facts, scope changes, evidence separation, escaping and historical snapshot independence. They do not perform or mock live source verification. Actual source reading is documented separately.

New browser tests follow all six supplier presenter steps at 1366 and 390 pixels, confirm help is read-only, operate source panels by Enter/Space, inspect evidence, record bounded review, inspect HTML/CSV bytes, print to PDF and verify a later evidence replacement stales the current decision without rewriting its captured basis. Existing regressions retain their assertions. Report mapping is collapsed on screen and expands for print. Screenshots were inspected for mobile fit and basis text contrast; the inherited theme colors are preserved.

Actual generated report artifacts are under ignored test-artifacts/legal-local and test-artifacts/correction-local. HTML/CSV include stable IDs, categories, applicability, source versions, evidence versions and decision history. PDF text was extracted and checked for the same mapping. No conclusion is based merely on a download event.

Initial failures found and fixed: the clarified HRCQ sample string omitted the legacy gate's expected citation marker; full expansion made the application report exceed Firefox's full-page screenshot height. The existing gate remains protected, with the sample assumption labeled separately from legal applicability. Detailed report mapping is now expandable and printable. The new test waits for actual persisted invalidation after asynchronous file processing. Extracted PDF text then exposed a closed-details print issue; content-visibility is explicitly enabled for print and the browser suite now asserts text from inside the printed basis panel using pdftotext.

## Boundaries

All ten regulatory source records have verified text for the bounded statements. Project applicability remains unresolved where facts are missing; scope extensions and legacy decisions without source snapshots remain explicitly pending. No industry standard, guidance, license or order is asserted as applicable. Broader transportation-engine references remain workflow diagnostics, with legal verification pending. See requirement-authority-audit.md and source-verification-2026-09-07.md.

Preview verification is performed after push against the existing Netlify deploy preview, using build-info.json and GitHub deployment status to check the commit. No production deployment or merge is authorized or performed.
