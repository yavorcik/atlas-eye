import './App.css'
import ReadinessReviewForm from './ReadinessReviewForm.jsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HistoricalAtlasNuclearEye from './components/HistoricalAtlasNuclearEye.jsx'

const STORE_KEY = 'atlas.publicDemoWorkspace.v2'
const SCHEMA_VERSION = 2
const MAX_FILE_SIZE = 512 * 1024
const supportedTypes = new Map([
  ['text/plain', 'Text'],
  ['text/markdown', 'Markdown'],
  ['text/csv', 'CSV'],
  ['application/json', 'JSON'],
])

const nowIso = () => new Date().toISOString()
const niceTime = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not saved yet'
const safeName = (value) => String(value || 'atlas-report').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()

const modules = [
  { href: '/mission-control/nuclear-readiness/', projectId: 'reactor-app', code: '01', title: 'Nuclear Readiness', text: 'Project overview, requirements, blockers, and next actions.' },
  { href: '/part53/', projectId: 'reactor-app', code: '02', title: 'Part 53 Application', text: 'Guided application draft with evidence and review gaps.' },
  { href: '/mission-control/transportation/', projectId: 'fuel-transport', code: '03', title: 'Transportation Readiness', text: 'Shipment facts, evidence blocker, review package, and change invalidation.' },
  { href: '/mission-control/evidence/', projectId: 'supplier-qualification', code: '04', title: 'Evidence / Governance', text: 'Evidence inventory, versions, findings, and history.' },
]

const sampleDocuments = {
  formationRecord: {
    id: 'sample-formation-record',
    name: 'sample-formation-record.txt',
    type: 'text/plain',
    scope: 'Advanced reactor application',
    text: `SAMPLE EVIDENCE - ORGANIZATION RECORD
Entity: Atlas Demo Energy LLC
State of organization: Ohio
Principal office: 100 Demo Industrial Parkway, Piketon, Ohio
Purpose: Development of an advanced reactor demonstration project.
Version: 2026-08-15
`,
  },
  safetySummary: {
    id: 'sample-safety-summary',
    name: 'sample-safety-summary.md',
    type: 'text/markdown',
    scope: 'Advanced reactor application',
    text: `# Sample Safety Analysis Summary

Scope: preliminary application assembly for a small advanced reactor demonstration.

Current status: thermal power envelope and site-interface assumptions remain under technical review.

Open issue: the controlled safety analysis has not been approved for application use.
`,
  },
  transportPackage: {
    id: 'sample-transport-package',
    name: 'sample-transport-package-record.json',
    type: 'application/json',
    scope: 'Fuel transportation',
    text: JSON.stringify({
      label: 'Sample transport package compatibility record',
      material: 'HALEU UF6',
      enrichmentWtPercent: 19.75,
      quantity: '12 kgU',
      packageEvidence: 'Demo package compatibility record loaded for public demonstration',
      reviewerStatus: 'Pending governed review',
    }, null, 2),
  },
  carrier: {
    id: 'sample-carrier-authority',
    name: 'sample-carrier-authority.txt',
    type: 'text/plain',
    scope: 'Fuel transportation',
    text: `SAMPLE EVIDENCE - CARRIER AUTHORITY
Carrier: Demo Nuclear Logistics LLC
Mode: highway
Represented authority: domestic highway movement support for the sample facts.
Limit: does not authorize a real shipment.
`,
  },
  supplierCurrent: {
    id: 'sample-supplier-current-qap',
    name: 'sample-supplier-quality-program-rev-c.txt',
    type: 'text/plain',
    scope: 'Supplier qualification',
    text: `SAMPLE EVIDENCE - SUPPLIER QUALITY PROGRAM
Supplier: ForgeWorks Demo Components
Document: Quality Program Manual
Revision: C
Effective: 2026-07-01
Status: Current according to supplier transmittal.
`,
  },
  supplierSuperseded: {
    id: 'sample-supplier-superseded-qap',
    name: 'sample-supplier-quality-program-rev-b.txt',
    type: 'text/plain',
    scope: 'Supplier qualification',
    text: `SAMPLE EVIDENCE - SUPERSEDED SUPPLIER DOCUMENT
Supplier: ForgeWorks Demo Components
Document: Quality Program Manual
Revision: B
Effective: 2025-03-01
Status: Superseded by Revision C.
`,
  },
}

const sourceRecords = {
  part53: {
    citation: '10 CFR Part 53, including §§ 53.1109 and 53.1413',
    version: 'eCFR Title 10 displayed up to date as of 2026-08-31; Title 10 last amended 2026-08-26',
    sourceUrl: 'https://www.ecfr.gov/current/title-10/chapter-I/part-53',
  },
  transportHrcq: {
    citation: '49 CFR § 173.403',
    version: 'eCFR Title 49 displayed up to date as of 2026-09-03; Title 49 last amended 2026-09-03',
    sourceUrl: 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-I/subchapter-C/part-173/subpart-I/section-173.403',
  },
  transportEmergency: {
    citation: '49 CFR Part 172 Subpart G',
    version: 'eCFR Title 49 displayed up to date as of 2026-09-03; Title 49 last amended 2026-09-03',
    sourceUrl: 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-I/subchapter-C/part-172/subpart-G',
  },
  atlasGovernance: {
    citation: 'Atlas public demo governance control',
    version: 'Public demo model v2',
    sourceUrl: '',
  },
}

const sampleHashes = {
  'sample-formation-record': '5c9617d93085f488b6c30cd00939ebbf2468a21de43fceefae87723b7da5e9bb',
  'sample-safety-summary': '9ccd13d33602228ecce62ab3e037632c14bbd6bee0859652129f57d6e57e2b00',
  'sample-transport-package': '5743b31d6874bf07d9305fd2b85e1a76c158d649f5b9cbdf2c498eb638f24678',
  'sample-carrier-authority': 'dcaa8283f50bb737290054b44ab83b64aec6ee6e69c57085ab45aaff4eea6ac8',
  'sample-supplier-current-qap': 'd10e3c3fedf22964739e48e9aa4c679a3d83bfce98c97c72f421f7ed79ce870d',
  'sample-supplier-superseded-qap': 'dffbeabd1812eda57d97acecb89d68d1c7337002ae98f58c0b3c039ef0c9d748',
}

function initialProjects() {
  return {
    'reactor-app': {
      id: 'reactor-app',
      name: 'Piketon Advanced Reactor COL Assembly',
      purpose: 'Assemble a bounded demonstration application draft and identify missing evidence before qualified review.',
      stage: 'Application assembly',
      scope: 'Small advanced reactor combined-license application preparation using representative public-demo facts.',
      route: '/mission-control/nuclear-readiness/',
      nextAction: 'Answer the safety-analysis question and link support.',
      role: 'Application owner',
      inputs: {
        legalName: 'Atlas Demo Energy LLC',
        address: '100 Demo Industrial Parkway, Piketon, Ohio',
        business: 'Advanced nuclear energy project developer',
        organization: 'Ohio limited liability company',
        authorization: 'Combined license for a new advanced reactor demonstration',
        safetyAnalysis: '',
        financialQualifications: 'Funding plan outline received; financial capacity review not complete.',
        environmentalInformation: 'Site environmental report outline started.',
      },
      requirements: [
        { id: 'p53-legal', title: 'Applicant identity', source: 'part53', relevance: 'The application scope includes applicant general information.', linkedEvidence: ['ev-formation'], status: 'supported', question: 'Confirm applicant legal name and organization record.' },
        { id: 'p53-financial', title: 'Financial qualifications', source: 'part53', relevance: 'The represented COL preparation includes applicant ability to carry out the proposed activity.', linkedEvidence: [], status: 'gap', question: 'Attach financial qualification support.' },
        { id: 'p53-safety', title: 'Safety analysis content', source: 'part53', relevance: 'The application draft cannot treat safety analysis as complete until a controlled record exists and is reviewed.', linkedEvidence: ['ev-safety'], status: 'review', question: 'What safety analysis supports this application?' },
        { id: 'p53-environment', title: 'Environmental information', source: 'part53', relevance: 'Environmental information is represented as in scope for this sample application.', linkedEvidence: [], status: 'gap', question: 'Attach environmental information support.' },
      ],
      guided: {
        current: 0,
        complete: false,
        questions: [
          { id: 'legalName', label: 'Applicant legal name', prompt: 'What legal entity is applying?', requirement: 'p53-legal' },
          { id: 'authorization', label: 'Requested authorization', prompt: 'What authorization is being requested?', requirement: 'p53-legal' },
          { id: 'safetyAnalysis', label: 'Safety analysis', prompt: 'What safety analysis supports the application?', requirement: 'p53-safety' },
          { id: 'financialQualifications', label: 'Financial qualifications', prompt: 'What financial information is available?', requirement: 'p53-financial' },
          { id: 'environmentalInformation', label: 'Environmental information', prompt: 'What environmental information is available?', requirement: 'p53-environment' },
        ],
      },
      evidence: {
        'ev-formation': seededEvidence('ev-formation', sampleDocuments.formationRecord, ['p53-legal'], 'processed'),
        'ev-safety': seededEvidence('ev-safety', sampleDocuments.safetySummary, ['p53-safety'], 'pending_review'),
      },
      history: [
        history('Workspace opened from sample project.', 'System'),
        history('Applicant identity sample evidence loaded.', 'Application owner'),
        history('Safety analysis marked pending review.', 'Technical reviewer'),
      ],
    },
    'fuel-transport': {
      id: 'fuel-transport',
      name: 'HALEU UF6 Highway Shipment Readiness',
      purpose: 'Build a transportation readiness package from shipment facts, evidence, findings, and governed demo review.',
      stage: 'Evidence blocker',
      scope: 'Domestic highway movement from Ohio enrichment facility to Pennsylvania advanced-reactor project; maritime and route-change scenarios are optional.',
      route: '/mission-control/transportation/',
      nextAction: 'Resolve package compatibility evidence.',
      role: 'Transportation compliance lead',
      inputs: {
        material: 'HALEU',
        form: 'UF6',
        enrichment: '19.75',
        quantity: '12 kgU',
        origin: 'Ohio enrichment facility',
        destination: 'Pennsylvania advanced-reactor project',
        hrcqStatus: 'Unresolved until activity/package threshold facts are recorded',
        packageEvidence: 'missing',
        carrierEvidence: 'supported',
        routeEvidence: 'supported',
        securityEvidence: 'plan_only',
        executionEvidence: 'pending',
        emergencyEvidence: 'pending',
        reviewer: 'Unassigned',
        governedDecision: 'pending',
        priorApprovalFingerprint: '',
        priorApprovalStatus: '',
      },
      requirements: [
        { id: 'trn-material', title: 'Material and HRCQ facts', source: 'transportHrcq', relevance: 'The sample movement includes Class 7/fissile-material facts that drive route and package questions.', linkedEvidence: [], status: 'gap', question: 'Record the activity/package threshold facts needed to resolve HRCQ.' },
        { id: 'trn-package', title: 'Package compatibility', source: 'atlasGovernance', relevance: 'Atlas cannot support shipment readiness unless a package compatibility record is linked to these represented contents.', linkedEvidence: [], status: 'gap', question: 'Attach or load package compatibility evidence.' },
        { id: 'trn-carrier', title: 'Carrier authority', source: 'atlasGovernance', relevance: 'The primary path assumes a domestic highway carrier and keeps authority distinct from package evidence.', linkedEvidence: ['ev-carrier'], status: 'supported', question: 'Confirm carrier authority evidence.' },
        { id: 'trn-response', title: 'Emergency response information', source: 'transportEmergency', relevance: 'Emergency response information is represented as a readiness node for the shipment package.', linkedEvidence: [], status: 'gap', question: 'Attach response organization or exercise evidence.' },
      ],
      evidence: {
        'ev-carrier': seededEvidence('ev-carrier', sampleDocuments.carrier, ['trn-carrier'], 'processed'),
      },
      review: {
        fingerprint: '',
        status: 'not_current',
        simulatedAcceptance: false,
      },
      history: [
        history('Shipment facts entered for the primary highway path.', 'Transportation lead'),
        history('Carrier authority sample evidence loaded.', 'Carrier manager'),
        history('Package compatibility evidence left unresolved.', 'Atlas'),
      ],
    },
    'supplier-qualification': {
      id: 'supplier-qualification',
      name: 'ForgeWorks Safety-Related Valve Supplier Review',
      purpose: 'Review a bounded supplier qualification package and expose a superseded/conflicting quality-program document.',
      stage: 'Review pending',
      scope: 'Desk review of quality program and calibration evidence for one sample safety-related valve supplier; not a complete supplier qualification engine.',
      route: '/mission-control/evidence/',
      nextAction: 'Replace the superseded quality-program document.',
      role: 'Supplier quality reviewer',
      inputs: {
        supplier: 'ForgeWorks Demo Components',
        itemScope: 'Safety-related valve body machining and final inspection records',
        reviewScope: 'Quality program and calibration record sample only',
        documentSet: 'Quality Program Manual Rev. B conflicts with supplier transmittal identifying Rev. C as current.',
      },
      requirements: [
        { id: 'sup-qap-current', title: 'Current quality program document', source: 'atlasGovernance', relevance: 'The bounded supplier review requires a current quality-program basis before review can proceed.', linkedEvidence: ['ev-supplier-old'], status: 'conflict', question: 'Replace the superseded quality program document.' },
        { id: 'sup-calibration', title: 'Calibration record sample', source: 'atlasGovernance', relevance: 'The sample scope includes one calibration-record check, not full supplier qualification.', linkedEvidence: [], status: 'gap', question: 'Attach a calibration record sample.' },
      ],
      evidence: {
        'ev-supplier-old': seededEvidence('ev-supplier-old', sampleDocuments.supplierSuperseded, ['sup-qap-current'], 'processed'),
      },
      history: [
        history('Supplier review opened with bounded sample scope.', 'Supplier quality reviewer'),
        history('Quality Program Manual Rev. B identified as superseded by supplier transmittal.', 'Atlas'),
      ],
    },
  }
}

function seededEvidence(id, document, linkedRequirements, status) {
  return {
    id,
    filename: document.name,
    size: new Blob([document.text]).size,
    type: document.type,
    hash: sampleHashes[document.id],
    attachedAt: '2026-09-01T14:00:00.000Z',
    version: 1,
    scope: document.scope,
    status,
    linkedRequirements,
    preview: document.text,
    source: 'sample',
    replacements: [],
    reviewStatus: status === 'pending_review' ? 'Pending human review' : 'Not reviewed for real-world acceptance',
  }
}

function history(action, actor) {
  return { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, at: nowIso(), actor, action }
}

function Shell({ title, eyebrow = 'MISSION CONTROL', children }) {
  return <main className="workspace-shell">
    <header className="workspace-header">
      <a className="brand" href="/" aria-label="Atlas Nuclear home"><span>A</span> ATLAS NUCLEAR</a>
      <div className="workspace-breadcrumb"><span>{eyebrow}</span><strong>{title}</strong></div>
      <a className="button secondary compact" href="/mission-control/">Mission Control</a>
    </header>
    {children}
  </main>
}

function Cover() {
  return <main className="cover-page">
    <section className="cover-panel" aria-labelledby="cover-title">
      <p className="launch-kicker">ATLAS NUCLEAR</p>
      <HistoricalAtlasNuclearEye />
      <p className="eyebrow">ATLAS EYE</p>
      <h1 id="cover-title">ATLAS EYE</h1>
      <p className="cover-copy">From concept to governed readiness.</p>
      <a className="button primary hero-primary" href="/mission-control/" data-primary-cover-cta="true">ENTER ATLAS <span aria-hidden="true">→</span></a>
    </section>
  </main>
}

function useWorkspace() {
  const [workspace, setWorkspace] = useState(() => ({ schemaVersion: SCHEMA_VERSION, projects: initialProjects(), lastSavedAt: '', saveStatus: 'idle', storageError: '', recovery: '' }))
  const first = useRef(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed?.schemaVersion !== SCHEMA_VERSION || !parsed.projects) {
        setWorkspace((current) => ({ ...current, recovery: 'Saved demo data uses an older schema. You can reset it, or continue with the current sample workspace.' }))
        return
      }
      setWorkspace({ ...parsed, saveStatus: 'saved', storageError: '', recovery: '' })
    } catch {
      setWorkspace((current) => ({ ...current, recovery: 'Saved demo data could not be read. Current samples remain available; reset only if you want to discard the unreadable browser record.' }))
    }
  }, [])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const payload = { schemaVersion: SCHEMA_VERSION, projects: workspace.projects, lastSavedAt: nowIso() }
    setWorkspace((current) => ({ ...current, saveStatus: 'saving', storageError: '' }))
    window.setTimeout(() => {
      try {
        if (window.__ATLAS_DEMO_FORCE_STORAGE_FAILURE__) throw new Error('Forced storage failure')
        localStorage.setItem(STORE_KEY, JSON.stringify(payload))
        setWorkspace((current) => ({ ...current, lastSavedAt: payload.lastSavedAt, saveStatus: 'saved', storageError: '' }))
      } catch (error) {
        setWorkspace((current) => ({ ...current, saveStatus: 'error', storageError: error instanceof Error ? error.message : 'Browser storage failed.' }))
      }
    }, 80)
  }, [workspace.projects])

  const updateProject = useCallback((projectId, updater) => {
    setWorkspace((current) => {
      const nextProject = updater(current.projects[projectId])
      return { ...current, projects: { ...current.projects, [projectId]: nextProject }, saveStatus: 'saving' }
    })
  }, [])

  const reset = useCallback(() => {
    if (!window.confirm('Reset this browser demo workspace? This removes saved sample progress on this device.')) return
    localStorage.removeItem(STORE_KEY)
    setWorkspace({ schemaVersion: SCHEMA_VERSION, projects: initialProjects(), lastSavedAt: '', saveStatus: 'saved', storageError: '', recovery: '' })
  }, [])

  return { workspace, updateProject, reset }
}

function evaluateProject(project) {
  const evidence = Object.values(project.evidence || {})
  const supportedEvidence = new Set(evidence.filter((item) => item.status === 'processed' || item.status === 'pending_review').map((item) => item.id))
  const findings = project.requirements.map((req) => {
    const linked = req.linkedEvidence.filter((id) => supportedEvidence.has(id))
    let status = req.status
    let reason = 'Evidence exists but human review remains separate from Atlas assessment.'
    if (req.status === 'supported' && linked.length) reason = 'Linked evidence exists for this sample requirement; real-world acceptance is not established.'
    if (req.status === 'review') reason = 'A supporting record exists, but qualified review is still needed.'
    if (req.status === 'gap' && linked.length) {
      status = 'review'
      reason = 'Processed evidence is linked; qualified review still has to determine relevance and acceptance.'
    }
    if (!linked.length) {
      status = 'gap'
      reason = 'No processed evidence is linked to this requirement.'
    }
    if (req.status === 'conflict') {
      const hasCurrent = evidence.some((item) => item.linkedRequirements.includes(req.id) && /rev-c|current/i.test(`${item.filename} ${item.preview}`))
      status = hasCurrent ? 'review' : 'conflict'
      reason = hasCurrent ? 'Replacement evidence is linked; reviewer must confirm supersession is resolved.' : 'The linked record appears superseded or conflicts with the represented current document set.'
    }
    if (project.id === 'fuel-transport' && req.id === 'trn-material' && !/unresolved/i.test(project.inputs.hrcqStatus || '')) {
      status = 'review'
      reason = 'Material and HRCQ threshold facts were entered; qualified review must confirm the represented threshold basis.'
    }
    return {
      id: `finding-${req.id}`,
      requirementId: req.id,
      title: req.title,
      status,
      reason,
      source: sourceRecords[req.source],
      relevantBecause: req.relevance,
      supportingEvidence: linked,
      missingEvidence: linked.length ? [] : ['Processed evidence linked to this requirement'],
      applicabilityQuestions: status === 'supported' ? [] : ['Does the sample scope fully match this requirement?', 'Has an authorized reviewer accepted the evidence?'],
      nextAction: req.question,
      role: project.role,
    }
  })

  if (project.id === 'fuel-transport') {
    const packageSupported = evidence.some((item) => item.linkedRequirements.includes('trn-package') && item.status !== 'failed')
    const hrcqResolved = !/unresolved/i.test(project.inputs.hrcqStatus)
    const nodesSupported = packageSupported && hrcqResolved && project.inputs.carrierEvidence === 'supported'
    const fingerprint = contentFingerprint({ inputs: project.inputs, evidence: evidence.map(({ hash, linkedRequirements, version }) => ({ hash, linkedRequirements, version })) })
    const priorCurrent = project.review?.fingerprint === fingerprint && project.review?.simulatedAcceptance
    findings.push({
      id: 'finding-trn-governed-review',
      requirementId: 'trn-governed-review',
      title: 'Governed transportation review',
      status: priorCurrent ? 'demo_accepted' : nodesSupported ? 'review' : 'gap',
      reason: priorCurrent ? 'A demonstration-only acceptance is current for this exact manifest fingerprint.' : nodesSupported ? 'Primary evidence nodes are ready for governed demo review.' : 'The exact unresolved prerequisite is package compatibility evidence plus HRCQ threshold facts.',
      source: sourceRecords.atlasGovernance,
      relevantBecause: 'The public demo preserves the human approval boundary and invalidates prior review when material facts or evidence change.',
      supportingEvidence: evidence.map((item) => item.id),
      missingEvidence: nodesSupported ? [] : ['Package compatibility evidence', 'Resolved HRCQ threshold facts'],
      applicabilityQuestions: ['Is the package evidence applicable to these material facts?', 'Has the authorized reviewer accepted this manifest?'],
      nextAction: nodesSupported ? 'Begin demonstration-only governed review.' : 'Open material facts and package compatibility inputs.',
      role: 'Governed reviewer',
      fingerprint,
    })
  }

  return findings
}

function contentFingerprint(value) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).slice(0, 24)
}

function Dashboard({ workspace, reset }) {
  const projects = Object.values(workspace.projects)
  return <Shell title="Project Workspace">
    <section className="module-page demo-workspace" aria-labelledby="dashboard-title">
      <DemoNotice workspace={workspace} reset={reset} />
      <p className="eyebrow">PUBLIC DEMONSTRATION</p>
      <h1 id="dashboard-title">Open a sample project.</h1>
      <p className="module-copy">Atlas now presents the public demo as a saved project workspace. Each project has its own inputs, evidence, findings, history, and report.</p>
      <div className="project-list" aria-label="Sample projects">
        {projects.map((project) => {
          const findings = evaluateProject(project)
          const unresolved = findings.filter((finding) => !['supported', 'demo_accepted'].includes(finding.status))
          return <a className="project-card" href={project.route} key={project.id}>
            <span className="project-stage">{project.stage}</span>
            <h2>{project.name}</h2>
            <p>{project.purpose}</p>
            <dl>
              <div><dt>Current condition</dt><dd>{unresolved.length} evidence gaps or review findings</dd></div>
              <div><dt>Last saved</dt><dd>{niceTime(workspace.lastSavedAt)}</dd></div>
              <div><dt>Primary next action</dt><dd>{project.nextAction}</dd></div>
            </dl>
          </a>
        })}
      </div>
      <div className="module-grid" aria-label="Capability navigation">
        {modules.map((item) => <a className="module-card compact-card" href={item.href} key={item.href}>
          <span className="module-icon" aria-hidden="true">{item.code}</span>
          <strong>{item.title}</strong>
          <small>{item.text}</small>
        </a>)}
      </div>
      <PresenterGuide />
    </section>
  </Shell>
}

function DemoNotice({ workspace, reset }) {
  return <div className={`demo-notice-panel save-${workspace.saveStatus}`} role="status">
    <strong>Demo workspace</strong>
    <span>Saved in this browser. Other devices will not see this demo workspace. Use sample or non-sensitive material.</span>
    <span>{workspace.saveStatus === 'saving' ? 'Saving...' : workspace.saveStatus === 'error' ? `Save failed: ${workspace.storageError}` : `Last saved: ${niceTime(workspace.lastSavedAt)}`}</span>
    {workspace.recovery ? <span className="warning">{workspace.recovery}</span> : null}
    <button type="button" className="button secondary compact" onClick={reset}>Reset saved demo</button>
  </div>
}

function PresenterGuide() {
  return <details className="presenter-panel">
    <summary>Presenter / advanced controls</summary>
    <ol>
      <li>Open Mission Control.</li>
      <li>Select a sample project.</li>
      <li>Explain its starting condition in Overview.</li>
      <li>Open Requirements / application and inspect one requirement with supporting evidence.</li>
      <li>Use Load sample evidence or Replace evidence to resolve one demonstrated gap.</li>
      <li>Open Findings and actions and point out the changed finding and history record.</li>
      <li>Open Report, then Download HTML report or Download evidence/action register.</li>
      <li>Reload the page and show the saved browser-local progress.</li>
    </ol>
    <p>The public demo uses local browser storage and demonstration-only review records. A licensed private workspace would add authenticated users, controlled storage, permissions, production evidence custody, and authorized review workflows.</p>
  </details>
}

function ProjectWorkspace({ projectId, initialView, workspace, updateProject, reset }) {
  const project = workspace.projects[projectId] || workspace.projects['reactor-app']
  const [view, setView] = useState(initialView || 'overview')
  const [selectedEvidence, setSelectedEvidence] = useState('')
  const findings = useMemo(() => evaluateProject(project), [project])
  const activeEvidence = selectedEvidence ? project.evidence[selectedEvidence] : null

  function patchProject(mutator) {
    updateProject(project.id, (current) => {
      const next = structuredClone(current)
      mutator(next)
      return next
    })
  }

  function setInput(key, value) {
    patchProject((next) => {
      if (key === '__guidedCurrent') {
        next.guided.current = Number(value)
        next.history.unshift(history(`Moved guided application to question ${Number(value) + 1}.`, 'Visitor'))
        return
      }
      if (key === '__guidedBack') {
        next.guided.current = Math.max(0, next.guided.current - 1)
        next.history.unshift(history(`Returned guided application to question ${next.guided.current + 1}.`, 'Visitor'))
        return
      }
      if (key === '__guidedComplete') {
        next.guided.complete = true
        next.history.unshift(history('Completed the guided demonstration and opened application results.', 'Visitor'))
        return
      }
      next.inputs[key] = value
      next.history.unshift(history(`Updated ${key}. Affected findings were reevaluated.`, 'Visitor'))
      if (next.id === 'fuel-transport' && next.review?.simulatedAcceptance) {
        next.review.simulatedAcceptance = false
        next.review.status = 'stale'
        next.history.unshift(history('Prior transportation review marked stale after material scope or evidence changed.', 'Atlas'))
      }
    })
  }

  function linkEvidence(evidenceId, requirementId) {
    patchProject((next) => {
      const evidence = next.evidence[evidenceId]
      const requirement = next.requirements.find((item) => item.id === requirementId)
      if (!evidence || !requirement) return
      evidence.linkedRequirements = Array.from(new Set([...evidence.linkedRequirements, requirementId]))
      requirement.linkedEvidence = Array.from(new Set([...requirement.linkedEvidence, evidenceId]))
      next.history.unshift(history(`Linked ${evidence.filename} to ${requirement.title}.`, 'Visitor'))
    })
  }

  async function attachFile(file, requirementId, replaceId = '') {
    const processed = await processEvidenceFile(file, project.scope)
    patchProject((next) => {
      const id = replaceId || `ev-${Date.now()}`
      const previous = next.evidence[id]
      next.evidence[id] = {
        ...processed,
        id,
        version: previous ? previous.version + 1 : 1,
        linkedRequirements: requirementId ? [requirementId] : [],
        replacements: previous ? [...(previous.replacements || []), { filename: previous.filename, hash: previous.hash, version: previous.version, replacedAt: nowIso(), status: previous.status }] : [],
        reviewStatus: processed.status === 'failed' ? 'Not reviewable' : 'Pending human review',
      }
      if (requirementId) {
        const req = next.requirements.find((item) => item.id === requirementId)
        if (req) req.linkedEvidence = Array.from(new Set([...req.linkedEvidence.filter((x) => x !== replaceId), id]))
      }
      if (next.id === 'fuel-transport' && next.review?.simulatedAcceptance) {
        next.review.simulatedAcceptance = false
        next.review.status = 'stale'
      }
      next.history.unshift(history(`${replaceId ? 'Replaced' : 'Attached'} ${processed.filename}: ${processed.status}.`, 'Visitor'))
    })
    setSelectedEvidence(replaceId || '')
  }

  async function loadSampleEvidence(requirementId) {
    const sample = chooseSample(project.id, requirementId)
    const file = new File([sample.text], sample.name, { type: sample.type, lastModified: Date.now() })
    await attachFile(file, requirementId)
  }

  function acceptTransportationDemo() {
    const governed = findings.find((finding) => finding.id === 'finding-trn-governed-review')
    if (!governed || governed.status !== 'review') return
    patchProject((next) => {
      next.review = { fingerprint: governed.fingerprint, status: 'accepted_demo_only', simulatedAcceptance: true, acceptedAt: nowIso() }
      next.history.unshift(history('Demonstration-only transportation acceptance recorded for the current manifest fingerprint.', 'Demo authorized reviewer'))
    })
  }

  return <Shell title={project.name}>
    <section className="project-workspace">
      <DemoNotice workspace={workspace} reset={reset} />
      <ProjectHeader project={project} findings={findings} />
      <nav className="project-tabs" aria-label="Project workspace">
        {[
          ['overview', 'Overview'],
          ['requirements', project.id === 'reactor-app' ? 'Requirements / application' : 'Requirements'],
          ['evidence', 'Evidence'],
          ['findings', 'Findings and actions'],
          ['history', 'History'],
          ['report', 'Report'],
        ].map(([id, label]) => <button className={view === id ? 'active' : ''} type="button" onClick={() => setView(id)} key={id}>{label}</button>)}
      </nav>
      {view === 'overview' ? <Overview project={project} findings={findings} setView={setView} /> : null}
      {view === 'requirements' ? <Requirements project={project} findings={findings} setInput={setInput} linkEvidence={linkEvidence} loadSampleEvidence={loadSampleEvidence} attachFile={attachFile} acceptTransportationDemo={acceptTransportationDemo} /> : null}
      {view === 'evidence' ? <EvidenceInventory project={project} activeEvidence={activeEvidence} setSelectedEvidence={setSelectedEvidence} attachFile={attachFile} linkEvidence={linkEvidence} /> : null}
      {view === 'findings' ? <Findings project={project} findings={findings} /> : null}
      {view === 'history' ? <History project={project} /> : null}
      {view === 'report' ? <Report project={project} findings={findings} /> : null}
    </section>
  </Shell>
}

function ProjectHeader({ project, findings }) {
  const unresolved = findings.filter((finding) => !['supported', 'demo_accepted'].includes(finding.status))
  return <header className="project-hero">
    <p className="eyebrow">{project.stage}</p>
    <h1>{project.name}</h1>
    <div className="status-strip">
      <span>{unresolved.length} unresolved findings</span>
      <span>{Object.keys(project.evidence).length} evidence records</span>
      <span>{project.role}</span>
    </div>
    <p>{project.purpose}</p>
  </header>
}

function Overview({ project, findings, setView }) {
  const open = findings.filter((finding) => !['supported', 'demo_accepted'].includes(finding.status))
  return <div className="workspace-grid">
    <section className="panel wide">
      <h2>Current Condition</h2>
      <p>{project.scope}</p>
      <div className="summary-grid">
        <article><span>What this project is trying to accomplish</span><strong>{project.purpose}</strong></article>
        <article><span>What Atlas identified</span><strong>{open.length ? `${open.length} unresolved evidence or review findings` : 'No unresolved demo findings'}</strong></article>
        <article><span>What the visitor should do next</span><strong>{project.nextAction}</strong></article>
        <article><span>Deliverable</span><strong>{project.id === 'reactor-app' ? 'Application draft and evidence/action register' : project.id === 'fuel-transport' ? 'Transportation readiness package' : 'Supplier review report'}</strong></article>
      </div>
    </section>
    <section className="panel">
      <h2>Next Actions</h2>
      <ul className="action-list">{open.slice(0, 4).map((finding) => <li key={finding.id}><strong>{finding.nextAction}</strong><span>{finding.role}</span></li>)}</ul>
      <button type="button" className="button primary" onClick={() => setView('requirements')}>Continue work</button>
    </section>
    <section className="panel">
      <h2>Review Records</h2>
      <ul className="plain-list">{project.history.slice(0, 4).map((item) => <li key={item.id}>{niceTime(item.at)} · {item.action}</li>)}</ul>
    </section>
  </div>
}

function Requirements({ project, findings, setInput, linkEvidence, loadSampleEvidence, attachFile, acceptTransportationDemo }) {
  const [editingQuestion, setEditingQuestion] = useState(null)
  const guided = project.guided
  const currentQuestion = guided?.questions[guided.current]
  const completeGuided = guided && guided.current >= guided.questions.length - 1
  return <div className="workspace-grid">
    {project.id === 'reactor-app' ? <section className="panel wide" data-testid="part53-builder">
      <h2>{guided.complete ? 'Application Results' : 'Guided Application'}</h2>
      {!guided.complete ? <div className="guided-box">
        <p className="citation">{sourceRecords.part53.citation}</p>
        <label>{currentQuestion.prompt}<textarea value={project.inputs[currentQuestion.id] || ''} onChange={(event) => setInput(currentQuestion.id, event.target.value)} /></label>
        <div className="button-row">
          <button type="button" className="button secondary" disabled={guided.current === 0} onClick={() => setInput('__guidedBack', '') || null}>Back</button>
          <button type="button" className="button primary" onClick={() => setGuidedStep(project, setInput, completeGuided ? 'complete' : 'next')}>{completeGuided ? 'Finish guided demonstration' : 'Save and continue'}</button>
        </div>
      </div> : <ApplicationDraft project={project} editingQuestion={editingQuestion} setEditingQuestion={setEditingQuestion} setInput={setInput} />}
    </section> : null}
    {project.id === 'fuel-transport' ? <TransportationPath project={project} findings={findings} setInput={setInput} loadSampleEvidence={loadSampleEvidence} acceptTransportationDemo={acceptTransportationDemo} /> : null}
    <section className="panel wide">
      <h2>Requirements</h2>
      <div className="requirement-list">
        {project.requirements.map((req) => {
          const finding = findings.find((item) => item.requirementId === req.id)
          return <article className="requirement-card" key={req.id}>
            <div>
              <span className={`status-pill ${finding?.status}`}>{readableStatus(finding?.status)}</span>
              <h3>{req.title}</h3>
              <p>{req.relevance}</p>
              <p className="citation">{sourceRecords[req.source].citation} · {sourceRecords[req.source].version}</p>
            </div>
            <EvidenceLinks req={req} evidence={project.evidence} linkEvidence={linkEvidence} />
            <div className="button-row">
              <button type="button" className="button secondary compact" onClick={() => loadSampleEvidence(req.id)}>Load sample evidence</button>
              <label className="file-button">Attach evidence<input type="file" onChange={(event) => event.target.files?.[0] && attachFile(event.target.files[0], req.id)} /></label>
            </div>
            <p className="finding-reason">{finding?.reason}</p>
          </article>
        })}
      </div>
    </section>
  </div>
}

function setGuidedStep(project, setInput, action) {
  const questions = project.guided.questions
  if (action === 'complete') {
    setInput('__guidedComplete', 'true')
    return
  }
  const next = Math.min(project.guided.current + 1, questions.length - 1)
  setInput('__guidedCurrent', String(next))
}

function ApplicationDraft({ project, editingQuestion, setEditingQuestion, setInput }) {
  const missing = project.guided.questions.filter((q) => !String(project.inputs[q.id] || '').trim())
  return <div className="application-draft" data-testid="part53-results">
    <p>Completion of this guided demonstration means the visitor reached the results view. It does not mean the application is complete or accepted.</p>
    {project.guided.questions.map((q) => <article key={q.id}>
      <h3>{q.label}</h3>
      {editingQuestion === q.id ? <label>Edit answer<textarea value={project.inputs[q.id] || ''} onChange={(event) => setInput(q.id, event.target.value)} /><button type="button" className="button primary compact" onClick={() => setEditingQuestion(null)}>Save edit</button></label> : <>
        <p>{project.inputs[q.id] || 'Missing section'}</p>
        <button type="button" className="button secondary compact" onClick={() => setEditingQuestion(q.id)}>Edit answer</button>
      </>}
    </article>)}
    <h3>Missing sections, evidence gaps, and review needs</h3>
    <ul>{missing.map((q) => <li key={q.id}>{q.label} answer is missing.</li>)}<li>Financial, safety, environmental, and legal eligibility evidence still require human review.</li></ul>
  </div>
}

function TransportationPath({ project, findings, setInput, loadSampleEvidence, acceptTransportationDemo }) {
  const governed = findings.find((finding) => finding.id === 'finding-trn-governed-review')
  return <section className="panel wide transportation-path">
    <h2>Your transportation readiness package</h2>
    <div className="sticky-step">
      <strong>Active step: material and shipment facts</strong>
      <span>{findings.filter((finding) => !['supported', 'demo_accepted'].includes(finding.status)).length} unresolved findings</span>
    </div>
    <div className="form-grid">
      {[
        ['material', 'Material'],
        ['form', 'Physical or chemical form'],
        ['enrichment', 'U-235 enrichment wt%'],
        ['quantity', 'Quantity'],
        ['origin', 'Origin'],
        ['destination', 'Destination'],
        ['hrcqStatus', 'HRCQ threshold status'],
      ].map(([key, label]) => <label key={key}>{label}<input value={project.inputs[key] || ''} onChange={(event) => setInput(key, event.target.value)} /></label>)}
    </div>
    <p className="warning">Exact unresolved prerequisite: package compatibility evidence linked to the represented HALEU UF6 material facts, plus resolved HRCQ threshold facts.</p>
    <div className="button-row">
      <button type="button" className="button primary" onClick={() => loadSampleEvidence('trn-package')}>Load sample package evidence</button>
      <button type="button" className="button secondary" onClick={() => setInput('hrcqStatus', 'Resolved for this sample package threshold')}>Resolve HRCQ facts</button>
      <button type="button" className="button secondary" disabled={governed?.status !== 'review'} onClick={acceptTransportationDemo}>Simulate governed acceptance</button>
    </div>
    {project.review?.status === 'stale' ? <p className="warning">Prior demonstration review is stale. Reevaluation did not silently reapprove the changed manifest.</p> : null}
    {project.review?.simulatedAcceptance ? <p className="demo-acceptance">Demonstration-only acceptance is current for this manifest. This is not a real shipment authorization.</p> : null}
    <details><summary>Detailed authority and evidence sections</summary><Findings project={project} findings={findings} compact /></details>
    <details><summary>Optional maritime/change scenarios</summary><p>Switching to maritime or changing material facts creates a new scope and invalidates any prior demonstration review until reevaluated.</p><button type="button" className="button secondary compact" onClick={() => setInput('destination', 'Demo marine terminal and overseas receiving site')}>Apply optional maritime destination</button></details>
  </section>
}

function EvidenceLinks({ req, evidence, linkEvidence }) {
  const allEvidence = Object.values(evidence)
  return <div className="evidence-links">
    <strong>Evidence</strong>
    {req.linkedEvidence.length ? <ul>{req.linkedEvidence.map((id) => <li key={id}>{evidence[id]?.filename || id}</li>)}</ul> : <p>No linked evidence.</p>}
    <label>Link existing evidence<select defaultValue="" onChange={(event) => event.target.value && linkEvidence(event.target.value, req.id)}>
      <option value="">Choose evidence</option>
      {allEvidence.map((item) => <option value={item.id} key={item.id}>{item.filename}</option>)}
    </select></label>
  </div>
}

function EvidenceInventory({ project, activeEvidence, setSelectedEvidence, attachFile, linkEvidence }) {
  const items = Object.values(project.evidence)
  return <div className="workspace-grid">
    <section className="panel wide">
      <h2>Evidence Inventory</h2>
      <p>Attachments are processed in this browser only. Atlas records existence, integrity, relevance links, review status, and replacement history separately.</p>
      <div className="evidence-table">
        {items.map((item) => <article key={item.id}>
          <button type="button" className="evidence-open" onClick={() => setSelectedEvidence(item.id)}>{item.filename}</button>
          <span className={`status-pill ${item.status}`}>{readableStatus(item.status)}</span>
          <span>v{item.version}</span>
          <span>{item.type}</span>
          <span>{item.hash.slice(0, 16)}</span>
        </article>)}
      </div>
      <label className="file-button">Attach unlinked evidence<input type="file" onChange={(event) => event.target.files?.[0] && attachFile(event.target.files[0], '')} /></label>
    </section>
    <section className="panel">
      <h2>Inspectable Record</h2>
      {activeEvidence ? <EvidencePreview item={activeEvidence} requirements={project.requirements} linkEvidence={linkEvidence} attachFile={attachFile} /> : <p>Select an evidence record to inspect preview text, hash, versions, and links.</p>}
    </section>
  </div>
}

function EvidencePreview({ item, requirements, linkEvidence, attachFile }) {
  return <div className="evidence-preview" data-testid="evidence-preview">
    <dl>
      <div><dt>Filename</dt><dd>{item.filename}</dd></div>
      <div><dt>Hash</dt><dd>{item.hash}</dd></div>
      <div><dt>Attached</dt><dd>{niceTime(item.attachedAt)}</dd></div>
      <div><dt>Status</dt><dd>{readableStatus(item.status)}</dd></div>
      <div><dt>Review</dt><dd>{item.reviewStatus}</dd></div>
    </dl>
    <pre>{item.preview || item.failureReason || 'No supported preview available.'}</pre>
    <label>Link to requirement<select defaultValue="" onChange={(event) => event.target.value && linkEvidence(item.id, event.target.value)}>
      <option value="">Choose requirement</option>
      {requirements.map((req) => <option value={req.id} key={req.id}>{req.title}</option>)}
    </select></label>
    <label className="file-button">Replace evidence<input type="file" onChange={(event) => event.target.files?.[0] && attachFile(event.target.files[0], item.linkedRequirements[0] || '', item.id)} /></label>
    {item.replacements?.length ? <details open><summary>Replacement history</summary><ul>{item.replacements.map((entry) => <li key={`${entry.hash}-${entry.version}`}>v{entry.version} {entry.filename} replaced {niceTime(entry.replacedAt)} · {entry.hash.slice(0, 16)}</li>)}</ul></details> : null}
  </div>
}

function Findings({ project, findings, compact = false }) {
  return <section className={compact ? '' : 'panel wide'}>
    {!compact ? <h2>Findings and Actions</h2> : null}
    <div className="finding-list">
      {findings.map((finding) => <article className="finding-card" key={finding.id}>
        <span className={`status-pill ${finding.status}`}>{readableStatus(finding.status)}</span>
        <h3>{finding.title}</h3>
        <p>{finding.reason}</p>
        <dl>
          <div><dt>Source</dt><dd>{finding.source.citation}</dd></div>
          <div><dt>Source/version</dt><dd>{finding.source.version}</dd></div>
          <div><dt>Relevant because</dt><dd>{finding.relevantBecause}</dd></div>
          <div><dt>Supporting evidence</dt><dd>{finding.supportingEvidence.map((id) => project.evidence[id]?.filename || id).join(', ') || 'None'}</dd></div>
          <div><dt>Missing evidence</dt><dd>{finding.missingEvidence.join(', ') || 'None represented'}</dd></div>
          <div><dt>Applicability questions</dt><dd>{finding.applicabilityQuestions.join(' ') || 'None represented'}</dd></div>
          <div><dt>Next action</dt><dd>{finding.nextAction}</dd></div>
        </dl>
      </article>)}
    </div>
  </section>
}

function History({ project }) {
  return <section className="panel wide">
    <h2>History</h2>
    <ol className="history-list">{project.history.map((entry) => <li key={entry.id}><strong>{niceTime(entry.at)}</strong><span>{entry.actor}</span><p>{entry.action}</p></li>)}</ol>
  </section>
}

function Report({ project, findings }) {
  const report = buildReport(project, findings)
  return <section className="panel wide report-panel">
    <h2>Project Report</h2>
    <div className="button-row">
      <button type="button" className="button primary" onClick={() => download(`${safeName(project.name)}.html`, report.html, 'text/html')}>Download HTML report</button>
      <button type="button" className="button secondary" onClick={() => download(`${safeName(project.name)}-evidence-register.csv`, report.csv, 'text/csv')}>Download evidence/action register</button>
      <button type="button" className="button secondary" onClick={() => window.print()}>Print / save PDF</button>
    </div>
    <article className="print-report" dangerouslySetInnerHTML={{ __html: report.body }} />
  </section>
}

function buildReport(project, findings) {
  const generated = nowIso()
  const evidenceRows = Object.values(project.evidence).map((item) => [item.filename, item.version, item.status, item.hash, item.linkedRequirements.join('; ')])
  const csv = ['Filename,Version,Status,Hash,Linked requirements', ...evidenceRows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))].join('\n')
  const body = `<h1>${esc(project.name)}</h1>
    <p><strong>Generated:</strong> ${esc(niceTime(generated))}</p>
    <p><strong>Stage:</strong> ${esc(project.stage)}</p>
    <p><strong>Purpose:</strong> ${esc(project.purpose)}</p>
    <p><strong>Represented scope:</strong> ${esc(project.scope)}</p>
    <h2>Inputs / Application Draft</h2>${Object.entries(project.inputs).map(([key, value]) => `<p><strong>${esc(labelize(key))}:</strong> ${esc(value || 'Missing')}</p>`).join('')}
    <h2>Evidence Inventory and Versions</h2>${Object.values(project.evidence).map((item) => `<p><strong>${esc(item.filename)}</strong> v${item.version} · ${esc(readableStatus(item.status))} · ${esc(item.hash)} · linked: ${esc(item.linkedRequirements.join(', ') || 'None')}</p>`).join('')}
    <h2>Findings and Basis</h2>${findings.map((finding) => `<section><h3>${esc(finding.title)} · ${esc(readableStatus(finding.status))}</h3><p>${esc(finding.reason)}</p><p><strong>Basis:</strong> ${esc(finding.source.citation)} · ${esc(finding.source.version)}</p><p><strong>Unresolved gaps/conflicts:</strong> ${esc([...finding.missingEvidence, ...finding.applicabilityQuestions].join(' ') || 'None represented')}</p><p><strong>Next action:</strong> ${esc(finding.nextAction)} · ${esc(finding.role)}</p></section>`).join('')}
    <h2>History</h2>${project.history.map((entry) => `<p>${esc(niceTime(entry.at))} · ${esc(entry.actor)} · ${esc(entry.action)}</p>`).join('')}
    <h2>Demo Limitations</h2><p>This public demonstration uses browser-local storage, sample evidence, and simulated review. It does not upload documents to Atlas, create a regulatory submission, grant authorization, provide real shipment authorization, authorize a real shipment, or represent NRC, DOT, PHMSA, supplier, carrier, or human acceptance.</p>`
  return { body, html: `<!doctype html><html><head><meta charset="utf-8"><title>${esc(project.name)} report</title><style>body{font-family:Arial,sans-serif;line-height:1.5;max-width:960px;margin:40px auto;color:#111}h1,h2{border-bottom:1px solid #ccc;padding-bottom:6px}</style></head><body>${body}</body></html>`, csv }
}

async function processEvidenceFile(file, scope) {
  const base = { filename: file.name, size: file.size, type: file.type || 'application/octet-stream', attachedAt: nowIso(), scope, status: 'processing', linkedRequirements: [], preview: '', replacements: [] }
  if (file.size > MAX_FILE_SIZE) return { ...base, status: 'failed', hash: 'not-computed', failureReason: 'File is larger than the 512 KB public-demo limit.' }
  const extension = file.name.split('.').pop()?.toLowerCase()
  const typeSupported = supportedTypes.has(file.type) || ['txt', 'md', 'markdown', 'csv', 'json'].includes(extension)
  const buffer = await file.arrayBuffer()
  const hash = await sha256(buffer)
  if (!typeSupported) return { ...base, hash, status: 'failed', failureReason: 'Unsupported file type. This public demo processes TXT, Markdown, CSV, and JSON only.' }
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  if (file.type === 'application/json' || extension === 'json') {
    try { JSON.parse(text) } catch { return { ...base, hash, status: 'failed', failureReason: 'Malformed JSON. Atlas computed a hash but did not treat the file as extracted evidence.' } }
  }
  if (text.includes('\u0000')) return { ...base, hash, status: 'failed', failureReason: 'File content does not appear to be a supported text document.' }
  return { ...base, hash, status: 'processed', preview: text.slice(0, 5000) }
}

async function sha256(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function chooseSample(projectId, requirementId) {
  if (projectId === 'reactor-app' && requirementId === 'p53-legal') return sampleDocuments.formationRecord
  if (projectId === 'reactor-app') return sampleDocuments.safetySummary
  if (projectId === 'fuel-transport' && requirementId === 'trn-carrier') return sampleDocuments.carrier
  if (projectId === 'fuel-transport') return sampleDocuments.transportPackage
  if (projectId === 'supplier-qualification' && requirementId === 'sup-qap-current') return sampleDocuments.supplierCurrent
  return sampleDocuments.supplierCurrent
}

function readableStatus(status) {
  return ({
    supported: 'Evidence linked',
    gap: 'Evidence gap',
    review: 'Review needed',
    conflict: 'Conflict',
    processed: 'Processed',
    processing: 'Processing',
    failed: 'Failed',
    attached: 'Attached',
    pending_review: 'Pending review',
    demo_accepted: 'Demo accepted',
  })[status] || labelize(status)
}

function labelize(value) {
  return String(value || '').replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function download(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

function Privacy() {
  return <main><section className="section"><p className="eyebrow">PRIVACY NOTICE</p><h1>Atlas Nuclear inquiry privacy</h1><p>Atlas Nuclear uses project-readiness inquiry information only to respond to the inquiry. Do not submit safeguards information, security-sensitive information, export-controlled technical data, proprietary reactor information, or controlled project records.</p><p>Submitting an inquiry does not create an attorney-client relationship, engineering engagement, project approval, regulatory submission, or authorization to proceed.</p><a className="button primary" href="/">Return to Atlas Nuclear</a></section></main>
}

function routeInfo(path) {
  if (path.startsWith('/part53') || path.startsWith('/part53-workspace')) return { projectId: 'reactor-app', view: 'requirements' }
  if (path.startsWith('/transportation')) return { projectId: 'fuel-transport', view: 'requirements' }
  if (path.startsWith('/mission-control/transportation')) return { projectId: 'fuel-transport', view: 'requirements' }
  if (path.startsWith('/mission-control/evidence')) return { projectId: 'supplier-qualification', view: 'evidence' }
  if (path.startsWith('/mission-control/nuclear-readiness')) return { projectId: 'reactor-app', view: 'overview' }
  return null
}

function App() {
  const [reviewOpen, setReviewOpen] = useState(false)
  const closeReview = useCallback(() => setReviewOpen(false), [])
  const { workspace, updateProject, reset } = useWorkspace()
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/privacy') return <Privacy />
  if (path === '/mission-control') return <><Dashboard workspace={workspace} reset={reset} /><ReadinessReviewForm open={reviewOpen} onClose={closeReview} /></>
  const route = routeInfo(path)
  if (route) return <ProjectWorkspace projectId={route.projectId} initialView={route.view} workspace={workspace} updateProject={updateProject} reset={reset} />
  if (path === '/demo') { window.location.replace('https://lab.atlaseye.ai'); return null }
  return <Cover />
}

export default App
