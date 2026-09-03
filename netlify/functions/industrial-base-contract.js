const DEFAULT_TIMEOUT_MS = 5000
const MAX_RESPONSE_BYTES = 650000
const MAX_AGE_SECONDS = 300
const MAX_FUTURE_SKEW_SECONDS = 30
const REQUIRED_SCHEMA_VERSION =
  'industrial-base-traceability.v1'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return preflightResponse(event)
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(event, 405, {
      error: 'Method not allowed.',
    })
  }

  const originFailure = validateOrigin(event)
  if (originFailure) return originFailure

  const upstream =
    process.env.ATLAS_INDUSTRIAL_BASE_URL
  const expectedTenant =
    process.env.ATLAS_INDUSTRIAL_BASE_TENANT_ID
  const expectedProject =
    process.env.ATLAS_INDUSTRIAL_BASE_PROJECT_ID

  if (!upstream || !expectedTenant || !expectedProject) {
    return jsonResponse(event, 503, {
      error:
        'Atlas Nuclear Industrial Base service scope is not configured.',
      status: 'SERVICE_UNAVAILABLE',
    })
  }

  let url

  try {
    url = new URL(upstream)
  } catch {
    return jsonResponse(event, 503, {
      error:
        'Atlas Nuclear Industrial Base service configuration is invalid.',
      status: 'SERVICE_UNAVAILABLE',
    })
  }

  if (url.protocol !== 'https:') {
    return jsonResponse(event, 503, {
      error:
        'Atlas Nuclear Industrial Base service configuration is not allowed.',
      status: 'SERVICE_UNAVAILABLE',
    })
  }

  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    DEFAULT_TIMEOUT_MS,
  )

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'X-Atlas-Contract-Version':
          REQUIRED_SCHEMA_VERSION,
        ...(process.env.ATLAS_INDUSTRIAL_BASE_TOKEN
          ? {
              Authorization:
                `Bearer ${process.env.ATLAS_INDUSTRIAL_BASE_TOKEN}`,
            }
          : {}),
      },
    })

    const contentType =
      response.headers.get('content-type') || ''

    if (
      !response.ok ||
      !contentType.includes('application/json')
    ) {
      return jsonResponse(event, 502, {
        error:
          'Atlas Nuclear Industrial Base service did not return a current governed contract.',
        status: 'SERVICE_UNAVAILABLE',
      })
    }

    const text = await boundedText(response)
    const payload = JSON.parse(text)

    if (
      payload?.workspace !== 'INDUSTRIAL_BASE' ||
      payload?.schema_version !== REQUIRED_SCHEMA_VERSION ||
      payload?.tenant_id !== expectedTenant ||
      payload?.project_id !== expectedProject ||
      !isFresh(payload)
    ) {
      return jsonResponse(event, 502, {
        error:
          'Atlas Nuclear Industrial Base contract is outside the configured scope or freshness window.',
        status: 'EVIDENCE_NOT_EVALUATED',
      })
    }

    return jsonResponse(event, 200, payload)
  } catch {
    return jsonResponse(event, 502, {
      error:
        'Atlas Nuclear Industrial Base service is unavailable.',
      status: 'SERVICE_UNAVAILABLE',
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function boundedText(response) {
  if (!response.body?.getReader) {
    const text = await response.text()

    if (text.length > MAX_RESPONSE_BYTES) {
      throw new Error('Contract too large.')
    }

    return text
  }

  const reader = response.body.getReader()
  const chunks = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_RESPONSE_BYTES) {
      throw new Error('Contract too large.')
    }
    chunks.push(value)
  }

  return new TextDecoder().decode(concatChunks(chunks, total))
}

function concatChunks(chunks, total) {
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

function isFresh(payload) {
  const generatedAt =
    payload.generated_at || payload.contract_generated_at
  if (typeof generatedAt !== 'string') return false
  const generatedTime = Date.parse(generatedAt)
  if (Number.isNaN(generatedTime)) return false
  const now = Date.now()
  return (
    (now - generatedTime) / 1000 <= MAX_AGE_SECONDS &&
    (generatedTime - now) / 1000 <= MAX_FUTURE_SKEW_SECONDS
  )
}

function validateOrigin(event) {
  const origin =
    event.headers?.origin || event.headers?.Origin || ''
  if (!origin) return null

  const allowlist = (process.env.ATLAS_EYE_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (!allowlist.includes(origin)) {
    return {
      statusCode: 403,
      headers: {
        Vary: 'Origin',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
        Pragma: 'no-cache',
      },
      body: JSON.stringify({
        error: 'Origin is not allowed.',
        status: 'SERVICE_UNAVAILABLE',
      }),
    }
  }

  return null
}

function preflightResponse(event) {
  const originFailure = validateOrigin(event)
  if (originFailure) return originFailure
  return {
    statusCode: 204,
    headers: corsHeaders(event),
    body: '',
  }
}

function corsHeaders(event) {
  const origin =
    event.headers?.origin || event.headers?.Origin || ''
  const allowlist = (process.env.ATLAS_EYE_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const headers = {
    'Access-Control-Allow-Headers':
      'Content-Type, X-Atlas-Contract-Version',
    'Access-Control-Allow-Methods':
      'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
    Vary: 'Origin',
  }
  if (origin && allowlist.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function jsonResponse(event, statusCode, payload) {
  return {
    statusCode,
    headers: corsHeaders(event),
    body: JSON.stringify(payload),
  }
}
