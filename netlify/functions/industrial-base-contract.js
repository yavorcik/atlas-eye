const DEFAULT_TIMEOUT_MS = 5000
const MAX_RESPONSE_BYTES = 650000
const REQUIRED_SCHEMA_VERSION =
  'industrial-base-traceability.v1'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {})
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, {
      error: 'Method not allowed.',
    })
  }

  const upstream =
    process.env.ATLAS_INDUSTRIAL_BASE_URL

  if (!upstream) {
    return jsonResponse(503, {
      error:
        'Atlas Nuclear Industrial Base service is not configured.',
      status: 'SERVICE_UNAVAILABLE',
    })
  }

  let url

  try {
    url = new URL(upstream)
  } catch {
    return jsonResponse(503, {
      error:
        'Atlas Nuclear Industrial Base service configuration is invalid.',
      status: 'SERVICE_UNAVAILABLE',
    })
  }

  if (!['https:', 'http:'].includes(url.protocol)) {
    return jsonResponse(503, {
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
      return jsonResponse(502, {
        error:
          'Atlas Nuclear Industrial Base service did not return a current governed contract.',
        status: 'SERVICE_UNAVAILABLE',
      })
    }

    const text = await boundedText(response)
    const payload = JSON.parse(text)

    if (
      payload?.workspace !== 'INDUSTRIAL_BASE' ||
      payload?.schema_version !== REQUIRED_SCHEMA_VERSION
    ) {
      return jsonResponse(502, {
        error:
          'Atlas Nuclear Industrial Base contract version is incompatible.',
        status: 'EVIDENCE_NOT_EVALUATED',
      })
    }

    return jsonResponse(200, payload)
  } catch {
    return jsonResponse(502, {
      error:
        'Atlas Nuclear Industrial Base service is unavailable.',
      status: 'SERVICE_UNAVAILABLE',
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function boundedText(response) {
  const text = await response.text()

  if (text.length > MAX_RESPONSE_BYTES) {
    throw new Error('Contract too large.')
  }

  return text
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Content-Type, X-Atlas-Contract-Version',
    'Access-Control-Allow-Methods':
      'GET, OPTIONS',
    'Content-Type': 'application/json',
  }
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(payload),
  }
}
