import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sourceCommit = 'd341664ad7ebc205fabbb4bc0b3cdd54c8f88844'
const page = await readFile('public/part53/index.html', 'utf8')
const app = await readFile('src/App.jsx', 'utf8')
const eye = await readFile('src/components/AtlasEye.jsx', 'utf8')
const netlify = await readFile('netlify.toml', 'utf8')
const redirects = await readFile('public/_redirects', 'utf8')

test('Part 53 route remains advertised and opens the saved workspace', () => {
  assert.match(page, new RegExp(`data-part53-source-commit="${sourceCommit}"`))
  assert.match(page, /Mission Control \/ Part 53 Application Workspace/)
  assert.match(page, /part53-workspace/)
  assert.match(app, /Application Results/)
  assert.match(app, /Finish guided demonstration/)
  assert.match(app, /Download HTML report/)
  assert.match(app, /const part53Fields = \[/)
  assert.match(app, /What application history must remain traceable\?/)
  assert.match(app, /p53-history/)
})

test('Mission Control routes point to real workspace routes before fallback', () => {
  for (const route of ['/part53', '/part53/', '/part53-workspace/', '/transportation', '/transportation/', '/mission-control/transportation/', '/mission-control/', '/mission-control/evidence/', '/mission-control/nuclear-readiness/']) {
    assert.match(netlify + redirects, new RegExp(route.replaceAll('/', '\\/')))
  }
  assert.ok(redirects.indexOf('/part53-demo.html') < redirects.indexOf('/*'))
  assert.ok(redirects.indexOf('/transportation/') < redirects.indexOf('/*'))
})

test('homepage keeps original entry interaction and module choices link to workspaces', () => {
  assert.match(app, /ENTER ATLAS/)
  assert.match(eye, /data-active-eye="true"/)
  assert.match(app, /href: '\/mission-control\/transportation\/'/)
  assert.match(app, /href: '\/part53\/'/)
  assert.doesNotMatch(app, /href="#/)
  assert.doesNotMatch(app, /scrollIntoView|location\.hash|hashchange/)
})

test('public demo preserves evidence and legal-review boundaries', () => {
  assert.match(app, /Saved in this browser/)
  assert.match(app, /Use sample or non-sensitive material/)
  assert.match(app, /does not mean the application is complete or accepted/)
  assert.match(app, /human review remains separate/)
  assert.match(app, /does not upload documents to Atlas/)
  assert.match(app, /sample-financial-qualification-plan\.txt/)
  assert.match(app, /sample-environmental-information-outline\.md/)
  assert.match(app, /sample-emergency-response-information\.txt/)
  assert.match(app, /sample-calibration-record\.txt/)
})
