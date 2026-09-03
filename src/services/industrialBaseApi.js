export const INDUSTRIAL_BASE_SCHEMA_VERSION =
  'industrial-base-traceability.v1'

export const INDUSTRIAL_BASE_WORKFLOW = [
  'DEFINE',
  'QUALIFY',
  'PROCURE',
  'RECEIVE',
  'INSTALL',
  'INSPECT',
  'DEMONSTRATE',
]

const DEFAULT_ENDPOINT = '/api/industrial-base'
const MAX_CONTRACT_BYTES = 650000
const MAX_AGE_SECONDS = 300

export class IndustrialBaseContractError extends Error {
  constructor(message, code = 'SERVICE_UNAVAILABLE') {
    super(message)
    this.name = 'IndustrialBaseContractError'
    this.code = code
  }
}

export async function fetchIndustrialBaseContract({
  endpoint = DEFAULT_ENDPOINT,
  fetchImpl = globalThis.fetch,
  now = Date.now(),
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear service client is unavailable.',
    )
  }

  let response

  try {
    response = await fetchImpl(endpoint, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        'X-Atlas-Contract-Version':
          INDUSTRIAL_BASE_SCHEMA_VERSION,
      },
    })
  } catch {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear Industrial Base service is unavailable.',
    )
  }

  if (!response.ok) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear Industrial Base service is unavailable.',
      response.status === 404
        ? 'EVIDENCE_NOT_EVALUATED'
        : 'SERVICE_UNAVAILABLE',
    )
  }

  const contentType =
    response.headers?.get?.('content-type') || ''

  if (!contentType.includes('application/json')) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear returned a non-JSON contract.',
      'MALFORMED_CONTRACT',
    )
  }

  const text = await response.text()

  if (text.length > MAX_CONTRACT_BYTES) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear contract exceeded the bounded response size.',
      'MALFORMED_CONTRACT',
    )
  }

  let payload

  try {
    payload = JSON.parse(text)
  } catch {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear returned malformed JSON.',
      'MALFORMED_CONTRACT',
    )
  }

  return validateIndustrialBaseContract(payload, { now })
}

export function validateIndustrialBaseContract(payload, { now = Date.now() } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear contract is missing.',
      'MALFORMED_CONTRACT',
    )
  }

  requireEqual(payload.workspace, 'INDUSTRIAL_BASE', 'workspace')
  requireEqual(
    payload.schema_version,
    INDUSTRIAL_BASE_SCHEMA_VERSION,
    'schema_version',
  )
  requireString(payload.tenant_id, 'tenant_id')
  requireString(payload.project_id, 'project_id')
  requireString(payload.record_hash, 'record_hash')
  requireArray(payload.supplier_results, 'supplier_results')
  requireArray(payload.component_inventory, 'component_inventory')
  requireArray(payload.conflict_queue, 'conflict_queue')
  requireArray(payload.workflow, 'workflow')
  requireArray(payload.trace?.answers, 'trace.answers')
  requireArray(payload.demo_transition?.states, 'demo_transition.states')
  requireArray(
    payload.demo_transition?.final_as_built_evidence_chain,
    'demo_transition.final_as_built_evidence_chain',
  )

  if (
    payload.workflow.length !== INDUSTRIAL_BASE_WORKFLOW.length ||
    payload.workflow.some(
      (step, index) => step !== INDUSTRIAL_BASE_WORKFLOW[index],
    )
  ) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear contract has an incompatible workflow.',
      'INCOMPATIBLE_CONTRACT',
    )
  }

  const readiness = payload.readiness
  if (!readiness || typeof readiness !== 'object') {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear contract is missing readiness.',
      'MALFORMED_CONTRACT',
    )
  }

  requireString(readiness.status, 'readiness.status')
  requireArray(readiness.blockers, 'readiness.blockers')

  if (
    readiness.ready_for_human_acceptance === true &&
    readiness.blockers.length > 0
  ) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear readiness fields disagree.',
      'UI_API_DISAGREEMENT',
    )
  }

  for (const supplier of payload.supplier_results) {
    validateStatusRecord(supplier.status)
  }

  for (const state of payload.demo_transition.states) {
    validateDemoState(state)
  }

  validateResponseFreshness(payload, now)

  return Object.freeze(payload)
}

function validateResponseFreshness(payload, now) {
  const generatedAt = payload.generated_at || payload.contract_generated_at

  if (!generatedAt) return

  const generatedTime = Date.parse(generatedAt)

  if (Number.isNaN(generatedTime)) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear contract has an invalid timestamp.',
      'STALE_CONTRACT',
    )
  }

  if ((now - generatedTime) / 1000 > MAX_AGE_SECONDS) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear contract is stale.',
      'STALE_CONTRACT',
    )
  }
}

function validateStatusRecord(status) {
  if (!status || typeof status !== 'object') {
    throw new IndustrialBaseContractError(
      'A scoped status record is missing.',
      'MALFORMED_CONTRACT',
    )
  }

  for (const key of [
    'status',
    'determined_by',
    'scope',
    'effective_date',
    'expiration_date',
  ]) {
    requireString(status[key], `status.${key}`)
  }

  requireArray(status.evidence_ids, 'status.evidence_ids')
  requireArray(status.conditions, 'status.conditions')

  if (typeof status.current_validity !== 'boolean') {
    throw new IndustrialBaseContractError(
      'A scoped status validity flag is missing.',
      'MALFORMED_CONTRACT',
    )
  }
}

function validateDemoState(state) {
  if (!state || typeof state !== 'object') {
    throw new IndustrialBaseContractError(
      'A demo transition state is missing.',
      'MALFORMED_CONTRACT',
    )
  }

  requireString(state.status, 'demo_transition.states.status')
  if (
    typeof state.summary !== 'string' &&
    typeof state.decision_basis !== 'string'
  ) {
    throw new IndustrialBaseContractError(
      'A demo transition state explanation is missing.',
      'MALFORMED_CONTRACT',
    )
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new IndustrialBaseContractError(
      `Atlas Nuclear contract field ${label} is missing.`,
      'MALFORMED_CONTRACT',
    )
  }
}

function requireEqual(value, expected, label) {
  if (value !== expected) {
    throw new IndustrialBaseContractError(
      `Atlas Nuclear contract field ${label} is incompatible.`,
      'INCOMPATIBLE_CONTRACT',
    )
  }
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new IndustrialBaseContractError(
      `Atlas Nuclear contract field ${label} is missing.`,
      'MALFORMED_CONTRACT',
    )
  }
}
