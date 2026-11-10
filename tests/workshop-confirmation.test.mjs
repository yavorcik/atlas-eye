import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { createIntakeHandler } from '../netlify/functions/learning-intake.js'
import { confirmationConfig, createWorkshopConfirmation } from '../netlify/lib/workshop-confirmation.mjs'

const env = {
  WORKSHOP_EMAIL_ENABLED: 'true', SMTP_HOST: 'smtp.example.com', SMTP_PORT: '587',
  SMTP_SECURE: 'false', SMTP_USER: 'test', SMTP_PASS: 'fake-test-password',
  MAIL_FROM: 'workshop@example.com', WORKSHOP_MEET_URL: 'https://meet.google.com/abc-defg-hij',
}
const context = { deploy: { context: 'production' } }
const attendee = { kind: 'workshop', name: 'Original attendee', email: 'sample@example.com', consent: true }
const key = createHash('sha256').update(attendee.email).digest('hex')
const now = () => Date.parse('2026-11-10T12:00:00Z')
function request(input = attendee) {
  return new Request('https://atlaseye.ai/learn/intake', { method: 'POST', headers: { origin: 'https://atlaseye.ai', 'content-type': 'application/json' }, body: JSON.stringify(input) })
}
function setup({ config = env, send, fail } = {}) {
  const records = new Map(), messages = []
  const store = {
    async get(key) { return records.get(key) },
    async list() { return { blobs: [...records.keys()].map(key => ({ key })) } },
    async delete(key) { records.delete(key) },
    async setJSON(key, value, options) {
      assert.equal(options.onlyIfNew, true)
      if (fail?.(key)) throw new Error('private storage error')
      if (records.has(key)) return { modified: false }
      records.set(key, value)
      return { modified: true }
    },
  }
  const confirm = createWorkshopConfirmation({ env: config, createTransport(options) {
    assert.equal(options.requireTLS, true)
    assert.equal(options.logger, false)
    return { async sendMail(message) {
      messages.push(message)
      assert.ok(records.has(key) || records.has(createHash('sha256').update(message.to.address).digest('hex')))
      return send ? send(message) : { accepted: [message.to.address] }
    }, close() {} }
  } })
  return { records, messages, store, confirm, handle: createIntakeHandler(() => store, now, confirm) }
}

test('saved signup sends fixed workshop details from server-only configuration; duplicates use original record', async () => {
  const { handle, records, messages } = setup()
  const first = await handle(request(), context)
  assert.deepEqual(await first.json(), { saved: true, confirmationEmail: 'accepted' })
  assert.equal(messages.length, 1)
  assert.match(messages[0].text, /Friday, November 20, 2026/)
  assert.match(messages[0].text, /4:00–4:45 p.m. Eastern/)
  assert.match(messages[0].text, /https:\/\/meet.google.com\/abc-defg-hij/)
  assert.deepEqual(messages[0].to, { address: attendee.email })
  assert.equal(records.get(`_confirmation/${key}/result`).status, 'accepted')
  const again = await handle(request({ ...attendee, name: 'Changed name' }), context)
  assert.deepEqual(await again.json(), { saved: true, confirmationEmail: 'accepted' })
  assert.equal(messages.length, 1)
  assert.equal(records.get(key).name, attendee.name)
})

test('existing saved record supplies name, never duplicate-request name', async () => {
  const { handle, records, messages } = setup()
  records.set(key, { ...attendee, id: 'existing' })
  await handle(request({ ...attendee, name: 'Attacker supplied replacement' }), context)
  assert.match(messages[0].text, /Hi Original attendee/)
  assert.doesNotMatch(messages[0].text, /Attacker/)
})

test('simultaneous duplicate requests claim one SMTP attempt', async () => {
  const { handle, messages, records } = setup()
  const responses = await Promise.all(Array.from({ length: 20 }, () => handle(request(), context)))
  assert.ok(responses.every(response => response.status === 201))
  assert.equal(messages.length, 1)
  assert.equal([...records.keys()].filter(key => key.startsWith('_capacity/')).length, 1)
})

test('SMTP errors/rejection are private and never retried automatically', async () => {
  for (const send of [() => { throw new Error('SMTP_PASS=secret; personal-data') }, () => ({ accepted: [], rejected: [attendee.email] })]) {
    const { handle, messages } = setup({ send })
    for (let i = 0; i < 2; i++) {
      const response = await handle(request(), context)
      assert.equal(response.status, 201)
      assert.deepEqual(await response.json(), { saved: true, confirmationEmail: 'unconfirmed' })
    }
    assert.equal(messages.length, 1)
  }
})

test('disabled, unconfigured, malformed runtime config and preview/local contexts never send or claim', async () => {
  for (const config of [{}, { ...env, WORKSHOP_EMAIL_ENABLED: 'false' }, { ...env, SMTP_PASS: '' }, { ...env, SMTP_PORT: 'abc' }, { ...env, SMTP_SECURE: 'yes' }, { ...env, MAIL_FROM: 'bad\r\nBcc: x@example.com' }, { ...env, WORKSHOP_MEET_URL: 'https://evil.example/path' }]) {
    assert.equal(confirmationConfig(config, context), null)
    const { handle, messages, records } = setup({ config })
    assert.deepEqual(await (await handle(request(), context)).json(), { saved: true, confirmationEmail: 'unconfirmed' })
    assert.equal(messages.length, 0)
    assert.equal([...records.keys()].filter(key => key.startsWith('_confirmation/')).length, 0)
  }
  for (const deployContext of [undefined, {}, { deploy: { context: 'deploy-preview' } }, { deploy: { context: 'branch-deploy' } }]) {
    const { handle, messages } = setup()
    await handle(request(), deployContext)
    assert.equal(messages.length, 0)
  }
})

test('failed registration write cannot send; claim failure cannot send; outcome failure keeps claim', async () => {
  for (const [predicate, expectedStatus, attempts] of [
    [key => /^[a-f0-9]{64}$/.test(key), 503, 0],
    [key => key.endsWith('/claim'), 201, 0],
    [key => key.endsWith('/result'), 201, 1],
  ]) {
    const { handle, messages } = setup({ fail: predicate })
    for (let i = 0; i < 2; i++) assert.equal((await handle(request(), context)).status, expectedStatus)
    assert.equal(messages.length, attempts)
  }
})

test('a crash-left claim is not retried', async () => {
  const { handle, records, messages } = setup()
  records.set(key, attendee)
  records.set(`_confirmation/${key}/claim`, { status: 'attempting' })
  assert.deepEqual(await (await handle(request(), context)).json(), { saved: true, confirmationEmail: 'unconfirmed' })
  assert.equal(messages.length, 0)
})

test('capacity and concurrent unique registrations send only for the 25 saved seats', async () => {
  const { handle, messages } = setup()
  const responses = await Promise.all(Array.from({ length: 30 }, (_, i) => handle(request({ ...attendee, email: `attendee${i}@example.com` }), context)))
  assert.equal(responses.filter(r => r.status === 201).length, 25)
  assert.equal(responses.filter(r => r.status === 409).length, 5)
  assert.equal(messages.length, 25)
  assert.equal((await handle(request({ ...attendee, email: 'overflow@example.com' }), context)).status, 409)
  assert.equal(messages.length, 25)
})

test('waitlist, inquiry, invalid consent and closed workshop never invoke SMTP', async () => {
  const { handle, messages, store, confirm } = setup()
  assert.equal((await handle(request({ ...attendee, kind: 'waitlist' }), context)).status, 201)
  assert.equal((await handle(request({ ...attendee, kind: 'inquiry', requestId: '12345678-1234-1234-1234-123456789abc' }), context)).status, 201)
  assert.equal((await handle(request({ ...attendee, consent: false }), context)).status, 400)
  const closed = createIntakeHandler(() => store, () => Date.parse('2026-11-20T21:00:00Z'), confirm)
  assert.equal((await closed(request(), context)).status, 410)
  assert.equal(messages.length, 0)
})

test('saved malformed mailboxes cannot inject headers or add envelope recipients', async () => {
  for (const email of ['one@example.com,two@example.com', 'Name<one@example.com>', 'one@example.com\r\nBcc:two@example.com', 'one@example.com;two@example.com']) {
    const { records, confirm, store, messages } = setup()
    records.set(key, { ...attendee, email })
    assert.equal(await confirm(store, key, context), 'unconfirmed')
    assert.equal(messages.length, 0)
    assert.equal(records.has(`_confirmation/${key}/claim`), false)
  }
})

test('unconfirmed registration write never reaches sender', async () => {
  let calls = 0
  const handle = createIntakeHandler(() => ({
    get: async () => null, list: async () => ({ blobs: [] }), delete: async () => {},
    setJSON: async key => ({ modified: key.startsWith('_capacity/') }),
  }), now, async () => { calls++; return 'accepted' })
  assert.equal((await handle(request(), context)).status, 503)
  assert.equal(calls, 0)
})

test('browser form distinguishes email acceptance, fallback and interrupted/repeated submission', async () => {
  const { readFile } = await import('node:fs/promises')
  const { runInNewContext } = await import('node:vm')
  const source = await readFile(new URL('../public/learn/intake.js', import.meta.url), 'utf8')
  for (const outcome of ['accepted', 'unconfirmed', 'interrupt']) {
    const status = { textContent: '' }, button = { disabled: false, textContent: 'Register' }
    let listener, resets = 0, calls = 0, release
    const gate = new Promise(resolve => { release = resolve })
    const form = {
      dataset: { intake: 'workshop' },
      querySelector: selector => selector === '[role="status"]' ? status : button,
      addEventListener: (_, callback) => { listener = callback },
      reset() { resets++ },
    }
    runInNewContext(source, {
      window: { location: { search: '' } }, URLSearchParams,
      AbortSignal: { timeout(milliseconds) {
        // Leave time for the 20-second SMTP deadline plus registration/outcome storage.
        assert.equal(milliseconds, 45000)
        return AbortSignal.timeout(milliseconds)
      } },
      crypto: { randomUUID: () => '12345678-1234-1234-1234-123456789abc' },
      FormData: class { *[Symbol.iterator]() { yield ['name', attendee.name]; yield ['email', attendee.email]; yield ['consent', 'yes'] } },
      document: { querySelectorAll: selector => selector === '[data-intake]' ? [form] : [], getElementById: () => null },
      fetch: async () => {
        calls++
        await gate
        if (outcome === 'interrupt') throw new Error('network interruption')
        return { ok: true, json: async () => ({ saved: true, confirmationEmail: outcome }) }
      },
    })
    const pending = listener({ preventDefault() {} })
    assert.equal(button.disabled, true)
    await listener({ preventDefault() {} })
    assert.equal(calls, 1)
    release()
    await pending
    assert.equal(button.disabled, false)
    assert.equal(button.textContent, 'Register')
    if (outcome === 'accepted') assert.match(status.textContent, /provider accepted/)
    if (outcome === 'unconfirmed') assert.match(status.textContent, /cannot confirm.*email was sent/)
    if (outcome === 'interrupt') {
      assert.match(status.textContent, /could not confirm the submission/)
      assert.equal(resets, 0)
      await listener({ preventDefault() {} })
      assert.equal(calls, 2)
    } else {
      assert.match(status.textContent, /registration is saved/)
      assert.match(status.textContent, /free-call link below/)
      assert.equal(resets, 1)
    }
  }
})

test('SMTP deadline aborts the in-flight send and retains claim without retry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let signal
  const { handle, messages, records } = setup({ send: message => {
    signal = message.signal
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
  } })
  const response = handle(request(), context)
  while (!signal) await new Promise(resolve => setImmediate(resolve))
  assert.equal(signal.aborted, false)
  t.mock.timers.tick(20000)
  assert.deepEqual(await (await response).json(), { saved: true, confirmationEmail: 'unconfirmed' })
  assert.equal(signal.aborted, true)
  assert.equal(records.get(`_confirmation/${key}/result`).status, 'uncertain')
  assert.equal((await handle(request(), context)).status, 201)
  assert.equal(messages.length, 1)
})

test('protected diagnostic verifies only once, records safe categories, and never sends', async () => {
  const { createSmtpDiagnostic } = await import('../netlify/lib/workshop-smtp-diagnostic.mjs')
  for (const [code, expected] of [[null, 'verified'], ['EAUTH', 'auth_failed'], ['EDNS', 'dns_failed'], ['ETLS', 'tls_failed'], ['ESOCKET', 'connection_failed'], ['ETIMEDOUT', 'timeout'], ['SECRET_ERROR', 'other']]) {
    const { records, store, messages } = setup()
    records.set(key, attendee)
    records.set(`_confirmation/${key}/claim`, { status: 'attempting' })
    const config = { ...env, WORKSHOP_EMAIL_ENABLED: 'false', WORKSHOP_SMTP_DIAGNOSTIC_ENABLED: 'true', WORKSHOP_SMTP_DIAGNOSTIC_TOKEN: 'a'.repeat(64), WORKSHOP_SMTP_DIAGNOSTIC_ID: 'b'.repeat(32), WORKSHOP_SMTP_DIAGNOSTIC_EMAIL: attendee.email }
    let verified = 0
    const diagnose = createSmtpDiagnostic(() => store, { env: config, createTransport: options => {
      assert.equal(options.forceAuth, true)
      assert.equal(options.requireTLS, true)
      return { verify: async () => { verified++; if (code) throw Object.assign(new Error('SECRET_PASSWORD private recipient'), { code, response: 'private provider response' }); return true }, sendMail: () => assert.fail('Diagnostic must not send mail'), close() {} }
    } })
    const handler = createIntakeHandler(() => store, now, () => assert.fail('Diagnostic must bypass confirmation sender'), diagnose)
    const probe = () => new Request('https://atlaseye.ai/learn/intake', { method: 'POST', headers: { 'x-workshop-diagnostic': 'verify-smtp', authorization: `Bearer ${config.WORKSHOP_SMTP_DIAGNOSTIC_TOKEN}` } })
    const responses = await Promise.all([handler(probe(), context), handler(probe(), context)])
    for (const response of responses) assert.deepEqual(await response.json(), { ok: true })
    assert.equal(verified, 1)
    assert.equal(messages.length, 0)
    const result = records.get(`_smtp_diagnostic/${config.WORKSHOP_SMTP_DIAGNOSTIC_ID}/result`)
    assert.equal(result.category, expected)
    assert.deepEqual(Object.keys(result).sort(), ['category', 'elapsedMs', 'recordedAt'])
    assert.doesNotMatch(JSON.stringify(result), /SECRET|private|sample@example/)
    assert.deepEqual(records.get(`_confirmation/${key}/claim`), { status: 'attempting' })
    assert.equal(records.has(`_confirmation/${key}/result`), false)
  }
})

test('diagnostics reject unauthenticated, disabled, preview, malformed and unsaved-owner requests', async () => {
  const { createSmtpDiagnostic } = await import('../netlify/lib/workshop-smtp-diagnostic.mjs')
  const config = { ...env, WORKSHOP_SMTP_DIAGNOSTIC_ENABLED: 'true', WORKSHOP_SMTP_DIAGNOSTIC_TOKEN: 'a'.repeat(64), WORKSHOP_SMTP_DIAGNOSTIC_ID: 'b'.repeat(32), WORKSHOP_SMTP_DIAGNOSTIC_EMAIL: attendee.email }
  for (const variant of ['no-token', 'wrong-token', 'disabled', 'preview', 'bad-id', 'short-token', 'no-record', 'wrong-intent', 'get']) {
    const { records, store } = setup()
    if (variant !== 'no-record') records.set(key, attendee)
    const modified = { ...config }
    if (variant === 'disabled') modified.WORKSHOP_SMTP_DIAGNOSTIC_ENABLED = 'false'
    if (variant === 'bad-id') modified.WORKSHOP_SMTP_DIAGNOSTIC_ID = '../bad'
    if (variant === 'short-token') modified.WORKSHOP_SMTP_DIAGNOSTIC_TOKEN = 'short'
    const diagnose = createSmtpDiagnostic(() => store, { env: modified, createTransport: () => assert.fail('Unauthorized SMTP verification') })
    const headers = { 'x-workshop-diagnostic': variant === 'wrong-intent' ? 'send' : 'verify-smtp', authorization: `Bearer ${variant === 'wrong-token' ? 'c'.repeat(64) : modified.WORKSHOP_SMTP_DIAGNOSTIC_TOKEN}` }
    if (variant === 'no-token') delete headers.authorization
    const response = await diagnose(new Request('https://atlaseye.ai/learn/intake', { method: variant === 'get' ? 'GET' : 'POST', headers }), variant === 'preview' ? {} : context)
    assert.equal(response.status, 404, variant)
    assert.deepEqual(await response.json(), { ok: false })
    assert.equal([...records.keys()].filter(k => k.startsWith('_smtp_diagnostic/')).length, 0)
  }
})

test('diagnostic failed claims cannot contact SMTP, and invalid config records only a safe category', async () => {
  const { createSmtpDiagnostic } = await import('../netlify/lib/workshop-smtp-diagnostic.mjs')
  for (const failClaim of [true, false]) {
    const { records, store } = setup({ fail: k => failClaim && k.startsWith('_smtp_diagnostic/') })
    records.set(key, attendee)
    const config = { ...env, SMTP_PASS: '', WORKSHOP_SMTP_DIAGNOSTIC_ENABLED: 'true', WORKSHOP_SMTP_DIAGNOSTIC_TOKEN: 'a'.repeat(64), WORKSHOP_SMTP_DIAGNOSTIC_ID: 'b'.repeat(32), WORKSHOP_SMTP_DIAGNOSTIC_EMAIL: attendee.email }
    const diagnose = createSmtpDiagnostic(() => store, { env: config, createTransport: () => assert.fail('No transport without configuration and persisted claim') })
    const response = await diagnose(new Request('https://atlaseye.ai/learn/intake', { method: 'POST', headers: { 'x-workshop-diagnostic': 'verify-smtp', authorization: `Bearer ${config.WORKSHOP_SMTP_DIAGNOSTIC_TOKEN}` } }), context)
    assert.equal(response.status, 200)
    assert.equal(records.get(`_smtp_diagnostic/${config.WORKSHOP_SMTP_DIAGNOSTIC_ID}/result`)?.category, failClaim ? undefined : 'configuration_failed')
  }
})

test('one-time owner test uses saved recipient, separate immutable claims and TEST subject without changing registration or seats', async () => {
  const { createOwnerEmailTest } = await import('../netlify/lib/workshop-smtp-diagnostic.mjs')
  for (const failSend of [false, true]) {
    const { records, store } = setup()
    const config = { ...env, WORKSHOP_EMAIL_ENABLED: 'false', WORKSHOP_OWNER_TEST_ENABLED: 'true', WORKSHOP_SMTP_DIAGNOSTIC_ENABLED: 'false', WORKSHOP_SMTP_DIAGNOSTIC_TOKEN: 'a'.repeat(64), WORKSHOP_SMTP_DIAGNOSTIC_ID: 'b'.repeat(32), WORKSHOP_SMTP_DIAGNOSTIC_EMAIL: attendee.email }
    records.set(key, attendee)
    records.set('_capacity/seat-01', { emailKey: key })
    records.set(`_confirmation/${key}/claim`, { status: 'attempting' })
    records.set(`_confirmation/${key}/result`, { status: 'uncertain' })
    records.set(`_smtp_diagnostic/${config.WORKSHOP_SMTP_DIAGNOSTIC_ID}/result`, { category: 'verified' })
    const before = [...records.entries()]
    let attempts = 0
    const testOwner = createOwnerEmailTest(() => store, { env: config, createTransport: () => ({
      sendMail: async message => {
        attempts++
        assert.equal(message.to.address, attendee.email)
        assert.match(message.subject, /^\[TEST\] /)
        assert.match(message.text, /Hi Original attendee/)
        if (failSend) throw new Error('private timeout or provider error')
        return { accepted: [attendee.email] }
      }, close() {},
    }) })
    const handler = createIntakeHandler(() => assert.fail('No ordinary registration path'), now, () => assert.fail('No ordinary mail'), () => assert.fail('No verify-only action'), testOwner)
    const requestTest = () => new Request('https://atlaseye.ai/learn/intake', { method: 'POST', headers: { 'x-workshop-diagnostic': 'send-owner-test', authorization: `Bearer ${config.WORKSHOP_SMTP_DIAGNOSTIC_TOKEN}` }, body: JSON.stringify({ email: 'attacker@example.com', name: 'Changed name', kind: 'workshop' }) })
    const responses = await Promise.all([handler(requestTest(), context), handler(requestTest(), context)])
    for (const response of responses) assert.deepEqual(await response.json(), { ok: true })
    await handler(requestTest(), context)
    assert.equal(attempts, 1)
    for (const [k, value] of before) assert.deepEqual(records.get(k), value)
    const prefix = `_confirmation_test/${config.WORKSHOP_SMTP_DIAGNOSTIC_ID}/${key}`
    assert.equal(records.get(`${prefix}/result`).status, failSend ? 'uncertain' : 'accepted')
    assert.equal(records.size, before.length + 2)
  }
})

test('owner test refuses disabled, unauthenticated, preview, unverified and missing-owner requests', async () => {
  const { createOwnerEmailTest } = await import('../netlify/lib/workshop-smtp-diagnostic.mjs')
  for (const variant of ['disabled', 'no-token', 'preview', 'unverified', 'missing-owner', 'verify-intent']) {
    const { records, store } = setup()
    const config = { ...env, WORKSHOP_OWNER_TEST_ENABLED: variant === 'disabled' ? 'false' : 'true', WORKSHOP_SMTP_DIAGNOSTIC_ENABLED: 'false', WORKSHOP_SMTP_DIAGNOSTIC_TOKEN: 'a'.repeat(64), WORKSHOP_SMTP_DIAGNOSTIC_ID: 'b'.repeat(32), WORKSHOP_SMTP_DIAGNOSTIC_EMAIL: attendee.email }
    if (variant !== 'missing-owner') records.set(key, attendee)
    records.set(`_smtp_diagnostic/${config.WORKSHOP_SMTP_DIAGNOSTIC_ID}/result`, { category: variant === 'unverified' ? 'auth_failed' : 'verified' })
    const testOwner = createOwnerEmailTest(() => store, { env: config, createTransport: () => assert.fail('Forbidden test send') })
    const response = await testOwner(new Request('https://atlaseye.ai/learn/intake', { method: 'POST', headers: { 'x-workshop-diagnostic': variant === 'verify-intent' ? 'verify-smtp' : 'send-owner-test', authorization: variant === 'no-token' ? '' : `Bearer ${config.WORKSHOP_SMTP_DIAGNOSTIC_TOKEN}` } }), variant === 'preview' ? {} : context)
    assert.equal(response.status, 404, variant)
    assert.equal([...records.keys()].some(k => k.startsWith('_confirmation_test/')), false)
  }
})
