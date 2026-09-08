import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReview } from '../services/supplier-intake/review.mjs'
const record = () => ({ pk: { S: 'SUBMISSION#abc' }, record_type: { S: 'submission' }, status: { S: 'pending' }, reference: { S: 'receipt' }, payload_hash: { S: 'hash' }, payload: { S: JSON.stringify({ company: 'Example manufacturer' }) } })
const input = () => ({ item: record(), decision: 'approved', notes: 'Evidence references reviewed', checks: { authority: true, facility: true, role: true, product_evidence: true }, reviewer: 'arn:aws:iam::428521271682:user/test', eventId: '066aa74a-8aeb-47b3-ab81-f7ee1b8d8cbc', timestamp: '2026-09-08T12:00:00Z', table: 'test' })
test('approval requires all attestations and refuses synthetic records', () => {
  const a = input(); a.checks.authority = false
  assert.throws(() => buildReview(a), /approval_checks_required/)
  a.checks.authority = true; a.item.payload.S = JSON.stringify({ company: 'SYNTHETIC BROWSER TEST — DO NOT PUBLISH' })
  assert.throws(() => buildReview(a), /synthetic_record/)
})
test('review keeps source payload immutable and guards concurrent decisions and history', () => {
  const a = input(), original = structuredClone(a.item), tx = buildReview(a)
  assert.deepEqual(a.item, original)
  assert.equal(tx.TransactItems[0].Put.ConditionExpression, 'attribute_not_exists(pk)')
  assert.match(tx.TransactItems[1].Update.ConditionExpression, /payload_hash = :hash.*attribute_not_exists\(last_review\)/)
  assert.doesNotMatch(tx.TransactItems[1].Update.UpdateExpression, /payload/)
  a.item.last_review = { S: 'previous-event' }
  const next = buildReview(a).TransactItems[1].Update
  assert.match(next.ConditionExpression, /last_review = :previous/)
  assert.equal(next.ExpressionAttributeValues[':previous'].S, 'previous-event')
})
test('review cannot write unsupported publication state or omit reasons', () => {
  assert.throws(() => buildReview({ ...input(), decision: 'published' }), /invalid_decision/)
  assert.throws(() => buildReview({ ...input(), notes: '' }), /notes_required/)
})
