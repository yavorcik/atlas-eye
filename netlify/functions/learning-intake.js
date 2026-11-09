import { createHash, randomUUID } from 'node:crypto'
import { getDeployStore, getStore } from '@netlify/blobs'

const consultationUrl = 'https://calendar.app.google/T6uKgFsHYE6okXn28'
const workshopStart = Date.parse('2026-11-19T16:00:00-05:00')
const maxBytes = 8192
const validVolume = ['none', '1–10', '11–50', '51+']
const validGoal = ['missed', 'slow', 'qualification', 'other']
const validSource = ['direct', 'referral', 'linkedin', 'email', 'event', 'other']

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

export function createIntakeHandler(openStore, now = Date.now) {
  return async function handleIntake(request, context) {
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
    if (!['workshop', 'inquiry'].includes(kind) || !name || name.length > 100 ||
        email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u.test(email) ||
        input.consent !== true) {
      return reply({ error: 'Enter your name and a valid email, and confirm the contact permission.' }, 400)
    }

    if (kind === 'workshop' && now() >= workshopStart) {
      return reply({ error: 'Registration for this workshop has closed.' }, 410)
    }

    const record = {
      id: randomUUID(),
      name,
      email,
      source,
      campaign: /^[a-z0-9_.-]{1,80}$/i.test(campaign) ? campaign : '',
      receivedAt: new Date().toISOString(),
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
      const lead = { business, volume, goal, details }
      const review = reviewLead(lead)
      Object.assign(record, lead, review, {
        reviewState: 'pending',
        draftType: review.status === 'owner_review' ? 'internal note' : 'customer reply',
      })
      key += '-' + requestId
    }

    try {
      const store = openStore(kind, context)
      const write = await store.setJSON(key, record, { onlyIfNew: true })
      if (!write.modified && !(await store.get(key, { type: 'json', consistency: 'strong' }))) {
        return reply({ error: 'We could not save your submission. Please try again.' }, 503)
      }
    } catch {
      return reply({ error: 'We could not save your submission. Please try again.' }, 503)
    }
    return reply({ saved: true }, 201)
  }
}

export default createIntakeHandler((kind, context) => {
  const name = kind === 'workshop' ? 'learning-workshop-signups' : 'learning-inquiry-review'
  return context?.deploy?.context === 'production' ? getStore(name) : getDeployStore(name)
})

export const config = {
  path: '/learn/intake',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
