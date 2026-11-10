import nodemailer from 'nodemailer'

const mailbox = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i

export function confirmationConfig(env, context) {
  if (context?.deploy?.context !== 'production' || env.WORKSHOP_EMAIL_ENABLED !== 'true') return null
  const port = Number(env.SMTP_PORT)
  if (!env.SMTP_HOST || !/^[a-z0-9.-]+$/i.test(env.SMTP_HOST) ||
      !Number.isInteger(port) || port < 1 || port > 65535 ||
      !['true', 'false'].includes(env.SMTP_SECURE) ||
      !env.SMTP_USER || !env.SMTP_PASS || !mailbox.test(env.MAIL_FROM || '')) return null
  let meet
  try { meet = new URL(env.WORKSHOP_MEET_URL) } catch { return null }
  if (meet.protocol !== 'https:' || meet.hostname !== 'meet.google.com' || meet.port ||
      meet.username || meet.password || meet.search || meet.hash ||
      !/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(meet.pathname)) return null
  return {
    transport: {
      host: env.SMTP_HOST, port, secure: env.SMTP_SECURE === 'true',
      requireTLS: true, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000,
      logger: false, debug: false,
    },
    from: env.MAIL_FROM, meetUrl: meet.href,
  }
}

// No queue or automatic retry: SMTP can accept a message before a timeout.
// An immutable claim survives crashes, and a separate immutable outcome is private.
export function createWorkshopConfirmation({ env = process.env, createTransport = nodemailer.createTransport, testRunId } = {}) {
  return async function confirm(store, key, context) {
    let transport
    let deadline
    try {
      if (testRunId !== undefined && !/^[a-f0-9]{32}$/.test(testRunId)) return 'unconfirmed'
      const prefix = testRunId ? `_confirmation_test/${testRunId}/${key}` : `_confirmation/${key}`
      const resultKey = `${prefix}/result`
      const previous = await store.get(resultKey, { type: 'json', consistency: 'strong' })
      if (previous) return previous.status === 'accepted' ? 'accepted' : 'unconfirmed'
      const config = confirmationConfig(env, context)
      if (!config) return 'unconfirmed'
      const registration = await store.get(key, { type: 'json', consistency: 'strong' })
      if (!registration || !mailbox.test(registration.email || '') || typeof registration.name !== 'string') return 'unconfirmed'
      const claim = await store.setJSON(`${prefix}/claim`, {
        status: 'attempting', claimedAt: new Date().toISOString(), registrationId: registration.id,
      }, { onlyIfNew: true })
      if (!claim.modified) return 'unconfirmed'

      let status = 'uncertain'
      try {
        transport = createTransport(config.transport)
        const controller = new AbortController()
        const result = await Promise.race([transport.sendMail({
          from: { name: 'Atlas Learning', address: config.from },
          to: { address: registration.email },
          subject: `${testRunId ? '[TEST] ' : ''}Your Atlas Learning workshop registration: November 20`,
          text: `Hi ${registration.name.replace(/[\r\n]/g, ' ')},\n\nYour registration is saved for the free Atlas Learning live workshop.\n\nFriday, November 20, 2026\n4:00–4:45 p.m. Eastern (21:00–21:45 UTC)\n\nJoin on Google Meet: ${config.meetUrl}\n\nKeep this email for the joining link. If you need help, visit https://atlaseye.ai/learn/#book.\n\nAtlas Learning`,
          disableFileAccess: true, disableUrlAccess: true, signal: controller.signal,
        }), new Promise((_, reject) => {
          deadline = setTimeout(() => {
            controller.abort()
            reject(new Error('SMTP deadline exceeded'))
          }, 20000)
        })])
        status = result.accepted?.some((address) => address.toLowerCase() === registration.email.toLowerCase()) ? 'accepted' : 'not_accepted'
      } catch {
        // Provider errors can include credentials and personal data. Never expose/log them.
      }
      await store.setJSON(resultKey, { status, recordedAt: new Date().toISOString() }, { onlyIfNew: true })
      return status === 'accepted' ? 'accepted' : 'unconfirmed'
    } catch {
      // A saved registration remains saved, even if the claim/outcome store fails.
      return 'unconfirmed'
    } finally {
      clearTimeout(deadline)
      try { transport?.close() } catch { /* no provider logging */ }
    }
  }
}
