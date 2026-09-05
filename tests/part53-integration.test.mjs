import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sourceCommit = 'd341664ad7ebc205fabbb4bc0b3cdd54c8f88844'
const page = await readFile('public/part53/index.html', 'utf8')
const app = await readFile('src/App.jsx', 'utf8')
const eye = await readFile('src/components/AtlasEye.jsx', 'utf8')
const netlify = await readFile('netlify.toml', 'utf8')
const redirects = await readFile('public/_redirects', 'utf8')
const workflow = await readFile('public/part53/js/part53-redesign.js', 'utf8')

test('Part 53 route remains a real builder with source provenance', () => {
  assert.match(page, new RegExp(`data-part53-source-commit="${sourceCommit}"`))
  assert.match(page, /id="workspace" class="question-workspace"/)
  assert.match(page, /part53\/js\/part53-redesign\.js/)
})

test('Mission Control routes are real workspace routes before fallback', () => {
  for (const route of ['/part53', '/part53/', '/transportation', '/transportation/', '/mission-control/', '/mission-control/evidence/', '/mission-control/nuclear-readiness/']) assert.match(netlify + redirects, new RegExp(route.replaceAll('/', '\\/')))
  assert.ok(redirects.indexOf('/part53-demo.html') < redirects.indexOf('/*'))
  assert.ok(redirects.indexOf('/transportation/') < redirects.indexOf('/*'))
})

test('homepage has one Mission Control primary action and module choices link to workspaces', () => {
  assert.match(app, /ENTER ATLAS/)
  assert.match(eye, /data-active-eye="true"/)
  assert.match(app, /href: '\/transportation\/'/)
  assert.match(app, /href: '\/part53\/'/)
  assert.doesNotMatch(app, /href="#/)
  assert.doesNotMatch(app, /scrollIntoView|location\.hash|hashchange/)
})

test('Part 53 preserves the legal-review boundary', () => {
  assert.match(page, /Saved in this browser for refresh and revision traceability/)
  assert.match(workflow, /LEGAL ELIGIBILITY REVIEW REQUIRED/)
  assert.match(workflow, /Atlas cannot determine eligibility/)
  assert.doesNotMatch(page, /type="file"|\blogin\b|\bpassword\b/i)
})

test('Part 53 has an explicit persisted completion state and summary workspace', () => {
  assert.match(workflow, /NOT_STARTED/)
  assert.match(workflow, /IN_PROGRESS/)
  assert.match(workflow, /INTAKE_COMPLETE/)
  assert.match(workflow, /REVIEW_REQUIRED/)
  assert.match(workflow, /atlas-part53-application-state-v1/)
  assert.match(workflow, /APPLICATION FOUNDATION COMPLETE/)
  assert.match(workflow, /NRC submission readiness/)
  assert.match(workflow, /NOT READY/)
  assert.doesNotMatch(workflow, /NRC-APPROVED|NRC approved|APPROVED, LICENSED|LICENSED, COMPLIANT/)
})
