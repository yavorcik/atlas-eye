import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test, { afterEach, beforeEach } from 'node:test'

import { handler, testables } from '../netlify/functions/gadget.js'

const key = crypto.randomBytes(32)
const env = {
  GADGET_SITE_ORIGIN: 'https://preview.atlaseye.example',
  GADGET_COGNITO_DOMAIN: 'https://atlas-preview.auth.us-east-2.amazoncognito.com',
  GADGET_COGNITO_CLIENT_ID: 'previewclient123',
  GADGET_ATLAS_API_URL: 'https://preview-api.atlaseye.example/api/gadget/query',
  GADGET_SESSION_SECRET: key.toString('base64'),
}
const originalFetch = global.fetch

beforeEach(() => {
  Object.assign(process.env, env)
  testables.rateState.clear()
})

afterEach(() => {
  global.fetch = originalFetch
  for (const name of Object.keys(env)) delete process.env[name]
})

function event(action, overrides = {}) {
  return {
    httpMethod: 'GET',
    queryStringParameters: { action },
    headers: {}, body: '',
    ...overrides,
  }
}

function authenticatedEvent(payload = { assistant: 'gadget', question: 'What next?' }) {
  const csrf = 'csrf-value-long-enough'
  const sealed = testables.seal({ accessToken: 'private-cognito-access-token', csrf, expiresAt: Date.now() + 60_000 }, key)
  return event('query', {
    httpMethod: 'POST',
    headers: {
      cookie: `__Host-atlas_gadget_session=${sealed}`,
      origin: env.GADGET_SITE_ORIGIN,
      'sec-fetch-site': 'same-origin',
      'x-atlas-csrf': csrf,
    },
    body: JSON.stringify(payload),
  })
}

test('auth start uses PKCE, read scope, safe return path, and hardened cookie', async () => {
  const result = await handler(event('auth-start', { queryStringParameters: { action: 'auth-start', returnTo: 'https://evil.invalid' } }))
  assert.equal(result.statusCode, 302)
  const location = new URL(result.headers.Location)
  assert.equal(location.origin, env.GADGET_COGNITO_DOMAIN)
  assert.match(location.searchParams.get('scope'), /atlas-gadget\/read/)
  assert.doesNotMatch(location.searchParams.get('scope'), /approve/)
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256')
  assert.match(result.multiValueHeaders['Set-Cookie'][0], /HttpOnly; Secure; SameSite=Lax/)
})

test('auth callback exchanges the PKCE code server-side and seals the access token', async () => {
  const started = await handler(event('auth-start', {
    queryStringParameters: { action: 'auth-start', returnTo: '/mission-control/evidence/' },
  }))
  const authorize = new URL(started.headers.Location)
  const transactionCookie = started.multiValueHeaders['Set-Cookie'][0].split(';', 1)[0]
  let tokenRequest
  global.fetch = async (url, options) => {
    tokenRequest = { url: String(url), options }
    return {
      ok: true,
      text: async () => JSON.stringify({
        access_token: 'callback-private-access-token', token_type: 'Bearer', expires_in: 900,
      }),
    }
  }
  const completed = await handler(event('auth-callback', {
    headers: { cookie: transactionCookie },
    queryStringParameters: {
      action: 'auth-callback', code: 'one-time-code', state: authorize.searchParams.get('state'),
    },
  }))
  assert.equal(completed.statusCode, 302)
  assert.equal(completed.headers.Location, `${env.GADGET_SITE_ORIGIN}/mission-control/evidence/`)
  assert.equal(tokenRequest.url, `${env.GADGET_COGNITO_DOMAIN}/oauth2/token`)
  assert.match(String(tokenRequest.options.body), /code_verifier=/)
  const sessionCookie = completed.multiValueHeaders['Set-Cookie'].find(value => value.startsWith('__Host-atlas_gadget_session='))
  assert.match(sessionCookie, /HttpOnly; Secure; SameSite=Lax/)
  assert.doesNotMatch(completed.body + completed.headers.Location, /callback-private-access-token/)
  const sealed = sessionCookie.split(';', 1)[0].split('=', 2)[1]
  assert.equal(testables.open(sealed, key).accessToken, 'callback-private-access-token')
})

test('session exposes only CSRF state and never the browser-hidden access token', async () => {
  const request = authenticatedEvent()
  request.httpMethod = 'GET'
  request.queryStringParameters = { action: 'session' }
  const result = await handler(request)
  assert.equal(result.statusCode, 200)
  assert.deepEqual(JSON.parse(result.body), { authenticated: true, csrf: 'csrf-value-long-enough' })
  assert.doesNotMatch(result.body, /private-cognito-access-token/)
  assert.equal(result.headers['Cache-Control'], 'no-store')
})

test('query enforces origin and CSRF before contacting Atlas', async () => {
  global.fetch = () => { throw new Error('must not fetch') }
  const crossOrigin = authenticatedEvent()
  crossOrigin.headers.origin = 'https://evil.invalid'
  assert.equal((await handler(crossOrigin)).statusCode, 403)
  const badCsrf = authenticatedEvent()
  badCsrf.headers['x-atlas-csrf'] = 'wrong'
  assert.equal((await handler(badCsrf)).statusCode, 403)
})

test('query forwards the server-held token and returns no credential material', async () => {
  let request
  global.fetch = async (_url, options) => {
    request = options
    return { ok: true, status: 200, text: async () => JSON.stringify({ status: 'success', response: { assistant: 'gadget' } }) }
  }
  const result = await handler(authenticatedEvent())
  assert.equal(result.statusCode, 200)
  assert.equal(request.headers.Authorization, 'Bearer private-cognito-access-token')
  assert.doesNotMatch(result.body, /private-cognito-access-token/)
  assert.doesNotMatch(result.body, /GADGET_SESSION_SECRET/)
})

test('caller-supplied agents, sessions, tools, paths, and URLs are rejected', async () => {
  global.fetch = () => { throw new Error('must not fetch') }
  for (const field of ['agent_id', 'session_id', 'tools', 'path', 'url']) {
    const result = await handler(authenticatedEvent({ assistant: 'gadget', question: 'hello', [field]: 'attacker' }))
    assert.equal(result.statusCode, 400, field)
  }
})

test('upstream failures are opaque and query rate limiting is bounded', async () => {
  global.fetch = async () => { throw new Error('SECRET upstream detail') }
  const failed = await handler(authenticatedEvent())
  assert.equal(failed.statusCode, 503)
  assert.doesNotMatch(failed.body, /SECRET/)

  global.fetch = async () => ({ ok: true, status: 200, text: async () => '{}' })
  let latest
  for (let index = 0; index < 11; index += 1) latest = await handler(authenticatedEvent())
  assert.equal(latest.statusCode, 429)
})

test('invalid or missing configuration fails closed', async () => {
  delete process.env.GADGET_SESSION_SECRET
  const result = await handler(event('session'))
  assert.equal(result.statusCode, 503)
  assert.deepEqual(JSON.parse(result.body), { error: 'gadget_unavailable' })
})
