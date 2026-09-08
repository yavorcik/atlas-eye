// Integration check against the official DynamoDB Local service only.
import { env } from 'node:process'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { createStore } from '../services/supplier-intake/store.mjs'
if (!env.DYNAMO_SDK_MODULE || !/^http:\/\/127\.0\.0\.1:\d+$/.test(env.DYNAMO_LOCAL_ENDPOINT || '')) throw Error('Provide DYNAMO_SDK_MODULE and a loopback-only DYNAMO_LOCAL_ENDPOINT')
const { DynamoDBClient, CreateTableCommand, GetItemCommand, ScanCommand, TransactWriteItemsCommand, DeleteTableCommand } = await import(env.DYNAMO_SDK_MODULE)
const db = new DynamoDBClient({ endpoint: env.DYNAMO_LOCAL_ENDPOINT, region: 'us-east-2', credentials: { accessKeyId: 'local', secretAccessKey: 'local' } })
const table = `supplier-test-${randomUUID()}`
await db.send(new CreateTableCommand({ TableName: table, BillingMode: 'PAY_PER_REQUEST', AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }], KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }] }))
try {
  const store = createStore({ table, digest: async text => createHash('sha256').update(text).digest('hex'), uuid: randomUUID, now: () => 1800000000000,
    driver: { get: input => db.send(new GetItemCommand(input)), transact: input => db.send(new TransactWriteItemsCommand(input)) } })
  const original = { request_id: randomUUID(), email: 'test@example.com', company: 'SYNTHETIC TEST — DO NOT PUBLISH' }
  const parallel = await Promise.all([store(original), store(original)])
  assert.equal(parallel[0].reference, parallel[1].reference)
  assert.equal((await store({ ...original, company: 'Different payload' })).outcome, 'conflict')
  for (let i = 0; i < 4; i++) assert.equal((await store({ ...original, request_id: randomUUID() })).outcome, 'created')
  assert.equal((await store({ ...original, request_id: randomUUID() })).outcome, 'limited')
  for (let i = 0; i < 95; i++) assert.equal((await store({ ...original, request_id: randomUUID(), email: `test-${i}@example.com` })).outcome, 'created')
  assert.equal((await store({ ...original, request_id: randomUUID(), email: 'last@example.com' })).outcome, 'limited')
  const { Items } = await db.send(new ScanCommand({ TableName: table }))
  const records = Items.filter(item => item.record_type?.S === 'submission')
  assert.equal(records.length, 100)
  assert.ok(records.every(item => item.status.S === 'pending' && !item.expires_at))
  console.log('PASS: actual DynamoDB transactions, concurrent duplicate receipt, payload conflict, both rate limits, exactly 100 private pending records.')
} finally { await db.send(new DeleteTableCommand({ TableName: table })); db.destroy() }
