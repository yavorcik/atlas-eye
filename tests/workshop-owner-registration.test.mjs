import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { createIntakeHandler } from '../netlify/functions/learning-intake.js'
import { createWorkshopConfirmation } from '../netlify/lib/workshop-confirmation.mjs'

const email = 'sample@example.com'
const key = createHash('sha256').update(email).digest('hex')
const before = () => Date.parse('2026-11-10T17:00:00Z')
const env = {
  WORKSHOP_OWNER_REGISTRATION_ENABLED: 'true',
  WORKSHOP_OWNER_REGISTRATION_TOKEN: 'a'.repeat(64),
  WORKSHOP_OWNER_REGISTRATION_ID: 'b'.repeat(32),
  WORKSHOP_OWNER_REGISTRATION_EMAIL: email,
}
const source = { id: 'original-id', name: 'Original attendee', email, source: 'email', campaign: 'original', receivedAt: '2026-11-01T10:00:00Z', consentedAt: '2026-11-01T10:00:00Z', consentPurpose: 'next free live workshop notifications' }
const context = { deploy: { context: 'production' } }
function request({ headers = {}, method = 'POST', body } = {}) {
  return new Request('https://atlaseye.ai/learn/intake', { method, headers: {
    'x-workshop-owner-registration': 'register-waitlist', authorization: `Bearer ${env.WORKSHOP_OWNER_REGISTRATION_TOKEN}`, ...headers,
  }, body })
}
function setup(overrides = {}, now = before) {
  // Handler intentionally uses the same production factory and allocator as the public form.
  const prior = { ...process.env }
  Object.assign(process.env, env, overrides)
  const maps = { waitlist: new Map([[key, structuredClone(source)]]), workshop: new Map() }
  const open = kind => ({
    get: async key => structuredClone(maps[kind].get(key)),
    list: async () => ({ blobs: [...maps[kind].keys()].map(key => ({ key })) }),
    delete: async key => maps[kind].delete(key),
    setJSON: async (key, value, options) => {
      assert.equal(options.onlyIfNew, true)
      if (maps[kind].has(key)) return { modified: false }
      maps[kind].set(key, structuredClone(value))
      return { modified: true }
    },
  })
  const handle = createIntakeHandler(open, now, async () => { throw new Error('Owner route must never invoke sender') })
  return { maps, open, handle, cleanup() {
    for (const key of Object.keys(process.env)) if (!(key in prior)) delete process.env[key]
    Object.assign(process.env, prior)
  } }
}

test('owner action preserves waitlist and consent, reserves one seat, and is idempotent', async t => {
  const { handle, maps, cleanup } = setup(); t.after(cleanup)
  const responses = await Promise.all(Array.from({ length: 5 }, () => handle(request(), context)))
  assert.ok(responses.every(r => [200, 201].includes(r.status)))
  assert.deepEqual(maps.waitlist.get(key), source)
  const record = maps.workshop.get(key)
  assert.equal(record.consentedAt, source.consentedAt)
  assert.equal(record.consentPurpose, source.consentPurpose)
  assert.equal(record.source, source.source)
  assert.equal(record.campaign, source.campaign)
  assert.equal(record.ownerRegistration.sourceWaitlistId, source.id)
  assert.equal(record.ownerRegistration.sourceWaitlistKey, key)
  assert.equal(record.ownerRegistration.authorizedAt, new Date(before()).toISOString())
  assert.deepEqual(record.confirmationDelivery, { mode: 'manual', status: 'pending' })
  assert.equal([...maps.workshop.keys()].filter(k => k.startsWith('_capacity/')).length, 1)
})

test('rejects unauthorized, preview, non-POST, wrong intent, and body overrides without writes', async t => {
  const { handle, maps, cleanup } = setup(); t.after(cleanup)
  for (const req of [request({ headers: { authorization: 'Bearer wrong' } }), request({ headers: { 'x-workshop-owner-registration': 'wrong' } }), request({ method: 'GET' })]) {
    assert.equal((await handle(req, context)).status, 404)
  }
  assert.equal((await handle(request(), { deploy: { context: 'deploy-preview' } })).status, 404)
  assert.equal((await handle(request({ body: JSON.stringify({ email: 'other@example.com', consent: true }) }), context)).status, 400)
  assert.equal(maps.workshop.size, 0)
})

test('disabled, malformed config, missing source consent, and closed session fail safely', async t => {
  for (const overrides of [{ WORKSHOP_OWNER_REGISTRATION_ENABLED: 'false' }, { WORKSHOP_OWNER_REGISTRATION_TOKEN: 'short' }, { WORKSHOP_OWNER_REGISTRATION_ID: '' }, { WORKSHOP_OWNER_CONFIRMATION_GMAIL_ID: 'abc' }]) {
    const s = setup(overrides)
    try { assert.equal((await s.handle(request(), context)).status, 404); assert.equal(s.maps.workshop.size, 0) } finally { s.cleanup() }
  }
  const s = setup(); t.after(s.cleanup)
  s.maps.waitlist.get(key).consentPurpose = 'unrelated purpose'
  assert.equal((await s.handle(request(), context)).status, 404)
  s.maps.waitlist.delete(key)
  assert.equal((await s.handle(request(), context)).status, 404)
  const closed = createIntakeHandler(() => assert.fail('No storage when closed'), () => Date.parse('2026-11-20T21:00:00Z'))
  assert.equal((await closed(request(), context)).status, 410)
})

test('full workshop and existing attendee record are not overwritten', async t => {
  const s = setup(); t.after(s.cleanup)
  for (let index = 0; index < 25; index++) s.maps.workshop.set(index.toString(16).padStart(64, '0'), { existing: true })
  assert.equal((await s.handle(request(), context)).status, 409)
  assert.equal(s.maps.workshop.has(key), false)
  s.maps.workshop.set(key, { email, consentedAt: 'attendee-consent' })
  assert.equal((await s.handle(request(), context)).status, 409)
  assert.deepEqual(s.maps.workshop.get(key), { email, consentedAt: 'attendee-consent' })
})

test('manual Gmail provenance is immutable and all automatic send modes are suppressed', async t => {
  const s = setup({ WORKSHOP_OWNER_CONFIRMATION_GMAIL_ID: '123456789abcdef0', WORKSHOP_OWNER_CONFIRMATION_SENT_AT: '2026-11-10T16:00:00Z' }); t.after(s.cleanup)
  assert.equal((await s.handle(request(), context)).status, 201)
  assert.deepEqual(s.maps.workshop.get(key).confirmationDelivery, { mode: 'manual', status: 'accepted', provider: 'gmail', messageId: '123456789abcdef0', sentAt: '2026-11-10T16:00:00Z' })
  for (const status of ['accepted', 'pending']) {
    s.maps.workshop.get(key).confirmationDelivery.status = status
    for (const testRunId of [undefined, 'c'.repeat(32)]) {
      const confirm = createWorkshopConfirmation({ env: { WORKSHOP_EMAIL_ENABLED: 'true' }, testRunId, createTransport: () => assert.fail('No SMTP for manual registration') })
      assert.equal(await confirm(s.open('workshop'), key, context), status === 'accepted' ? 'accepted' : 'unconfirmed')
    }
  }
  s.maps.workshop.get(key).confirmationDelivery.status = 'accepted'
  process.env.WORKSHOP_OWNER_CONFIRMATION_GMAIL_ID = 'ffffffffffffffff'
  assert.equal((await s.handle(request(), context)).status, 200)
  assert.equal(s.maps.workshop.get(key).confirmationDelivery.messageId, '123456789abcdef0')
})

test('store failure does not report saved', async t => {
  const s = setup(); t.after(s.cleanup)
  const broken = createIntakeHandler(() => ({ get: async () => { throw new Error('private provider error') } }), before)
  const response = await broken(request(), context)
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { saved: false })
})

test('owner page clears secrets, sends a bodyless request once, and handles uncertain outcomes', async () => {
  const { readFile } = await import('node:fs/promises')
  const { runInNewContext } = await import('node:vm')
  const html = await readFile(new URL('../public/learn/owner-registration.html', import.meta.url), 'utf8')
  const script = await readFile(new URL('../public/learn/owner-registration.js', import.meta.url), 'utf8')
  assert.match(html, /noindex,nofollow,noarchive/)
  assert.match(html, /form-action 'none'/)
  assert.match(html, /type="password"/)
  assert.doesNotMatch(html.match(/<input[^>]+>/)[0], /\bname=/)
  assert.match(html, /<button type="submit" disabled>/)
  assert.doesNotMatch(script, /localStorage|sessionStorage|console\.|location\.|sendBeacon/)
  for (const outcome of [200, 201, 404, 'failure', 'invalid-key']) {
    let listener, calls = 0
    const input = { value: outcome === 'invalid-key' ? 'invalid' : 'a'.repeat(64) }, button = {}, status = {}
    const form = { querySelector: () => button, addEventListener: (_, cb) => { listener = cb } }
    runInNewContext(script, {
      document: { getElementById: id => ({ 'owner-registration': form, 'verification-key': input, 'check-status': status })[id] }, AbortSignal,
      fetch: async (url, options) => {
        calls++
        assert.equal(url, '/learn/intake')
        assert.equal(options.method, 'POST')
        assert.equal(options.headers['X-Workshop-Owner-Registration'], 'register-waitlist')
        assert.equal(options.headers.Authorization, `Bearer ${'a'.repeat(64)}`)
        assert.equal(options.body, undefined)
        assert.equal(options.redirect, 'error')
        assert.equal(input.value, '')
        if (outcome === 'failure') throw new Error('secret provider error')
        return { status: outcome }
      },
    })
    await listener({ preventDefault() {} })
    await listener({ preventDefault() {} })
    assert.equal(calls, outcome === 'invalid-key' ? 0 : 1)
    assert.equal(input.value, '')
    assert.doesNotMatch(status.textContent, /secret provider error|aaaa/)
    if ([200, 201].includes(outcome)) assert.match(status.textContent, /Registration saved/)
    else assert.doesNotMatch(status.textContent, /Registration saved/)
  }
})
