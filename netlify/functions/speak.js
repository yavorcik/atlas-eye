const DEFAULT_ATLAS_SPEAK_URL =
  'http://127.0.0.1:8090/api/nuclear/speak'

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
      error: 'Invalid speech request.',
    })
  }

  const text =
    typeof payload.text === 'string'
      ? payload.text.trim()
      : ''

  if (!text) {
    return jsonResponse(400, {
      error: 'Text is required.',
    })
  }

  const atlasSpeakUrl =
    process.env.ATLAS_SPEAK_URL ||
    (
      process.env.ATLAS_API_URL
        ? process.env.ATLAS_API_URL.replace(
            /\/ask\/?$/,
            '/speak',
          )
        : DEFAULT_ATLAS_SPEAK_URL
    )

  try {
    const response = await fetch(atlasSpeakUrl, {
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
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      const errorText = await response.text()

      return jsonResponse(response.status, {
        error:
          errorText ||
          'Atlas could not generate speech.',
      })
    }

    const audio = Buffer.from(
      await response.arrayBuffer(),
    )

    return jsonResponse(200, {
      audio: audio.toString('base64'),
      contentType:
        response.headers.get('content-type') ||
        'audio/wav',
    })
  } catch (error) {
    console.error('Atlas speech bridge error:', error)

    return jsonResponse(502, {
      error:
        'The Atlas speech service is unavailable.',
      detail:
        error instanceof Error
          ? error.message
          : String(error),
    })
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
