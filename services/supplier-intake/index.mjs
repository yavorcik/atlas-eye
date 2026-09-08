import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb'
import { createHash, randomUUID } from 'node:crypto'
import { createHandler } from './handler.mjs'
import { createStore } from './store.mjs'
import { createLambda } from './adapter.mjs'

const db = new DynamoDBClient({ maxAttempts: 3 })
const save = createStore({
  table: process.env.SUPPLIER_TABLE,
  digest: async value => createHash('sha256').update(value).digest('hex'),
  uuid: randomUUID,
  driver: {
    get: input => db.send(new GetItemCommand(input)),
    transact: input => db.send(new TransactWriteItemsCommand(input)),
  },
})
export const handler = createLambda(createHandler({ save, previewOrigin: process.env.SUPPLIER_PREVIEW_ORIGIN || '' }))
