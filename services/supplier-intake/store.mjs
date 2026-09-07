// The driver uses native DynamoDB AttributeValue objects. No public table access exists.
export function createStore({ driver, table, digest, uuid, now = Date.now }) {
  if (!table) throw Error('missing_table')
  return async value => {
    const time = now(), window = Math.floor(time / 3600000)
    const key = { pk: { S: `SUBMISSION#${await digest(value.request_id)}` } }
    const payload = JSON.stringify(value), hash = await digest(payload)
    const existing = async () => (await driver.get({ TableName: table, Key: key, ConsistentRead: true })).Item
    const outcome = item => item.payload_hash.S === hash ? { outcome: 'duplicate', reference: item.reference.S } : { outcome: 'conflict' }
    let item = await existing()
    if (item) return outcome(item)
    const reference = uuid()
    const counter = (pk, limit) => ({ Update: {
      TableName: table, Key: { pk: { S: pk } },
      UpdateExpression: 'SET expires_at = :ttl ADD #count :one',
      ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
      ExpressionAttributeNames: { '#count': 'count' },
      ExpressionAttributeValues: { ':ttl': { N: String((window + 48) * 3600) }, ':one': { N: '1' }, ':limit': { N: String(limit) } },
    } })
    const transaction = { TransactItems: [
      { Put: { TableName: table, ConditionExpression: 'attribute_not_exists(pk)', Item: {
        ...key, reference: { S: reference }, payload_hash: { S: hash }, payload: { S: payload },
        status: { S: 'pending' }, created_at: { S: new Date(time).toISOString() }, record_type: { S: 'submission' },
      } } },
      counter(`RATE#EMAIL#${await digest(value.email)}#${window}`, 5),
      counter(`RATE#GLOBAL#${window}`, 100),
    ] }
    for (let attempt = 0; attempt < 3; attempt++) {
      try { await driver.transact(transaction); return { outcome: 'created', reference } }
      catch (error) {
        // A network timeout may follow a committed transaction: re-read before retrying.
        item = await existing()
        if (item) return outcome(item)
        const reasons = error.CancellationReasons || []
        if (reasons.slice(1).some(reason => reason.Code === 'ConditionalCheckFailed')) return { outcome: 'limited' }
        if (!['TransactionCanceledException', 'TransactionConflictException', 'TimeoutError'].includes(error.name) || attempt === 2) throw error
        await new Promise(resolve => setTimeout(resolve, 30 * (attempt + 1)))
      }
    }
    throw Error('storage_unavailable')
  }
}
