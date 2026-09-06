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
  financialPlan: {
    id: 'sample-financial-plan',
    name: 'sample-financial-qualification-plan.txt',
    type: 'text/plain',
    scope: 'Advanced reactor application',
    text: `SAMPLE EVIDENCE - FINANCIAL QUALIFICATION PLAN
Applicant: Atlas Demo Energy LLC
Scope: estimated construction, fuel-cycle, and first five years of operating cost support.
Status: prepared for qualified financial review.
Limit: sample evidence only; does not establish financial qualification.
`,
  },
  environmentalReport: {
    id: 'sample-environmental-report',
    name: 'sample-environmental-information-outline.md',
    type: 'text/markdown',
    scope: 'Advanced reactor application',
    text: `# Sample Environmental Information Outline

Scope: bounded environmental information outline for the sample advanced-reactor application.

Current status: site characterization attachments and alternatives analysis remain review items.
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
  emergencyResponse: {
    id: 'sample-emergency-response',
    name: 'sample-emergency-response-information.txt',
    type: 'text/plain',
    scope: 'Fuel transportation',
    text: `SAMPLE EVIDENCE - EMERGENCY RESPONSE INFORMATION
Shipment: HALEU UF6 highway movement
Emergency response contact: Demo response desk
Exercise status: sample tabletop exercise completed; corrective action review pending.
Limit: no tactical response instructions and no real shipment authorization.
`,
  },
  routeRecord: {
    id: 'sample-route-record',
    name: 'sample-highway-route-record.txt',
    type: 'text/plain',
    scope: 'Fuel transportation',
    text: `SAMPLE EVIDENCE - HIGHWAY ROUTE RECORD
Route profile: highway only
Origin: Ohio enrichment facility
Destination: Pennsylvania advanced-reactor project
Status: sample route evidence prepared for review.
`,
  },
  securityRecord: {
    id: 'sample-security-record',
    name: 'sample-security-readiness-record.txt',
    type: 'text/plain',
    scope: 'Fuel transportation',
    text: `SAMPLE EVIDENCE - SECURITY READINESS RECORD
Scope: compliance readiness level only.
Status: domestic highway security evidence represented for public demo review.
No tactical security instructions are included.
`,
  },
  executionRecord: {
    id: 'sample-execution-record',
    name: 'sample-shipment-execution-record.txt',
    type: 'text/plain',
    scope: 'Fuel transportation',
    text: `SAMPLE EVIDENCE - SHIPMENT EXECUTION RECORD
Package inspection: sample complete
Measurement record: sample within represented range
Shipping paper package: sample prepared for review
Status: no real shipment release.
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
    metadata: { documentIdentity: 'FW-QAP', documentVersion: 'C', supersedes: 'B', reviewStatus: 'pending_review', requirementRelevance: ['sup-qap-current'] },
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
    metadata: { documentIdentity: 'FW-QAP', documentVersion: 'B', supersededBy: 'C', reviewStatus: 'superseded', requirementRelevance: ['sup-qap-current'] },
  },
  supplierMisleading: {
    id: 'sample-supplier-misleading',
    name: 'sample-supplier-quality-program-rev-c-misleading.txt',
    type: 'text/plain',
    scope: 'Supplier qualification',
    text: `SAMPLE EVIDENCE - MISLEADING SUPPLIER FILE
Filename claims Revision C, but controlled identity is missing.
This sample must not resolve a superseded-document conflict without explicit metadata.
`,
    metadata: { documentIdentity: 'UNKNOWN', documentVersion: 'unverified', reviewStatus: 'pending_review', requirementRelevance: [] },
  },
  calibrationRecord: {
    id: 'sample-calibration-record',
    name: 'sample-calibration-record.txt',
    type: 'text/plain',
    scope: 'Supplier qualification',
    text: `SAMPLE EVIDENCE - CALIBRATION RECORD
Supplier: ForgeWorks Demo Components
Instrument: demo bore gauge BG-17
Calibration date: 2026-07-15
Status: sample record prepared for supplier-quality review.
`,
    metadata: { documentIdentity: 'FW-CAL-BG-17', documentVersion: '2026-07-15', reviewStatus: 'pending_review', requirementRelevance: ['sup-calibration'] },
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

const part53Fields = [
  ['legal-name', 'Applicant legal name', '10 CFR § 53.1109(a)', 'What is the exact legal name of the organization applying for the license?', 'p53-legal'],
  ['address', 'Applicant address', '10 CFR § 53.1109(b)', 'What is the applicant’s address?', 'p53-legal'],
  ['business', 'Business or occupation', '10 CFR § 53.1109(c)', 'What business or occupation does the applicant conduct?', 'p53-legal'],
  ['organization', 'Organization details', '10 CFR § 53.1109(d)(3)(i)', 'What is the applicant’s organization type, State of organization, and principal place of business?', 'p53-legal'],
  ['citizenship', 'Directors and principal officers', '10 CFR § 53.1109(d)(3)(ii)', 'Who are the applicant’s directors and principal officers?', 'p53-legal'],
  ['focd', 'Foreign ownership, control, or domination', '10 CFR § 53.1109(d)(3)(iii)', 'Is the applicant owned, controlled, or dominated by an alien, foreign corporation, or foreign government?', 'p53-legal'],
  ['license', 'License request', '10 CFR § 53.1109(e)', 'What license, facility use, license period, and related approvals are being requested?', 'p53-legal'],
  ['financial', 'Financial qualifications', '10 CFR § 53.1413', 'How will the applicant demonstrate financial qualifications?', 'p53-financial'],
  ['safety', 'Safety analysis', '10 CFR § 53.1416', 'What safety analysis will support the application?', 'p53-safety'],
  ['environment', 'Environmental information', '10 CFR § 53.1419', 'What environmental information will support the application?', 'p53-environment'],
  ['eligibility', 'Legal eligibility review', '10 CFR § 53.1118', 'What legal eligibility review is required?', 'p53-eligibility'],
  ['evidence', 'Controlled records', 'Atlas controlled-record contract', 'Which controlled records support this application?', 'p53-records'],
  ['reviews', 'Reviews and open items', 'Atlas review-control contract', 'What reviews and open items remain?', 'p53-reviews'],
  ['history', 'Traceable history', 'Atlas traceability contract', 'What application history must remain traceable?', 'p53-history'],
].map(([id, label, citation, prompt, requirement]) => ({ id, label, citation, prompt, requirement }))

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
        'legal-name': 'Atlas Demo Energy LLC',
        address: '100 Demo Industrial Parkway, Piketon, Ohio',
        business: 'Advanced nuclear energy project developer',
        organization: 'Ohio limited liability company',
        citizenship: 'Director roster started; citizenship records not yet complete.',
        focd: 'Ownership and control analysis incomplete.',
        license: 'Combined license for a new advanced reactor demonstration',
        financial: 'Funding plan outline received; financial capacity review not complete.',
        safety: '',
        environment: 'Site environmental report outline started.',
        eligibility: 'Legal eligibility review not started.',
        evidence: 'Controlled record index started.',
        reviews: 'Technical, financial, environmental, and legal reviews remain open.',
        history: 'Initial sample workspace history established.',
      },
      requirements: [
        { id: 'p53-legal', title: 'Applicant identity', source: 'part53', relevance: 'The application scope includes applicant general information.', linkedEvidence: ['ev-formation'], status: 'supported', question: 'Confirm applicant legal name and organization record.' },
        { id: 'p53-financial', title: 'Financial qualifications', source: 'part53', relevance: 'The represented COL preparation includes applicant ability to carry out the proposed activity.', linkedEvidence: [], status: 'gap', question: 'Attach financial qualification support.' },
        { id: 'p53-safety', title: 'Safety analysis content', source: 'part53', relevance: 'The application draft cannot treat safety analysis as complete until a controlled record exists and is reviewed.', linkedEvidence: ['ev-safety'], status: 'review', question: 'What safety analysis supports this application?' },
        { id: 'p53-environment', title: 'Environmental information', source: 'part53', relevance: 'Environmental information is represented as in scope for this sample application.', linkedEvidence: [], status: 'gap', question: 'Attach environmental information support.' },
        { id: 'p53-eligibility', title: 'Legal eligibility review', source: 'part53', relevance: 'Eligibility remains a qualified legal review work package, not an applicant checkbox.', linkedEvidence: [], status: 'gap', question: 'Create or attach the eligibility review record.' },
        { id: 'p53-records', title: 'Controlled record inventory', source: 'atlasGovernance', relevance: 'Evidence must remain traceable to application sections and versions.', linkedEvidence: [], status: 'gap', question: 'Complete the controlled record inventory.' },
        { id: 'p53-reviews', title: 'Review status', source: 'atlasGovernance', relevance: 'Open technical and legal review items must remain visible before any qualified approval.', linkedEvidence: [], status: 'gap', question: 'Assign remaining review actions.' },
        { id: 'p53-history', title: 'Application history', source: 'atlasGovernance', relevance: 'Application changes and evidence replacements must remain inspectable.', linkedEvidence: [], status: 'review', question: 'Inspect history before report generation.' },
      ],
      guided: {
        current: 0,
        complete: false,
        questions: part53Fields,
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
        hrcqStatus: 'insufficient_information',
        hrcqBasis: '',
        routeProfile: 'truck_only',
        packageEvidence: 'none',
        carrierEvidence: 'truck_supported',
        routeEvidence: 'truck_supported',
        securityEvidence: 'domestic_supported',
        executionEvidence: 'domestic_supported',
        emergencyEvidence: 'none',
        reviewer: 'none',
        governedDecision: 'pending',
        priorApprovalFingerprint: '',
        priorApprovalStatus: '',
      },
      requirements: [
        { id: 'trn-material', title: 'Material and HRCQ facts', source: 'transportHrcq', relevance: 'The sample movement includes Class 7/fissile-material facts that drive route and package questions.', linkedEvidence: [], status: 'gap', question: 'Record the activity/package threshold facts needed to resolve HRCQ.' },
        { id: 'trn-package', title: 'Package compatibility', source: 'atlasGovernance', relevance: 'Atlas cannot support shipment readiness unless a package compatibility record is linked to these represented contents.', linkedEvidence: [], status: 'gap', question: 'Attach or load package compatibility evidence.' },
        { id: 'trn-carrier', title: 'Carrier authority', source: 'atlasGovernance', relevance: 'The primary path assumes a domestic highway carrier and keeps authority distinct from package evidence.', linkedEvidence: ['ev-carrier'], status: 'supported', question: 'Confirm carrier authority evidence.' },
        { id: 'trn-route', title: 'Route and mode', source: 'transportHrcq', relevance: 'Route and mode gates depend on HRCQ status and selected highway or maritime scope.', linkedEvidence: [], status: 'gap', question: 'Confirm route and mode evidence.' },
        { id: 'trn-security', title: 'Security and physical protection', source: 'atlasGovernance', relevance: 'Security readiness is evaluated separately and keeps sensitive details out of the public demo.', linkedEvidence: [], status: 'gap', question: 'Resolve security evidence.' },
        { id: 'trn-execution', title: 'Shipment execution', source: 'atlasGovernance', relevance: 'Pre-departure inspection, measurement, shipping-paper, and package documents remain separate gates.', linkedEvidence: [], status: 'gap', question: 'Complete shipment execution evidence.' },
        { id: 'trn-response', title: 'Emergency response information', source: 'transportEmergency', relevance: 'Emergency response information is represented as a readiness node for the shipment package.', linkedEvidence: [], status: 'gap', question: 'Attach response organization or exercise evidence.' },
        { id: 'trn-reviewer', title: 'Governed reviewer', source: 'atlasGovernance', relevance: 'A reviewer with explicit demo authority is required before simulated acceptance is available.', linkedEvidence: [], status: 'gap', question: 'Assign a demo authorized reviewer.' },
      ],
      evidence: {
        'ev-carrier': seededEvidence('ev-carrier', sampleDocuments.carrier, ['trn-carrier'], 'processed'),
      },
      transportEvaluation: null,
      staleTransportEvaluation: null,
      transportRevision: 1,
      evaluationStatus: 'dirty',
      evaluationError: '',
      evaluatingRevision: 0,
      acceptanceError: '',
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
        expectedQualityProgramIdentity: 'FW-QAP',
        expectedQualityProgramVersion: 'C',
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
    fullText: document.text,
    previewTruncated: false,
    metadata: document.metadata || {},
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
      setWorkspace({ ...parsed, projects: invalidateCachedTransportEvaluations(parsed.projects), saveStatus: 'saved', storageError: '', recovery: '' })
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
      const accepted = supplierRequirementResolved(project, req.id, evidence)
      status = accepted ? 'review' : 'conflict'
      reason = accepted ? 'Explicit replacement identity and supersession metadata are linked; reviewer must confirm acceptance.' : 'The linked record is superseded, unrelated, failed, or lacks explicit replacement identity metadata.'
    }
    if (project.id === 'fuel-transport') {
      const transportFinding = transportRequirementFinding(project, req)
      if (transportFinding) {
        status = transportFinding.status
        reason = transportFinding.reason
      }
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
      nextAction: findingNextAction(project, req, status, evidence),
      role: project.role,
    }
  })

  if (project.id === 'fuel-transport') {
    const result = currentTransportationEvaluation(project)
    const provisional = result || evaluateTransportationProject(project)
    const fingerprint = result?.manifestFingerprint || ''
    const evaluationComplete = Boolean(result)
    const priorCurrent = Boolean(evaluationComplete && fingerprint && project.review?.fingerprint === fingerprint && project.review?.simulatedAcceptance)
    const readyForReview = Boolean(evaluationComplete && result.readyForReview)
    const evaluationUnavailable = project.evaluationStatus === 'error'
    findings.push({
      id: 'finding-trn-governed-review',
      requirementId: 'trn-governed-review',
      title: 'Governed transportation review',
      status: priorCurrent ? 'demo_accepted' : readyForReview ? 'review' : 'gap',
      reason: priorCurrent ? 'A demonstration-only acceptance is current for this exact completed evaluation fingerprint.' : readyForReview ? 'All applicable transportation gates are ready for governed demo review.' : evaluationUnavailable ? `Detailed transportation evaluation unavailable: ${project.evaluationError}` : project.evaluationStatus === 'evaluating' ? 'Detailed transportation evaluation is running. Acceptance is disabled until the current revision is evaluated and hashed.' : `Next blocker: ${provisional.nextBlocker}`,
      source: sourceRecords.atlasGovernance,
      relevantBecause: 'The public demo preserves the human approval boundary and invalidates prior review when material facts or evidence change.',
      supportingEvidence: evidence.map((item) => item.id),
      missingEvidence: readyForReview ? [] : provisional.blockers,
      applicabilityQuestions: ['Is the package evidence applicable to these material facts?', 'Has the authorized reviewer accepted this manifest?'],
      nextAction: priorCurrent ? 'Inspect the transportation report and maintain the reviewed shipment information.' : readyForReview ? 'Begin demonstration-only governed review.' : evaluationUnavailable ? 'Retry detailed transportation evaluation.' : !evaluationComplete ? 'Wait for shipment checking to finish before review.' : result.nextAction,
      role: 'Governed reviewer',
      fingerprint,
      transportResult: result || provisional,
    })
  }

  return findings
}

function findingNextAction(project, req, status, evidence) {
  if (project.id === 'supplier-qualification' && req.id === 'sup-qap-current') {
    if (status === 'review') return 'Review the replacement quality program and confirm its applicability and supersession of Revision B.'
    const failed = evidence.filter((item) => item.linkedRequirements.includes(req.id)).flatMap((item) => [item, ...(item.replacements || [])]).find((item) => item.status === 'failed')
    return failed ? `Replacement failed: ${failed.failureReason}. Prior records remain available. Obtain valid replacement evidence.` : 'Obtain valid replacement evidence for the superseded quality program document.'
  }
  if (status === 'review') return `Review the linked evidence for ${req.title.toLowerCase()} and confirm applicability.`
  if (status === 'supported') return `Maintain the supporting record for ${req.title.toLowerCase()}.`
  return req.question
}

function primaryNextAction(findings) {
  const transportation = findings.find((finding) => finding.id === 'finding-trn-governed-review')
  if (transportation) return transportation.nextAction
  return findings.find((finding) => !['supported', 'demo_accepted'].includes(finding.status))?.nextAction || 'Inspect the report and maintain the supporting records.'
}

function transportationStatus(project) {
  const current = currentTransportationEvaluation(project)
  if (project.evaluationStatus === 'error') return `Shipment checking failed: ${project.evaluationError} Retry detailed evaluation.`
  if (!current) return 'Checking the updated shipment information.'
  if (project.review?.status === 'stale') return `Shipment information changed. The previous review no longer applies.${current.readyForReview ? '' : ` Outstanding requirement: ${current.nextBlocker}`}`
  if (project.review?.simulatedAcceptance && project.review.fingerprint === current.manifestFingerprint) return 'Demonstration-only acceptance is current for this shipment information.'
  return current.readyForReview ? 'The sample package is ready for review.' : `Exact unresolved prerequisite: ${current.nextBlocker}`
}

function ReportAction({ project, setView }) {
  const label = project.id === 'reactor-app' ? 'View your application draft' : project.id === 'fuel-transport' ? 'View your transportation report' : 'View your supplier review report'
  return <button type="button" className="button primary" onClick={() => setView('report')}>{label}</button>
}

function supplierRequirementResolved(project, requirementId, evidence) {
  if (requirementId !== 'sup-qap-current') return false
  const expectedIdentity = project.inputs.expectedQualityProgramIdentity
  const expectedVersion = project.inputs.expectedQualityProgramVersion
  return evidence.some((item) => (
    item.status !== 'failed' &&
    item.linkedRequirements.includes(requirementId) &&
    item.metadata?.documentIdentity === expectedIdentity &&
    item.metadata?.documentVersion === expectedVersion &&
    item.metadata?.supersedes === 'B' &&
    item.reviewStatus !== 'Not reviewable'
  ))
}

function transportRequirementFinding(project, req) {
  const result = currentTransportationEvaluation(project) || evaluateTransportationProject(project)
  const node = {
    'trn-material': result.nodes.material,
    'trn-package': result.nodes.package,
    'trn-carrier': result.nodes.carrier,
    'trn-route': result.nodes.route,
    'trn-security': result.nodes.security,
    'trn-execution': result.nodes.execution,
    'trn-response': result.nodes.emergency,
    'trn-reviewer': result.nodes.reviewer,
  }[req.id]
  if (!node) return null
  return {
    status: node.status === 'SUPPORTED' ? 'supported' : node.status === 'REVIEW' ? 'review' : 'gap',
    reason: node.reason,
  }
}

function currentTransportationEvaluation(project) {
  const evaluation = project.transportEvaluation
  if (!evaluation || evaluation.lifecycle !== 'complete') return null
  if (!evaluation.manifestFingerprint || evaluation.projectRevision !== (project.transportRevision || 0)) return null
  if (project.evaluationStatus !== 'complete') return null
  return evaluation
}

function evaluateTransportationProject(project) {
  const inputs = project.inputs
  const evidence = Object.values(project.evidence || {})
  const linked = (requirementId) => evidence.filter((item) => item.status !== 'failed' && item.linkedRequirements.includes(requirementId))
  const hrcqValid = inputs.hrcqStatus === 'resolved_sample_basis' && /49 CFR 173\.403/i.test(inputs.hrcqBasis || '')
  const routeProfile = inputs.routeProfile || 'truck_only'
  const maritime = routeProfile === 'truck_port_vessel'
  const nodes = {
    material: hrcqValid ? supported('Material facts and HRCQ sample basis are explicitly recorded for review.') : blocked('HRCQ threshold status is unresolved. Select the sample basis; blank, arbitrary, or incomplete text is not accepted.'),
    package: linked('trn-package').length ? review('Package compatibility evidence is linked; reviewer must confirm applicability to the material facts.') : blocked('Package compatibility evidence is missing.'),
    carrier: inputs.carrierEvidence === 'truck_supported' || inputs.carrierEvidence === 'multimodal_supported' ? supported('Carrier evidence is represented for the selected route profile.') : blocked('Shipper/carrier authority evidence is missing or only claimed.'),
    route: hrcqValid && ((!maritime && inputs.routeEvidence === 'truck_supported') || (maritime && inputs.routeEvidence === 'multimodal_supported')) ? supported('Route and mode evidence covers the represented scope.') : blocked(maritime ? 'Maritime route, port, vessel, flag-state, and destination overlays are unresolved.' : 'Highway route evidence or HRCQ basis is unresolved.'),
    security: ((!maritime && inputs.securityEvidence === 'domestic_supported') || (maritime && inputs.securityEvidence === 'multimodal_supported')) ? supported('Security readiness is represented without tactical details.') : blocked(maritime ? 'Port, vessel, or flag-state security evidence is unresolved.' : 'Security plan adequacy or support is unresolved.'),
    execution: ((!maritime && inputs.executionEvidence === 'domestic_supported') || (maritime && inputs.executionEvidence === 'multimodal_supported')) ? supported('Shipment execution evidence is represented for the selected path.') : blocked(maritime ? 'Port handoff or vessel cargo acceptance is unresolved.' : 'Pre-departure inspection, measurement, or shipping-paper evidence is unresolved.'),
    emergency: linked('trn-response').length && ((!maritime && inputs.emergencyEvidence === 'domestic_supported') || (maritime && inputs.emergencyEvidence === 'multimodal_supported')) ? review('Emergency response evidence is linked and ready for qualified review.') : blocked(maritime ? 'Port/COTP, vessel, flag-state, or destination response evidence is unresolved.' : 'Emergency response information evidence is missing or incomplete.'),
    reviewer: inputs.reviewer === 'valid' ? supported('Demo authorized reviewer is assigned.') : blocked(inputs.reviewer === 'missing_authority' ? 'Reviewer authority basis is missing.' : 'Demo authorized reviewer is not assigned.'),
  }
  const blockers = Object.entries(nodes).filter(([, node]) => node.status === 'BLOCKED').map(([key, node]) => `${labelize(key)}: ${node.reason}`)
  return {
    buildMarker: 'TRN-GOVERNED-DECISION-DEMO-0.9.0',
    routeProfile,
    maritime,
    nodes,
    blockers,
    readyForReview: blockers.length === 0,
    nextBlocker: blockers[0] || 'Governed review pending',
    nextAction: blockers[0] ? `Resolve ${blockers[0]}` : 'Begin demonstration-only governed review.',
    manifestFingerprint: project.transportEvaluation?.manifestFingerprint || '',
    manifestFingerprintShort: project.transportEvaluation?.manifestFingerprint?.slice(0, 16) || 'calculating',
  }
}

async function evaluateTransportationWithExistingEngine(project) {
  await loadTransportationEngine()
  if (typeof window.evaluateTransportationDemo !== 'function') throw new Error('Detailed transportation evaluator is unavailable.')
  if (window.__ATLAS_DEMO_TRANSPORT_EVALUATOR_THROWS__) throw new Error('Detailed transportation evaluator threw during the demo run.')
  const engine = window.__ATLAS_DEMO_TRANSPORT_EVALUATOR_INVALID__ ? null : await window.evaluateTransportationDemo(mapTransportationInputs(project))
  return normalizeTransportationEngineResult(project, engine)
}

let transportationEnginePromise = null
function loadTransportationEngine() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.__ATLAS_DEMO_TRANSPORT_SCRIPT_UNAVAILABLE__) return Promise.reject(new Error('Detailed transportation evaluator script could not be loaded.'))
  if (typeof window.evaluateTransportationDemo === 'function') return Promise.resolve()
  if (transportationEnginePromise) return transportationEnginePromise
  transportationEnginePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/transportation/js/transportation-engine.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Transportation evaluator could not load.'))
    document.head.append(script)
  }).catch((error) => {
    transportationEnginePromise = null
    throw error
  })
  return transportationEnginePromise
}

function mapTransportationInputs(project) {
  const inputs = project.inputs
  return {
    material: inputs.material,
    chemical_form: inputs.form,
    u235_enrichment_wt_percent: inputs.enrichment,
    quantity: String(inputs.quantity || '').split(' ')[0],
    quantity_unit: String(inputs.quantity || '').split(' ').slice(1).join(' ') || 'kgU',
    hrcq_status: inputs.hrcqStatus === 'resolved_sample_basis' && /49 CFR 173\.403/i.test(inputs.hrcqBasis || '') ? 'HRCQ' : 'INSUFFICIENT_INFORMATION',
    origin_state: inputs.origin,
    destination_state: inputs.destination,
    proposed_mode: inputs.routeProfile === 'truck_port_vessel' ? 'Highway to vessel' : 'Highway',
    route_profile: inputs.routeProfile || 'truck_only',
    package_evidence_mode: project.requirements.find((req) => req.id === 'trn-package')?.linkedEvidence?.some((id) => project.evidence[id]?.status !== 'failed') ? 'compatible' : inputs.packageEvidence || 'none',
    carrier_evidence_mode: inputs.carrierEvidence || 'none',
    route_evidence_mode: inputs.routeEvidence || 'none',
    security_evidence_mode: inputs.securityEvidence || 'none',
    shipment_execution_evidence_mode: inputs.executionEvidence || 'none',
    emergency_response_evidence_mode: project.requirements.find((req) => req.id === 'trn-response')?.linkedEvidence?.some((id) => project.evidence[id]?.status !== 'failed') ? inputs.emergencyEvidence || 'none' : 'none',
    incident_scenario: 'vehicle_accident_no_release',
    governed_reviewer_mode: inputs.reviewer || 'none',
    governed_decision_mode: 'pending',
    prior_governed_manifest_fingerprint: project.review?.fingerprint || '',
    prior_governed_decision: project.review?.simulatedAcceptance ? 'APPROVED_FOR_RELEASE_BY_AUTHORITY' : '',
    flag_state: 'United States',
    destination_country: inputs.routeProfile === 'truck_port_vessel' ? inputs.destination : 'United States',
  }
}

function normalizeTransportationEngineResult(project, engine) {
  if (!engine || typeof engine !== 'object') throw new Error('Detailed transportation evaluator returned no usable result.')
  if (!engine.package_authorization || !engine.shipper_carrier_authority || !engine.route_mode_analysis || !engine.security_physical_protection || !engine.shipment_execution || !engine.emergency_response_readiness || !engine.governed_readiness_decision) {
    throw new Error('Detailed transportation evaluator returned an incomplete result.')
  }
  const fallback = evaluateTransportationProject(project)
  const nodeStatus = {
    material: engine.readiness_items?.find(([label]) => /Material/.test(label))?.[1],
    package: engine.package_authorization?.decision,
    carrier: engine.shipper_carrier_authority?.decision,
    route: engine.route_mode_analysis?.decision,
    security: engine.security_physical_protection?.decision,
    execution: engine.shipment_execution?.decision,
    emergency: engine.emergency_response_readiness?.decision,
    reviewer: engine.governed_readiness_decision?.reviewer_status === 'AUTHORIZED_DEMO_REVIEWER' ? 'SUPPORTED' : 'BLOCKED',
  }
  const reason = {
    material: engine.route_mode_analysis?.hrcq_determination?.missing_facts?.join('; ') || fallback.nodes.material.reason,
    package: engine.package_authorization?.finding?.missing_facts_evidence?.join('; ') || fallback.nodes.package.reason,
    carrier: firstBlockingReason(engine.shipper_carrier_authority?.entity_findings) || fallback.nodes.carrier.reason,
    route: firstBlockingReason(engine.route_mode_analysis?.segment_findings) || fallback.nodes.route.reason,
    security: firstBlockingReason(engine.security_physical_protection?.security_findings) || fallback.nodes.security.reason,
    execution: firstBlockingReason(engine.shipment_execution?.execution_findings) || fallback.nodes.execution.reason,
    emergency: firstBlockingReason(engine.emergency_response_readiness?.emergency_findings) || fallback.nodes.emergency.reason,
    reviewer: engine.governed_readiness_decision?.reviewer_defects?.join('; ') || fallback.nodes.reviewer.reason,
  }
  const nodes = Object.fromEntries(Object.entries(fallback.nodes).map(([key, local]) => {
    const status = nodeStatus[key] === 'SUPPORTED' ? (local.status === 'REVIEW' ? 'REVIEW' : 'SUPPORTED') : 'BLOCKED'
    return [key, { status, reason: status === 'BLOCKED' ? reason[key] || local.reason : local.reason }]
  }))
  const blockers = Object.entries(nodes).filter(([, node]) => node.status === 'BLOCKED').map(([key, node]) => `${labelize(key)}: ${node.reason}`)
  return {
    ...fallback,
    buildMarker: engine.build_marker || fallback.buildMarker,
    engineResult: engine,
    nodes,
    blockers,
    readyForReview: blockers.length === 0,
    nextBlocker: blockers[0] || 'Governed review pending',
    nextAction: blockers[0] ? `Resolve ${blockers[0]}` : 'Begin demonstration-only governed review.',
  }
}

function firstBlockingReason(findings = []) {
  const blocked = findings.find((finding) => finding.status === 'BLOCKED' || finding.final_readiness_status === 'BLOCKED')
  return blocked?.missing_facts_evidence?.join('; ') || blocked?.unresolved_conflicts_assumptions_missing_information?.join('; ') || blocked?.next_action || ''
}

function supported(reason) {
  return { status: 'SUPPORTED', reason }
}

function review(reason) {
  return { status: 'REVIEW', reason }
}

function blocked(reason) {
  return { status: 'BLOCKED', reason }
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
              <div><dt>Primary next action</dt><dd>{primaryNextAction(findings)}</dd></div>
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

  useEffect(() => {
    if (project.id !== 'fuel-transport') return
    const revision = project.transportRevision || 1
    if (currentTransportationEvaluation(project)) return
    if (project.evaluationStatus === 'error') return
    if (project.evaluationStatus === 'evaluating' && project.evaluatingRevision === revision) return
    async function refreshTransportEvaluation() {
      updateProject(project.id, (current) => current.transportRevision === revision ? { ...current, evaluationStatus: 'evaluating', evaluatingRevision: revision, evaluationError: '', acceptanceError: '' } : current)
      try {
        if (window.__ATLAS_DEMO_TRANSPORT_EVALUATOR_DELAY_MS__) await new Promise((resolve) => window.setTimeout(resolve, Number(window.__ATLAS_DEMO_TRANSPORT_EVALUATOR_DELAY_MS__)))
        const base = await evaluateTransportationWithExistingEngine(project)
        const manifest = {
          projectRevision: revision,
          representedScope: project.scope,
          inputs: project.inputs,
          requirements: project.requirements.map((req) => ({ id: req.id, linkedEvidence: [...req.linkedEvidence].sort() })),
          evidence: Object.values(project.evidence).map((item) => ({
            id: item.id,
            filename: item.filename,
            hash: item.hash,
            version: item.version,
            status: item.status,
            linkedRequirements: [...item.linkedRequirements].sort(),
            metadata: item.metadata || {},
          })).sort((a, b) => a.id.localeCompare(b.id)),
          nodeStatuses: Object.fromEntries(Object.entries(base.nodes).map(([key, node]) => [key, node.status])),
          engineBuild: base.buildMarker,
        }
        const manifestFingerprint = await sha256Text(canonicalStringify(manifest))
        updateProject(project.id, (current) => {
          if ((current.transportRevision || 1) !== revision) return current
          return {
            ...current,
            transportEvaluation: {
              ...base,
              lifecycle: 'complete',
              projectRevision: revision,
              completedAt: nowIso(),
              manifestFingerprint,
              manifestFingerprintShort: manifestFingerprint.slice(0, 16),
            },
            evaluationStatus: 'complete',
            evaluatingRevision: 0,
            evaluationError: '',
            acceptanceError: '',
          }
        })
      } catch (error) {
        updateProject(project.id, (current) => {
          if ((current.transportRevision || 1) !== revision) return current
          return {
            ...current,
            transportEvaluation: null,
            evaluationStatus: 'error',
            evaluatingRevision: 0,
            evaluationError: error instanceof Error ? error.message : 'Detailed transportation evaluation failed.',
          }
        })
      }
    }
    refreshTransportEvaluation()
  }, [project, updateProject])

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
      if (next.id === 'fuel-transport') markTransportationDirty(next, 'material scope or input changed')
    })
  }

  function linkEvidence(evidenceId, requirementId) {
    patchProject((next) => {
      const evidence = next.evidence[evidenceId]
      const requirement = next.requirements.find((item) => item.id === requirementId)
      if (!evidence || !requirement) return
      evidence.linkedRequirements = Array.from(new Set([...evidence.linkedRequirements, requirementId]))
      requirement.linkedEvidence = Array.from(new Set([...requirement.linkedEvidence, evidenceId]))
      if (next.id === 'fuel-transport') markTransportationDirty(next, 'evidence link changed')
      next.history.unshift(history(`Linked ${evidence.filename} to ${requirement.title}.`, 'Visitor'))
    })
  }

  async function attachFile(file, requirementId, replaceId = '', metadataOverride = null) {
    const processed = await processEvidenceFile(file, project.scope)
    if (metadataOverride) processed.metadata = metadataOverride
    patchProject((next) => {
      const id = replaceId || `ev-${Date.now()}`
      const previous = next.evidence[id]
      if (replaceId && processed.status === 'failed' && previous) {
        previous.replacements = [...(previous.replacements || []), { filename: processed.filename, hash: processed.hash, version: previous.version + 1, replacedAt: nowIso(), status: processed.status, failureReason: processed.failureReason, attempted: true, fullText: processed.fullText || '' }]
        next.history.unshift(history(`Replacement attempt failed for ${previous.filename}: ${processed.failureReason}. Prior usable version retained.`, 'Visitor'))
        return
      }
      next.evidence[id] = {
        ...processed,
        id,
        version: previous ? previous.version + 1 : 1,
        linkedRequirements: requirementId ? [requirementId] : [],
        replacements: previous ? [...(previous.replacements || []), { filename: previous.filename, hash: previous.hash, version: previous.version, replacedAt: nowIso(), status: previous.status, fullText: previous.fullText || previous.preview || '', linkedRequirements: previous.linkedRequirements }] : [],
        reviewStatus: processed.status === 'failed' ? 'Not reviewable' : 'Pending human review',
      }
      if (requirementId) {
        const req = next.requirements.find((item) => item.id === requirementId)
        if (req) req.linkedEvidence = Array.from(new Set([...req.linkedEvidence.filter((x) => x !== replaceId), id]))
      }
      if (next.id === 'fuel-transport') markTransportationDirty(next, 'evidence identity, content, version, or links changed')
      next.history.unshift(history(`${replaceId ? 'Replaced' : 'Attached'} ${processed.filename}: ${processed.status}.`, 'Visitor'))
    })
    setSelectedEvidence(replaceId || '')
  }

  async function loadSampleEvidence(requirementId) {
    const sample = chooseSample(project.id, requirementId)
    const file = new File([sample.text], sample.name, { type: sample.type, lastModified: Date.now() })
    await attachFile(file, requirementId, '', sample.metadata || null)
  }

  function retryTransportationEvaluation() {
    patchProject((next) => {
      if (next.id !== 'fuel-transport') return
      next.evaluationStatus = 'dirty'
      next.evaluationError = ''
      next.acceptanceError = ''
      next.history.unshift(history('Retry requested for the detailed transportation evaluation.', 'Visitor'))
    })
  }

  function acceptTransportationDemo() {
    patchProject((next) => {
      const current = currentTransportationEvaluation(next)
      const ready = Boolean(current?.readyForReview && current.manifestFingerprint && current.projectRevision === (next.transportRevision || 0))
      if (!ready) {
        next.acceptanceError = next.evaluationStatus === 'error' ? 'Acceptance blocked because detailed transportation evaluation is unavailable.' : 'Acceptance blocked until the current project revision finishes detailed evaluation and hashing.'
        next.history.unshift(history(next.acceptanceError, 'Atlas'))
        return
      }
      next.acceptanceError = ''
      next.review = { fingerprint: current.manifestFingerprint, status: 'accepted_demo_only', simulatedAcceptance: true, acceptedAt: nowIso(), evaluation: current, acceptedRevision: next.transportRevision }
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
      {view === 'requirements' ? <Requirements project={project} findings={findings} setView={setView} setInput={setInput} linkEvidence={linkEvidence} loadSampleEvidence={loadSampleEvidence} attachFile={attachFile} acceptTransportationDemo={acceptTransportationDemo} retryTransportationEvaluation={retryTransportationEvaluation} /> : null}
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
        <article><span>What the visitor should do next</span><strong>{primaryNextAction(findings)}</strong></article>
        <article><span>Deliverable</span><strong>{project.id === 'reactor-app' ? 'Application draft and evidence/action register' : project.id === 'fuel-transport' ? 'Transportation readiness package' : 'Supplier review report'}</strong></article>
      </div>
    </section>
    <section className="panel">
      <h2>Next Actions</h2>
      <ul className="action-list">{open.slice(0, 4).map((finding) => <li key={finding.id}><strong>{finding.nextAction}</strong><span>{finding.role}</span></li>)}</ul>
      <button type="button" className="button primary" onClick={() => setView('requirements')}>Continue work</button>
      <ReportAction project={project} setView={setView} />
    </section>
    <section className="panel">
      <h2>Review Records</h2>
      <ul className="plain-list">{project.history.slice(0, 4).map((item) => <li key={item.id}>{niceTime(item.at)} · {item.action}</li>)}</ul>
    </section>
  </div>
}

function Requirements({ project, findings, setView, setInput, linkEvidence, loadSampleEvidence, attachFile, acceptTransportationDemo, retryTransportationEvaluation }) {
  const [editingQuestion, setEditingQuestion] = useState(null)
  const guided = project.guided
  const currentQuestion = guided?.questions[guided.current]
  const completeGuided = guided && guided.current >= guided.questions.length - 1
  return <div className="workspace-grid">
    {project.id === 'reactor-app' ? <section className="panel wide" data-testid="part53-builder">
      <h2>{guided.complete ? 'Application Results' : 'Guided Application'}</h2>
      {guided.complete ? <><p>Your answers have been assembled into a draft. Review the remaining evidence gaps and open items before downloading.</p><ReportAction project={project} setView={setView} /></> : null}
      {!guided.complete ? <div className="guided-box">
        <p className="citation">{sourceRecords.part53.citation}</p>
        <label>{currentQuestion.prompt}<textarea value={project.inputs[currentQuestion.id] || ''} onChange={(event) => setInput(currentQuestion.id, event.target.value)} /></label>
        <div className="button-row">
          <button type="button" className="button secondary" disabled={guided.current === 0} onClick={() => setInput('__guidedBack', '') || null}>Back</button>
          <button type="button" className="button primary" onClick={() => setGuidedStep(project, setInput, completeGuided ? 'complete' : 'next')}>{completeGuided ? 'Finish guided demonstration' : 'Save and continue'}</button>
        </div>
      </div> : <ApplicationDraft project={project} editingQuestion={editingQuestion} setEditingQuestion={setEditingQuestion} setInput={setInput} />}
    </section> : null}
    {project.id === 'fuel-transport' ? <TransportationPath project={project} findings={findings} setInput={setInput} loadSampleEvidence={loadSampleEvidence} acceptTransportationDemo={acceptTransportationDemo} retryTransportationEvaluation={retryTransportationEvaluation} /> : null}
    {project.id !== 'reactor-app' ? <ReportAction project={project} setView={setView} /> : null}
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

function TransportationPath({ project, findings, setInput, loadSampleEvidence, acceptTransportationDemo, retryTransportationEvaluation }) {
  const governed = findings.find((finding) => finding.id === 'finding-trn-governed-review')
  const current = currentTransportationEvaluation(project)
  const result = current || evaluateTransportationProject(project)
  const evaluationReady = Boolean(current?.readyForReview && governed?.status === 'review' && governed?.fingerprint)
  return <section className="panel wide transportation-path">
    <h2>Your transportation readiness package</h2>
    <div className="sticky-step">
      <strong>Active step: material and shipment facts</strong>
      <span>{current ? `${result.blockers.length} transportation blockers` : 'Checking shipment requirements'}</span>
    </div>
    <p role="status" data-testid="transport-evaluation-state">{transportationStatus(project)}</p>
    <TransportationDetails project={project} />
    <div className="form-grid">
      {[
        ['material', 'Material'],
        ['form', 'Physical or chemical form'],
        ['enrichment', 'U-235 enrichment wt%'],
        ['quantity', 'Quantity'],
        ['origin', 'Origin'],
        ['destination', 'Destination'],
      ].map(([key, label]) => <label key={key}>{label}<input value={project.inputs[key] || ''} onChange={(event) => setInput(key, event.target.value)} /></label>)}
      <label>HRCQ threshold status<select value={project.inputs.hrcqStatus || 'insufficient_information'} onChange={(event) => setInput('hrcqStatus', event.target.value)}>
        <option value="insufficient_information">Insufficient information</option>
        <option value="claimed_only">Claimed only</option>
        <option value="resolved_sample_basis">Resolved with sample basis</option>
      </select></label>
      <label>HRCQ sample basis<input value={project.inputs.hrcqBasis || ''} placeholder="Sample basis cites 49 CFR 173.403 threshold review" onChange={(event) => setInput('hrcqBasis', event.target.value)} /></label>
      <label>Route profile<select value={project.inputs.routeProfile || 'truck_only'} onChange={(event) => setInput('routeProfile', event.target.value)}>
        <option value="truck_only">Highway only</option>
        <option value="truck_port_vessel">Highway to port and vessel</option>
      </select></label>
      <label>Carrier evidence<select value={project.inputs.carrierEvidence || 'none'} onChange={(event) => setInput('carrierEvidence', event.target.value)}>
        <option value="none">Missing</option>
        <option value="claimed">Claimed only</option>
        <option value="truck_supported">Highway supported</option>
        <option value="multimodal_supported">Multimodal supported</option>
      </select></label>
      <label>Route evidence<select value={project.inputs.routeEvidence || 'none'} onChange={(event) => setInput('routeEvidence', event.target.value)}>
        <option value="none">Missing</option>
        <option value="truck_supported">Highway route supported</option>
        <option value="multimodal_supported">Multimodal route supported</option>
      </select></label>
      <label>Security evidence<select value={project.inputs.securityEvidence || 'none'} onChange={(event) => setInput('securityEvidence', event.target.value)}>
        <option value="none">Missing</option>
        <option value="plan_only">Plan only</option>
        <option value="domestic_supported">Domestic highway supported</option>
        <option value="multimodal_supported">Multimodal supported</option>
      </select></label>
      <label>Execution evidence<select value={project.inputs.executionEvidence || 'none'} onChange={(event) => setInput('executionEvidence', event.target.value)}>
        <option value="none">Missing</option>
        <option value="measurement_out_of_range">Measurement out of range</option>
        <option value="domestic_supported">Domestic highway supported</option>
        <option value="multimodal_supported">Multimodal supported</option>
      </select></label>
      <label>Emergency response evidence<select value={project.inputs.emergencyEvidence || 'none'} onChange={(event) => setInput('emergencyEvidence', event.target.value)}>
        <option value="none">Missing</option>
        <option value="exercise_open_action">Exercise action open</option>
        <option value="domestic_supported">Domestic highway supported</option>
        <option value="multimodal_supported">Multimodal supported</option>
      </select></label>
      <label>Governed reviewer<select value={project.inputs.reviewer || 'none'} onChange={(event) => setInput('reviewer', event.target.value)}>
        <option value="none">Not assigned</option>
        <option value="missing_authority">Assigned, authority missing</option>
        <option value="valid">Demo authorized reviewer</option>
      </select></label>
    </div>
    <div className="button-row">
      <button type="button" className="button primary" onClick={() => loadSampleEvidence('trn-package')}>Load sample package evidence</button>
      <button type="button" className="button secondary" onClick={() => { setInput('hrcqStatus', 'resolved_sample_basis'); setInput('hrcqBasis', 'Sample basis cites 49 CFR 173.403 threshold review for the represented package.') }}>Resolve HRCQ facts</button>
      <button type="button" className="button secondary" onClick={() => loadSampleEvidence('trn-response')}>Load sample emergency response evidence</button>
      <button type="button" className="button secondary" onClick={() => setInput('reviewer', 'valid')}>Assign demo reviewer</button>
      <button type="button" className="button secondary" disabled={!evaluationReady} onClick={acceptTransportationDemo}>Simulate governed acceptance</button>
      {project.evaluationStatus === 'error' ? <button type="button" className="button secondary" onClick={retryTransportationEvaluation}>Retry detailed evaluation</button> : null}
    </div>
    {project.acceptanceError ? <p className="warning">{project.acceptanceError}</p> : null}
    <p className="demo-acceptance">Demonstration only — not shipment authorization</p>
    <details><summary>Detailed authority and evidence sections</summary><Findings project={project} findings={findings} compact /></details>
    <details><summary>Optional maritime/change scenarios</summary><p>Switching to maritime adds port, vessel, flag-state, destination, security, execution, and emergency-response gates. It invalidates prior demonstration review until all added scope is reevaluated.</p><button type="button" className="button secondary compact" onClick={() => { setInput('routeProfile', 'truck_port_vessel'); setInput('destination', 'Demo marine terminal and overseas receiving site'); setInput('routeEvidence', 'truck_supported'); setInput('securityEvidence', 'plan_only'); setInput('executionEvidence', 'none'); setInput('emergencyEvidence', 'none') }}>Apply optional maritime scope</button><button type="button" className="button secondary compact" onClick={() => { setInput('carrierEvidence', 'multimodal_supported'); setInput('routeEvidence', 'multimodal_supported'); setInput('securityEvidence', 'multimodal_supported'); setInput('executionEvidence', 'multimodal_supported'); setInput('emergencyEvidence', 'multimodal_supported') }}>Resolve maritime sample scope</button></details>
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
  const displayText = item.preview || item.failureReason || 'No supported preview available.'
  const failedAttempts = (item.replacements || []).filter((entry) => entry.attempted && entry.status === 'failed')
  return <div className="evidence-preview" data-testid="evidence-preview">
    <dl>
      <div><dt>Filename</dt><dd>{item.filename}</dd></div>
      <div><dt>Hash</dt><dd>{item.hash}</dd></div>
      <div><dt>Attached</dt><dd>{niceTime(item.attachedAt)}</dd></div>
      <div><dt>Status</dt><dd>{readableStatus(item.status)}</dd></div>
      <div><dt>Review</dt><dd>{item.reviewStatus}</dd></div>
      <div><dt>Full retained length</dt><dd>{(item.fullText || '').length} characters</dd></div>
    </dl>
    {item.previewTruncated ? <p className="warning">Preview is limited to the first 5,000 characters. The full supported document is retained in this browser and available below.</p> : null}
    {failedAttempts.length ? <p className="warning">Prior usable version retained after failed replacement attempt.</p> : null}
    <pre>{displayText}</pre>
    {item.fullText ? <details><summary>Full retained document text</summary><pre>{item.fullText}</pre></details> : null}
    {item.fullText ? <button type="button" className="button secondary compact" onClick={() => download(`${safeName(item.filename)}.txt`, item.fullText, 'text/plain')}>Download retained text</button> : null}
    {Object.keys(item.metadata || {}).length ? <details><summary>Evidence metadata</summary><pre>{JSON.stringify(item.metadata, null, 2)}</pre></details> : null}
    <label>Link to requirement<select defaultValue="" onChange={(event) => event.target.value && linkEvidence(item.id, event.target.value)}>
      <option value="">Choose requirement</option>
      {requirements.map((req) => <option value={req.id} key={req.id}>{req.title}</option>)}
    </select></label>
    <label className="file-button">Replace evidence<input type="file" onChange={(event) => event.target.files?.[0] && attachFile(event.target.files[0], item.linkedRequirements[0] || '', item.id)} /></label>
    {item.replacements?.length ? <details open><summary>Replacement history</summary><ul>{item.replacements.map((entry) => <li key={`${entry.hash}-${entry.version}`}>v{entry.version} {entry.filename} {entry.attempted ? 'attempt failed' : 'replaced'} {niceTime(entry.replacedAt)} · {entry.hash.slice(0, 16)}{entry.failureReason ? ` · ${entry.failureReason}` : ''}<details><summary>Prior retained content</summary><pre>{entry.fullText || 'No retained text available.'}</pre></details></li>)}</ul></details> : null}
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

function TransportationDetails({ project }) {
  return <details><summary>Evaluation details and prior records</summary>
    <p>Current revision: {project.transportRevision}. Evaluation: {project.evaluationStatus}.</p>
    <p>Fingerprint: {currentTransportationEvaluation(project)?.manifestFingerprint || 'Awaiting completed checking'}</p>
    {project.staleTransportEvaluation ? <p>Prior evaluation revision: {project.staleTransportEvaluation.projectRevision}. Retained because: {project.staleTransportEvaluation.staleReason}. Fingerprint: {project.staleTransportEvaluation.manifestFingerprint}</p> : null}
  </details>
}

function History({ project }) {
  return <section className="panel wide">
    <h2>History</h2>
    {project.id === 'fuel-transport' ? <TransportationDetails project={project} /> : null}
    <ol className="history-list">{project.history.map((entry) => <li key={entry.id}><strong>{niceTime(entry.at)}</strong><span>{entry.actor}</span><p>{entry.action}</p></li>)}</ol>
  </section>
}

function Report({ project, findings }) {
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  const report = buildReport(project, findings)
  return <section className="panel wide report-panel">
    <h2 ref={heading} tabIndex={-1}>Project Report</h2>
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
  const actionRows = findings.map((finding) => [finding.requirementId, finding.title, readableStatus(finding.status), finding.nextAction, finding.role, finding.source.citation])
  const csv = [
    ['Project', project.name].map(csvCell).join(','),
    ['Scope', project.scope].map(csvCell).join(','),
    ['Generated', generated].map(csvCell).join(','),
    ['Review state', project.id === 'fuel-transport' ? transportationStatus(project) : 'Qualified human review remains required'].map(csvCell).join(','),
    'Demo limitations: browser-local sample workspace; simulated review; no regulatory acceptance or shipment authorization.',
    'Inputs',
    ...Object.entries(project.inputs).map((row) => row.map(csvCell).join(',')),
    'Evidence inventory',
    'Filename,Version,Status,Hash,Linked requirements',
    ...evidenceRows.map((row) => row.map(csvCell).join(',')),
    '',
    'Action register',
    'Requirement reference,Finding,Status,Action,Responsible role,Basis',
    ...actionRows.map((row) => row.map(csvCell).join(',')),
  ].join('\n')
  const body = `<h1>${esc(project.name)}</h1>
    <p><strong>Generated:</strong> ${esc(niceTime(generated))}</p>
    <p><strong>Stage:</strong> ${esc(project.stage)}</p>
    <p><strong>Purpose:</strong> ${esc(project.purpose)}</p>
    <p><strong>Represented scope:</strong> ${esc(project.scope)}</p>
    <p><strong>Primary next action:</strong> ${esc(primaryNextAction(findings))}</p>
    <p><strong>Review state:</strong> ${esc(project.id === 'fuel-transport' ? transportationStatus(project) : 'Qualified human review remains required')}</p>
    <h2>Inputs / Application Draft</h2>${Object.entries(project.inputs).map(([key, value]) => `<p><strong>${esc(labelize(key))}:</strong> ${esc(value || 'Missing')}</p>`).join('')}
    <h2>Evidence Inventory and Versions</h2>${Object.values(project.evidence).map((item) => `<p><strong>${esc(item.filename)}</strong> v${item.version} · ${esc(readableStatus(item.status))} · ${esc(item.hash)} · linked: ${esc(item.linkedRequirements.join(', ') || 'None')} · full retained characters: ${esc((item.fullText || '').length)}</p>`).join('')}
    <h2>Findings and Basis</h2>${findings.map((finding) => `<section><h3>${esc(finding.title)} · ${esc(readableStatus(finding.status))}</h3><p>${esc(finding.reason)}</p><p><strong>Basis:</strong> ${esc(finding.source.citation)} · ${esc(finding.source.version)}</p><p><strong>Unresolved gaps/conflicts:</strong> ${esc([...finding.missingEvidence, ...finding.applicabilityQuestions].join(' ') || 'None represented')}</p><p><strong>Next action:</strong> ${esc(finding.nextAction)} · ${esc(finding.role)}</p></section>`).join('')}
    <h2>History</h2>${project.history.map((entry) => `<p>${esc(niceTime(entry.at))} · ${esc(entry.actor)} · ${esc(entry.action)}</p>`).join('')}
    <h2>Demo Limitations</h2><p>This public demonstration uses browser-local storage, sample evidence, and simulated review. It does not upload documents to Atlas, create a regulatory submission, grant authorization, provide real shipment authorization, authorize a real shipment, or represent NRC, DOT, PHMSA, supplier, carrier, or human acceptance.</p>`
  return { body, html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(project.name)} report</title><style>body{font-family:Arial,sans-serif;line-height:1.5;max-width:960px;margin:40px auto;padding:0 20px;color:#111;overflow-wrap:anywhere}h1,h2{border-bottom:1px solid #ccc;padding-bottom:6px;break-after:avoid}@page{margin:18mm}@media print{body{margin:0;padding:0}h3{break-after:avoid}}</style></head><body>${body}</body></html>`, csv }
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

async function processEvidenceFile(file, scope) {
  const base = { filename: file.name, size: file.size, type: file.type || 'application/octet-stream', attachedAt: nowIso(), scope, status: 'processing', linkedRequirements: [], preview: '', fullText: '', previewTruncated: false, replacements: [], metadata: {} }
  if (file.size > MAX_FILE_SIZE) return { ...base, status: 'failed', hash: 'not-computed', failureReason: 'File is larger than the 512 KB public-demo limit.' }
  const extension = file.name.split('.').pop()?.toLowerCase()
  const typeSupported = supportedTypes.has(file.type) || ['txt', 'md', 'markdown', 'csv', 'json'].includes(extension)
  const buffer = await file.arrayBuffer()
  const hash = await sha256(buffer)
  if (!typeSupported) return { ...base, hash, status: 'failed', failureReason: 'Unsupported file type. This public demo processes TXT, Markdown, CSV, and JSON only.' }
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  let metadata = {}
  if (file.type === 'application/json' || extension === 'json') {
    try {
      const parsed = JSON.parse(text)
      metadata = parsed?.metadata && typeof parsed.metadata === 'object' ? parsed.metadata : {}
    } catch { return { ...base, hash, status: 'failed', failureReason: 'Malformed JSON. Atlas computed a hash but did not treat the file as extracted evidence.' } }
  }
  if (text.includes('\u0000')) return { ...base, hash, status: 'failed', failureReason: 'File content does not appear to be a supported text document.' }
  return { ...base, hash, status: 'processed', preview: text.slice(0, 5000), fullText: text, previewTruncated: text.length > 5000, metadata }
}

async function sha256(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Text(value) {
  if (typeof window !== 'undefined' && window.__ATLAS_DEMO_TRANSPORT_HASH_FAIL__) throw new Error('Transportation manifest hashing failed.')
  return sha256(new TextEncoder().encode(value))
}

function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalStringify(item)).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

function staleTransportationReview(project, reason) {
  if (!project.review?.simulatedAcceptance) return
  project.review.simulatedAcceptance = false
  project.review.status = 'stale'
  project.history.unshift(history(`Prior transportation review marked stale after ${reason}.`, 'Atlas'))
}

function markTransportationDirty(project, reason) {
  const previous = currentTransportationEvaluation(project) || project.transportEvaluation || project.staleTransportEvaluation || null
  if (previous) project.staleTransportEvaluation = { ...previous, staleReason: reason, staleAt: nowIso() }
  project.transportEvaluation = null
  project.transportRevision = (project.transportRevision || 1) + 1
  project.evaluationStatus = 'dirty'
  project.evaluatingRevision = 0
  project.evaluationError = ''
  project.acceptanceError = ''
  staleTransportationReview(project, reason)
}

function invalidateCachedTransportEvaluations(projects) {
  const next = structuredClone(projects)
  const transport = next['fuel-transport']
  if (transport?.transportEvaluation || transport?.evaluationStatus === 'evaluating') {
    if (transport.transportEvaluation) transport.staleTransportEvaluation = { ...transport.transportEvaluation, staleReason: 'browser reload validation pending', staleAt: nowIso() }
    transport.transportEvaluation = null
    transport.evaluationStatus = 'dirty'
    transport.evaluationError = ''
    transport.evaluatingRevision = 0
    transport.acceptanceError = ''
  }
  return next
}

function chooseSample(projectId, requirementId) {
  if (projectId === 'reactor-app' && requirementId === 'p53-legal') return sampleDocuments.formationRecord
  if (projectId === 'reactor-app' && requirementId === 'p53-financial') return sampleDocuments.financialPlan
  if (projectId === 'reactor-app' && requirementId === 'p53-environment') return sampleDocuments.environmentalReport
  if (projectId === 'reactor-app') return sampleDocuments.safetySummary
  if (projectId === 'fuel-transport' && requirementId === 'trn-carrier') return sampleDocuments.carrier
  if (projectId === 'fuel-transport' && requirementId === 'trn-route') return sampleDocuments.routeRecord
  if (projectId === 'fuel-transport' && requirementId === 'trn-security') return sampleDocuments.securityRecord
  if (projectId === 'fuel-transport' && requirementId === 'trn-execution') return sampleDocuments.executionRecord
  if (projectId === 'fuel-transport' && requirementId === 'trn-response') return sampleDocuments.emergencyResponse
  if (projectId === 'fuel-transport') return sampleDocuments.transportPackage
  if (projectId === 'supplier-qualification' && requirementId === 'sup-qap-current') return sampleDocuments.supplierCurrent
  if (projectId === 'supplier-qualification' && requirementId === 'sup-calibration') return sampleDocuments.calibrationRecord
  return sampleDocuments.supplierMisleading
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
