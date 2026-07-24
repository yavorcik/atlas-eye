const DEFAULT_ATLAS_LISTEN_URL =
  'http://127.0.0.1:8090/api/nuclear/listen'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {})
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      error: 'Method not allowed.',
    })
  }

  let payload

  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return jsonResponse(400, {
      error: 'Invalid voice request.',
    })
  }

  const encodedAudio =
    typeof payload.audio === 'string'
      ? payload.audio
      : ''

  if (!encodedAudio) {
    return jsonResponse(400, {
      error: 'Audio is required.',
    })
  }

  const audio = Buffer.from(encodedAudio, 'base64')

  if (!audio.length) {
    return jsonResponse(400, {
      error: 'The recording was empty.',
    })
  }

  if (audio.length > 25 * 1024 * 1024) {
    return jsonResponse(413, {
      error: 'The recording exceeds 25 MB.',
    })
  }

  const contentType =
    typeof payload.contentType === 'string' &&
    payload.contentType.startsWith('audio/')
      ? payload.contentType
      : 'audio/webm'

  const atlasListenUrl =
    process.env.ATLAS_LISTEN_URL ||
    (
      process.env.ATLAS_API_URL
        ? process.env.ATLAS_API_URL.replace(
            /\/ask\/?$/,
            '/listen',
          )
        : DEFAULT_ATLAS_LISTEN_URL
    )

  try {
    const response = await fetch(atlasListenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        ...(process.env.ATLAS_PUBLIC_API_TOKEN
          ? {
              Authorization:
                `Bearer ${process.env.ATLAS_PUBLIC_API_TOKEN}`,
            }
          : {}),
        'X-Atlas-Project-Id':
          'ATLAS-ONE-OHIO',
        'X-Atlas-Analysis-Mode': 'auto',
      },
      body: audio,
    })

    const text = await response.text()

    let result

    try {
      result = JSON.parse(text)
    } catch {
      result = {
        message: text,
      }
    }

    if (!response.ok) {
      return jsonResponse(response.status, {
        error:
          result.message ||
          result.error ||
          'Atlas could not transcribe the recording.',
      })
    }

    return jsonResponse(
      200,
      normalizeVoiceResponse(result),
    )
  } catch (error) {
    console.error('Atlas voice bridge error:', error)

    return jsonResponse(502, {
      error:
        'The Atlas voice service is unavailable.',
      detail:
        error instanceof Error
          ? error.message
          : String(error),
    })
  }
}

function normalizeVoiceResponse(result) {
  const conversation =
    result.response ||
    result.result ||
    result

  const governed =
    conversation.response ||
    conversation.result ||
    conversation

  const transcription =
    result.transcription ||
    conversation.transcription ||
    {}

  const confidenceValue =
    governed.confidence ??
    conversation.confidence ??
    null

  const confidence =
    typeof confidenceValue === 'number'
      ? confidenceValue > 1
        ? confidenceValue / 100
        : confidenceValue
      : null

  return {
    question:
      transcription.transcript ||
      governed.question ||
      conversation.question ||
      '',

    answer:
      governed.answer ||
      governed.conclusion ||
      governed.summary ||
      governed.message ||
      'Atlas completed the analysis.',

    intent:
      governed.intent ||
      conversation.intent ||
      null,

    confidence,

    disposition:
      governed.disposition ||
      conversation.disposition ||
      null,

    recommendation:
      governed.recommendation ||
      governed.next_action ||
      null,

    blockers:
      governed.blockers ||
      governed.blocking_conditions ||
      [],

    evidence:
      governed.evidence ||
      governed.citations ||
      governed.authorities ||
      [],

    transcription,
  }
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'Content-Type',
      'Access-Control-Allow-Methods':
        'POST, OPTIONS',
      'Content-Type': 'application/json',
    },
    body:
      statusCode === 204
        ? ''
        : JSON.stringify(payload),
  }
}
