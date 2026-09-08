import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { createStore } from '../services/supplier-intake/store.mjs'
import { createLambda } from '../services/supplier-intake/adapter.mjs'
import { createHandler } from '../services/supplier-intake/handler.mjs'

const value = { request_id: randomUUID(), email: 'test@example.com' }
const digest = async text => createHash('sha256').update(text).digest('hex')
test('store retries uncertain committed writes without creating a second record', async () => {
  let item, writes = 0
  const store = createStore({ table: 'test', digest, uuid: randomUUID, driver: {
    get: async () => ({ Item: item }),
    transact: async input => { writes++; item = input.TransactItems[0].Put.Item; throw Object.assign(Error(), { name: 'TimeoutError' }) },
  } })
  const first = await store(value), second = await store(value)
  assert.equal(first.reference, second.reference); assert.equal(writes, 1)
  assert.equal((await store({ ...value, email: 'changed@example.com' })).outcome, 'conflict')
})
test('counter rejection cannot be reported as a stored submission', async () => {
  const store = createStore({ table: 'test', digest, uuid: randomUUID, driver: {
    get: async () => ({}), transact: async () => { throw Object.assign(Error(), { CancellationReasons: [{ Code: 'None' }, { Code: 'ConditionalCheckFailed' }] }) },
  } })
  assert.deepEqual(await store(value), { outcome: 'limited' })
})
test('AWS adapter preserves API response and rejects unsupported events', async () => {
  const lambda = createLambda(createHandler({ save: async () => { throw Error('must_not_save') } }))
  assert.equal((await lambda({ version: '1.0' })).statusCode, 400)
  const preflight = await lambda({ version: '2.0', requestContext: { http: { method: 'OPTIONS' } }, headers: { origin: 'https://atlaseye.ai' } })
  assert.equal(preflight.statusCode, 204)
  assert.equal(preflight.headers['access-control-allow-origin'], 'https://atlaseye.ai')
  assert.equal((await lambda({ version: '2.0', requestContext: { http: { method: 'POST' } }, headers: { origin: 'https://atlaseye.ai', 'content-type': 'application/json' }, body: Buffer.from('{}').toString('base64'), isBase64Encoded: true })).statusCode, 400)
})
