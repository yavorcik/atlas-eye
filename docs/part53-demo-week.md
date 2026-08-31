# Part 53 demo-week readiness

The presenter checks use the built local site by default at `http://127.0.0.1:4173/part53/`. Run `npm run build` and `npm run preview -- --host 127.0.0.1 --port 4173` first, then run:

```text
npm run demo:preflight
npm run demo:rehearsal
```

`demo:preflight` is a low-rate, read-only smoke against `https://atlaseye.ai/part53/` when `PART53_DEMO_TARGET` is set to that URL. It checks the homepage CTA, canonical and compatibility routes, the source marker, builder workspace, accessible names, overflow, console/network failures, and a short answer → evidence hold → next-field journey. It exits 0 with `GO` and nonzero with `NO-GO`.

`demo:rehearsal` is deterministic, uses reduced motion, and is intended for the local build or deploy preview. It records a trace, screenshots, action timing metadata, and JSON/Markdown reports. Set `PART53_DEMO_TARGET` and `PART53_DEMO_ARTIFACTS` to change the target and artifact directory. No command authenticates, uploads, persists, submits, approves, or calls AWS.

Expected runtime is under one minute for either short journey. Reports are written to `artifacts/part53-demo/` by default. For a failure, inspect the Markdown report and trace, correct only the underlying product defect, and replay the same target after rebuilding. Production preflight is intentionally low-rate; the randomized adversarial runner remains the bounded local campaign tool.
