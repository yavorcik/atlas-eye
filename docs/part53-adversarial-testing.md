# Part 53 adversarial testing

The repeatable runner is `npm run test:part53:adversarial`. It uses Playwright browser events, a clean context per iteration, a deterministic seed, bounded profiles, and fail-closed artifacts.

## Installation and commands

Install the lockfile dependencies with `npm ci`, then install the repository-compatible browser with `npx playwright install chromium` in the project environment. Build before local testing with `npm run build`; the default target is `http://127.0.0.1:4173/part53/`.

```text
npm run test:part53:smoke
npm run test:part53:adversarial
npm run test:part53:soak -- --runs 500 --seed 12345
npm run test:part53:replay -- --seed 12345
npm run test:part53:production-smoke -- --target https://atlaseye.ai/part53/
npm run test:part53:self-test
node tests/part53-adversarial-runner.mjs --self-test --self-test-fixture  # expected nonzero detector demonstration
```

Configuration is available through `PART53_TEST_RUNS`, `PART53_TEST_SEED`, `PART53_TEST_TARGET`, `PART53_TEST_HEADLESS`, `PART53_TEST_ARTIFACTS`, and `PART53_TEST_MAX_MINUTES`. Production is never the default and production-smoke is low-rate, read-only.

## What is checked

The runner covers canonical routes, the homepage CTA, direct and guided entry, evidence holds, the 14 representative fields, officer records, legal-review work-item routing, responsive viewports, keyboard-capable browser controls, reduced motion, adversarial text, refresh-safe session behavior, and boundary oracles for authority, evidence, approval, persistence, and uploads. It is not exhaustive and does not prove behavior outside these journeys.

Every exercised action must produce navigation, a visible/focus/state/accessibility change, or a clear message. The runner also checks first-party request failures, page errors, provenance, duplicate IDs, accessible names, ARIA values, overflow, and misleading approval language.

## Failures and artifacts

Failures exit nonzero and are written under `artifacts/part53-adversarial/run-*/` with JSON metadata, DOM, screenshot, and Playwright trace. `report.json` and `summary.md` are generated at the artifact root. A suspected defect is not confirmed until the same seed is replayed; the original trace is retained before minimization.

Invariants belong in `invariantFailures` or the canonical journey. New journeys should use the `action` helper so dead controls cannot be silently ignored. The normal self-test passes a healthy in-memory fixture; adding `--self-test-fixture` intentionally makes it exit nonzero after detecting an unchanged control, proving the oracle without changing the production application.

## Resource and safety limits

Runs are capped at 5,000, each action has a bounded browser timeout, and the overall profile has a maximum duration. Long soak runs are manual; no recurring workflow or production load is created. The harness never authenticates, uploads, submits, persists, calls AWS, mutates Terraform, or sends applicant answers to an external service.
