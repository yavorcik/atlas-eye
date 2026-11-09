import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { analyzeInquiry, samples } from '../public/learn/workflow/engine.mjs'

test('all fictional samples route and identify actual missing fields', () => {
  assert.deepEqual(samples.map(sample => analyzeInquiry(sample.text).route.id), ['inquiries', 'orders', 'reporting'])
  assert.deepEqual(samples.map(sample => analyzeInquiry(sample.text).missing.map(item => item.key)), [['budget'], ['tools', 'timeline'], []])
})
test('changing a budget changes the output and clears the missing question', () => {
  const result = analyzeInquiry(samples[0].text.replace('Budget: Not decided', 'Budget: $2,500'))
  assert.equal(result.fields.budget, '$2,500')
  assert.equal(result.missing.length, 0)
  assert.equal(result.record.customer_budget, '$2,500')
  assert.match(result.reply, /Who will review drafts/)
  assert.doesNotMatch(result.reply, /What budget range/)
})
test('blank fields do not consume the following line', () => {
  const result = analyzeInquiry('Business:\nRequest: Organize quote requests.\nTools:\nVolume: 10\nTimeline:\nBudget: $1,000')
  assert.equal(result.fields.business, null)
  assert.equal(result.fields.tools, null)
  assert.equal(result.fields.timeline, null)
  assert.equal(result.fields.budget, '$1,000')
})
test('unknown requests fall back to human clarification', () => {
  const result = analyzeInquiry('Business: Fictional Co\nRequest: We need something completely different.')
  assert.equal(result.route.id, 'review')
  assert.match(result.route.checks, /does not match/)
  assert.ok(result.missing.length > 0)
})
test('multiline field content is retained without consuming another labeled field', () => {
  const result = analyzeInquiry('Business: Fictional Co\nRequest: We need to\norganize customer inquiries.\nTools: Gmail\nBudget: Not decided')
  assert.equal(result.fields.request, 'We need to organize customer inquiries.')
  assert.equal(result.fields.tools, 'Gmail')
  assert.equal(result.fields.budget, null)
  assert.equal(result.route.id, 'inquiries')
})
test('matching is case insensitive and does not execute text', () => {
  const result = analyzeInquiry('business: <img src=x onerror=alert(1)>\nrequest: QUOTE REQUESTS\nBUDGET: $12')
  assert.equal(result.fields.business, '<img src=x onerror=alert(1)>')
  assert.equal(result.route.id, 'inquiries')
})
test('duplicate fields and ambiguous routes require review', () => {
  const result = analyzeInquiry('Business: Fictional Co\nRequest: An order report for quote requests.\nBudget: $1,000\nBudget: $2,000')
  assert.equal(result.fields.budget, '$1,000')
  assert.equal(result.warnings.length, 2)
})
test('input validation handles empty, short, non-string and oversized values', () => {
  for (const text of ['', 'tiny', null, {}, 'x'.repeat(2001)]) assert.throws(() => analyzeInquiry(text))
})
test('no sample output represents a real send, save, or delivery commitment', () => {
  for (const sample of samples) {
    const result = analyzeInquiry(sample.text)
    assert.equal(result.status, 'Human review required')
    assert.match(result.record.stage, /not saved/)
    assert.match(result.reply, /agreed before paid work/)
    if (result.fields.timeline) assert.match(result.reply, /not a delivery commitment/)
  }
})
test('demo has no request/storage APIs or unsafe HTML rendering', async () => {
  const script = await readFile(new URL('../public/learn/workflow/app.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(script, /\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|sendBeacon|eval)\b|innerHTML|insertAdjacentHTML/)
  const html = await readFile(new URL('../public/learn/workflow/index.html', import.meta.url), 'utf8')
  assert.match(html, /does not call a live AI model/)
  assert.match(html, /Rules-based simulation/)
  assert.match(html, /interest=done-for-you#book/)
  assert.match(html, /interest=build-along#book/)
  assert.match(html, /id="run"[^>]+disabled/)
  assert.match(script, /get\('run'\)\.disabled = false/)
})
