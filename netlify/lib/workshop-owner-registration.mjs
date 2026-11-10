import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'

const digest = value => createHash('sha256').update(value).digest()
const emailPattern = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u
const workshopStart = Date.parse('2026-11-20T16:00:00-05:00')
const reply = (status, saved = false) => Response.json({ saved }, { status, headers: { 'Cache-Control': 'no-store' } })

// Disabled by default. No caller-controlled recipient, record, consent or storage key.
// Immutable email-key registration is the one-shot operation; retries cannot overwrite it.
export function createOwnerRegistration(openStore, reserve, { env = process.env, now = Date.now } = {}) {
  return async (request, context) => {
    const token = env.WORKSHOP_OWNER_REGISTRATION_TOKEN || ''
    const runId = env.WORKSHOP_OWNER_REGISTRATION_ID || ''
    const email = (env.WORKSHOP_OWNER_REGISTRATION_EMAIL || '').trim().toLowerCase()
    if (request.method !== 'POST' || request.headers.get('x-workshop-owner-registration') !== 'register-waitlist' ||
        context?.deploy?.context !== 'production' || env.WORKSHOP_OWNER_REGISTRATION_ENABLED !== 'true' ||
        !/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9]{32}$/.test(runId) ||
        email.length > 254 || !emailPattern.test(email) ||
        !timingSafeEqual(digest(request.headers.get('authorization') || ''), digest(`Bearer ${token}`))) return reply(404)
    // Reject bodies rather than silently accepting apparent overrides.
    if (request.body !== null) return reply(400)
    if (now() >= workshopStart) return reply(410)
    const messageId = env.WORKSHOP_OWNER_CONFIRMATION_GMAIL_ID || ''
    const sentAt = env.WORKSHOP_OWNER_CONFIRMATION_SENT_AT || ''
    if ((messageId || sentAt) && (!/^[a-f0-9]{16,32}$/.test(messageId) ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(sentAt) ||
        !Number.isFinite(Date.parse(sentAt)) || Date.parse(sentAt) > now())) return reply(404)
    try {
      const key = createHash('sha256').update(email).digest('hex')
      const store = openStore('workshop', context)
      const existing = await store.get(key, { type: 'json', consistency: 'strong' })
      if (existing) return reply(existing.ownerRegistration?.runId === runId ? 200 : 409, existing.ownerRegistration?.runId === runId)
      const source = await openStore('waitlist', context).get(key, { type: 'json', consistency: 'strong' })
      if (!source || source.email !== email || typeof source.name !== 'string' || !source.name.trim() ||
          source.name.length > 100 || typeof source.id !== 'string' ||
          typeof source.consentedAt !== 'string' || !Number.isFinite(Date.parse(source.consentedAt)) ||
          source.consentPurpose !== 'next free live workshop notifications') return reply(404)
      const receivedAt = new Date(now()).toISOString()
      // Only original consent is carried over. Owner authorization is a separate fact.
      const record = {
        id: randomUUID(), name: source.name, email, source: source.source, campaign: source.campaign,
        receivedAt, consentedAt: source.consentedAt, consentPurpose: source.consentPurpose,
        ownerRegistration: { runId, authorizedAt: receivedAt, workshop: '2026-11-20', sourceWaitlistKey: key, sourceWaitlistId: source.id },
        confirmationDelivery: messageId
          ? { mode: 'manual', status: 'accepted', provider: 'gmail', messageId, sentAt }
          : { mode: 'manual', status: 'pending' },
      }
      const result = await reserve(store, key, record)
      if (result.full) return reply(409)
      const saved = await store.get(key, { type: 'json', consistency: 'strong' })
      // A concurrent attendee registration is not represented as our owner action.
      if (saved?.ownerRegistration?.runId !== runId) return reply(409)
      return reply(201, true)
    } catch {
      // Never disclose credentials, recipient data, or provider errors.
      return reply(503)
    }
  }
}
