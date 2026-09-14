export async function gadgetSession() {
  const response = await fetch('/api/gadget/session.json', {
    method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store',
  })
  if (response.status === 401) return { authenticated: false }
  if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) {
    return { authenticated: false, unavailable: true }
  }
  return response.json()
}

export async function queryGadget(payload, csrf, signal) {
  const response = await fetch('/api/gadget/query', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Atlas-CSRF': csrf },
    body: JSON.stringify(payload),
  })
  const contentType = response.headers.get('content-type') || ''
  const result = contentType.includes('application/json') ? await response.json() : {}
  if (!response.ok) {
    const error = new Error(
      response.status === 401 ? 'Your Gadget session has expired.'
        : response.status === 429 ? 'Gadget has enough questions for one minute. Try again shortly.'
          : 'Gadget is unavailable. Determinism is patient; please try again.',
    )
    error.status = response.status
    throw error
  }
  return result
}
