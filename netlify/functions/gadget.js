import crypto from 'node:crypto'

const SESSION_COOKIE = '__Host-atlas_gadget_session'
const TRANSACTION_COOKIE = '__Host-atlas_gadget_oauth'
const MAX_BODY_BYTES = 16_384
const MAX_UPSTREAM_BYTES = 65_536
const RATE_WINDOW_MS = 60_000
const rateState = new Map()
const ROUTE_ACTIONS = Object.freeze({
  '/api/gadget/auth/start': 'auth-start',
  '/api/gadget/auth/callback': 'auth-callback',
  '/api/gadget/session.json': 'session',
  '/api/gadget/logout': 'logout',
  '/api/gadget/query': 'query',
})

export async function handler(event) {
  const action = requestedAction(event)
  try {
    if (action === 'auth-start') return authStart(event)
    if (action === 'auth-callback') return await authCallback(event)
    if (action === 'session') return sessionStatus(event)
    if (action === 'logout') return logout(event)
    if (action === 'query') return await query(event)
    return response(404, { error: 'not_found' })
  } catch {
    return response(503, { error: 'gadget_unavailable' })
  }
}

function requestedAction(event) {
  const explicit = event.queryStringParameters?.action
  if (typeof explicit === 'string' && explicit) return explicit
  const candidates = [event.path, event.rawPath]
  if (typeof event.rawUrl === 'string') {
    try {
      candidates.push(new URL(event.rawUrl).pathname)
    } catch {
      return ''
    }
  }
  for (const path of candidates) {
    if (typeof path === 'string' && ROUTE_ACTIONS[path]) return ROUTE_ACTIONS[path]
  }
  return ''
}

function configuration() {
  const siteOrigin = exactOrigin(process.env.GADGET_SITE_ORIGIN)
  const cognitoDomain = exactOrigin(process.env.GADGET_COGNITO_DOMAIN)
  const clientId = process.env.GADGET_COGNITO_CLIENT_ID || ''
  const atlasUrl = new URL(process.env.GADGET_ATLAS_API_URL || '')
  if (!/^[A-Za-z0-9]{1,128}$/.test(clientId)) throw new Error('invalid config')
  if (atlasUrl.protocol !== 'https:' || atlasUrl.username || atlasUrl.password || atlasUrl.search || atlasUrl.hash || atlasUrl.pathname !== '/api/gadget/query') {
    throw new Error('invalid config')
  }
  const key = Buffer.from(process.env.GADGET_SESSION_SECRET || '', 'base64')
  if (key.length !== 32) throw new Error('invalid config')
  return { siteOrigin, cognitoDomain, clientId, atlasUrl: atlasUrl.href, key }
}

function exactOrigin(value = '') {
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('invalid origin')
  }
  return parsed.origin
}

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

function seal(value, key) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const plaintext = Buffer.from(JSON.stringify(value))
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return [base64url(iv), base64url(encrypted), base64url(cipher.getAuthTag())].join('.')
}

function open(value, key) {
  const parts = typeof value === 'string' ? value.split('.') : []
  if (parts.length !== 3) throw new Error('invalid cookie')
  const [iv, encrypted, tag] = parts.map(part => Buffer.from(part, 'base64url'))
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()])
  const parsed = JSON.parse(plaintext)
  if (!parsed || typeof parsed !== 'object') throw new Error('invalid cookie')
  return parsed
}

function cookieValue(event, name) {
  const matches = String(event.headers?.cookie || '')
    .split(';')
    .map(value => value.trim())
    .filter(value => value.startsWith(`${name}=`))
  return matches.length === 1 ? matches[0].slice(name.length + 1) : ''
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`
}

function cleanReturnTo(value) {
  return typeof value === 'string' && /^\/mission-control(?:\/[^?#]*)?$/.test(value)
    ? value
    : '/mission-control/'
}

function method(event, expected) {
  return event.httpMethod === expected
}

function sameOrigin(event, config) {
  return event.headers?.origin === config.siteOrigin
    && (!event.headers?.['sec-fetch-site'] || event.headers['sec-fetch-site'] === 'same-origin')
}

function authStart(event) {
  if (!method(event, 'GET')) return response(405, { error: 'method_not_allowed' })
  const config = configuration()
  const state = base64url(crypto.randomBytes(24))
  const verifier = base64url(crypto.randomBytes(48))
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest())
  const returnTo = cleanReturnTo(event.queryStringParameters?.returnTo)
  const transaction = seal({ state, verifier, returnTo, expiresAt: Date.now() + 5 * 60_000 }, config.key)
  const callback = `${config.siteOrigin}/api/gadget/auth/callback`
  const authorize = new URL('/oauth2/authorize', config.cognitoDomain)
  authorize.search = new URLSearchParams({
    response_type: 'code', client_id: config.clientId, redirect_uri: callback,
    scope: 'openid atlas-gadget/read', state, code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString()
  return redirect(authorize.href, [cookie(TRANSACTION_COOKIE, transaction, 300)])
}

async function authCallback(event) {
  if (!method(event, 'GET')) return response(405, { error: 'method_not_allowed' })
  const config = configuration()
  const transaction = open(cookieValue(event, TRANSACTION_COOKIE), config.key)
  const code = event.queryStringParameters?.code
  const state = event.queryStringParameters?.state
  if (typeof code !== 'string' || code.length > 4_096 || state !== transaction.state || Date.now() >= transaction.expiresAt) {
    return response(400, { error: 'authentication_failed' }, [cookie(TRANSACTION_COOKIE, '', 0)])
  }
  const callback = `${config.siteOrigin}/api/gadget/auth/callback`
  const tokenResponse = await fetch(new URL('/oauth2/token', config.cognitoDomain), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', client_id: config.clientId, code,
      redirect_uri: callback, code_verifier: transaction.verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  const raw = await tokenResponse.text()
  if (!tokenResponse.ok || Buffer.byteLength(raw) > 16_384) {
    return response(401, { error: 'authentication_failed' }, [cookie(TRANSACTION_COOKIE, '', 0)])
  }
  const tokens = JSON.parse(raw)
  if (typeof tokens.access_token !== 'string' || tokens.access_token.length > 12_000 || tokens.token_type !== 'Bearer') {
    return response(401, { error: 'authentication_failed' }, [cookie(TRANSACTION_COOKIE, '', 0)])
  }
  const lifetime = Math.min(Number(tokens.expires_in) || 0, 900)
  if (lifetime < 60) return response(401, { error: 'authentication_failed' }, [cookie(TRANSACTION_COOKIE, '', 0)])
  const csrf = base64url(crypto.randomBytes(24))
  const session = seal({ accessToken: tokens.access_token, csrf, expiresAt: Date.now() + lifetime * 1_000 }, config.key)
  return redirect(`${config.siteOrigin}${cleanReturnTo(transaction.returnTo)}`, [
    cookie(TRANSACTION_COOKIE, '', 0), cookie(SESSION_COOKIE, session, lifetime),
  ])
}

function readSession(event, config) {
  const session = open(cookieValue(event, SESSION_COOKIE), config.key)
  if (typeof session.accessToken !== 'string' || typeof session.csrf !== 'string' || Date.now() >= session.expiresAt) {
    throw new Error('expired session')
  }
  return session
}

function sessionStatus(event) {
  if (!method(event, 'GET')) return response(405, { error: 'method_not_allowed' })
  const config = configuration()
  try {
    const session = readSession(event, config)
    return response(200, { authenticated: true, csrf: session.csrf })
  } catch {
    return response(401, { authenticated: false }, [cookie(SESSION_COOKIE, '', 0)])
  }
}

function logout(event) {
  if (!method(event, 'POST')) return response(405, { error: 'method_not_allowed' })
  const config = configuration()
  if (!sameOrigin(event, config)) return response(403, { error: 'request_rejected' })
  try {
    const session = readSession(event, config)
    if (!safeEqual(event.headers?.['x-atlas-csrf'], session.csrf)) throw new Error('csrf')
  } catch {
    return response(403, { error: 'request_rejected' })
  }
  return response(200, { authenticated: false }, [cookie(SESSION_COOKIE, '', 0)])
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function rateAllowed(key) {
  const now = Date.now()
  const recent = (rateState.get(key) || []).filter(stamp => now - stamp < RATE_WINDOW_MS)
  if (recent.length >= 10) return false
  recent.push(now)
  rateState.set(key, recent)
  if (rateState.size > 2_000) {
    for (const [candidate, stamps] of rateState) {
      if (!stamps.some(stamp => now - stamp < RATE_WINDOW_MS)) rateState.delete(candidate)
    }
  }
  return true
}

async function query(event) {
  if (!method(event, 'POST')) return response(405, { error: 'method_not_allowed' })
  const config = configuration()
  if (!sameOrigin(event, config)) return response(403, { error: 'request_rejected' })
  let session
  try {
    session = readSession(event, config)
  } catch {
    return response(401, { error: 'authentication_required' }, [cookie(SESSION_COOKIE, '', 0)])
  }
  if (!safeEqual(event.headers?.['x-atlas-csrf'], session.csrf)) return response(403, { error: 'request_rejected' })
  if (Buffer.byteLength(event.body || '') > MAX_BODY_BYTES) return response(413, { error: 'request_too_large' })
  let payload
  try { payload = JSON.parse(event.body || '') } catch { return response(400, { error: 'invalid_request' }) }
  const allowed = new Set(['assistant', 'question', 'stage', 'mode', 'project_id', 'interaction', 'page_context', 'guided_project', 'conversation_context'])
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.assistant !== 'gadget' || Object.keys(payload).some(key => !allowed.has(key))) {
    return response(400, { error: 'invalid_request' })
  }
  const rateKey = crypto.createHash('sha256').update(session.csrf).digest('hex')
  if (!rateAllowed(rateKey)) return response(429, { error: 'rate_limited' })
  const requestId = base64url(crypto.randomBytes(12))
  const started = Date.now()
  try {
    const upstream = await fetch(config.atlasUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
      redirect: 'error',
    })
    const text = await upstream.text()
    if (Buffer.byteLength(text) > MAX_UPSTREAM_BYTES) throw new Error('oversized upstream')
    if (!upstream.ok) {
      console.info(JSON.stringify({ event: 'gadget_bff_query', requestId, status: upstream.status, durationMs: Date.now() - started }))
      return response(upstream.status === 401 ? 401 : upstream.status === 429 ? 429 : 503, {
        error: upstream.status === 401 ? 'authentication_required' : upstream.status === 429 ? 'rate_limited' : 'gadget_unavailable',
        request_id: requestId,
      })
    }
    const result = JSON.parse(text)
    console.info(JSON.stringify({ event: 'gadget_bff_query', requestId, status: 200, durationMs: Date.now() - started }))
    return response(200, result)
  } catch {
    console.info(JSON.stringify({ event: 'gadget_bff_query', requestId, status: 503, durationMs: Date.now() - started }))
    return response(503, { error: 'gadget_unavailable', request_id: requestId })
  }
}

function headers() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  }
}

function response(statusCode, payload, cookies = []) {
  return { statusCode, headers: headers(), multiValueHeaders: cookies.length ? { 'Set-Cookie': cookies } : undefined, body: JSON.stringify(payload) }
}

function redirect(location, cookies) {
  return { statusCode: 302, headers: { ...headers(), Location: location }, multiValueHeaders: { 'Set-Cookie': cookies }, body: '' }
}

export const testables = { seal, open, cookieValue, cleanReturnTo, sameOrigin, configuration, rateState }
