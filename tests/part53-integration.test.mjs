import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sourceCommit = 'd341664ad7ebc205fabbb4bc0b3cdd54c8f88844'
const page = await readFile('public/part53/index.html', 'utf8')
const app = await readFile('src/App.jsx', 'utf8')
const netlify = await readFile('netlify.toml', 'utf8')
const redirects = await readFile('public/_redirects', 'utf8')
const workflow = await readFile('public/part53/js/part53-redesign.js', 'utf8')

test('Part 53 route is a real builder with source provenance', () => {
  assert.match(page, new RegExp(`data-part53-source-commit="${sourceCommit}"`))
  assert.match(page, /id="workspace" class="question-workspace"/)
  assert.match(page, /part53\/js\/part53-redesign\.js/)
  assert.match(page, /part53\/css\/part53-redesign\.css/)
})

test('Netlify routes bypass the SPA fallback for canonical and compatibility paths', () => {
  assert.match(netlify, /from = "\/part53"[\s\S]*?to = "\/part53\/index\.html"[\s\S]*?status = 200/)
  assert.match(netlify, /from = "\/part53\/"[\s\S]*?to = "\/part53\/index\.html"[\s\S]*?status = 200/)
  assert.match(netlify, /from = "\/part53-demo\.html"[\s\S]*?to = "\/part53\/"[\s\S]*?status = 301/)

  const compatibilityRule = redirects.indexOf('/part53-demo.html')
  const spaFallback = redirects.indexOf('/*')
  assert.notEqual(compatibilityRule, -1)
  assert.notEqual(spaFallback, -1)
  assert.ok(compatibilityRule < spaFallback)
  assert.match(redirects, /\/part53-demo\.html\s+\/part53\/\s+301!/)
})

test('Part 53 Builder is the semantic primary homepage action', () => {
  assert.match(app, /<a className="button primary compact" href="\/part53">Build a Part 53 Application<\/a>/)
  assert.match(app, /<a className="button primary hero-primary" href="\/part53">Build a Part 53 Application/)
  assert.match(app, /THE ATLAS PART 53 APPLICATION BUILDER/)
  assert.doesNotMatch(app, /<button[^>]*>Build a Part 53 Application<\/button>/)
  assert.doesNotMatch(app, /window\.location[^\n]*part53/)
})

test('readiness assessment is named and visually secondary', () => {
  assert.match(app, /Assess SMR Project Readiness/)
  assert.match(app, /Run the Readiness Assessment/)
  assert.doesNotMatch(app, />Demonstration</)
  assert.doesNotMatch(app, /Run the guided demonstration/)
})

test('builder remains browser-only and preserves the legal-review boundary', () => {
  assert.match(page, /Demo session · Sample information only · Nothing is saved/)
  assert.match(workflow, /Eligibility remains pending legal review/)
  assert.match(workflow, /no eligibility conclusion will enter the controlled draft/)
  assert.doesNotMatch(page, /<form\b|type="file"|\blogin\b|\bpassword\b/i)
})

test('missing controlled evidence presents actionable next steps instead of a dead control', () => {
  assert.match(workflow, /class="evidence-status" role="status"/)
  assert.match(workflow, /No controlled record has been added/)
  assert.match(workflow, /data-action="request-record"/)
  assert.match(workflow, /data-action="hold-field"/)
  assert.doesNotMatch(workflow, /No existing controlled record is available<\/button>/)
})

test('structured person mutations use the preserving workspace update path', () => {
  assert.match(workflow, /if \(action === "add-person"\)[\s\S]*?record\(\)\.status = "EVIDENCE REQUIRED"; update\(snapshot\); return/)
  assert.match(workflow, /if \(action === "edit-person"\)[\s\S]*?record\(\)\.editing = Number\(button\.dataset\.personIndex\); update\(\);/)
  assert.match(workflow, /if \(action === "remove-person"\)[\s\S]*?record\(\)\.status = record\(\)\.people\.length \? "EVIDENCE REQUIRED" : "NOT STARTED"; update\(\); return/)
})
