import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb'
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { createHash, randomUUID } from 'node:crypto'
import { createHandler } from './handler.mjs'
import { createStore } from './store.mjs'
import { createLambda } from './adapter.mjs'
import { createOwnerPoster } from './owner-events.mjs'

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
const secrets = new SecretsManagerClient({ maxAttempts: 3 })
const post = createOwnerPoster({ endpoint: process.env.OWNER_ACTIVITY_URL, secretProvider: async () => (await secrets.send(new GetSecretValueCommand({ SecretId: process.env.OWNER_ACTIVITY_SECRET_ARN }))).SecretString })
const reportFailure = ({ requestId, occurredAt }) => post({ event_id: `supplier-processing-failure:${requestId}:${occurredAt}`, site: 'atlas-supplier-intake', event_type: 'processing_failure', occurred_at: occurredAt, reference: requestId, next_action: 'Inspect the supplier intake Lambda logs; the submission was not reported as accepted.' })
export const handler = createLambda(createHandler({ save, previewOrigin: process.env.SUPPLIER_PREVIEW_ORIGIN || '', reportFailure }))
