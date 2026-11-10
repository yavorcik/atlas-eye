import { createHash, timingSafeEqual } from 'node:crypto'
import nodemailer from 'nodemailer'
import { confirmationConfig } from './workshop-confirmation.mjs'

const digest = value => createHash('sha256').update(value).digest()
const categories = {
  EAUTH: 'auth_failed', ENOAUTH: 'auth_failed', EOAUTH2: 'auth_failed',
  EDNS: 'dns_failed', ETLS: 'tls_failed', EREQUIRETLS: 'tls_failed',
  ECONNECTION: 'connection_failed', ESOCKET: 'connection_failed',
  ETIMEDOUT: 'timeout', ECONFIG: 'configuration_failed',
}
const reply = status => Response.json({ ok: status === 200 }, { status, headers: { 'Cache-Control': 'no-store' } })

// Operator-only, one-shot connection/authentication probe. Never sends a message.
// No request body, address, SMTP option or storage key is accepted from the caller.
export function createSmtpDiagnostic(openStore, { env = process.env, createTransport = nodemailer.createTransport } = {}) {
  return async (request, context) => {
    const token = env.WORKSHOP_SMTP_DIAGNOSTIC_TOKEN || ''
    const runId = env.WORKSHOP_SMTP_DIAGNOSTIC_ID || ''
    if (request.method !== 'POST' || request.headers.get('x-workshop-diagnostic') !== 'verify-smtp' ||
        context?.deploy?.context !== 'production' || env.WORKSHOP_SMTP_DIAGNOSTIC_ENABLED !== 'true' ||
        !/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9]{32}$/.test(runId) ||
        !timingSafeEqual(digest(request.headers.get('authorization') || ''), digest(`Bearer ${token}`))) return reply(404)

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
