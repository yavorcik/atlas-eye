# Part 53 application demo integration

This route is a browser-only public demonstration. It uses session state only;
it does not authenticate users, persist data, receive real uploads, or provide
regulatory, legal, engineering, or eligibility approval.

## Provenance

- Source repository: `yavorcik/atlas-nuclear`
- Source merge commit: `d341664ad7ebc205fabbb4bc0b3cdd54c8f88844`
- Target repository: `yavorcik/atlas-eye`
- Target integration commit: `2b10b2dcbf65f73c693dcf988555461e5ac544e4`

The static builder was adapted from the source commit into the target Vite
public tree. The adapted files are:

- `public/part53/index.html`
- `public/part53/css/part53-redesign.css`
- `public/part53/css/universal-guided-workflow.css`
- `public/part53/js/part53-redesign.js`
- `public/part53/data/part53-public-requirements.json`
- `public/part53/assets/logos/atlas-nuclear-logo-original.png`
- `netlify.toml`
- `src/App.jsx`

The Part 53 page carries the same source commit in the non-visual
`data-part53-source-commit` attribute. The red-eye asset is kept inside the
route’s public asset tree so the page is self-contained on Netlify.

## Routes and boundary

- `/part53` and `/part53/` serve the builder directly.
- `/part53-demo.html` redirects to `/part53/` for compatibility.
- The homepage CTA is a semantic link to `/part53`.
- The SPA fallback remains the final rule and is not used for these routes.

The builder’s evidence, assignment, review, and legal-review states remain
demonstration states. No AWS, Terraform, governed evidence, voice backend,
authentication, persistence, or PR #77 content is included.

## Artifact hashes

SHA-256 hashes for the source-controlled route artifacts are recorded by the
release build verification for the target integration commit.
