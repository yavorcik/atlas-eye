export function createOwnerPoster({ endpoint, secretProvider, fetchImpl = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/owner-activity$/.test(endpoint || '')) throw Error('invalid_owner_activity_endpoint')
  let secret
  return async body => {
    secret ||= await secretProvider()
    if (!secret) throw Error('missing_owner_activity_secret')
    let lastStatus = 0
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetchImpl(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'x-owner-activity-secret': secret }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) })
        lastStatus = response.status
        if (response.ok) return
        if (response.status < 500 && response.status !== 429) break
      } catch { lastStatus = 0 }
      if (attempt < 2) await wait(150 * (2 ** attempt))
    }
    const error = Error('owner_notification_delivery_failed')
    error.statusCode = lastStatus
    throw error
  }
}

export function ownerEventFromStream(record) {
  if (record?.eventName !== 'INSERT') return null
  const item = record.dynamodb?.NewImage
  if (item?.record_type?.S === 'submission') return {
    event_id: `supplier-submission:${item.reference.S}`, site: 'atlas-supplier-intake', event_type: 'supplier_submission',
    occurred_at: item.created_at.S, reference: item.reference.S,
    next_action: 'Review the private supplier record; no publication or approval occurs automatically.',
  }
  if (item?.record_type?.S === 'review') return {
    event_id: `supplier-review:${item.reference.S}:${item.pk.S.split('#').at(-1)}`, site: 'atlas-supplier-intake', event_type: 'supplier_review',
    occurred_at: item.created_at.S, reference: item.reference.S,
    next_action: `Status changed to ${item.action.S}; read the private review event for rationale.`,
  }
  return null
}
