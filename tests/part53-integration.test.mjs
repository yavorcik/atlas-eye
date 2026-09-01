import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sourceCommit = 'd341664ad7ebc205fabbb4bc0b3cdd54c8f88844'
const page = await readFile('public/part53/index.html', 'utf8')
const app = await readFile('src/App.jsx', 'utf8')
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
  assert.match(app, /ENTER MISSION CONTROL/)
  assert.match(app, /href: '\/transportation\/'/)
  assert.match(app, /href: '\/part53\/'/)
  assert.doesNotMatch(app, /href="#/)
  assert.doesNotMatch(app, /scrollIntoView|location\.hash|hashchange/)
})

test('Part 53 preserves the legal-review boundary', () => {
  assert.match(page, /Demo session · Sample information only · Nothing is saved/)
  assert.match(workflow, /Eligibility remains pending legal review/)
  assert.match(workflow, /no eligibility conclusion will enter the controlled draft/)
  assert.doesNotMatch(page, /type="file"|\blogin\b|\bpassword\b/i)
})
