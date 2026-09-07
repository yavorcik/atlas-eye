import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { catalog, filterParts, sourcesFor } from '../src/supply-chain/catalog.mjs'
import { BLOCKS, validateSubmission } from '../supabase/functions/supplier-submission/contract.mjs'
import { createHandler } from '../supabase/functions/supplier-submission/handler.mjs'

const good = { request_id: '550e8400-e29b-41d4-a716-446655440000', kind: 'new', existing_part_id: '', company: 'Example Manufacturer', email: 'maker@example.com', website: 'https://example.com', role: 'Manufacturer / OEM', product: 'Example instrumentation', block: '08 Controls & electrical', facility: 'Example works', country: 'United States', description: 'Illustrative capability submitted for editorial review.', document_url: 'https://example.com/products', certificate: '', consent: true, fax: '' }
const request = (body = good, origin = 'https://atlaseye.ai') => new Request('https://example.supabase.co/functions/v1/supplier-submission', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

test('catalog preserves all research groups, source provenance, and unresolved gaps', () => {
  assert.equal(catalog.parts.length, 70); assert.equal(catalog.sources.length, 52)
  assert.equal(new Set(catalog.parts.map(part => part.id)).size, 70)
  assert.deepEqual(catalog.blocks, BLOCKS)
  assert.equal(filterParts({ evidence: 'Unresolved' }).length, 2)
  for (const part of catalog.parts) {
    assert.ok(sourcesFor(part).length > 0, part.id)
    assert.ok(part.limitation, part.id)
    assert.match(part.url, /^https:\/\//)
  }
  assert.ok(catalog.sources.some(source => /fetch failed/.test(source.access)))
})
test('search combines terms and filters without confusing supplier roles', () => {
  const valves = filterParts({ query: '  VELAN valve ' })
  assert.ok(valves.length > 0); assert.ok(valves.every(part => /Velan/.test(part.company)))
  assert.ok(filterParts({ query: 'Bechtel', evidence: 'Construction role' }).length > 0)
  assert.equal(filterParts({ query: 'Bechtel', evidence: 'SMR relationship' }).length, 0)
  assert.equal(filterParts({ query: 'no-match-zxy999' }).length, 0)
  assert.ok(filterParts({ block: BLOCKS[0] }).every(part => part.block === BLOCKS[0]))
})
test('valid submission is normalized and cannot carry public review state', () => {
  assert.equal(validateSubmission({ ...good, company: '  Example Manufacturer  ', email: 'MAKER@example.com' }).email, 'maker@example.com')
  assert.throws(() => validateSubmission({ ...good, status: 'published' }))
  assert.throws(() => validateSubmission({ ...good, origin: 'Verified' }))
})
for (const [name, patch] of [
  ['missing consent', { consent: false }], ['invalid email', { email: 'bad' }],
  ['honeypot', { fax: 'bot' }], ['oversize', { description: 'x'.repeat(2001) }],
  ['script URL', { website: 'javascript:alert(1)' }], ['embedded credentials', { document_url: 'https://user:pass@example.com' }],
  ['unknown role', { role: 'NRC approved supplier' }], ['missing document', { document_url: '' }],
  ['invalid update', { kind: 'update', existing_part_id: 'P071' }],
  ['new request with target', { existing_part_id: 'P001' }],
]) test(`rejects ${name}`, () => assert.throws(() => validateSubmission({ ...good, ...patch })))
test('updates require an actual research record identifier', () => {
  for (let i = 1; i <= 70; i++) assert.equal(validateSubmission({ ...good, kind: 'update', existing_part_id: `P${String(i).padStart(3, '0')}` }).kind, 'update')
  assert.throws(() => validateSubmission({ ...good, kind: 'update', existing_part_id: 'P000' }))
})
test('success is returned only after durable save, with no private fields', async () => {
  let saved
  const handler = createHandler({ save: async value => { saved = value; return { outcome: 'created', reference: good.request_id } } })
  const result = await handler(request())
  assert.equal(result.status, 200); assert.equal(saved.email, good.email)
  assert.deepEqual(await result.json(), { ok: true, reference: good.request_id })
  assert.equal(result.headers.get('Cache-Control'), 'no-store')
})
test('origin, payload, and body limits reject before any database access', async () => {
  let saves = 0
  const handler = createHandler({ save: async () => { saves++; throw Error() } })
  assert.equal((await handler(request(good, 'https://untrusted.example'))).status, 403)
  assert.equal((await handler(request({ ...good, consent: false }))).status, 400)
  assert.equal((await handler(request({ ...good, description: 'x'.repeat(20000) }))).status, 413)
  assert.equal(saves, 0)
})
test('storage failure never returns success and rate limit is explicit', async () => {
  assert.equal((await createHandler({ save: async () => { throw Error('private database detail') } })(request())).status, 503)
  for (const [outcome, status] of [['limited', 429], ['conflict', 409], ['duplicate', 200]]) {
    const result = await createHandler({ save: async () => ({ outcome, reference: good.request_id }) })(request())
    assert.equal(result.status, status)
  }
})
test('live preview access requires exact server configuration and preserves origin isolation', async () => {
  const preview = 'https://deploy-preview-22--atlas-eye.netlify.app'
  const save = async () => ({ outcome: 'created', reference: good.request_id })
  assert.equal((await createHandler({ save })(request(good, preview))).status, 403)
  const handler = createHandler({ save, previewOrigin: preview })
  const accepted = await handler(request(good, preview))
  assert.equal(accepted.status, 200)
  assert.equal(accepted.headers.get('Access-Control-Allow-Origin'), preview)
  const denied = await handler(request(good, 'https://deploy-preview-23--atlas-eye.netlify.app'))
  assert.equal(denied.status, 403)
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), 'null')
  const preflight = await handler(new Request('https://example.supabase.co', { method: 'OPTIONS', headers: { Origin: preview } }))
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), preview)
  assert.throws(() => createHandler({ save, previewOrigin: 'https://unrelated.netlify.app' }))
  assert.throws(() => createHandler({ save, previewOrigin: preview + '.attacker.example' }))
})
test('direct route and static artifacts are built for both hosting paths', () => {
  const html = fs.readFileSync('dist/supply-chain/index.html', 'utf8')
  assert.match(html, /Nuclear Supply Chain Explorer/)
  for (const [, path] of html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)) assert.ok(fs.existsSync(`dist${path}`), path)
  assert.ok(fs.existsSync('dist/supply-chain/assembly.html'))
  assert.ok(fs.statSync('dist/supply-chain/SMR_Parts_and_Manufacturers.xlsx').size > 10000)
  for (const file of ['public/_redirects', 'netlify.toml']) {
    const source = fs.readFileSync(file, 'utf8')
    assert.ok(source.indexOf('/supply-chain') < source.lastIndexOf('/*'))
  }
})
