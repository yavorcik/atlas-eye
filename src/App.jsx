import { useCallback, useState } from 'react'
import './App.css'
import ReadinessReviewForm from './ReadinessReviewForm.jsx'

const READINESS_ASSESSMENT = 'https://lab.atlaseye.ai'

const capabilities = [
  ['Guide each requirement', 'Atlas translates the application structure into focused questions, requested evidence, responsible roles, and review boundaries.'],
  ['Build seven volumes', 'Applicant information moves into a reviewable application structure while unsupported fields remain visibly held back.'],
  ['Preserve the basis', 'Each answer stays connected to its regulatory basis, evidence status, ownership, history, and deterministic fingerprint.'],
  ['Expose what is missing', 'Missing, unreviewed, conflicting, stale, and superseded evidence cannot silently become an application fact.'],
  ['Control the boundary', 'Qualified professionals retain interpretation, acceptance, approval, submission, and regulatory authority.'],
]

const audiences = [
  ['Prospective owners/operators', 'Begin organizing the accountable applicant, project basis, evidence, and licensing work needed to advance.'],
  ['Utilities', 'Connect the application effort with grid, customer, governance, and operating-organization obligations.'],
  ['Data-center and industrial users', 'Test whether a nuclear energy concept has enough project and organizational basis to begin licensing preparation.'],
  ['Reactor developers and suppliers', 'Expose customer-interface, configuration, evidence, qualification, and long-lead gaps before commitments harden.'],
  ['EPC and construction teams', 'Connect licensing objectives with engineering, procurement, construction, turnover, and owner-readiness dependencies.'],
  ['Investors and lenders', 'Separate supported facts, assumptions, evidence gaps, risks, and the decisions still required.'],
  ['State and local organizations', 'Understand which site, infrastructure, community, licensing, and organizational questions must be resolved.'],
  ['Legal, regulatory, engineering, and QA advisors', 'Coordinate requirements, evidence, disciplines, and review boundaries without displacing professional accountability.'],
]

const outputs = ['Seven-volume application structure', 'Regulatory basis for each question', 'Applicant-information record', 'Evidence-status map', 'Requirements traceability', 'Accountable owners and reviewers', 'Held-back unsupported fields', 'Version and history visibility', 'Read-only authority status']

function App() {
  const [reviewOpen, setReviewOpen] = useState(false)
  const closeReview = useCallback(() => setReviewOpen(false), [])
  if (window.location.pathname.replace(/\/+$/, '') === '/privacy') return <main><section className="section"><p className="eyebrow">PRIVACY NOTICE</p><h1>Atlas Nuclear inquiry privacy</h1><p>Atlas Nuclear uses project-readiness inquiry information only to respond to the inquiry. Do not submit safeguards information, security-sensitive information, export-controlled technical data, proprietary reactor information, or controlled project records.</p><p>Inquiry content is delivered through our existing email provider and is not written to Atlas Core, Mission Control, governed records, protected evidence, or a lead database. Short-lived pseudonymous controls prevent abuse and duplicate delivery.</p><p>Submitting an inquiry does not create an attorney-client relationship, engineering engagement, project approval, regulatory submission, or authorization to proceed.</p><a className="button primary" href="/">Return to Atlas Nuclear</a></section></main>
  if (window.location.pathname.replace(/\/+$/, '') === '/demo') {
    window.location.replace(READINESS_ASSESSMENT)
    return null
  }

  return <main>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Atlas Nuclear home"><span>A</span> ATLAS NUCLEAR</a>
      <nav aria-label="Primary navigation"><a href="/part53">Part 53 Builder</a><a href="#how">How It Works</a><a href="#who">Who It Helps</a><a href={READINESS_ASSESSMENT}>Readiness Assessment</a><button className="nav-link" type="button" onClick={() => setReviewOpen(true)}>Legal Readiness Review</button><a href="#about">About</a></nav>
      <a className="button primary compact" href="/part53">Build a Part 53 Application</a>
    </header>

    <section className="hero" id="top">
      <div>
        <p className="eyebrow">THE ATLAS PART 53 APPLICATION BUILDER</p>
        <h1>Build the application. Keep every requirement tied to evidence.</h1>
        <p className="hero-copy">Tell Atlas about the proposed applicant and project. Atlas guides you through the information, evidence, accountable work, and qualified review needed to assemble a Part 53 application.</p>
        <div className="actions"><a className="button primary hero-primary" href="/part53">Build a Part 53 Application <span aria-hidden="true">→</span></a><a className="button secondary" href="#how">See how the builder works</a></div>
        <p className="supporting"><b>Interactive product preview.</b> Sample information only. Nothing is saved, submitted, approved, or used to authorize nuclear work.</p>
      </div>
      <aside className="builder-card">
        <p className="card-label">APPLICATION WORKSPACE</p>
        <strong>From applicant information to a controlled draft.</strong>
        <ol>
          <li><span>01</span> Establish the applicant</li>
          <li><span>02</span> Answer guided questions</li>
          <li><span>03</span> Identify supporting evidence</li>
          <li><span>04</span> Assign accountable review</li>
          <li><span>05</span> Assemble the application</li>
        </ol>
        <div className="status-line"><span className="status-dot" aria-hidden="true"></span> Missing evidence remains visible</div>
      </aside>
    </section>

    <section className="pathways section" id="product">
      <div><p className="eyebrow">TWO CLEAR STARTING POINTS</p><h2>Start with the work your project needs now.</h2></div>
      <div className="pathway-grid">
        <article className="pathway-primary"><p className="pathway-number">01 / LICENSING</p><h3>Build a Part 53 Application</h3><p>Work through the applicant information, regulatory basis, evidence, ownership, and review needed to assemble a controlled application draft.</p><a className="text-link" href="/part53">Open the Part 53 Builder →</a></article>
        <article><p className="pathway-number">02 / PROJECT PLANNING</p><h3>Assess SMR Project Readiness</h3><p>Evaluate broader project readiness across site, grid, technology, organization, licensing, evidence, delivery, and operations.</p><a className="text-link secondary-link" href={READINESS_ASSESSMENT}>Run the Readiness Assessment →</a></article>
      </div>
    </section>

    <section className="section" id="how"><p className="eyebrow">HOW THE BUILDER WORKS</p><h2>Atlas turns regulatory requirements into application work.</h2><div className="capabilities">{capabilities.map(([title, body], i) => <article key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      <div className="flow" aria-label="Part 53 application workflow"><b>Describe the applicant</b><i>→</i><b>Answer the requirement</b><i>→</i><b>Identify evidence</b><i>→</i><b>Assign review</b><i>→</i><b>Build the volume</b></div>
      <div className="parts"><p><b>Guided questions</b> ask for the information needed by the application structure and explain why it matters.</p><p><b>Evidence control</b> distinguishes applicant statements from missing, unreviewed, conflicting, stale, or superseded support.</p><p><b>Mission Control</b> shows what is verified, restricted, reviewed, approved, or unauthorized.</p></div>
    </section>

    <section className="section" id="who"><p className="eyebrow">WHO ATLAS HELPS</p><h2>One application record for every party shaping the project.</h2><div className="audiences">{audiences.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></section>

    <section className="section deliverables"><div><p className="eyebrow">WHAT THE BUILDER PRODUCES</p><h2>See the application and its basis—not just a score.</h2><p>Atlas gives the applicant and its disciplines a common record of what is known, asserted, evidenced, missing, held back, and assigned.</p></div><ul>{outputs.map(item => <li key={item}>{item}</li>)}</ul></section>

    <section className="section trust" id="about"><p className="eyebrow">ACCOUNTABLE DECISIONS</p><h2>Atlas builds the controlled work. Qualified people make the decisions.</h2><p>Licensed engineers, qualified nuclear professionals, counsel, responsible executives, regulators, and established approval authorities retain their respective roles. Atlas does not design reactors, license projects, operate reactors, replace engineers or counsel, issue NRC approval, authorize nuclear work, or provide NQA-1 certification.</p><details><summary>Product-preview and authority limitations</summary><p>The public Part 53 Builder is advisory and non-governed. Its output is not engineering approval, legal advice, regulatory acceptance, work authorization, governed release, an NRC submission, or permission to perform nuclear work.</p></details></section>

    <section className="closing" id="review"><p className="eyebrow">BEGIN THE APPLICATION</p><h2>Turn the proposed project into organized licensing work.</h2><p>Start with the applicant. Atlas will show what information is needed, what evidence is missing, and what must be reviewed next.</p><div className="actions"><a className="button primary" href="/part53">Build a Part 53 Application</a><button className="button secondary" type="button" onClick={() => setReviewOpen(true)}>Request a legal readiness review</button></div></section>
    <footer><b>ATLAS NUCLEAR</b><span>Part 53 application building + SMR project readiness</span><button className="footer-contact" type="button" onClick={() => setReviewOpen(true)}>Request a legal readiness review</button></footer>
    <ReadinessReviewForm open={reviewOpen} onClose={closeReview} />
  </main>
}

export default App
