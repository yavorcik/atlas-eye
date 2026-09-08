export function createLambda(handle) {
  return async event => {
    if (event.version !== '2.0') return { statusCode: 400, body: '{"error":"invalid_gateway_event"}' }
    const method = event.requestContext?.http?.method
    const text = event.body || ''
    if (typeof text !== 'string' || text.length > 24000) return { statusCode: 413, body: '{"error":"invalid_submission"}' }
    const bytes = event.isBase64Encoded ? Buffer.from(text, 'base64') : Buffer.from(text)
    const req = new Request('https://intake.invalid/supplier-submissions', {
      method, headers: event.headers || {}, ...(!['GET', 'HEAD'].includes(method) ? { body: bytes } : {}),
    })
    const result = await handle(req)
    return { statusCode: result.status, headers: Object.fromEntries(result.headers), body: await result.text(), isBase64Encoded: false }
  }
}
