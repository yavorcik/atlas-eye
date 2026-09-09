import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { createOwnerPoster, ownerEventFromStream } from './owner-events.mjs'

const secrets = new SecretsManagerClient({ maxAttempts: 3 })
const post = createOwnerPoster({
  endpoint: process.env.OWNER_ACTIVITY_URL,
  secretProvider: async () => (await secrets.send(new GetSecretValueCommand({ SecretId: process.env.OWNER_ACTIVITY_SECRET_ARN }))).SecretString,
})

export const handler = async event => {
  if (event?.action === 'daily_digest') {
    await post({ action: 'digest' })
    return { delivered: 1 }
  }
  let delivered = 0
  for (const record of event?.Records || []) {
    const ownerEvent = ownerEventFromStream(record)
    if (!ownerEvent) continue
    await post(ownerEvent)
    delivered += 1
  }
  return { delivered }
}
