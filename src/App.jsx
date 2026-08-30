import { useCallback, useState } from 'react'
import './App.css'
import ReadinessReviewForm from './ReadinessReviewForm.jsx'

const DEMO = 'https://lab.atlaseye.ai'

const capabilities = [
  ['Structures the project', 'Captures project stage, location, technology, site, grid, QA, licensing, evidence, and organizational facts.'],
  ['Evaluates readiness', 'Assesses the project across eleven SMR-readiness domains using repository-controlled criteria and existing readiness engines.'],
  ['Explains every gap', 'Shows the fact, assumption, evidence, missing evidence, responsible discipline, next action, and supporting source.'],
  ['Builds the action plan', 'Converts findings into a sequenced 30/60/90-day readiness plan with accountable owners.'],
  ['Controls the boundary', 'Distinguishes technical analysis from qualified review, approval, work authorization, governed release, and regulatory acceptance.'],
]

const audiences = [
  ['Prospective owners/operators', 'Decide whether the organization, evidence, site, and delivery model are ready for the next investment or licensing step.'],
  ['Utilities', 'Compare project readiness with grid, customer, governance, and operating-organization obligations.'],
  ['Data-center and industrial users', 'Test whether a nuclear energy concept has the site, interconnection, technology, fuel, and delivery basis to advance.'],
  ['Reactor developers and suppliers', 'Expose customer-interface, configuration, evidence, qualification, and long-lead gaps before commitments harden.'],
  ['EPC and construction teams', 'See prerequisites, work-package, QA, supply-chain, construction, turnover, and owner-readiness dependencies.'],
  ['Investors and lenders', 'Make diligence faster by separating supported facts, assumptions, evidence gaps, risks, and next decisions.'],
  ['State and local organizations', 'Understand which site, infrastructure, community, licensing, and organizational questions must be resolved.'],
  ['Legal, regulatory, engineering, and QA advisors', 'Coordinate requirements, evidence, disciplines, and review boundaries without displacing professional accountability.'],
]

const outputs = ['SMR readiness assessment', 'Critical-gap register', 'Evidence inventory', 'Requirements traceability', 'Organizational-capability assessment', 'Licensing-preparation issues', '30/60/90-day action plan', 'Downloadable advisory readiness report', 'Read-only decision and authority status']

function App() {
  const [reviewOpen, setReviewOpen] = useState(false)
  const closeReview = useCallback(() => setReviewOpen(false), [])
  if (window.location.pathname.replace(/\/+$/, '') === '/privacy') return <main><section className="section"><p className="eyebrow">PRIVACY NOTICE</p><h1>Atlas Nuclear inquiry privacy</h1><p>Atlas Nuclear uses project-readiness inquiry information only to respond to the inquiry. Do not submit safeguards information, security-sensitive information, export-controlled technical data, proprietary reactor information, or controlled project records.</p><p>Inquiry content is delivered through our existing email provider and is not written to Atlas Core, Mission Control, governed records, protected evidence, or a lead database. Short-lived pseudonymous controls prevent abuse and duplicate delivery.</p><p>Submitting an inquiry does not create an attorney-client relationship, engineering engagement, project approval, regulatory submission, or authorization to proceed.</p><a className="button primary" href="/">Return to Atlas Nuclear</a></section></main>
  if (window.location.pathname.replace(/\/+$/, '') === '/demo') {
    window.location.replace(DEMO)
    return null
  }

  return <main>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Atlas Nuclear home"><span>A</span> ATLAS NUCLEAR</a>
      <nav aria-label="Primary navigation"><a href="#product">Product</a><a href="#how">How It Works</a><a href="#who">Who It Helps</a><a href={DEMO}>Demonstration</a><button className="nav-link" type="button" onClick={() => setReviewOpen(true)}>Readiness Review</button><a href="#about">About</a></nav>
      <a className="button primary compact" href={DEMO}>Run the SMR readiness demonstration</a>
    </header>

    <section className="hero" id="top">
      <div><p className="eyebrow">SMR PROJECT READINESS + EVIDENCE CONTROL</p><h1>Know what is ready. Know what is missing. Know what must happen next.</h1><p className="hero-copy">Atlas Nuclear helps organizations evaluate SMR project readiness, connect requirements to evidence, identify critical gaps, and build a defensible plan for the next project decision.</p><div className="actions"><a className="button primary" href="/part53">BUILD A PART 53 APPLICATION</a><a className="button primary" href={DEMO}>Run the guided demonstration</a><a className="button secondary" href="#how">See how Atlas works</a></div><p className="supporting">Experience how Atlas turns regulatory requirements into guided questions, evidence requests, accountable work, and a reviewable application.</p></div>
      <aside><strong>An SMR project-readiness and evidence-control platform.</strong><dl><div><dt>Atlas produces</dt><dd>Explainable readiness, evidence gaps, and owned next actions</dd></div><div><dt>Atlas refuses</dt><dd>Unsupported approval, authorization, certification, or regulatory claims</dd></div></dl></aside>
    </section>

    <section className="problem section" id="product"><p className="eyebrow">THE PROJECT PROBLEM</p><h2>SMR projects do not fail from a lack of documents. They fail when organizations cannot tell which facts, evidence, decisions, and responsibilities are actually ready.</h2><p>Project information is fragmented among developers, vendors, counsel, engineers, consultants, utilities, regulators, suppliers, and capital providers.</p><div className="consequences">{['Important assumptions look like facts', 'Evidence is disconnected from decisions', 'Organizational gaps appear too late', 'Licensing preparation becomes reactive', 'Diligence becomes slow and expensive', 'Executives cannot see the real critical path', 'Technical completion is confused with approval or authority'].map(item => <span key={item}>{item}</span>)}</div></section>

    <section className="section" id="how"><p className="eyebrow">WHAT ATLAS DOES</p><h2>From scattered project information to a credible next decision.</h2><div className="capabilities">{capabilities.map(([title, body], i) => <article key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      <div className="flow" aria-label="Atlas Nuclear workflow"><b>Describe the project</b><i>→</i><b>Ask Atlas</b><i>→</i><b>Evaluate readiness</b><i>→</i><b>Inspect evidence</b><i>→</i><b>Build the plan</b><i>→</i><b>Control the decision</b></div>
      <div className="parts"><p><b>Talk to Atlas</b> explains project questions using the current project context and repository-controlled nuclear sources.</p><p><b>Atlas Readiness</b> evaluates eleven readiness domains and identifies explainable gaps.</p><p><b>Mission Control</b> shows what is verified, restricted, reviewed, approved, or unauthorized.</p></div>
    </section>

    <section className="section" id="who"><p className="eyebrow">WHO ATLAS HELPS</p><h2>One readiness record for every party shaping the project.</h2><div className="audiences">{audiences.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></section>

    <section className="section deliverables"><div><p className="eyebrow">CONCRETE DELIVERABLES</p><h2>See the basis, not just a score.</h2><p>Atlas gives leaders and disciplines a common record of what is known, assumed, evidenced, missing, and assigned.</p></div><ul>{outputs.map(item => <li key={item}>{item}</li>)}</ul></section>

    <section className="section trust" id="about"><p className="eyebrow">ACCOUNTABLE DECISIONS</p><h2>Atlas helps organizations prepare for accountable decisions. It does not make those decisions for them.</h2><p>Licensed engineers, qualified nuclear professionals, counsel, responsible executives, regulators, and established approval authorities retain their respective roles. Atlas does not design reactors, license projects, operate reactors, replace engineers or counsel, issue NRC approval, authorize nuclear work, or provide NQA-1 certification.</p><details><summary>Full prototype and authority limitations</summary><p>The public demonstration is advisory and non-governed. Its analysis is not engineering approval, legal advice, regulatory acceptance, work authorization, governed release, or permission to perform nuclear work. Mission Control presents the read-only boundary between technical verification and authority.</p></details></section>

    <section className="closing" id="review"><p className="eyebrow">THE NEXT CREDIBLE DECISION</p><h2>Before your organization says an SMR project is ready, make sure the evidence supports it.</h2><div className="actions"><a className="button primary" href={DEMO}>Run the guided demonstration</a><button className="button secondary" type="button" onClick={() => setReviewOpen(true)}>Request a project-readiness review</button></div></section>
    <footer><b>ATLAS NUCLEAR</b><span>SMR project readiness + evidence control</span><button className="footer-contact" type="button" onClick={() => setReviewOpen(true)}>Request a project-readiness review</button></footer>
    <ReadinessReviewForm open={reviewOpen} onClose={closeReview} />
  </main>
}

export default App
