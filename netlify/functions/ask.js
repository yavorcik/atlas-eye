const DEFAULT_ATLAS_URL =
  'http://127.0.0.1:8090/api/nuclear/ask'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(
      405,
      { error: 'Method not allowed.' },
    )
  }

  let payload

  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return jsonResponse(
      400,
      { error: 'Invalid JSON request.' },
    )
  }

  const question =
    typeof payload.question === 'string'
      ? payload.question.trim()
      : ''

  if (!question) {
    return jsonResponse(
      400,
      { error: 'A question is required.' },
    )
  }

  const atlasUrl =
    process.env.ATLAS_API_URL ||
    DEFAULT_ATLAS_URL

  try {
    const response = await fetch(atlasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
            ...(process.env.ATLAS_PUBLIC_API_TOKEN
              ? {
                  Authorization:
                    `Bearer ${process.env.ATLAS_PUBLIC_API_TOKEN}`,
                }
              : {}),
      },
      body: JSON.stringify({ question }),
    })

    const text = await response.text()

    let result

    try {
      result = JSON.parse(text)
    } catch {
      result = {
        answer: text,
      }
    }

    if (!response.ok) {
      return jsonResponse(
        response.status,
        {
          error:
            result.error ||
            result.message ||
            'Atlas Nuclear returned an error.',
          upstream: result,
        },
      )
    }

    return jsonResponse(
      200,
      normalizeAtlasResponse(
        question,
        result,
      ),
    )
  } catch (error) {
    console.error('Atlas bridge error:', error)

    return jsonResponse(
      502,
      {
        error:
          'The Atlas Nuclear reasoning service is unavailable.',
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
    )
  }
}

function normalizeAtlasResponse(question, result) {
  const governed =
    result.governed_response ||
    result.response ||
    result.result ||
    result

  const answer =
    governed.answer ||
    governed.conclusion ||
    governed.summary ||
    governed.message ||
    result.answer ||
    'Atlas completed the analysis.'

  const confidenceValue =
    governed.confidence ??
    result.confidence ??
    null

  const confidence =
    typeof confidenceValue === 'number'
      ? confidenceValue > 1
        ? confidenceValue / 100
        : confidenceValue
      : null

  const evidence =
    governed.evidence ||
    governed.citations ||
    governed.authorities ||
    result.evidence ||
    result.citations ||
    result.authorities ||
    []

  const blockers =
    governed.blockers ||
    governed.blocking_conditions ||
    result.blockers ||
    result.blocking_conditions ||
    []

  return {
    question:
      governed.question ||
      result.question ||
      question,

    intent:
      governed.intent ||
      result.intent ||
      result.query_mode ||
      null,

    answer,

    confidence,

    disposition:
      governed.disposition ||
      result.disposition ||
      null,

    recommendation:
      governed.recommendation ||
      result.recommendation ||
      result.next_action ||
      null,

    blockers:
      Array.isArray(blockers)
        ? blockers
        : [blockers].filter(Boolean),

    evidence:
      Array.isArray(evidence)
        ? evidence
        : [evidence].filter(Boolean),

    raw: result,
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Content-Type',
    'Access-Control-Allow-Methods':
      'POST, OPTIONS',
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
