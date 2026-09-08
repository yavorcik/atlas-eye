import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { execPath } from 'node:process'

const { values } = parseArgs({ options: {
  stack: { type: 'string', default: 'atlas-eye-supplier-intake' }, account: { type: 'string' },
  region: { type: 'string', default: 'us-east-2' }, preview: { type: 'string', default: '' }, apply: { type: 'boolean', default: false },
} })
if (!/^\d{12}$/.test(values.account || '')) throw Error('Supply --account with the intended AWS account ID')
if (values.preview && !/^https:\/\/deploy-preview-[1-9][0-9]*--atlas-eye\.netlify\.app$/.test(values.preview)) throw Error('Invalid AtlasEye preview URL')
const root = fileURLToPath(new URL('..', import.meta.url))
const aws = args => execFileSync('aws', [...args, '--region', values.region, '--no-cli-pager'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const identity = JSON.parse(aws(['sts', 'get-caller-identity', '--output', 'json']))
if (identity.Account !== values.account) throw Error('Authenticated AWS account does not match --account')
const dirty = execFileSync('git', ['status', '--porcelain', '--', 'services/supplier-intake', 'scripts/build-supplier-intake.mjs', 'scripts/deploy-supplier-intake.mjs'], { cwd: root, encoding: 'utf8' })
if (dirty.trim()) throw Error('Commit the intake source before creating a deployment change set')
const directory = mkdtempSync(path.join(tmpdir(), 'atlas-supplier-deploy-')), template = path.join(directory, 'template.json')
execFileSync(execPath, [path.join(root, 'scripts/build-supplier-intake.mjs'), template], { stdio: 'inherit' })
aws(['cloudformation', 'validate-template', '--template-body', `file://${template}`])
const args = ['cloudformation', 'deploy', '--stack-name', values.stack, '--template-file', template, '--capabilities', 'CAPABILITY_IAM', '--no-fail-on-empty-changeset', '--parameter-overrides', `PreviewOrigin=${values.preview}`]
if (!values.apply) args.push('--no-execute-changeset')
console.log(aws(args))
if (values.apply) {
  const stack = JSON.parse(aws(['cloudformation', 'describe-stacks', '--stack-name', values.stack, '--output', 'json'])).Stacks[0]
  if (!['CREATE_COMPLETE', 'UPDATE_COMPLETE'].includes(stack.StackStatus)) throw Error(`Deployment is not complete: ${stack.StackStatus}`)
  console.log(JSON.stringify({ status: stack.StackStatus, outputs: stack.Outputs }, null, 2))
} else console.log('Change set prepared. Resources have not been activated. Review the change set before running with --apply.')
