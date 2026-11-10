import { createHash, randomUUID } from 'node:crypto'
import { getDeployStore, getStore } from '@netlify/blobs'
import { createWorkshopConfirmation } from '../lib/workshop-confirmation.mjs'
import { createSmtpDiagnostic, createOwnerEmailTest } from '../lib/workshop-smtp-diagnostic.mjs'

const consultationUrl = 'https://calendar.app.google/T6uKgFsHYE6okXn28'
const workshopStart = Date.parse('2026-11-20T16:00:00-05:00')
const workshopCapacity = 25
const maxBytes = 8192
const validVolume = ['none', '1–10', '11–50', '51+']
const validContext = ['work', 'life', 'both']
const validBuildPreference = ['for-me', 'with-me', 'not-sure']
const validGoal = ['missed', 'slow', 'qualification', 'other']
const validSource = ['direct', 'referral', 'linkedin', 'tiktok', 'email', 'event', 'other']

const goalLabels = {
  missed: 'new inquiries getting missed',
  slow: 'slow first replies',
  qualification: 'time spent qualifying requests',
  other: 'your current inquiry workflow',
}

function reply(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function field(input, name, limit) {
  const value = input[name]
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, limit + 1)
}

function reviewGeneralInquiry({ context, buildPreference }) {
  const contextLabels = { work: 'work', life: 'everyday life', both: 'work and everyday life' }
  const buildLabels = {
    'for-me': 'having an agent built for them',
    'with-me': 'building an agent together with guidance',
    'not-sure': 'discussing which build approach fits',
  }
  // Only fixed labels enter the private draft. Submitted text is untrusted data,
  // not instructions or evidence of feasibility, qualification, or a commitment.
  return {
    status: 'owner_review',
    draft: `This person is asking about a recurring task in ${contextLabels[context]} and prefers ${buildLabels[buildPreference]}. Review their task and any details, then discuss scope, access, feasibility, and appropriate human review before proposing a build. Fit and next steps have not been confirmed.`,
  }
}

function reviewLead({ volume, goal, business, details }) {
  if (!business || !volume || !goal) {
    return {
      status: 'needs_details',
      draft: 'Thanks for reaching out. What kind of service business do you run, and where do new customer inquiries usually get stuck?',
    }
  }

  if (volume === 'none') {
    return {
      status: 'owner_review',
      draft: 'This business reports no current inquiry volume. Discuss how it plans to generate demand before proposing an inbox setup.',
    }
  }

  if (goal === 'other' && !details) {
    return {
      status: 'needs_details',
      draft: 'Thanks for reaching out. Can you give us one example of what happens between a new customer inquiry and a booked call?',
    }
  }

  return {
    status: 'qualified',
    draft: `Thanks for reaching out. We can start by looking at ${goalLabels[goal]}. If you’d like to walk through one example together, you can pick a free introductory call here: ${consultationUrl}`,
  }
}

async function reserveWorkshopRegistration(store, emailKey, record) {
  if (await store.get(emailKey, { type: 'json', consistency: 'strong' })) return { saved: true }

  const { blobs } = await store.list()
  const legacyKeys = blobs.map((blob) => blob.key).filter((key) => /^[a-f0-9]{64}$/i.test(key))
  if (legacyKeys.length >= workshopCapacity) return { full: true }

  // Convert registrations already stored under their email hashes into occupied seats.
  for (let index = 0; index < Math.min(legacyKeys.length, workshopCapacity); index += 1) {
    await store.setJSON(`_capacity/seat-${String(index + 1).padStart(2, '0')}`, { legacy: true }, { onlyIfNew: true })
  }

  for (let index = 1; index <= workshopCapacity; index += 1) {
    const seatKey = `_capacity/seat-${String(index).padStart(2, '0')}`
    const seat = await store.setJSON(seatKey, { emailKey, claimedAt: record.receivedAt }, { onlyIfNew: true })
    if (!seat.modified) continue

    try {
      const saved = await store.setJSON(emailKey, record, { onlyIfNew: true })
      if (!saved.modified) {
        if (!(await store.get(emailKey, { type: 'json', consistency: 'strong' }))) {
          throw new Error('Registration write was not confirmed')
        }
        await store.delete(seatKey).catch(() => {})
        return { saved: true }
      }
      return { saved: true }
    } catch (error) {
      await store.delete(seatKey).catch(() => {})
      throw error
    }
  }

  if (await store.get(emailKey, { type: 'json', consistency: 'strong' })) return { saved: true }
  return { full: true }
}

export function createIntakeHandler(openStore, now = Date.now, confirmWorkshop = createWorkshopConfirmation(), diagnose = createSmtpDiagnostic(openStore), testOwnerEmail = createOwnerEmailTest(openStore)) {
  return async function handleIntake(request, context) {
    if (request.headers.get('x-workshop-diagnostic') === 'send-owner-test') return testOwnerEmail(request, context)
    if (request.headers.has('x-workshop-diagnostic')) return diagnose(request, context)
    if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405)
    if (request.headers.get('origin') !== new URL(request.url).origin) {
      return reply({ error: 'Open the form on the Atlas Learning website.' }, 403)
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return reply({ error: 'Unsupported form format.' }, 415)
    }
    const reader = request.body?.getReader()
    if (!reader) return reply({ error: 'Please complete the form.' }, 400)

    let size = 0
    let raw = ''
    const decoder = new TextDecoder()
    let input
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > maxBytes) {
          await reader.cancel()
          return reply({ error: 'This submission is too large.' }, 413)
        }
        raw += decoder.decode(value, { stream: true })
      }
      input = JSON.parse(raw + decoder.decode())
    } catch {
      return reply({ error: 'Please complete the form and try again.' }, 400)
    }
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.website) {
      return reply({ error: 'Please complete the form and try again.' }, 400)
    }

    const { kind } = input
    const email = field(input, 'email', 254).toLowerCase()
    const name = field(input, 'name', 100)
    const source = validSource.includes(input.source) ? input.source : 'other'
    const campaign = field(input, 'campaign', 80)
    if (!['workshop', 'waitlist', 'inquiry'].includes(kind) || !name || name.length > 100 ||
        email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u.test(email) ||
        input.consent !== true) {
      return reply({ error: 'Enter your name and a valid email, and confirm the contact permission.' }, 400)
    }

    if (kind === 'workshop' && now() >= workshopStart) {
      return reply({ error: 'Registration for this workshop has closed.' }, 410)
    }

    const receivedAt = new Date().toISOString()
    const consentPurpose = kind === 'waitlist' ? 'next free live workshop notifications' : kind === 'workshop' ? 'November 20 workshop updates' : 'inquiry follow-up'
    const record = {
      id: randomUUID(),
      name,
      email,
      source,
      campaign: /^[a-z0-9_.-]{1,80}$/i.test(campaign) ? campaign : '',
      receivedAt,
      consentedAt: receivedAt,
      consentPurpose,
    }
    let key = createHash('sha256').update(email).digest('hex')

    if (kind === 'inquiry') {
      const business = field(input, 'business', 150)
      const volume = field(input, 'volume', 12)
      const goal = field(input, 'goal', 20)
      const details = field(input, 'details', 1200)
      const requestId = field(input, 'requestId', 36)
      if (business.length > 150 || details.length > 1200 ||
          (volume && !validVolume.includes(volume)) || (goal && !validGoal.includes(goal)) ||
          !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(requestId)) {
        return reply({ error: 'Check the inquiry fields and try again.' }, 400)
      }
      // Older clients omit all three new fields. Presence, even if blank or
      // invalid, selects the new schema so malformed forms cannot fall back.
      const generalInquiry = ['context', 'buildPreference', 'task'].some((name) => Object.hasOwn(input, name))
      const inquiryContext = field(input, 'context', 20)
      const buildPreference = field(input, 'buildPreference', 20)
      const task = field(input, 'task', 1200)
      if (generalInquiry && (
        !validContext.includes(input.context) || !validBuildPreference.includes(input.buildPreference) ||
        !task || task.length > 1200 ||
        (Object.hasOwn(input, 'details') && typeof input.details !== 'string')
      )) {
        return reply({ error: 'Choose a context and build preference, and describe your task in 1–1200 characters.' }, 400)
      }
      const lead = generalInquiry
        ? { context: inquiryContext, buildPreference, task, details, business, volume, goal }
        : { business, volume, goal, details }
      const review = generalInquiry ? reviewGeneralInquiry(lead) : reviewLead(lead)
      Object.assign(record, lead, review, {
        reviewState: 'pending',
        draftType: review.status === 'owner_review' ? 'internal note' : 'customer reply',
      })
      key += '-' + requestId
    }

    let confirmationEmail
    try {
      const store = openStore(kind, context)
      if (kind === 'workshop') {
        const registration = await reserveWorkshopRegistration(store, key, record)
        if (registration.full) {
          return reply({ error: 'This workshop has reached its 25-person limit. Join the next-session list below.' }, 409)
        }
        // The sender rereads the saved record; retry input never changes the recipient/name.
        confirmationEmail = await confirmWorkshop(store, key, context).catch(() => 'unconfirmed')
      } else {
        const write = await store.setJSON(key, record, { onlyIfNew: true })
        if (!write.modified && !(await store.get(key, { type: 'json', consistency: 'strong' }))) {
          return reply({ error: 'We could not save your submission. Please try again.' }, 503)
        }
      }
    } catch {
      return reply({ error: 'We could not save your submission. Please try again.' }, 503)
    }
    return reply({ saved: true, ...(kind === 'workshop' ? { confirmationEmail } : {}) }, 201)
  }
}

export default createIntakeHandler((kind, context) => {
  const name = kind === 'workshop'
    ? 'learning-workshop-signups'
    : kind === 'waitlist'
      ? 'learning-workshop-waitlist'
      : 'learning-inquiry-review'
  return context?.deploy?.context === 'production' ? getStore(name) : getDeployStore(name)
})

export const config = {
  path: '/learn/intake',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
