export async function askAtlas(question) {
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  })

  const contentType = response.headers.get('content-type') || ''

  if (!response.ok) {
    let message = 'Atlas could not answer the question.'

    if (contentType.includes('application/json')) {
      const payload = await response.json()
      message = payload.error || payload.message || message
    }

    throw new Error(message)
  }

  if (!contentType.includes('application/json')) {
    throw new Error('Atlas returned an invalid response.')
  }

  return response.json()
}

export async function listenToAtlas(audioBlob) {
  const buffer = await audioBlob.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  let binary = ''
  const chunkSize = 0x8000

  for (
    let offset = 0;
    offset < bytes.length;
    offset += chunkSize
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(
        offset,
        offset + chunkSize,
      ),
    )
  }

  const response = await fetch('/api/listen', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: window.btoa(binary),
      contentType:
        audioBlob.type || 'audio/webm',
    }),
  })

  const payload = await response.json()

  if (!response.ok) {
    throw new Error(
      payload.error ||
      'Atlas could not understand the recording.',
    )
  }

  return payload
}

export async function speakAtlas(text) {
  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  const payload = await response.json()

  if (!response.ok) {
    throw new Error(
      payload.error ||
      'Atlas could not generate speech.',
    )
  }

  const binary = window.atob(payload.audio)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], {
    type: payload.contentType || 'audio/wav',
  })
}

