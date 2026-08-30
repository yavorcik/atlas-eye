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

test('structured person mutations use the preserving workspace update path', () => {
  assert.match(workflow, /if \(action === "add-person"\)[\s\S]*?record\(\)\.status = "EVIDENCE REQUIRED"; update\(\); return/)
  assert.match(workflow, /if \(action === "edit-person"\)[\s\S]*?record\(\)\.editing = Number\(button\.dataset\.personIndex\); update\(\);/)
  assert.match(workflow, /if \(action === "remove-person"\)[\s\S]*?record\(\)\.status = record\(\)\.people\.length \? "EVIDENCE REQUIRED" : "NOT STARTED"; update\(\); return/)
})
