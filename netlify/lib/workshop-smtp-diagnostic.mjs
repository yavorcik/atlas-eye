import { createHash, timingSafeEqual } from 'node:crypto'
import nodemailer from 'nodemailer'
import { confirmationConfig, createWorkshopConfirmation } from './workshop-confirmation.mjs'

const digest = value => createHash('sha256').update(value).digest()
const categories = {
  EAUTH: 'auth_failed', ENOAUTH: 'auth_failed', EOAUTH2: 'auth_failed',
  EDNS: 'dns_failed', ETLS: 'tls_failed', EREQUIRETLS: 'tls_failed',
  ECONNECTION: 'connection_failed', ESOCKET: 'connection_failed',
  ETIMEDOUT: 'timeout', ECONFIG: 'configuration_failed',
}
const reply = status => Response.json({ ok: status === 200 }, { status, headers: { 'Cache-Control': 'no-store' } })

function authorized(request, context, env, intent) {
  const token = env.WORKSHOP_SMTP_DIAGNOSTIC_TOKEN || ''
  const runId = env.WORKSHOP_SMTP_DIAGNOSTIC_ID || ''
  return request.method === 'POST' && request.headers.get('x-workshop-diagnostic') === intent &&
    context?.deploy?.context === 'production' &&
    (intent === 'send-owner-test' ? env.WORKSHOP_OWNER_TEST_ENABLED : env.WORKSHOP_SMTP_DIAGNOSTIC_ENABLED) === 'true' &&
    /^[a-f0-9]{64}$/.test(token) && /^[a-f0-9]{32}$/.test(runId) &&
    timingSafeEqual(digest(request.headers.get('authorization') || ''), digest(`Bearer ${token}`))
}

// Operator-only, one-shot connection/authentication probe. Never sends a message.
// No request body, address, SMTP option or storage key is accepted from the caller.
export function createSmtpDiagnostic(openStore, { env = process.env, createTransport = nodemailer.createTransport } = {}) {
  return async (request, context) => {
    if (!authorized(request, context, env, 'verify-smtp')) return reply(404)
    const runId = env.WORKSHOP_SMTP_DIAGNOSTIC_ID

    let transport, timer
    try {
      const email = (env.WORKSHOP_SMTP_DIAGNOSTIC_EMAIL || '').trim().toLowerCase()
      if (!email) return reply(404)
      const store = openStore('workshop', context)
      const registration = await store.get(createHash('sha256').update(email).digest('hex'), { type: 'json', consistency: 'strong' })
      if (!registration || registration.email !== email) return reply(404)
      const prefix = `_smtp_diagnostic/${runId}`
      const claim = await store.setJSON(`${prefix}/claim`, { claimedAt: new Date().toISOString() }, { onlyIfNew: true })
      if (!claim.modified) return reply(200)
      const started = Date.now()
      let category = 'configuration_failed'
      // Diagnostics can run with email sending disabled, but still require valid SMTP config.
      const config = confirmationConfig({ ...env, WORKSHOP_EMAIL_ENABLED: 'true' }, context)
      if (config) {
        try {
          transport = createTransport({ ...config.transport, forceAuth: true })
          await Promise.race([transport.verify(), new Promise((_, reject) => {
            timer = setTimeout(() => reject({ code: 'ETIMEDOUT' }), 20000)
          })])
          category = 'verified'
        } catch (error) {
          category = Object.hasOwn(categories, error?.code) ? categories[error.code] : 'other'
        }
      }
      await store.setJSON(`${prefix}/result`, { category, elapsedMs: Date.now() - started, recordedAt: new Date().toISOString() }, { onlyIfNew: true })
      return reply(200)
    } catch {
      return reply(200)
    } finally {
      clearTimeout(timer)
      try { transport?.close() } catch { /* Never expose provider details. */ }
    }
  }
}

// Separate explicit action: never reached by the verification-only intent.
export function createOwnerEmailTest(openStore, { env = process.env, createTransport = nodemailer.createTransport } = {}) {
  return async (request, context) => {
    if (!authorized(request, context, env, 'send-owner-test')) return reply(404)
    try {
      const store = openStore('workshop', context)
      const runId = env.WORKSHOP_SMTP_DIAGNOSTIC_ID
      const verification = await store.get(`_smtp_diagnostic/${runId}/result`, { type: 'json', consistency: 'strong' })
      if (verification?.category !== 'verified') return reply(404)
      const email = (env.WORKSHOP_SMTP_DIAGNOSTIC_EMAIL || '').trim().toLowerCase()
      if (!email) return reply(404)
      const key = createHash('sha256').update(email).digest('hex')
      const registration = await store.get(key, { type: 'json', consistency: 'strong' })
      if (!registration || registration.email !== email) return reply(404)
      const sendTest = createWorkshopConfirmation({ env: { ...env, WORKSHOP_EMAIL_ENABLED: 'true' }, createTransport, testRunId: runId })
      await sendTest(store, key, context)
      return reply(200)
    } catch {
      return reply(200)
    }
  }
}
