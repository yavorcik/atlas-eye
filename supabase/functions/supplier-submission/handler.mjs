import { validateSubmission } from './contract.mjs'

const ORIGINS = new Set(['https://atlaseye.ai', 'https://www.atlaseye.ai', 'https://lab.atlaseye.ai'])
const response = (status, body, origin) => new Response(JSON.stringify(body), { status, headers: {
  'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'null', 'Vary': 'Origin',
  'X-Content-Type-Options': 'nosniff',
} })
async function boundedJson(request) {
  const reader = request.body?.getReader()
  if (!reader) throw Error('invalid')
  const chunks = []; let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > 16384) { await reader.cancel(); throw Error('too_large') }
    chunks.push(value)
  }
  const bytes = new Uint8Array(length); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}
export function createHandler({ save }) {
  return async request => {
    const origin = request.headers.get('Origin') || ''
    if (!ORIGINS.has(origin)) return response(403, { error: 'request_rejected' }, origin)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '600', 'Vary': 'Origin',
    } })
    if (request.method !== 'POST') return response(405, { error: 'request_rejected' }, origin)
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return response(415, { error: 'request_rejected' }, origin)
    let value
    try { value = validateSubmission(await boundedJson(request)) }
    catch (error) { return response(error.message === 'too_large' ? 413 : 400, { error: 'invalid_submission' }, origin) }
    try {
      const result = await save(value)
      if (result?.outcome === 'limited') return response(429, { error: 'rate_limited' }, origin)
      if (result?.outcome === 'conflict') return response(409, { error: 'request_conflict' }, origin)
      if (!['created', 'duplicate'].includes(result?.outcome) || !result.reference) throw Error('storage')
      // Return only a receipt. Email, company data and review state remain private.
      return response(200, { ok: true, reference: result.reference }, origin)
    } catch { return response(503, { error: 'submission_unavailable' }, origin) }
  }
}
