import './App.css'
import ReadinessReviewForm from './ReadinessReviewForm.jsx'
import { useCallback, useState } from 'react'
import HistoricalAtlasNuclearEye from './components/HistoricalAtlasNuclearEye.jsx'

const modules = [
  { href: '/mission-control/nuclear-readiness/', code: '01', title: 'Nuclear Readiness', text: 'Project readiness, blockers, lifecycle status, and readiness gates.' },
  { href: '/part53/', code: '02', title: 'Part 53 Readiness', text: 'Guided application workspace with controlled evidence gates.' },
  { href: '/transportation/', code: '03', title: 'Transportation Readiness', text: 'Material, package, carrier, route, security, execution, emergency, and governed review.' },
  { href: '/mission-control/evidence/', code: '04', title: 'Evidence / Governance', text: 'Traceability, gaps, decision boundaries, and reviewable records.' },
]

function Shell({ title, eyebrow = 'MISSION CONTROL', children }) {
  return <main className="workspace-shell">
    <header className="workspace-header">
      <a className="brand" href="/" aria-label="Atlas Nuclear home"><span>A</span> ATLAS NUCLEAR</a>
      <div className="workspace-breadcrumb"><span>{eyebrow}</span><strong>{title}</strong></div>
      <a className="button secondary compact" href="/mission-control/">Back to Mission Control</a>
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

function MissionControl() {
  return <Shell title="Module Choices">
    <section className="module-page" aria-labelledby="module-title">
      <div>
        <p className="eyebrow">MISSION CONTROL MODULES</p>
        <h1 id="module-title">Choose the readiness surface.</h1>
        <p className="module-copy">Open one dedicated Atlas workspace. Each surface preserves its own evidence boundary and review status.</p>
      </div>
      <div className="module-grid" aria-label="Mission Control module choices">
        {modules.map((item) => <a className="module-card" href={item.href} key={item.href}>
          <span className="module-icon" aria-hidden="true">{item.code}</span>
          <strong>{item.title}</strong>
          <small>{item.text}</small>
        </a>)}
      </div>
    </section>
  </Shell>
}

function PlaceholderWorkspace({ kind }) {
  const copy = {
    nuclear: ['Nuclear Readiness', 'Project readiness workspace', 'This public surface frames project readiness status, open blockers, and qualified-review boundaries. Detailed project records remain in governed Atlas systems.'],
    evidence: ['Evidence / Governance', 'Evidence and governed decisions', 'This workspace summarizes traceability, record quality, coverage limits, and the human decision boundary for public demonstrations.'],
  }[kind]
  return <Shell title={copy[0]}>
    <section className="placeholder-workspace">
      <p className="eyebrow">{copy[1]}</p>
      <h1>{copy[0]}</h1>
      <p>{copy[2]}</p>
      <div className="governance-grid">
        <article><span>Coverage</span><strong>SCOPED</strong><small>Comprehensive legal coverage is not established.</small></article>
        <article><span>Authority</span><strong>HUMAN REVIEW REQUIRED</strong><small>Atlas cannot approve, license, or authorize nuclear work.</small></article>
        <article><span>Evidence</span><strong>TRACEABLE</strong><small>Claims remain distinct from controlled evidence and governed decisions.</small></article>
      </div>
    </section>
  </Shell>
}

function Privacy() {
  return <main><section className="section"><p className="eyebrow">PRIVACY NOTICE</p><h1>Atlas Nuclear inquiry privacy</h1><p>Atlas Nuclear uses project-readiness inquiry information only to respond to the inquiry. Do not submit safeguards information, security-sensitive information, export-controlled technical data, proprietary reactor information, or controlled project records.</p><p>Submitting an inquiry does not create an attorney-client relationship, engineering engagement, project approval, regulatory submission, or authorization to proceed.</p><a className="button primary" href="/">Return to Atlas Nuclear</a></section></main>
}

function App() {
  const [reviewOpen, setReviewOpen] = useState(false)
  const closeReview = useCallback(() => setReviewOpen(false), [])
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/privacy') return <Privacy />
  if (path === '/mission-control') return <><MissionControl /><ReadinessReviewForm open={reviewOpen} onClose={closeReview} /></>
  if (path === '/mission-control/nuclear-readiness') return <PlaceholderWorkspace kind="nuclear" />
  if (path === '/mission-control/evidence') return <PlaceholderWorkspace kind="evidence" />
  if (path === '/demo') { window.location.replace('https://lab.atlaseye.ai'); return null }
  return <Cover />
}

export default App
