import { execFileSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdtempSync, rmSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { parseArgs } from 'node:util'
import { buildReview } from '../services/supplier-intake/review.mjs'

const { values } = parseArgs({ options: {
  account: { type: 'string' }, region: { type: 'string', default: 'us-east-2' },
  stack: { type: 'string', default: 'atlas-eye-supplier-intake' },
  action: { type: 'string', default: 'list' }, key: { type: 'string' },
  output: { type: 'string' }, decision: { type: 'string' },
  'notes-file': { type: 'string' }, 'checks-file': { type: 'string' },
  apply: { type: 'boolean', default: false },
} })
if (!/^\d{12}$/.test(values.account || '')) throw Error('Supply the intended 12-digit --account')
if (!['list', 'inspect', 'review'].includes(values.action)) throw Error('Use --action list, inspect, or review')
const aws = args => {
  try { return JSON.parse(execFileSync('aws', [...args, '--region', values.region, '--output', 'json', '--no-cli-pager'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) || '{}') }
  catch { throw Error('AWS operation failed; verify the profile, permissions, or concurrent review. Private output suppressed.') }
}
const identity = aws(['sts', 'get-caller-identity'])
if (identity.Account !== values.account) throw Error('AWS account mismatch')
const stack = aws(['cloudformation', 'describe-stacks', '--stack-name', values.stack]).Stacks[0]
if (stack.StackId.split(':')[4] !== values.account) throw Error('Stack account mismatch')
const table = stack.Outputs.find(x => x.OutputKey === 'RecordsTable')?.OutputValue
if (!table) throw Error('Stack has no RecordsTable output')
if (values.action === 'list') {
  const result = aws(['dynamodb', 'scan', '--table-name', table, '--filter-expression', 'record_type = :type AND (#status = :pending OR #status = :info)',
    '--expression-attribute-values', JSON.stringify({ ':type': { S: 'submission' }, ':pending': { S: 'pending' }, ':info': { S: 'needs_information' } }),
    '--expression-attribute-names', JSON.stringify({ '#status': 'status' }),
    '--projection-expression', 'pk, reference, #status, created_at', '--limit', '100', '--no-paginate'])
  console.log(JSON.stringify({ records: result.Items, more: Boolean(result.LastEvaluatedKey), note: 'First 100 evaluated items only. Use IAM-protected console for paginated queue/history; business email is omitted.' }, null, 2))
} else {
  if (!/^SUBMISSION#[a-f0-9]{64}$/.test(values.key || '')) throw Error('Supply --key from the queue')
  const item = aws(['dynamodb', 'get-item', '--table-name', table, '--key', JSON.stringify({ pk: { S: values.key } }), '--consistent-read']).Item
  if (!item || item.record_type?.S !== 'submission') throw Error('Submission not found')
  if (values.action === 'inspect') {
    if (!values.output) throw Error('Supply a NEW private --output path outside Git')
    writeFileSync(values.output, JSON.stringify(item, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
    console.log('Private record written; do not commit, publish, or attach it to a public issue.')
  } else {
    if (!values['notes-file']) throw Error('Supply --notes-file with review evidence references and reasons')
    const checks = values['checks-file'] ? JSON.parse(readFileSync(values['checks-file'], 'utf8')) : {}
    const transaction = buildReview({ item, decision: values.decision, notes: readFileSync(values['notes-file'], 'utf8'), checks,
      reviewer: identity.Arn, eventId: randomUUID(), timestamp: new Date().toISOString(), table })
    console.log(JSON.stringify({ reference: item.reference.S, from: item.status.S, to: values.decision, reviewer: identity.Arn, apply: values.apply }))
    if (values.apply) {
      const directory = mkdtempSync(join(tmpdir(), 'atlas-review-')); chmodSync(directory, 0o700)
      const file = join(directory, 'transaction.json')
      try {
        writeFileSync(file, JSON.stringify(transaction), { flag: 'wx', mode: 0o600 })
        aws(['dynamodb', 'transact-write-items', '--cli-input-json', `file://${file}`])
        console.log('Review recorded atomically. Website publication requires a separate reviewed catalog change.')
      } finally { rmSync(directory, { recursive: true, force: true }) }
    } else console.log('Preview only. Review the decision before using --apply.')
  }
}
