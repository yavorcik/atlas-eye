import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('browser metrics are minimal and exclude query strings and browser identity', () => {
  const source = fs.readFileSync(new URL('../src/ownerActivity.js', import.meta.url), 'utf8')
  assert.match(source, /location\.pathname/)
  assert.doesNotMatch(source, /location\.(search|href)|document\.cookie|localStorage|sessionStorage|navigator\.userAgent|fingerprint/i)
  assert.match(source, /page_view/)
  assert.match(source, /download/)
})

test('owner delivery stores retries and uses provider idempotency', () => {
  const source = fs.readFileSync(new URL('../supabase/functions/owner-activity/index.ts', import.meta.url), 'utf8')
  assert.match(source, /idempotency-key/)
  assert.match(source, /next_attempt_at/)
  assert.match(source, /unavailable \(collection had not started\)/)
  assert.match(source, /partial since/)
  assert.match(source, /excludes form narratives, documents, credentials, and private review notes/)
  assert.doesNotMatch(source, /remoteip|user-agent|cookie/i)
})
