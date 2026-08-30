import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sourceCommit = 'd341664ad7ebc205fabbb4bc0b3cdd54c8f88844'
const page = await readFile('public/part53/index.html', 'utf8')
const app = await readFile('src/App.jsx', 'utf8')
const netlify = await readFile('netlify.toml', 'utf8')
const workflow = await readFile('public/part53/js/part53-redesign.js', 'utf8')

test('Part 53 route is a real builder with source provenance', () => {
  assert.match(page, new RegExp(`data-part53-source-commit="${sourceCommit}"`))
  assert.match(page, /id="workspace" class="question-workspace"/)
  assert.match(page, /part53\/js\/part53-redesign\.js/)
  assert.match(page, /part53\/css\/part53-redesign\.css/)
})

test('Netlify routes bypass the SPA fallback for both canonical paths', () => {
  assert.match(netlify, /from = "\/part53"[\s\S]*?to = "\/part53\/index\.html"[\s\S]*?status = 200/)
  assert.match(netlify, /from = "\/part53\/"[\s\S]*?to = "\/part53\/index\.html"[\s\S]*?status = 200/)
  assert.match(netlify, /from = "\/part53-demo\.html"[\s\S]*?to = "\/part53\/"[\s\S]*?status = 301/)
})

test('homepage CTA is a semantic Part 53 link', () => {
  assert.match(app, /<a className="button primary" href="\/part53">BUILD A PART 53 APPLICATION<\/a>/)
  assert.doesNotMatch(app, /BUILD A PART 53 APPLICATION[\s\S]{0,200}(?:onClick|window\.location)/)
})

test('builder remains browser-only and preserves the legal-review boundary', () => {
  assert.match(page, /Demo session · Sample information only · Nothing is saved/)
  assert.match(workflow, /Eligibility remains pending legal review/)
  assert.match(workflow, /no eligibility conclusion will enter the controlled draft/)
  assert.doesNotMatch(page, /<form\b|type="file"|\blogin\b|\bpassword\b/i)
})
