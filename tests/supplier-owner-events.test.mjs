import test from 'node:test'
import assert from 'node:assert/strict'
import { createOwnerPoster, ownerEventFromStream } from '../services/supplier-intake/owner-events.mjs'

const av = (type, reference, extra = {}) => ({ eventName: 'INSERT', dynamodb: { NewImage: { record_type: { S: type }, reference: { S: reference }, created_at: { S: '2026-09-09T12:00:00.000Z' }, ...extra } } })
test('stream events expose identifiers and status but never supplier payload or private notes', () => {
  const submission = ownerEventFromStream(av('submission', 'ref-1', { payload: { S: 'private' }, payload_hash: { S: 'hash' } }))
  assert.equal(submission.event_type, 'supplier_submission')
  assert.doesNotMatch(JSON.stringify(submission), /payload|private rationale/)
  const review = ownerEventFromStream(av('review', 'ref-1', { pk: { S: 'REVIEW#ref-1#event-1' }, action: { S: 'needs_information' }, notes: { S: 'private rationale' } }))
  assert.match(review.next_action, /needs_information/)
  assert.doesNotMatch(JSON.stringify(review), /private rationale/)
})

test('delivery retries reuse the same body and fail visibly', async () => {
  const calls = []
  const post = createOwnerPoster({ endpoint: 'https://example.supabase.co/functions/v1/owner-activity', secretProvider: async () => 'secret', wait: async () => {}, fetchImpl: async (_url, options) => { calls.push(options.body); return new Response('{}', { status: 503 }) } })
  await assert.rejects(() => post({ event_id: 'supplier-submission:ref-1' }), /owner_notification_delivery_failed/)
  assert.equal(calls.length, 3)
  assert.equal(new Set(calls).size, 1)
})
