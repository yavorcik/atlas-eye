import { useEffect, useMemo, useState } from 'react'
import './IndustrialBaseWorkspace.css'
import {
  INDUSTRIAL_BASE_WORKFLOW,
  fetchIndustrialBaseContract,
} from '../services/industrialBaseApi.js'

const panels = [
  ['DEFINE', 'Supplier Search'],
  ['QUALIFY', 'Scoped Qualification'],
  ['PROCURE', 'Component Inventory'],
  ['RECEIVE', 'Evidence Conflict Queue'],
  ['INSTALL', 'Workforce Assignment'],
  ['INSPECT', 'Trace This Component'],
  ['DEMONSTRATE', 'Resolution and Human Review'],
]

export default function IndustrialBaseWorkspace() {
  const [contract, setContract] = useState(null)
  const [failure, setFailure] = useState(null)
  const [activePanel, setActivePanel] = useState('DEFINE')
  const [activeTransition, setActiveTransition] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetchIndustrialBaseContract()
      .then((payload) => {
        if (cancelled) return
        setContract(payload)
        setFailure(null)
      })
      .catch((error) => {
        if (cancelled) return
        setContract(null)
        setFailure({
          code: error?.code || 'SERVICE_UNAVAILABLE',
          message:
            error?.message ||
            'Atlas Nuclear Industrial Base service is unavailable.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const activeTitle = useMemo(
    () => panels.find(([step]) => step === activePanel)?.[1],
    [activePanel],
  )

  if (failure) {
    return (
      <IndustrialShell>
        <section className="industrial-fail" role="alert">
          <p className="eyebrow">
            {failure.code === 'EVIDENCE_NOT_EVALUATED'
              ? 'EVIDENCE NOT EVALUATED'
              : 'SERVICE UNAVAILABLE'}
          </p>
          <h1>Atlas Nuclear contract unavailable.</h1>
          <p>{failure.message}</p>
          <dl>
            <div>
              <dt>Readiness display</dt>
              <dd>NOT CURRENT</dd>
            </div>
            <div>
              <dt>Recovery</dt>
              <dd>
                Verify the configured Atlas Nuclear Industrial Base
                service and reload this workspace.
              </dd>
            </div>
          </dl>
        </section>
      </IndustrialShell>
    )
  }

  if (!contract) {
    return (
      <IndustrialShell>
        <section className="industrial-fail" aria-live="polite">
          <p className="eyebrow">SERVICE CHECK</p>
          <h1>Loading governed Industrial Base contract.</h1>
        </section>
      </IndustrialShell>
    )
  }

  const transitionStates =
    contract.demo_transition?.states || []
  const visibleTransitionStates = transitionStates.slice(
    0,
    activeTransition + 1,
  )

  return (
    <IndustrialShell>
      <section
        className="industrial-workspace"
        aria-labelledby="industrial-title"
      >
        <div className="industrial-hero">
          <div>
            <p className="eyebrow">SUPPLIERS & COMPONENTS</p>
            <h1 id="industrial-title">
              Governed component traceability.
            </h1>
            <p>
              Trace qualified suppliers, nuclear craft,
              components, evidence, and installed configuration.
            </p>
          </div>
          <div
            className="industrial-status-card"
            data-state={statusTone(contract.readiness.status)}
          >
            <span>Current governed status</span>
            <strong>{contract.readiness.status}</strong>
            <small>Record hash {contract.record_hash}</small>
          </div>
        </div>

        <ol className="industrial-flow" aria-label="Industrial base workflow">
          {INDUSTRIAL_BASE_WORKFLOW.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="industrial-layout">
          <nav
            className="industrial-tabs"
            aria-label="Suppliers and components views"
          >
            {panels.map(([step, label]) => (
              <button
                type="button"
                key={step}
                aria-pressed={activePanel === step}
                onClick={() => setActivePanel(step)}
              >
                <span>{step}</span>
                <small>{label}</small>
              </button>
            ))}
          </nav>

          <section className="industrial-panel" aria-labelledby="industrial-panel-title">
            <h2 id="industrial-panel-title">{activeTitle}</h2>
            {activePanel === 'DEFINE' && (
              <SupplierResults contract={contract} />
            )}
            {activePanel === 'QUALIFY' && (
              <QualificationProfile contract={contract} />
            )}
            {activePanel === 'PROCURE' && (
              <ProcurementPanel
                contract={contract}
                onTrace={() => setActivePanel('INSPECT')}
              />
            )}
            {activePanel === 'RECEIVE' && (
              <ConflictPanel contract={contract} />
            )}
            {activePanel === 'INSTALL' && (
              <WorkforcePanel contract={contract} />
            )}
            {activePanel === 'INSPECT' && (
              <TracePanel contract={contract} />
            )}
            {activePanel === 'DEMONSTRATE' && (
              <DemonstrationPanel
                contract={contract}
                states={visibleTransitionStates}
                activeTransition={activeTransition}
                setActiveTransition={setActiveTransition}
              />
            )}
          </section>
        </div>
      </section>
    </IndustrialShell>
  )
}

function IndustrialShell({ children }) {
  return (
    <main className="industrial-route">
      <header className="workspace-header">
        <a className="brand" href="/" aria-label="Atlas Eye home">
          <span>A</span> ATLAS NUCLEAR
        </a>
        <div className="workspace-breadcrumb">
          <span>Mission Control</span>
          <strong>Suppliers & Components</strong>
        </div>
        <a className="button secondary compact" href="/mission-control/">
          Back to Mission Control
        </a>
      </header>
      {children}
    </main>
  )
}

function SupplierResults({ contract }) {
  return (
    <div className="industrial-list">
      {contract.supplier_results.map((supplier) => (
        <article className="industrial-row" key={supplier.organization_id}>
          <div>
            <strong>{supplier.legal_entity_name}</strong>
            <small>{supplier.roles.join(', ')}</small>
          </div>
          <ScopedStatus status={supplier.status} />
        </article>
      ))}
    </div>
  )
}

function QualificationProfile({ contract }) {
  const supplier = contract.supplier_results.find(
    (item) => item.qualification,
  )
  const qualification = supplier?.qualification
  const facility = supplier?.facilities?.[0]

  return (
    <div className="industrial-profile">
      <dl>
        <Field label="Manufacturer" value={supplier?.legal_entity_name} />
        <Field
          label="Distributor separation"
          value="Lokring Midwest is modeled only as distributor identity in this contract."
        />
        <Field label="Facility" value={facility?.physical_location} />
        <Field
          label="Product and service scope"
          value={qualification?.authorized_scope?.summary}
        />
        <Field
          label="Code/regulatory basis"
          value={qualification?.qualification_basis}
        />
        <Field
          label="Customer/application limits"
          value={qualification?.limitations?.join(' ')}
        />
        <Field
          label="Effective period"
          value={`${qualification?.effective_date} to ${qualification?.expiration_date}`}
        />
        <Field
          label="Reviewer"
          value={`${qualification?.human_reviewer} / ${qualification?.decision_record_id}`}
        />
      </dl>
      {qualification && <EvidenceList ids={qualification.evidence_ids} />}
    </div>
  )
}

function ProcurementPanel({ contract, onTrace }) {
  return (
    <div className="industrial-list">
      <button
        className="industrial-action"
        type="button"
        onClick={onTrace}
      >
        TRACE THIS COMPONENT
      </button>
      {contract.component_inventory.map((component) => (
        <article className="industrial-row" key={component.component_id}>
          <div>
            <strong>{component.component_id}</strong>
            <small>
              {component.part_number} · lot {component.lot_number} · heat{' '}
              {component.heat_number}
            </small>
          </div>
          <span className="industrial-badge industrial-badge-blocked">
            {component.lifecycle_status}
          </span>
          <p>{component.installed_location}</p>
        </article>
      ))}
    </div>
  )
}

function ConflictPanel({ contract }) {
  return (
    <div className="industrial-list">
      {contract.conflict_queue.map((item) => (
        <article className="industrial-row industrial-conflict" key={item.finding_id}>
          <div>
            <strong>{item.finding_id}</strong>
            <small>{item.severity}</small>
          </div>
          <p>{item.issue}</p>
          <Field
            label="Affected components"
            value={item.affected_component_ids.join(', ')}
          />
          <Field
            label="Installed locations"
            value={item.affected_installation_ids.join(', ')}
          />
          <Field label="Resolution task" value={item.resolution_task} />
          <EvidenceList ids={item.preserved_evidence_ids} />
        </article>
      ))}
    </div>
  )
}

function WorkforcePanel({ contract }) {
  return (
    <div className="industrial-list">
      {contract.registries.workforce.map((worker) => (
        <article className="industrial-row" key={worker.worker_id}>
          <div>
            <strong>{worker.identity}</strong>
            <small>{worker.craft_or_trade}</small>
          </div>
          <span className="industrial-badge">CURRENT</span>
          <EvidenceList ids={worker.credential_ids} />
        </article>
      ))}
    </div>
  )
}

function TracePanel({ contract }) {
  return (
    <div className="industrial-trace">
      {contract.trace.answers.map((answer) => (
        <article key={answer.question}>
          <h3>{answer.question}</h3>
          <p>{answer.answer}</p>
          <EvidenceList ids={answer.evidence_ids} />
        </article>
      ))}
    </div>
  )
}

function DemonstrationPanel({
  contract,
  states,
  activeTransition,
  setActiveTransition,
}) {
  const allStates = contract.demo_transition.states
  const canAdvance = activeTransition < allStates.length - 1

  return (
    <div className="industrial-demo">
      <div className="industrial-human-boundary">
        <strong>Atlas findings are advisory.</strong>
        <span>
          The displayed transition is supplied by Atlas Nuclear.
          AtlasEye does not calculate, widen, or overwrite governed status.
        </span>
      </div>
      <div className="industrial-action-row">
        <button
          type="button"
          className="industrial-action"
          disabled={activeTransition >= 1}
          onClick={() => setActiveTransition(1)}
        >
          Submit controlled resolution evidence
        </button>
        <button
          type="button"
          className="industrial-action"
          disabled={activeTransition >= 2}
          onClick={() => setActiveTransition(2)}
        >
          Route to qualified-human review
        </button>
        <button
          type="button"
          className="industrial-action"
          disabled={!canAdvance}
          onClick={() => setActiveTransition(3)}
        >
          Record controlled human decision
        </button>
      </div>
      <div className="industrial-transition-list">
        {states.map((state) => (
          <article key={state.status}>
            <strong>{state.status}</strong>
            <p>{state.summary || state.decision_basis}</p>
            {state.evidence_set_hash && (
              <small>Evidence-set hash {state.evidence_set_hash}</small>
            )}
            {state.reviewer && (
              <small>
                Reviewer {state.reviewer} / {state.role_authority}
              </small>
            )}
          </article>
        ))}
      </div>
      <p className="industrial-history">
        Final as-built evidence chain:{' '}
        {contract.demo_transition.final_as_built_evidence_chain.join(' · ')}
      </p>
    </div>
  )
}

function ScopedStatus({ status }) {
  return (
    <div className="industrial-status-detail">
      <span className={`industrial-badge ${statusTone(status.status)}`}>
        {status.status}
      </span>
      <dl>
        <Field label="Determined by" value={status.determined_by} />
        <Field label="Scope" value={status.scope} />
        <Field
          label="Effective"
          value={`${status.effective_date} to ${status.expiration_date}`}
        />
        <Field
          label="Current validity"
          value={status.current_validity ? 'CURRENT' : 'NOT CURRENT'}
        />
        <Field
          label="Conditions"
          value={
            status.conditions.length
              ? status.conditions.join(' ')
              : 'None stated in contract'
          }
        />
      </dl>
      <EvidenceList ids={status.evidence_ids} />
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || 'NOT EVALUATED'}</dd>
    </div>
  )
}

function EvidenceList({ ids = [] }) {
  return (
    <p className="industrial-evidence">
      {ids.map((id) => (
        <a key={id} href={`#evidence-${encodeURIComponent(id)}`}>
          {id}
        </a>
      ))}
    </p>
  )
}

function statusTone(status) {
  return String(status).includes('BLOCK') ||
    String(status).includes('UNVERIFIED') ||
    String(status).includes('EXPIRED') ||
    String(status).includes('SUSPENDED')
    ? 'industrial-badge-blocked'
    : 'industrial-badge-current'
}
