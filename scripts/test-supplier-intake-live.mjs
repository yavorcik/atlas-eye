// Creates exactly one labeled private test record; never publishes or emails it.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { stack: { type: 'string' }, account: { type: 'string' }, region: { type: 'string', default: 'us-east-2' }, origin: { type: 'string', default: 'https://atlaseye.ai' } } })
if (!values.stack || !/^\d{12}$/.test(values.account || '')) throw Error('Supply --stack and --account for the intended AWS deployment')
const aws = args => JSON.parse(execFileSync('aws', [...args, '--region', values.region, '--output', 'json', '--no-cli-pager'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
assert.equal(aws(['sts', 'get-caller-identity']).Account, values.account, 'Wrong AWS account')
const stack = aws(['cloudformation', 'describe-stacks', '--stack-name', values.stack]).Stacks[0]
assert.ok(['CREATE_COMPLETE', 'UPDATE_COMPLETE'].includes(stack.StackStatus), 'Stack is not ready')
const outputs = Object.fromEntries(stack.Outputs.map(item => [item.OutputKey, item.OutputValue]))
const endpoint = outputs.SubmissionUrl, table = outputs.RecordsTable
assert.ok(endpoint && table, 'Expected intake stack outputs missing')
const value = { request_id: randomUUID(), kind: 'new', existing_part_id: '', company: 'SYNTHETIC LIVE TEST — DO NOT PUBLISH', email: 'atlas-intake-test@example.com', website: 'https://example.com', role: 'Manufacturer / OEM', product: 'Synthetic validation record', block: '08 Controls & electrical', facility: 'Synthetic test facility', country: 'United States', description: 'Synthetic acceptance test only. Do not contact, qualify or publish this record.', document_url: 'https://example.com', certificate: '', consent: true, fax: '' }
const post = (body, origin = values.origin) => fetch(endpoint, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) })
const preflight = await fetch(endpoint, { method: 'OPTIONS', headers: { Origin: values.origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' }, signal: AbortSignal.timeout(20000) })
assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), values.origin)
const first = await post(value); assert.equal(first.status, 200)
const receipt = await first.json(); assert.deepEqual(Object.keys(receipt).sort(), ['ok', 'reference']); assert.equal(receipt.ok, true)
const repeated = await post(value); assert.equal(repeated.status, 200); assert.deepEqual(await repeated.json(), receipt)
assert.equal((await post({ ...value, company: 'Changed synthetic content' })).status, 409)
assert.equal((await post({ ...value, consent: false })).status, 400)
assert.equal((await post(value, 'https://untrusted.example')).status, 403)
assert.equal((await fetch(endpoint, { signal: AbortSignal.timeout(20000) })).status, 404)
const pk = `SUBMISSION#${createHash('sha256').update(value.request_id).digest('hex')}`
const stored = aws(['dynamodb', 'get-item', '--table-name', table, '--key', JSON.stringify({ pk: { S: pk } }), '--consistent-read']).Item
assert.equal(stored.reference.S, receipt.reference); assert.equal(stored.status.S, 'pending')
assert.equal(JSON.parse(stored.payload.S).company, value.company)
console.log(JSON.stringify({ result: 'PASS', reference: receipt.reference, checks: ['live private storage', 'same receipt on retry', 'payload conflict', 'invalid consent', 'origin rejection', 'no public read route'], test_record: 'retained privately for operator review; not published' }, null, 2))
