// Operator-only transaction builder. This module is never bundled into Lambda.
export function buildReview({ item, decision, notes, checks = {}, reviewer, eventId, timestamp, table }) {
  const statuses = ['pending', 'needs_information', 'approved', 'rejected']
  if (!item || item.record_type?.S !== 'submission' || !statuses.includes(item.status?.S)) throw Error('invalid_submission')
  if (!['needs_information', 'approved', 'rejected'].includes(decision)) throw Error('invalid_decision')
  if (item.status.S === decision) throw Error('unchanged_decision')
  if (!notes?.trim() || notes.length > 2000 || !reviewer?.startsWith('arn:aws:')) throw Error('review_identity_and_notes_required')
  if (!/^[0-9a-f-]{36}$/.test(eventId) || !Number.isFinite(Date.parse(timestamp))) throw Error('invalid_event')
  const payload = JSON.parse(item.payload.S)
  if (decision === 'approved') {
    if (/synthetic|do not publish/i.test(JSON.stringify(payload))) throw Error('synthetic_record_cannot_be_approved')
    if (!['authority', 'facility', 'role', 'product_evidence'].every(key => checks[key] === true)) throw Error('approval_checks_required')
  }
  const values = {
    ':old': { S: item.status.S }, ':new': { S: decision }, ':hash': item.payload_hash,
    ':event': { S: eventId }, ':at': { S: timestamp },
  }
  let condition = '#status = :old AND payload_hash = :hash AND attribute_not_exists(last_review)'
  if (item.last_review) {
    values[':previous'] = item.last_review
    condition = '#status = :old AND payload_hash = :hash AND last_review = :previous'
  }
  return { TransactItems: [
    { Put: { TableName: table, ConditionExpression: 'attribute_not_exists(pk)', Item: {
      pk: { S: `REVIEW#${item.reference.S}#${eventId}` }, record_type: { S: 'review' },
      reference: item.reference, submission_key: item.pk, reviewer: { S: reviewer },
      action: { S: decision }, previous_status: item.status, created_at: { S: timestamp },
      notes: { S: notes.trim() }, checks: { S: JSON.stringify(checks) }, payload_hash: item.payload_hash,
    } } },
    { Update: { TableName: table, Key: { pk: item.pk }, ConditionExpression: condition,
      UpdateExpression: 'SET #status = :new, last_review = :event, reviewed_at = :at',
      ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: values,
    } },
  ] }
}
