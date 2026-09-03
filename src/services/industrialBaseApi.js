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
const MAX_FUTURE_SKEW_SECONDS = 30
const EXPECTED_TENANT_ID = 'TENANT-ATLAS-DEMO'
const EXPECTED_PROJECT_ID = 'PROJECT-ATLAS-ONE-OHIO'

const READINESS_STATUSES = new Set([
  'BLOCKED',
  'READY_FOR_HUMAN_ACCEPTANCE',
])

const SUPPLIER_STATUSES = new Set([
  'IDENTIFIED',
  'SUPPLIER_CLAIM_UNVERIFIED',
  'EVIDENCE_SUBMITTED',
  'EVIDENCE_VERIFIED',
  'CUSTOMER_QUALIFIED_FOR_DEFINED_SCOPE',
  'NRC_AUTHORIZED_FOR_DEFINED_APPLICATION',
  'RESTRICTED',
  'EXPIRED',
  'SUPERSEDED',
  'SUSPENDED',
  'NOT_EVALUATED',
  'BLOCKED',
])

const LIFECYCLE_STATUSES = new Set([
  'BLOCKED',
  'RESOLUTION_EVIDENCE_SUBMITTED',
  'READY_FOR_HUMAN_REVIEW',
  'HUMAN_ACCEPTED_FOR_DEFINED_SCOPE',
  'NOT_EVALUATED',
])

const TRANSITION_STATUSES = new Set([
  'BLOCKED',
  'RESOLUTION_EVIDENCE_SUBMITTED',
  'READY_FOR_HUMAN_REVIEW',
  'HUMAN_ACCEPTED_FOR_DEFINED_SCOPE',
])

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
  requireEqual(payload.tenant_id, EXPECTED_TENANT_ID, 'tenant_id')
  requireEqual(payload.project_id, EXPECTED_PROJECT_ID, 'project_id')
  requireString(payload.record_hash, 'record_hash')
  validateResponseFreshness(payload, now)
  validateRegistries(payload.registries)
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
  requireAllowed(
    readiness.status,
    READINESS_STATUSES,
    'readiness.status',
  )
  requireArray(readiness.blockers, 'readiness.blockers')
  readiness.blockers.forEach((item) => requireString(item, 'readiness.blockers[]'))
  requireArray(readiness.warnings, 'readiness.warnings')
  readiness.warnings.forEach((item) => requireString(item, 'readiness.warnings[]'))
  if (typeof readiness.ready_for_human_acceptance !== 'boolean') {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear readiness boolean is missing.',
      'MALFORMED_CONTRACT',
    )
  }
  if (readiness.machine_findings_advisory !== true) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear readiness advisory boundary is missing.',
      'INCOMPATIBLE_CONTRACT',
    )
  }
  if (readiness.human_decision_required !== true) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear human-review boundary is missing.',
      'INCOMPATIBLE_CONTRACT',
    )
  }
  if (readiness.display_label_authoritative !== false) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear display label authority boundary is incompatible.',
      'INCOMPATIBLE_CONTRACT',
    )
  }

  if (
    readiness.status === 'BLOCKED' &&
    (readiness.ready_for_human_acceptance !== false ||
      readiness.blockers.length < 1)
  ) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear BLOCKED readiness fields disagree.',
      'UI_API_DISAGREEMENT',
    )
  }

  if (
    readiness.status === 'READY_FOR_HUMAN_ACCEPTANCE' &&
    (readiness.ready_for_human_acceptance !== true ||
      readiness.blockers.length !== 0)
  ) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear READY readiness fields disagree.',
      'UI_API_DISAGREEMENT',
    )
  }

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
    validateSupplier(supplier)
  }

  for (const component of payload.component_inventory) {
    validateComponent(component)
  }

  for (const conflict of payload.conflict_queue) {
    validateConflict(conflict)
  }

  for (const answer of payload.trace.answers) {
    validateTraceAnswer(answer)
  }

  for (const state of payload.demo_transition.states) {
    validateDemoState(state)
  }

  for (const evidenceId of payload.demo_transition.final_as_built_evidence_chain) {
    requireString(evidenceId, 'demo_transition.final_as_built_evidence_chain[]')
  }

  return Object.freeze(payload)
}

function validateResponseFreshness(payload, now) {
  const generatedAt = payload.generated_at || payload.contract_generated_at

  if (!generatedAt) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear contract timestamp is missing.',
      'STALE_CONTRACT',
    )
  }

  const generatedTime = Date.parse(generatedAt)

  if (Number.isNaN(generatedTime)) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear contract has an invalid timestamp.',
      'STALE_CONTRACT',
    )
  }

  if ((generatedTime - now) / 1000 > MAX_FUTURE_SKEW_SECONDS) {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear contract timestamp is in the future.',
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

function validateRegistries(registries) {
  if (!registries || typeof registries !== 'object') {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear contract registries are missing.',
      'MALFORMED_CONTRACT',
    )
  }

  requireArray(registries.workforce, 'registries.workforce')

  for (const worker of registries.workforce) {
    requireObject(worker, 'registries.workforce[]')
    requireString(worker.worker_id, 'worker.worker_id')
    requireString(worker.identity, 'worker.identity')
    requireString(worker.employer_organization_id, 'worker.employer_organization_id')
    requireString(worker.craft_or_trade, 'worker.craft_or_trade')
    requireArray(worker.credential_ids, 'worker.credential_ids')
    worker.credential_ids.forEach((id) => requireString(id, 'worker.credential_ids[]'))
  }
}

function validateSupplier(supplier) {
  requireObject(supplier, 'supplier_results[]')
  requireString(supplier.organization_id, 'supplier.organization_id')
  requireString(supplier.legal_entity_name, 'supplier.legal_entity_name')
  requireArray(supplier.roles, 'supplier.roles')
  supplier.roles.forEach((role) => requireString(role, 'supplier.roles[]'))
  requireArray(supplier.facilities, 'supplier.facilities')
  for (const facility of supplier.facilities) {
    requireObject(facility, 'supplier.facilities[]')
    requireString(facility.facility_id, 'facility.facility_id')
    requireString(facility.physical_location, 'facility.physical_location')
  }
  validateStatusRecord(supplier.status)

  if (supplier.qualification !== null) {
    requireObject(supplier.qualification, 'supplier.qualification')
    requireString(supplier.qualification.qualification_id, 'qualification.qualification_id')
    requireString(
      supplier.qualification.authorized_scope?.summary,
      'qualification.authorized_scope.summary',
    )
    requireString(supplier.qualification.qualification_basis, 'qualification.qualification_basis')
    requireArray(supplier.qualification.limitations, 'qualification.limitations')
    requireArray(supplier.qualification.evidence_ids, 'qualification.evidence_ids')
    requireString(supplier.qualification.effective_date, 'qualification.effective_date')
    requireString(supplier.qualification.expiration_date, 'qualification.expiration_date')
    requireString(supplier.qualification.human_reviewer, 'qualification.human_reviewer')
    requireString(supplier.qualification.decision_record_id, 'qualification.decision_record_id')
    supplier.qualification.limitations.forEach((item) => requireString(item, 'qualification.limitations[]'))
    supplier.qualification.evidence_ids.forEach((id) => requireString(id, 'qualification.evidence_ids[]'))
  }
}

function validateComponent(component) {
  requireObject(component, 'component_inventory[]')
  for (const key of [
    'component_id',
    'part_number',
    'lot_number',
    'heat_number',
    'purchase_order',
    'line_item',
    'lifecycle_status',
    'installed_location',
  ]) {
    requireString(component[key], `component.${key}`)
  }
  requireAllowed(
    component.lifecycle_status,
    LIFECYCLE_STATUSES,
    'component.lifecycle_status',
  )
}

function validateConflict(conflict) {
  requireObject(conflict, 'conflict_queue[]')
  requireString(conflict.finding_id, 'conflict.finding_id')
  requireString(conflict.severity, 'conflict.severity')
  requireString(conflict.issue, 'conflict.issue')
  requireArray(conflict.affected_component_ids, 'conflict.affected_component_ids')
  requireArray(conflict.affected_installation_ids, 'conflict.affected_installation_ids')
  requireArray(conflict.preserved_evidence_ids, 'conflict.preserved_evidence_ids')
  requireString(conflict.resolution_task, 'conflict.resolution_task')
  if (typeof conflict.requires_human_review !== 'boolean') {
    throw new IndustrialBaseContractError(
      'Atlas Nuclear conflict human-review flag is missing.',
      'MALFORMED_CONTRACT',
    )
  }
  conflict.affected_component_ids.forEach((id) => requireString(id, 'conflict.affected_component_ids[]'))
  conflict.affected_installation_ids.forEach((id) => requireString(id, 'conflict.affected_installation_ids[]'))
  conflict.preserved_evidence_ids.forEach((id) => requireString(id, 'conflict.preserved_evidence_ids[]'))
}

function validateTraceAnswer(answer) {
  requireObject(answer, 'trace.answers[]')
  requireString(answer.question, 'trace.answers.question')
  requireString(answer.answer, 'trace.answers.answer')
  requireArray(answer.evidence_ids, 'trace.answers.evidence_ids')
  answer.evidence_ids.forEach((id) => requireString(id, 'trace.answers.evidence_ids[]'))
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

  requireAllowed(status.status, SUPPLIER_STATUSES, 'status.status')
  requireArray(status.evidence_ids, 'status.evidence_ids')
  requireArray(status.conditions, 'status.conditions')
  status.evidence_ids.forEach((id) => requireString(id, 'status.evidence_ids[]'))
  status.conditions.forEach((condition) => requireString(condition, 'status.conditions[]'))

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
  requireAllowed(
    state.status,
    TRANSITION_STATUSES,
    'demo_transition.states.status',
  )
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

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new IndustrialBaseContractError(
      `Atlas Nuclear contract field ${label} is missing.`,
      'MALFORMED_CONTRACT',
    )
  }
}

function requireAllowed(value, allowed, label) {
  if (!allowed.has(value)) {
    throw new IndustrialBaseContractError(
      `Atlas Nuclear contract field ${label} has an unknown status.`,
      'INCOMPATIBLE_CONTRACT',
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
