import './App.css'
import BasisPanel from './BasisPanel.jsx'
import { authorities, snapshotBasis } from './legalBasis.js'
import { traceabilityHtml, traceabilityRows } from './basisReport.js'
import { presenterOpening, presenterSteps } from './presenterWalkthrough.js'
import { validateShipment, evidenceApplicability } from './demoValidation.js'
import ReadinessReviewForm from './ReadinessReviewForm.jsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HistoricalAtlasNuclearEye from './components/HistoricalAtlasNuclearEye.jsx'

import { STORE_KEY, mergeProject, migrateWorkspace, workspaceTransaction } from './workspacePersistence.js'
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
      documentType: 'atlas-demo-package-compatibility',
      documentIdentity: 'ATLAS-SAMPLE-PACKAGE-001',
      scope: 'Fuel transportation',
      form: 'UF6',
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

const sourceRecords = Object.fromEntries(Object.entries({ part53: 'nrc-general', part53Financial: 'nrc-finance', part53Safety: 'nrc-safety', part53Environment: 'nrc-environment', part53Eligibility: 'nrc-eligibility', transportHrcq: 'dot-hrcq', transportEmergency: 'dot-response', atlasGovernance: 'atlas-workflow' }).map(([key, id]) => [key, { citation: authorities[id].provision, version: `${authorities[id].version}; verified ${authorities[id].verifiedAt}`, sourceUrl: authorities[id].url }]))

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
  ['citizenship', 'Directors and principal officers', '10 CFR § 53.1109(d)(3)(ii)', 'What are the names, addresses and citizenship of the applicant’s directors and principal officers?', 'p53-legal'],
  ['focd', 'Foreign ownership, control, or domination', '10 CFR § 53.1109(d)(3)(iii)', 'Is the applicant owned, controlled, or dominated by an alien, foreign corporation, or foreign government?', 'p53-legal'],
  ['license', 'License request', '10 CFR § 53.1109(e)', 'What license, facility use, license period, and related approvals are being requested?', 'p53-legal'],
  ['financial', 'Financial qualifications', '10 CFR § 53.1413', 'How will the applicant demonstrate financial qualifications?', 'p53-financial'],
  ['safety', 'Safety analysis', '10 CFR § 53.1416', 'What safety analysis will support the application?', 'p53-safety'],
  ['environment', 'Environmental information', '10 CFR § 53.1419', 'What environmental information will support the application?', 'p53-environment'],
  ['eligibility', 'Legal eligibility review', '10 CFR § 53.1118', 'What legal eligibility review is required?', 'p53-eligibility'],
  ['evidence', 'Controlled records', 'Atlas controlled-record workflow', 'Which controlled records support this application?', 'p53-records'],
  ['reviews', 'Reviews and open items', 'Atlas review workflow', 'What reviews and open items remain?', 'p53-reviews'],
  ['history', 'Traceable history', 'Atlas traceability workflow', 'What application history must remain traceable?', 'p53-history'],
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
  const [workspace, setWorkspace] = useState(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      const saved = migrateWorkspace(raw ? JSON.parse(raw) : null, initialProjects())
      if (!raw) for (const item of Object.values(saved.projects)) item.factProvenance = Object.fromEntries(Object.keys(item.inputs).map(key => [key, { category: 'F', provenance: 'Seeded public demonstration assumption; not independently verified' }]))
      return { ...saved, projects: invalidateCachedTransportEvaluations(saved.projects), saveStatus: raw ? 'saved' : 'idle', storageError: '' }
    } catch (error) {
      return { ...migrateWorkspace(null, initialProjects()), saveStatus: 'error', storageError: error.message, recovery: 'Saved data could not be read. It has not been overwritten.' }
    }
  })
  const current = useRef(workspace)
  const queue = useRef(Promise.resolve())
  const failed = useRef(Boolean(workspace.storageError))
  const publish = useCallback((next) => { current.current = next; setWorkspace(next) }, [])

  const updateProject = useCallback((projectId, updater) => {
    const before = current.current
    const base = before.projects[projectId]
    const proposed = updater(base)
    if (proposed === base) return
    const optimistic = { ...before, projects: { ...before.projects, [projectId]: proposed }, saveStatus: failed.current ? 'error' : 'saving' }
    publish(optimistic)
    queue.current = queue.current.then(async () => {
      if (failed.current) return
      try {
        const stored = await workspaceTransaction(raw => {
          const latest = migrateWorkspace(raw, structuredClone(before.projects))
          if (latest.epoch !== before.epoch) throw new Error('This workspace was reset in another tab. Your old changes are retained here for download; load the saved workspace to continue.')
          const remote = latest.projects[projectId]
          const evaluationOnly = JSON.stringify(base.inputs) === JSON.stringify(proposed.inputs) && JSON.stringify(base.evidence) === JSON.stringify(proposed.evidence) && JSON.stringify(base.review) === JSON.stringify(proposed.review) && JSON.stringify(base.history) === JSON.stringify(proposed.history)
          if (evaluationOnly && (remote.transportRevision !== proposed.transportRevision || JSON.stringify(remote.inputs) !== JSON.stringify(proposed.inputs) || JSON.stringify(remote.evidence) !== JSON.stringify(proposed.evidence) || JSON.stringify(remote.review) !== JSON.stringify(proposed.review))) return null
          if (evaluationOnly && proposed.evaluationStatus !== 'evaluating' && remote.evaluationRequestId !== proposed.evaluationRequestId) return null
          if (remote.revision !== base.revision && JSON.stringify(base.review) !== JSON.stringify(proposed.review) && proposed.review?.simulatedAcceptance) throw new Error('Review conflict: the saved project changed in another tab. Download your changes and load the saved workspace before reviewing again.')
          const merged = structuredClone(evaluationOnly ? { ...remote, transportEvaluation: proposed.transportEvaluation, evaluationStatus: proposed.evaluationStatus, evaluatingRevision: proposed.evaluatingRevision, evaluationError: proposed.evaluationError, acceptanceError: proposed.acceptanceError, evaluationRequestId: proposed.evaluationRequestId } : mergeProject(base, proposed, remote))
          if (projectId === 'fuel-transport' && (JSON.stringify(merged.inputs) !== JSON.stringify(proposed.inputs) || JSON.stringify(merged.evidence) !== JSON.stringify(proposed.evidence))) markTransportationDirty(merged, 'concurrent project changes merged')
          const factsChanged = JSON.stringify(base.inputs) !== JSON.stringify(proposed.inputs) || JSON.stringify(base.evidence) !== JSON.stringify(proposed.evidence) || JSON.stringify(base.requirements) !== JSON.stringify(proposed.requirements)
          if (factsChanged && remote.review?.simulatedAcceptance && projectId === 'fuel-transport') staleTransportationReview(merged, 'changes from another tab')
          if (factsChanged && remote.review && projectId === 'supplier-qualification') staleSupplierReview(merged, 'changes from another tab')
          merged.revision = remote.revision + 1
          latest.projects[projectId] = merged
          latest.lastSavedAt = nowIso()
          return latest
        })
        if (current.current === optimistic) {
          if (stored) publish({ ...stored, saveStatus: 'saved', storageError: '' })
          else {
            const raw = localStorage.getItem(STORE_KEY)
            publish({ ...migrateWorkspace(raw ? JSON.parse(raw) : null, initialProjects()), saveStatus: 'saved', storageError: '' })
          }
        }
      } catch (error) {
        failed.current = true
        publish({ ...current.current, saveStatus: 'error', storageError: error.message })
      }
    })
  }, [publish])

  const reset = useCallback(async () => {
    if (!window.confirm('Reset this browser demo workspace? This removes saved sample progress on this device.')) return
    try {
      await queue.current
      const stored = await workspaceTransaction(() => ({ ...migrateWorkspace(null, initialProjects()), epoch: crypto.randomUUID(), lastSavedAt: nowIso() }))
      failed.current = false
      publish({ ...stored, saveStatus: 'saved', storageError: '' })
    } catch (error) { publish({ ...current.current, saveStatus: 'error', storageError: error.message }) }
  }, [publish])

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
    const applicability = linked.map(id => evidenceApplicability(project, req.id, project.evidence[id], sampleDocuments))
    if (applicability.some(item => item.status !== 'established')) {
      status = applicability.some(item => item.status === 'mismatched') ? 'conflict' : 'gap'
      reason += ' ' + applicability.filter(item => item.status !== 'established').map(item => item.reason).join(' ')
    }
    const reviewed = project.review?.simulatedAcceptance && (project.id === 'supplier-qualification' ? supplierReady(project) : project.id === 'fuel-transport' && currentTransportationEvaluation(project)?.readyForReview && project.review.fingerprint === currentTransportationEvaluation(project)?.manifestFingerprint)
    if (reviewed && ['review', 'supported'].includes(status) && linked.length) {
      status = 'demo_accepted'
      reason += ' This evidence version was included in the current simulated review. Real-world acceptance remains outside this demonstration.'
    }
    return {
      id: `finding-${req.id}`,
      requirementId: req.id,
      title: req.title,
      status,
      reason,
      source: requirementSource(req),
      relevantBecause: req.relevance,
      supportingEvidence: linked,
      missingEvidence: linked.length ? [] : ['Processed evidence linked to this requirement'],
      applicabilityQuestions: status === 'demo_accepted' ? ['Real-world authorization and qualified review remain outside this demo.'] : status === 'supported' ? [] : ['Does the sample scope fully match this requirement?', 'Has an authorized reviewer accepted the evidence?'],
      nextAction: status === 'demo_accepted' ? 'Maintain this reviewed evidence version. Any change requires a new simulated review.' : findingNextAction(project, req, status, evidence),
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
      nextAction: priorCurrent ? 'Inspect the transportation report and maintain the reviewed shipment information.' : readyForReview ? 'Begin demonstration-only governed review.' : evaluationUnavailable ? 'Retry detailed transportation evaluation.' : !evaluationComplete ? 'Open shipment information to check the current package before review.' : result.nextAction,
      role: 'Governed reviewer',
      fingerprint,
      transportResult: result || provisional,
    })
  }

  if (project.id === 'supplier-qualification' && project.review) {
    const decision = project.review
    const accepted = decision.simulatedAcceptance && supplierReady(project)
    findings.push({ id: 'supplier-decision', requirementId: 'supplier-decision', title: 'Bounded supplier review decision', status: accepted ? 'demo_accepted' : decision.status, reason: `${decision.status === 'stale' ? 'Historical decision; the supporting evidence changed. ' : ''}${decision.explanation}`, source: sourceRecords.atlasGovernance, relevantBecause: 'Only quality program and calibration sample review is demonstrated.', supportingEvidence: reviewEvidence(project).map(item => item.id), missingEvidence: [], applicabilityQuestions: ['Supplier audits, full qualification, and NQA-1 certification are outside this demo.'], nextAction: accepted ? 'Maintain the reviewed scope and evidence versions.' : decision.status === 'stale' ? 'Review the current supporting evidence again.' : decision.explanation, role: project.role })
  }
  if (project.id === 'reactor-app') {
    for (const q of project.guided.questions) {
      if (!project.guided.skipped?.[q.id] && String(project.inputs[q.id] || '').trim()) continue
      findings.push({ id: `answer-${q.id}`, requirementId: q.requirement, title: `${q.label}: unresolved answer`, status: 'gap', reason: project.guided.skipped?.[q.id] ? 'Skipped for now. Any earlier answer is retained but requires confirmation.' : 'This draft section is missing.', source: requirementSource(project.requirements.find(req => req.id === q.requirement)), relevantBecause: 'The bounded draft must identify missing sections.', supportingEvidence: [], missingEvidence: ['Confirmed applicant answer'], applicabilityQuestions: [], nextAction: `Return to ${q.label} and complete or confirm the answer.`, role: project.role })
    }
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
  if (project.evaluationStatus === 'error') return `Evaluation unavailable. Shipment checking failed: ${project.evaluationError} Retry detailed evaluation.`
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
  const validation = validateShipment(inputs)
  const applicable = id => linked(id).length > 0 && linked(id).every(item => evidenceApplicability(project, id, item, sampleDocuments).status === 'established')
  const hrcqValid = inputs.hrcqStatus === 'resolved_sample_basis' && /49 CFR 173\.403/i.test(inputs.hrcqBasis || '')
  const routeProfile = inputs.routeProfile
  const maritime = routeProfile === 'truck_port_vessel'
  const nodes = {
    material: !validation.valid ? blocked(Object.values(validation.errors).join(' ')) : hrcqValid ? supported('Material facts and HRCQ sample basis are explicitly recorded for review.') : blocked('HRCQ threshold status is unresolved. Select the sample basis; blank, arbitrary, or incomplete text is not accepted.'),
    package: applicable('trn-package') ? review('Package compatibility evidence is linked; reviewer must confirm applicability to the material facts.') : blocked(linked('trn-package').length ? linked('trn-package').map(item => evidenceApplicability(project, 'trn-package', item, sampleDocuments).reason).join(' ') : 'Package compatibility evidence is missing.'),
    carrier: inputs.carrierEvidence === 'truck_supported' || inputs.carrierEvidence === 'multimodal_supported' ? supported('Carrier evidence is represented for the selected route profile.') : blocked('Shipper/carrier authority evidence is missing or only claimed.'),
    route: hrcqValid && ((!maritime && inputs.routeEvidence === 'truck_supported') || (maritime && inputs.routeEvidence === 'multimodal_supported')) ? supported('Route and mode evidence covers the represented scope.') : blocked(maritime ? 'Maritime route, port, vessel, flag-state, and destination overlays are unresolved.' : 'Highway route evidence or HRCQ basis is unresolved.'),
    security: ((!maritime && inputs.securityEvidence === 'domestic_supported') || (maritime && inputs.securityEvidence === 'multimodal_supported')) ? supported('Security readiness is represented without tactical details.') : blocked(maritime ? 'Port, vessel, or flag-state security evidence is unresolved.' : 'Security plan adequacy or support is unresolved.'),
    execution: ((!maritime && inputs.executionEvidence === 'domestic_supported') || (maritime && inputs.executionEvidence === 'multimodal_supported')) ? supported('Shipment execution evidence is represented for the selected path.') : blocked(maritime ? 'Port handoff or vessel cargo acceptance is unresolved.' : 'Pre-departure inspection, measurement, or shipping-paper evidence is unresolved.'),
    emergency: applicable('trn-response') && ((!maritime && inputs.emergencyEvidence === 'domestic_supported') || (maritime && inputs.emergencyEvidence === 'multimodal_supported')) ? review('Emergency response evidence is linked and ready for qualified review.') : blocked(maritime ? 'Port/COTP, vessel, flag-state, or destination response evidence is unresolved.' : 'Emergency response information evidence is missing or incomplete.'),
    reviewer: inputs.reviewer === 'valid' ? supported('Demo authorized reviewer is assigned.') : blocked(inputs.reviewer === 'missing_authority' ? 'Reviewer authority basis is missing.' : 'Demo authorized reviewer is not assigned.'),
  }
  for (const [requirementId, nodeId] of Object.entries({ 'trn-carrier': 'carrier', 'trn-route': 'route', 'trn-security': 'security', 'trn-execution': 'execution', 'trn-response': 'emergency' })) {
    const unresolved = linked(requirementId).map(item => evidenceApplicability(project, requirementId, item, sampleDocuments)).filter(item => item.status !== 'established')
    if (unresolved.length) nodes[nodeId] = blocked(unresolved.map(item => item.reason).join(' '))
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
    quantity: validateShipment(inputs).quantity,
    quantity_unit: validateShipment(inputs).unit,
    hrcq_status: inputs.hrcqStatus === 'resolved_sample_basis' && /49 CFR 173\.403/i.test(inputs.hrcqBasis || '') ? 'HRCQ' : 'INSUFFICIENT_INFORMATION',
    origin_state: inputs.origin,
    destination_state: inputs.destination,
    proposed_mode: inputs.routeProfile === 'truck_port_vessel' ? 'Highway to vessel' : 'Highway',
    route_profile: inputs.routeProfile,
    package_evidence_mode: project.requirements.find((req) => req.id === 'trn-package')?.linkedEvidence?.length > 0 && project.requirements.find((req) => req.id === 'trn-package').linkedEvidence.every((id) => evidenceApplicability(project, 'trn-package', project.evidence[id], sampleDocuments).status === 'established') ? 'compatible' : 'none',
    carrier_evidence_mode: inputs.carrierEvidence || 'none',
    route_evidence_mode: inputs.routeEvidence || 'none',
    security_evidence_mode: inputs.securityEvidence || 'none',
    shipment_execution_evidence_mode: inputs.executionEvidence || 'none',
    emergency_response_evidence_mode: project.requirements.find((req) => req.id === 'trn-response')?.linkedEvidence?.some((id) => evidenceApplicability(project, 'trn-response', project.evidence[id], sampleDocuments).status === 'established') ? inputs.emergencyEvidence || 'none' : 'none',
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
    const status = nodeStatus[key] === 'SUPPORTED' && local.status !== 'BLOCKED' ? (local.status === 'REVIEW' ? 'REVIEW' : 'SUPPORTED') : 'BLOCKED'
    return [key, { status, reason: status === 'BLOCKED' ? (local.status === 'BLOCKED' ? local.reason + ' ' + (reason[key] || '') : reason[key] || local.reason) : local.reason }]
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
            <span className="project-stage">{customerReportModel(project, findings).stage}</span>
            <h2>{project.name}</h2>
            <p>{project.purpose}</p>
            <dl>
              <div><dt>Current condition</dt><dd>{unresolved.length} evidence gaps or review findings</dd></div>
              <div><dt>Last saved</dt><dd>{niceTime(workspace.lastSavedAt)}</dd></div>
              <div><dt>Primary next action</dt><dd>{customerReportModel(project, findings).nextAction}</dd></div>
            </dl>
          </a>
        })}
      </div>
      <p>Capability shortcuts open different views of the same three saved projects.</p>
      <div className="module-grid" aria-label="Capability navigation">
        {modules.map((item) => <a className="module-card compact-card" href={item.href} key={item.href}>
          <span className="module-icon" aria-hidden="true">{item.code}</span>
          <strong>{item.title}</strong>
          <small>{item.text}</small>
        </a>)}
      </div>
      <PresenterGuide />
      <section className="panel" aria-labelledby="supply-chain-title">
        <p className="eyebrow">PUBLIC REFERENCE</p>
        <h2 id="supply-chain-title">Nuclear Supply Chain Explorer</h2>
        <p>Explore 70 component families, candidate suppliers, and their public evidence. Manufacturers can submit products for editorial review.</p>
        <a className="button secondary" href="/supply-chain/">Explore the supply chain →</a>
      </section>
    </section>
  </Shell>
}

function DemoNotice({ workspace, reset }) {
  return <div className={`demo-notice-panel save-${workspace.saveStatus}`} role="status">
    <strong>Demo workspace</strong>
    <span>{workspace.saveStatus === 'saved' ? 'Saved in this browser.' : 'Browser-local demo.'} Other devices will not see this demo workspace. Use sample or non-sensitive material.</span>
    <span>{workspace.saveStatus === 'saving' ? 'Saving...' : workspace.saveStatus === 'error' ? `Save failed: ${workspace.storageError}` : `Last saved: ${niceTime(workspace.lastSavedAt)}`}</span>
    {workspace.saveStatus === 'error' ? <><button className="button secondary compact" onClick={() => download('atlas-recoverable-workspace.json', JSON.stringify(workspace, null, 2), 'application/json')}>Download recoverable changes</button><button className="button secondary compact" onClick={() => { if (window.confirm('Load the saved version? Download your recoverable changes first.')) window.location.reload() }}>Load saved workspace</button></> : null}
    {workspace.recovery ? <span className="warning">{workspace.recovery}</span> : null}
    <button type="button" className="button secondary compact" onClick={reset}>Reset saved demo</button>
  </div>
}

function PresenterGuide() {
  return <details className="presenter-panel">
    <summary>Presenter / advanced controls</summary>
    <details><summary>Presenter walkthrough</summary><p>{presenterOpening}</p><p>Five minutes: supplier evidence correction. About 45 seconds per step, with one minute for review.</p><ol>{presenterSteps.map(step => <li key={step.label}><strong>{step.label}</strong><p>{step.show}</p><p>Say: “{step.say}”</p><p>Expected: {step.result}</p><p>Saved progress: {step.saved}</p></li>)}</ol><p>Transportation alternative: Requirements → Load sample package evidence → Resolve HRCQ facts → Load sample emergency response evidence → Emergency response evidence: Domestic highway supported → Assign demo reviewer → Simulate governed acceptance → Report. The HRCQ button selects an assumption; legal applicability stays unresolved.</p><p>Application alternative: Requirements / application → Why is this required? → Save and continue through fourteen questions → Finish guided demonstration → Edit answer → Report. This creates a draft, not NRC acceptance.</p></details>
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
      const requestId = crypto.randomUUID()
      updateProject(project.id, (current) => current.transportRevision === revision ? { ...current, evaluationRequestId: requestId, evaluationStatus: 'evaluating', evaluatingRevision: revision, evaluationError: '', acceptanceError: '' } : current)
      try {
        if (window.__ATLAS_DEMO_TRANSPORT_EVALUATOR_DELAY_MS__) await new Promise((resolve) => window.setTimeout(resolve, Number(window.__ATLAS_DEMO_TRANSPORT_EVALUATOR_DELAY_MS__)))
        const base = await evaluateTransportationWithExistingEngine(project)
        const manifest = {
          projectRevision: revision,
          representedScope: representedScope(project),
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
          if ((current.transportRevision || 1) !== revision || current.evaluationRequestId !== requestId) return current
          const reviewChanged = current.review?.simulatedAcceptance && current.review.fingerprint !== manifestFingerprint
          return {
            ...current,
            review: reviewChanged ? { ...current.review, status: 'stale', simulatedAcceptance: false } : current.review,
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
          if ((current.transportRevision || 1) !== revision || current.evaluationRequestId !== requestId) return current
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
      const changedKeys = Object.keys(next.inputs || {}).filter(key => JSON.stringify(current.inputs?.[key]) !== JSON.stringify(next.inputs[key]))
      if (changedKeys.length) {
        next.factProvenance = { ...next.factProvenance }
        for (const key of changedKeys) next.factProvenance[key] = { category: /Evidence$|^hrcq|^reviewer$|^routeProfile$/.test(key) ? 'F' : 'E', provenance: 'Visitor entry in this browser; not independently verified', at: nowIso() }
        next.basisHistory = [...(next.basisHistory || []), { id: crypto.randomUUID(), at: nowIso(), changedKeys, prior: { ...snapshotBasis(current), requirements: snapshotBasis(current).requirements.filter(record => record.factKeys?.some(key => changedKeys.includes(key))) } }]
      }
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
        if (next.guided.complete) return
        next.guided.complete = true
        next.history.unshift(history('Completed the guided demonstration and opened application results.', 'Visitor'))
        return
      }
      if (key === '__guidedSkip') {
        const id = next.guided.questions[next.guided.current].id
        next.guided.skipped = { ...next.guided.skipped, [id]: true }
        next.history.unshift(history(`Skipped ${part53Fields.find(q => q.id === id)?.label}; unresolved answer retained for follow-up.`, 'Visitor'))
        if (next.guided.current === 13) next.guided.complete = true
        else next.guided.current += 1
        return
      }
      if (next.guided?.skipped) delete next.guided.skipped[key]
      next.inputs[key] = value
      if (key === 'quantityValue' || key === 'quantityUnit') next.inputs.quantity = `${next.inputs.quantityValue} ${next.inputs.quantityUnit}`
      next.history.unshift(history(`Updated ${part53Fields.find(q => q.id === key)?.label || labelize(key)}. Affected findings were reevaluated.`, 'Visitor'))
      if (next.id === 'fuel-transport') markTransportationDirty(next, 'material scope or input changed')
      if (next.id === 'supplier-qualification') staleSupplierReview(next, 'project facts changed')
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
      if (next.id === 'supplier-qualification') staleSupplierReview(next, 'evidence links changed')
      next.history.unshift(history(`Linked ${evidence.filename} to ${requirement.title}.`, 'Visitor'))
    })
  }

  async function attachFile(file, requirementId, replaceId = '', metadataOverride = null) {
    let processed
    try { processed = await processEvidenceFile(file, project.scope) } catch (error) { processed = { filename: file.name, status: 'failed', hash: 'not-computed', failureReason: `File processing failed: ${error.message}`, fullText: '', metadata: {} } }
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
        linkedRequirements: previous ? [...previous.linkedRequirements] : requirementId ? [requirementId] : [],
        replacements: previous ? [...(previous.replacements || []), { filename: previous.filename, hash: previous.hash, version: previous.version, replacedAt: nowIso(), status: previous.status, fullText: previous.fullText || previous.preview || '', linkedRequirements: previous.linkedRequirements }] : [],
        reviewStatus: processed.status === 'failed' ? 'Not reviewable' : 'Pending human review',
      }
      if (next.id === 'supplier-qualification' && processed.status !== 'failed' && requirementId) {
        for (const record of Object.values(next.evidence)) {
          if (record.id !== id && record.linkedRequirements.includes(requirementId)) {
            record.linkedRequirements = record.linkedRequirements.filter(reqId => reqId !== requirementId)
            record.reviewStatus = 'Historical — replaced in this requirement'
          }
        }
        const requirement = next.requirements.find(req => req.id === requirementId)
        if (requirement) requirement.linkedEvidence = []
      }
      if (requirementId) {
        const req = next.requirements.find((item) => item.id === requirementId)
        if (req) req.linkedEvidence = Array.from(new Set([...req.linkedEvidence.filter((x) => x !== replaceId), id]))
      }
      if (next.id === 'fuel-transport') markTransportationDirty(next, 'evidence identity, content, version, or links changed')
      if (next.id === 'supplier-qualification') staleSupplierReview(next, 'supporting evidence changed')
      next.history.unshift(history(`${replaceId ? 'Replaced' : 'Attached'} ${processed.filename}: ${processed.status}.`, 'Visitor'))
    })
    setSelectedEvidence(replaceId || '')
  }

  async function loadSampleEvidence(requirementId) {
    const sample = chooseSample(project.id, requirementId)
    if (!sample) return
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
      const ready = Boolean(validateShipment(next.inputs).valid && evaluateTransportationProject(next).readyForReview && current?.readyForReview && current.manifestFingerprint && current.projectRevision === (next.transportRevision || 0))
      if (!ready) {
        next.acceptanceError = next.evaluationStatus === 'error' ? 'Acceptance blocked because detailed transportation evaluation is unavailable.' : 'Acceptance blocked until the current project revision finishes detailed evaluation and hashing.'
        next.history.unshift(history(next.acceptanceError, 'Atlas'))
        return
      }
      next.acceptanceError = ''
      next.review = { authorityBasis: snapshotBasis({ ...next, revision: (next.revision || 0) + 1 }), fingerprint: current.manifestFingerprint, status: 'accepted_demo_only', simulatedAcceptance: true, acceptedAt: nowIso(), evaluation: current, acceptedRevision: next.transportRevision, scope: representedScope(next), inputs: structuredClone(next.inputs), evidence: reviewEvidence(next), explanation: 'Bounded sample gates and declared evidence reviewed for demonstration only.' }
      next.decisions = [...(next.decisions || []), structuredClone(next.review)]
      next.history.unshift(history('Demonstration-only transportation acceptance recorded for the current manifest fingerprint.', 'Demo authorized reviewer'))
    })
  }

  function decideSupplier(decision, explanation) {
    patchProject(next => {
      if (!explanation.trim()) return
      if (decision === 'accepted_demo_only' && !supplierReady(next)) return
      next.review = { authorityBasis: snapshotBasis({ ...next, revision: (next.revision || 0) + 1 }), status: decision, simulatedAcceptance: decision === 'accepted_demo_only', acceptedRevision: (next.revision || 0) + 1, acceptedAt: nowIso(), scope: representedScope(next), inputs: structuredClone(next.inputs), evidence: reviewEvidence(next), explanation: explanation.trim() }
      next.decisions = [...(next.decisions || []), structuredClone(next.review)]
      next.history.unshift(history(`Supplier demo decision: ${decision === 'accepted_demo_only' ? 'simulated acceptance' : decision === 'rejected' ? 'rejected' : 'changes requested'}. ${explanation.trim()}`, 'Supplier quality reviewer (simulated)'))
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
      {project.id === 'supplier-qualification' && (view === 'requirements' || view === 'evidence') ? <SupplierReview project={project} decide={decideSupplier} /> : null}
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
    <p className="eyebrow">{customerReportModel(project, findings).stage}</p>
    <h1>{project.name}</h1>
    <div className="status-strip">
      <span>{unresolved.length} unresolved findings</span>
      <span>{Object.keys(project.evidence).length} evidence records</span>
      <span>{project.role}</span>
    </div>
    <p>{project.purpose}</p>
    <p><strong>Atlas identified:</strong> {customerReportModel(project, findings).stage} <strong>Next:</strong> {customerReportModel(project, findings).nextAction} <strong>Produce:</strong> a bounded draft and evidence/action register.</p>
  </header>
}

function Overview({ project, findings, setView }) {
  const open = findings.filter((finding) => !['supported', 'demo_accepted'].includes(finding.status))
  return <div className="workspace-grid">
    <section className="panel wide">
      <h2>Current Condition</h2>
      <p><strong>{customerReportModel(project, findings).status}</strong></p>
      <p>{project.scope}</p>
      <div className="summary-grid">
        <article><span>What this project is trying to accomplish</span><strong>{project.purpose}</strong></article>
        <article><span>What Atlas identified</span><strong>{open.length ? `${open.length} unresolved evidence or review findings` : 'No unresolved demo findings'}</strong></article>
        <article><span>What the visitor should do next</span><strong>{customerReportModel(project, findings).nextAction}</strong></article>
        <article><span>Deliverable</span><strong>{project.id === 'reactor-app' ? 'Application draft and evidence/action register' : project.id === 'fuel-transport' ? 'Transportation readiness package' : 'Supplier review report'}</strong></article>
      </div>
    </section>
    <section className="panel">
      <h2>Next Actions</h2>
      <ul className="action-list">{open.slice(0, 4).map((finding) => <li key={finding.id}><strong>{finding.nextAction}</strong><span>{finding.role}</span><BasisPanel id={finding.requirementId} project={project} /></li>)}</ul>
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
  const storedQuestion = guided?.questions[guided.current]
  const currentQuestion = storedQuestion ? { ...storedQuestion, ...part53Fields.find(q => q.id === storedQuestion.id) } : null
  const completeGuided = guided && guided.current >= guided.questions.length - 1
  return <div className="workspace-grid">
    {project.id === 'reactor-app' ? <section className="panel wide" data-testid="part53-builder">
      <h2>{guided.complete ? 'Application Results' : 'Guided Application'}</h2>
      {guided.complete ? <><p>Your answers have been assembled into a draft. Review the remaining evidence gaps and open items before downloading.</p><ReportAction project={project} setView={setView} /></> : null}
      {!guided.complete ? <div className="guided-box">
        <p className="eyebrow">Question {guided.current + 1} of 14</p>
        <p>{questionGuidance[currentQuestion.id][0]}</p>
        <p><strong>Example:</strong> {questionGuidance[currentQuestion.id][1]}</p>
        <BasisPanel id={`q-${currentQuestion.id}`} project={project} />
        <p><strong>Evidence prompt:</strong> {project.requirements.find(req => req.id === currentQuestion.requirement)?.question}</p>
        {chooseSample(project.id, currentQuestion.requirement) ? <button className="button secondary compact" onClick={() => loadSampleEvidence(currentQuestion.requirement)}>Load relevant sample for this question</button> : <p>No supplied sample establishes this section. Use the requirements register to attach relevant supporting records; qualified assessment remains required.</p>}
        <p><strong>Draft preview — {currentQuestion.label}:</strong> {project.inputs[currentQuestion.id] || 'Missing section; your answer will appear here.'}</p>
        <label>{currentQuestion.prompt}<textarea value={project.inputs[currentQuestion.id] || ''} onChange={(event) => setInput(currentQuestion.id, event.target.value)} /></label>
        <div className="button-row">
          <button type="button" className="button secondary" disabled={guided.current === 0} onClick={() => setInput('__guidedBack', '') || null}>Back</button>
          <button type="button" className="button secondary" onClick={() => setInput('__guidedSkip', '')}>Skip for now — record unresolved gap</button>
          <button type="button" className="button primary" onClick={() => setGuidedStep(project, setInput, completeGuided ? 'complete' : 'next')}>{completeGuided ? 'Finish guided demonstration' : 'Save and continue'}</button>
        </div>
      </div> : <ApplicationDraft project={project} editingQuestion={editingQuestion} setEditingQuestion={setEditingQuestion} setInput={setInput} />}
    </section> : null}
    {project.id === 'fuel-transport' ? <TransportationPath project={project} findings={findings} setInput={setInput} loadSampleEvidence={loadSampleEvidence} acceptTransportationDemo={acceptTransportationDemo} retryTransportationEvaluation={retryTransportationEvaluation} /> : null}
    {project.id !== 'reactor-app' ? <ReportAction project={project} setView={setView} /> : null}
    <details className="panel wide" open={project.id !== 'reactor-app'}>
      <summary>Complete requirements register</summary>
      <h2>Requirements</h2>
      <div className="requirement-list">
        {project.requirements.map((req) => {
          const finding = findings.find((item) => item.requirementId === req.id)
          return <article className="requirement-card" key={req.id}>
            <div>
              <span className={`status-pill ${finding?.status}`}>{readableStatus(finding?.status)}</span>
              <h3>{req.title}</h3>
              <p>{req.relevance}</p>
              <BasisPanel id={req.id} project={project} />
            </div>
            <EvidenceLinks req={req} evidence={project.evidence} linkEvidence={linkEvidence} />
            <div className="button-row">
              <button type="button" className="button secondary compact" disabled={!chooseSample(project.id, req.id)} onClick={() => loadSampleEvidence(req.id)}>Load sample evidence</button>
              <label className="file-button">Attach evidence<input type="file" onChange={(event) => event.target.files?.[0] && attachFile(event.target.files[0], req.id)} /></label>
            </div>
            <p className="finding-reason">{finding?.reason}</p>
          </article>
        })}
      </div>
    </details>
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
  const missing = project.guided.questions.filter((q) => project.guided.skipped?.[q.id] || !String(project.inputs[q.id] || '').trim())
  return <div className="application-draft" data-testid="part53-results">
    <p>Completion of this guided demonstration means the visitor reached the results view. It does not mean the application is complete or accepted.</p>
    {project.guided.questions.map((q) => <article key={q.id}>
      <h3>{q.label}</h3><BasisPanel id={`q-${q.id}`} project={project} />
      {editingQuestion === q.id ? <label>Edit answer<textarea value={project.inputs[q.id] || ''} onChange={(event) => setInput(q.id, event.target.value)} /><button type="button" className="button primary compact" onClick={() => setEditingQuestion(null)}>Save edit</button></label> : <>
        <p>{project.guided.skipped?.[q.id] ? 'Skipped for now — unresolved gap. Retained prior answer: ' : ''}{project.inputs[q.id] || 'Missing section'}</p>
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
  const validation = validateShipment(project.inputs)
  const evaluationReady = Boolean(validation.valid && current?.readyForReview && governed?.status === 'review' && governed?.fingerprint)
  return <section className="panel wide transportation-path">
    <h2>Your transportation readiness package</h2>
    <div className="sticky-step">
      <strong>Shipment readiness</strong>
      <span>{current ? `${result.blockers.length} transportation blockers` : 'Checking shipment requirements'}</span>
    </div>
    <p role="status" data-testid="transport-evaluation-state">{transportationStatus(project)}</p>
    <TransportationDetails project={project} />
    <p>The bounded sample represents HALEU UF6 at 19.75 wt% and 12 kgU. Route, carrier, security, and execution selections are scenario assumptions, not attached documents.</p>
    {project.requirements.find(req => req.id === 'trn-response')?.linkedEvidence.length ? <p className="warning">Emergency response file attached. Next: assess the represented response scope using the <button className="button secondary compact" onClick={() => document.getElementById('emergency-assessment')?.querySelector('select')?.focus()}>Emergency response evidence control</button> below. Attachment alone does not establish applicability.</p> : null}
    <div className="form-grid">
      {[
        ['material', 'Material'],
        ['form', 'Physical or chemical form'],
        ['enrichment', 'U-235 enrichment wt%'],
        ['quantityValue', 'Quantity'],
        ['origin', 'Origin'],
        ['destination', 'Destination'],
      ].map(([key, label]) => <label key={key}>{label}<input aria-label={label} aria-invalid={Boolean(validation.errors[key])} aria-describedby={validation.errors[key] ? `error-${key}` : undefined} value={project.inputs[key] || ''} onChange={(event) => setInput(key, event.target.value)} />{validation.errors[key] ? <span className="field-error" id={`error-${key}`}>{validation.errors[key]}</span> : null}</label>)}
      <label>Quantity unit<select value={project.inputs.quantityUnit || ''} onChange={event => setInput('quantityUnit', event.target.value)}><option value="">Select unit</option><option value="kgU">kgU — kilograms of uranium</option>{project.inputs.quantityUnit && project.inputs.quantityUnit !== 'kgU' ? <option value={project.inputs.quantityUnit}>{project.inputs.quantityUnit} (unsupported)</option> : null}</select>{validation.errors.quantityUnit ? <span className="field-error">{validation.errors.quantityUnit}</span> : null}</label>
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
      <label id="emergency-assessment">Emergency response evidence<select value={project.inputs.emergencyEvidence || 'none'} onChange={(event) => setInput('emergencyEvidence', event.target.value)}>
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
    <p>Evidence dropdowns above represent simulated scope assessments. Inspect actual attachments in Evidence; real carrier, route, security, and execution approval remains outside this demo.</p>
    <div className="button-row">
      <button type="button" className="button primary" onClick={() => loadSampleEvidence('trn-package')}>Load sample package evidence</button>
      <button type="button" className="button secondary" onClick={() => { setInput('hrcqStatus', 'resolved_sample_basis'); setInput('hrcqBasis', 'Sample assumption for 49 CFR 173.403 only; activity per package and A1/A2 analysis are not supplied. Legal HRCQ applicability remains unresolved.') }}>Resolve HRCQ facts</button>
      <button type="button" className="button secondary" onClick={() => loadSampleEvidence('trn-response')}>Load sample emergency response evidence</button>
      <button type="button" className="button secondary" onClick={() => setInput('reviewer', 'valid')}>Assign demo reviewer</button>
      <button type="button" className="button secondary" disabled={!evaluationReady} onClick={acceptTransportationDemo}>Simulate governed acceptance</button>
      {project.evaluationStatus === 'error' ? <button type="button" className="button secondary" onClick={retryTransportationEvaluation}>Retry detailed evaluation</button> : null}
    </div>
    {project.acceptanceError ? <p className="warning">{project.acceptanceError}</p> : null}
    <BasisPanel id="trn-governed-review" project={project} /><BasisPanel id="trn-material" project={project} /><BasisPanel id="trn-package" project={project} /><BasisPanel id="trn-response" project={project} />
    <p className="demo-acceptance">Demonstration only — not shipment authorization</p>
    <details><summary>Detailed authority and evidence sections</summary><Findings project={project} findings={findings} compact /></details>
    <details><summary>Optional maritime/change scenarios</summary><BasisPanel id="trn-maritime" project={project} /><p>Switching to maritime adds port, vessel, flag-state, destination, security, execution, and emergency-response gates. It invalidates prior demonstration review until all added scope is reevaluated.</p><button type="button" className="button secondary compact" onClick={() => { setInput('routeProfile', 'truck_port_vessel'); setInput('destination', 'Demo marine terminal and overseas receiving site'); setInput('routeEvidence', 'truck_supported'); setInput('securityEvidence', 'plan_only'); setInput('executionEvidence', 'none'); setInput('emergencyEvidence', 'none') }}>Apply optional maritime scope</button><button type="button" className="button secondary compact" onClick={() => { setInput('carrierEvidence', 'multimodal_supported'); setInput('routeEvidence', 'multimodal_supported'); setInput('securityEvidence', 'multimodal_supported'); setInput('executionEvidence', 'multimodal_supported'); setInput('emergencyEvidence', 'multimodal_supported') }}>Resolve maritime sample scope</button></details>
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
        <p>{finding.reason}</p><BasisPanel id={finding.requirementId} project={project} />
        <dl>
          <div><dt>Source</dt><dd><SourceLink source={finding.source} /></dd></div>
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
  return <details><summary>Evaluation details and prior records</summary><p>Atlas workflow diagnostics. Embedded engine references have not received provision-level legal verification; legal verification pending for any broader conclusion. Use the reviewed basis panels for the represented scope.</p>
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
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    const frame = requestAnimationFrame(() => {
      const element = heading.current
      if (!element) return
      element.focus({ preventScroll: true })
      const offset = ['.workspace-header', '.project-tabs'].reduce((height, selector) => height + (getComputedStyle(document.querySelector(selector)).position === 'sticky' ? document.querySelector(selector).getBoundingClientRect().height : 0), 24)
      window.scrollTo({ top: Math.max(0, window.scrollY + element.getBoundingClientRect().top - offset), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [])
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

const questionGuidance = {
  'legal-name': ['Use the full registered applicant name, including the legal suffix.', 'Atlas Demo Energy LLC.'],
  address: ['Give the applicant mailing address and identify any separate principal office.', '100 Demo Industrial Parkway, Piketon, Ohio; postal code to be confirmed.'],
  business: ['Describe the activities the applicant conducts and its role in the proposed project.', 'Advanced reactor project development; operating organization still to be identified.'],
  organization: ['State the organization type, jurisdiction of formation, and principal place of business.', 'Ohio limited liability company with its principal office in Piketon.'],
  citizenship: ['List names, addresses and citizenship of directors and principal officers; identify missing supporting information.', 'Director roster is being assembled; citizenship records need legal review.'],
  focd: ['Describe known ownership and control arrangements, including foreign interests and unresolved questions.', 'Ownership chart attached; indirect control assessment remains open.'],
  license: ['Describe the requested license, intended facility use, period, and related approvals. Mark undecided items.', 'Combined license for a demonstration reactor; proposed term to be confirmed.'],
  financial: ['Identify funding sources, cost estimates, financial records, and who will review them.', 'Construction funding plan outline available; operating cost support needs financial review.'],
  safety: ['Identify the safety analysis documents and their actual maturity. Do not imply unfinished analyses are complete.', 'Preliminary safety analysis outline; controlled analysis and technical review outstanding.'],
  environment: ['Describe environmental information available and missing site or alternatives studies.', 'Site information outline available; alternatives analysis not completed.'],
  eligibility: ['Identify the legal eligibility questions, supporting records, and responsible legal reviewer.', 'Legal counsel to assess ownership and statutory eligibility; review not started.'],
  evidence: ['List controlled supporting records with identity, version, and their intended draft section.', 'Organization record dated 2026-08-15 supports applicant identity.'],
  reviews: ['List open decisions, responsible roles, and the next action for each.', 'Technical reviewer: assess preliminary safety analysis before application use.'],
  history: ['Describe revisions, source changes, and decisions that must remain traceable.', 'Retain prior document versions and the reason for each replacement.'],
}

function requirementSource(req) {
  if (req.id === 'trn-route') return sourceRecords.atlasGovernance
  return sourceRecords[({ 'p53-financial': 'part53Financial', 'p53-safety': 'part53Safety', 'p53-environment': 'part53Environment', 'p53-eligibility': 'part53Eligibility' })[req.id] || req.source]
}
function SourceLink({ source, label }) {
  const section = label?.match(/53\.\d+/)?.[0]
  if (section) source = { ...source, sourceUrl: `https://www.ecfr.gov/current/title-10/chapter-I/part-53/subpart-H/section-${section}` }
  return source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer">{label || source.citation}</a> : <span>{label || source.citation} — Atlas demo control, not a regulatory requirement</span>
}
function representedScope(project) {
  if (project.id !== 'fuel-transport') return project.scope
  const i = project.inputs
  return `${i.material || 'Missing material'} ${i.form || 'Missing form'}; ${i.enrichment || 'Missing enrichment'} wt%; ${i.quantityValue || 'Missing quantity'} ${i.quantityUnit || 'Missing unit'}; ${i.origin || 'Missing origin'} to ${i.destination || 'Missing destination'}; ${readableValues[i.routeProfile] || 'Missing or unsupported route'}. Bounded simulated shipment review only.`
}
function reviewEvidence(project) {
  return project.requirements.flatMap(req => req.linkedEvidence.map(id => project.evidence[id]).filter(Boolean).map(item => ({ id: item.id, requirement: req.title, filename: item.filename, version: item.version, hash: item.hash })))
}
function supplierReady(project) {
  return project.requirements.every(req => req.linkedEvidence.length > 0 && req.linkedEvidence.every(id => evidenceApplicability(project, req.id, project.evidence[id], sampleDocuments).status === 'established'))
}
function staleSupplierReview(project, reason) {
  if (!project.review) return
  project.review = { ...project.review, simulatedAcceptance: false, status: 'stale' }
  project.history.unshift(history(`Prior supplier decision marked historical after ${reason}.`, 'Atlas'))
}
function SupplierReview({ project, decide }) {
  const [explanation, setExplanation] = useState('')
  const ready = supplierReady(project)
  return <section className="panel wide supplier-review">
    <h2>Simulated supplier review</h2><BasisPanel id="supplier-decision" project={project} />
    <p>{customerReportModel(project).status}</p>
    <p>Inspect the quality program replacement and calibration sample, then explain your decision. This limited review does not qualify the supplier or establish NQA-1 certification. Audits, implementation effectiveness, procurement requirements, and item acceptance remain outside this demonstration.</p>
    {project.requirements.map(req => <div key={req.id}><h3>{req.title}</h3>{req.linkedEvidence.length ? req.linkedEvidence.map(id => {
      const item = project.evidence[id]
      if (!item) return null
      const applicability = evidenceApplicability(project, req.id, item, sampleDocuments)
      return <details key={id}><summary>Open {item.filename} · v{item.version} · {labelize(applicability.status)}</summary><p>{applicability.reason}</p><pre>{item.fullText || item.preview}</pre></details>
    }) : <p>Missing supporting evidence. Load or attach it in the requirements register.</p>}</div>)}
    <p>Professional judgment or interpretation · simulated reviewer explanation; no agency interpretation is attributed.</p><label>Decision explanation<textarea value={explanation} onChange={event => setExplanation(event.target.value)} /></label>
    <div className="button-row">
      <button className="button primary" disabled={!ready || !explanation.trim()} onClick={() => decide('accepted_demo_only', explanation)}>Simulate supplier acceptance</button>
      <button className="button secondary" disabled={!explanation.trim()} onClick={() => decide('changes_requested', explanation)}>Request changes</button>
      <button className="button secondary" disabled={!explanation.trim()} onClick={() => decide('rejected', explanation)}>Reject demo package</button>
    </div>
    {project.review ? <p><strong>Recorded explanation:</strong> {project.review.explanation}</p> : null}
  </section>
}

const readableValues = { truck_only: 'Highway only', truck_port_vessel: 'Highway, port, and vessel', domestic_supported: 'Domestic highway scope assumed in demo', truck_supported: 'Highway scope assumed in demo', multimodal_supported: 'Multimodal scope assumed in demo', valid: 'Demo authorized reviewer assigned', none: 'Not represented', insufficient_information: 'Insufficient information', resolved_sample_basis: 'Sample threshold basis selected', claimed_only: 'Claimed only; unresolved', plan_only: 'Plan only; adequacy unresolved', missing_authority: 'Reviewer authority missing', exercise_open_action: 'Exercise corrective action open', measurement_out_of_range: 'Measurement outside represented range' }
const readableValue = value => readableValues[value] || value || 'Missing section'
function customerReportModel(project, findings = evaluateProject(project)) {
  const accepted = project.id === 'fuel-transport'
    ? Boolean(validateShipment(project.inputs).valid && currentTransportationEvaluation(project)?.readyForReview && project.review?.simulatedAcceptance && project.review.fingerprint === currentTransportationEvaluation(project)?.manifestFingerprint)
    : project.id === 'supplier-qualification' && supplierReady(project) && project.review?.simulatedAcceptance
  const status = project.id === 'fuel-transport' ? transportationStatus(project)
    : project.review?.status === 'stale' ? 'Prior review stale after change — review the current evidence again.'
      : project.review?.status === 'rejected' ? 'Rejected — obtain corrected evidence and review again.'
        : project.review?.status === 'changes_requested' ? 'Changes requested — resolve the recorded review explanation.'
          : accepted ? 'Simulated acceptance current for the bounded supplier review.'
            : project.id === 'supplier-qualification' ? supplierReady(project) ? 'Ready for demo review.' : 'Blocked — replace the quality program and provide applicable calibration evidence.'
              : 'Bounded application draft — qualified review and missing sections remain open.'
  const groups = project.id === 'reactor-app' ? [
    ['Applicant identity and organization', ['legal-name', 'address', 'business', 'organization', 'citizenship']],
    ['Requested authorization and represented project scope', ['license']],
    ['Financial qualifications', ['financial']],
    ['Safety and environmental information', ['safety', 'environment']],
    ['Legal eligibility items', ['focd', 'eligibility']],
    ['Supporting evidence', ['evidence']],
    ['Outstanding questions and review needs', ['reviews']],
    ['Revision and history', ['history']],
  ] : project.id === 'fuel-transport' ? [
    ['Material and shipment facts', ['material', 'form', 'enrichment', 'quantity', 'origin', 'destination']],
    ['Represented route and scenario assumptions', ['routeProfile', 'hrcqStatus', 'hrcqBasis', 'carrierEvidence', 'routeEvidence', 'securityEvidence', 'executionEvidence', 'emergencyEvidence', 'reviewer']],
  ] : [['Supplier identity and represented scope', ['supplier', 'itemScope', 'reviewScope']], ['Controlled document expectations', ['expectedQualityProgramIdentity', 'expectedQualityProgramVersion']]]
  const sections = groups.map(([title, keys]) => ({ title, rows: keys.map(key => ({ label: part53Fields.find(q => q.id === key)?.label || labelize(key), value: project.guided?.skipped?.[key] ? `Unresolved gap — skipped for now. Prior answer: ${project.inputs[key] || 'Missing section'}` : readableValue(project.inputs[key]) })) }))
  const nextAction = accepted ? 'Inspect the reviewed scope and evidence versions. Real-world review remains outside this demonstration.' : project.review?.status === 'rejected' || project.review?.status === 'changes_requested' ? project.review.explanation : primaryNextAction(findings)
  const stage = accepted ? 'Simulated acceptance current' : project.review?.status === 'stale' ? 'Prior review stale after change' : project.review?.status === 'rejected' ? 'Rejected' : project.review?.status === 'changes_requested' ? 'Changes requested' : project.id === 'reactor-app' ? 'Application draft' : project.id === 'fuel-transport' && project.evaluationStatus === 'error' ? 'Evaluation unavailable' : project.id === 'fuel-transport' && !currentTransportationEvaluation(project) ? 'Checking' : (project.id === 'fuel-transport' ? currentTransportationEvaluation(project)?.readyForReview : supplierReady(project)) ? 'Ready for demo review' : 'Blocked'
  return { status, stage, accepted, sections, nextAction, scope: representedScope(project), revision: project.revision || 0, findings, records: reviewEvidence(project), decisions: project.decisions || (project.review?.acceptedAt ? [project.review] : []) }
}

function buildReport(project, findings) {
  const model = { ...customerReportModel(project, findings), traceability: snapshotBasis(project) }
  const generated = nowIso()
  const evidence = Object.values(project.evidence)
  const actions = findings.map(finding => [finding.requirementId, finding.title, readableStatus(finding.status), finding.nextAction, finding.role, finding.source.citation])
  const limitations = 'This public demonstration uses browser-local storage, sample evidence, and simulated review. It does not upload documents to Atlas, create a regulatory submission, grant real shipment authorization, or establish supplier qualification or NQA-1 certification. The application draft covers only the fourteen demonstrated questions; complete analyses, other required sections, legal sufficiency, and qualified review are not established.'
  const decisions = model.decisions.map(decision => ({ ...decision, label: model.accepted && decision.acceptedAt === project.review?.acceptedAt ? 'Current simulated decision' : `Historical decision — relevant revision ${decision.acceptedRevision ?? 'not recorded'}` }))
  const csv = [
    ['Project', project.name], ['Scope', model.scope], ['Generated', generated], ['Project revision', model.revision], ['Review state', model.status], ['Primary next action', model.nextAction], ['Demo limitations', limitations],
    ...model.sections.flatMap(section => [[section.title], ...section.rows.map(row => [row.label, row.value])]),
    ['Evidence inventory'], ['Filename', 'Version', 'Status', 'Hash', 'Linked requirements', 'Applicability'],
    ...evidence.map(item => [item.filename, item.version, readableStatus(item.status), item.hash, item.linkedRequirements.join('; '), item.linkedRequirements.map(id => evidenceApplicability(project, id, item, sampleDocuments).reason).join('; ') || 'Unlinked; not assessed']),
    ['Action register'], ['Requirement reference', 'Finding', 'Status', 'Action', 'Responsible role', 'Basis'], ...actions,
    ...traceabilityRows(model.traceability),
    ...decisions.flatMap(decision => traceabilityRows(decision.authorityBasis, decision.label)),
    ...(project.basisHistory || []).flatMap(entry => traceabilityRows(entry.prior, `Prior applicability before ${entry.changedKeys.join(', ')} change at ${entry.at}`)),
    ['Revision and review history'], ...decisions.flatMap(decision => [[decision.label, decision.acceptedRevision, labelize(decision.status), decision.scope, decision.explanation], ...(decision.evidence || []).map(item => ['Reviewed record', item.filename, item.version, item.hash, item.requirement])]),
    ...evidence.flatMap(item => (item.replacements || []).map(previous => ['Evidence history', previous.filename, previous.version, previous.status, previous.failureReason || 'Prior usable version', previous.hash])),
    ...project.history.map(entry => ['History', entry.at, entry.actor, entry.action]),
  ].map(row => row.map(csvCell).join(',')).join('\n')
  const sourceHtml = source => source.sourceUrl ? `<a href="${esc(source.sourceUrl)}">${esc(source.citation)}</a>` : `${esc(source.citation)} — Atlas demo control, not a regulatory requirement`
  const body = `<h1>${esc(project.name)}</h1>
    <h2>Executive summary</h2><p><strong>${esc(model.status)}</strong></p>
    <p>${esc(project.purpose)} This is a bounded demonstration draft. Missing facts, evidence gaps, and open review items remain listed below.</p>
    <p><strong>Represented scope:</strong> ${esc(model.scope)}</p>
    <p><strong>Primary next action:</strong> ${esc(model.nextAction)}</p>
    <p><strong>Project revision:</strong> ${model.revision} · <strong>Generated:</strong> ${esc(niceTime(generated))}</p>
    ${model.sections.map(section => `<h2>${esc(section.title)}</h2>${section.rows.map(row => `<p><strong>${esc(row.label)}:</strong> ${esc(row.value)}</p>`).join('')}`).join('')}
    <h2>Supporting evidence and applicability</h2>${evidence.map(item => `<section><h3>${esc(item.filename)} · v${item.version}</h3><p>Processing: ${esc(readableStatus(item.status))}. Links: ${esc(item.linkedRequirements.map(id => project.requirements.find(req => req.id === id)?.title || id).join(', ') || 'No linked evidence requirement')}.</p><p>${esc(item.linkedRequirements.map(id => evidenceApplicability(project, id, item, sampleDocuments).reason).join(' ') || 'Applicability not assessed for this unlinked record.')}</p></section>`).join('')}
    <h2>Outstanding questions, findings, and next actions</h2>${findings.map(finding => `<section><h3>${esc(finding.title)} · ${esc(readableStatus(finding.status))}</h3><p>${esc(finding.reason)}</p><p><strong>Basis:</strong> ${sourceHtml(finding.source)} · ${esc(finding.source.version)}</p><p><strong>Requirement reference:</strong> ${esc(finding.requirementId)}</p><p><strong>Open review questions:</strong> ${esc([...finding.missingEvidence, ...finding.applicabilityQuestions].join(' ') || 'None represented within this bounded check')}</p><p><strong>Next action:</strong> ${esc(finding.nextAction)} · <strong>Responsible role:</strong> ${esc(finding.role)}</p></section>`).join('')}
    <h2>Supporting authority and requirement mapping</h2>${traceabilityHtml(model.traceability)}
    <h2>Review scope and decisions</h2>${decisions.length ? decisions.map(decision => `<section><h3>${esc(decision.label)}</h3><p>Revision ${esc(decision.acceptedRevision ?? 'not recorded')} · ${esc(labelize(decision.status))} · ${esc(niceTime(decision.acceptedAt))}</p><p>Professional judgment or interpretation (simulated reviewer). ${esc(decision.scope || 'Historical scope not recorded')} — ${esc(decision.explanation || 'Explanation not recorded')}</p>${traceabilityHtml(decision.authorityBasis)}<ul>${(decision.evidence || []).map(item => `<li>${esc(item.filename)} · v${item.version} · ${esc(item.requirement)}</li>`).join('')}</ul></section>`).join('') : '<p>No simulated decision recorded. Qualified human review remains required.</p>'}
    <details><summary>Supporting technical records and detailed history</summary><h2>Evidence integrity and replacement history</h2>${evidence.map(item => `<p>${esc(item.filename)} · v${item.version} · SHA-256 ${esc(item.hash)} · full retained characters: ${esc((item.fullText || '').length)}</p>${(item.replacements || []).map(previous => `<p>Historical v${previous.version}: ${esc(previous.filename)} · ${esc(previous.hash)} · ${esc(previous.failureReason || 'Replaced')} · ${esc(previous.status)}</p>`).join('')}`).join('')}<h2>Project history</h2>${project.history.map(entry => `<p>${esc(niceTime(entry.at))} · ${esc(entry.actor)} · ${esc(entry.action)}</p>`).join('')}</details>
    <h2>Earlier applicability bases</h2>${(project.basisHistory || []).map(entry => `<details><summary>Before ${esc(entry.changedKeys.join(", "))} changed at ${esc(entry.at)}</summary>${traceabilityHtml(entry.prior)}</details>`).join('')}
    <h2>Demo Limitations</h2><p>${esc(limitations)}</p><p>Regulatory links identify source requirements, not proof that this entire scenario complies. No automatic authority currency check has occurred.</p>`
  return { body, html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(project.name)} report</title><style>body{font-family:Arial,sans-serif;line-height:1.5;max-width:960px;margin:40px auto;padding:0 20px;color:#111;overflow-wrap:anywhere}h1,h2{border-bottom:1px solid #ccc;padding-bottom:6px;break-after:avoid}@page{margin:18mm}@media print{body{margin:0;padding:0}h3{break-after:avoid}details::details-content{display:block!important;content-visibility:visible!important}details>*{display:block!important}}</style></head><body>${body}</body></html>`, csv }
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
  if (projectId === 'reactor-app' && requirementId === 'p53-safety') return sampleDocuments.safetySummary
  if (projectId === 'reactor-app') return null
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
    supported: 'Demo prerequisite represented',
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
