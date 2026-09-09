import { useRef, useState } from 'react'
import { catalog, filterParts, sourcesFor } from './catalog.mjs'
import { BLOCKS, ROLES, validateSubmission } from '../../services/supplier-intake/contract.mjs'

const initial = { kind: 'new', existing_part_id: '', company: '', email: '', website: '', role: '', product: '', block: '', facility: '', country: '', description: '', document_url: '', certificate: '', consent: false, fax: '' }
const endpoint = import.meta.env.VITE_SUPPLIER_SUBMISSION_URL || ''
const external = { target: '_blank', rel: 'noopener noreferrer' }

function ManufacturerForm({ seed }) {
  const [values, setValues] = useState({ ...initial, ...seed })
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')
  const attempt = useRef(null)
  const busy = useRef(false)
  function update(event) {
    const { name, type, checked, value } = event.target
    setValues(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value }))
  }
  async function submit(event) {
    event.preventDefault()
    if (busy.current || !endpoint) return
    let payload
    // Keep the same reference for retries of the same content, including uncertain network outcomes.
    const serialized = JSON.stringify(values)
    if (attempt.current?.serialized !== serialized) attempt.current = { serialized, id: crypto.randomUUID() }
    try { payload = validateSubmission({ ...values, request_id: attempt.current.id }) }
    catch { setError('Please check all required fields. Website and document links must begin with https://.'); return }
    busy.current = true
    setState('sending'); setError('')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetch(endpoint, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, fax: '' }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || result.ok !== true || !/^[0-9a-f-]{36}$/i.test(result.reference || '')) {
        if (response.status === 429) throw Error('Too many submissions. Please try again in an hour.')
        throw Error('We could not confirm receipt. Your form is still here; please try again later.')
      }
      setReference(result.reference); setState('success')
    } catch (reason) {
      setState('error')
      setError(reason.name === 'AbortError' ? 'Receipt could not be confirmed. Retry without changing the form to reuse the same submission reference.' : reason.message)
    } finally { clearTimeout(timer); busy.current = false }
  }
  if (state === 'success') return <section className="sc-confirmation" role="status">
    <span className="sc-kicker">RECEIVED FOR REVIEW</span><h2>Thank you for contributing.</h2>
    <p>Your product information is in the private review queue. It is not yet a public listing. The editorial team will use your business email to confirm your authority and follow up on evidence.</p>
    <p>Reference: <code>{reference}</code></p>
    <button onClick={() => { setValues(initial); setState('idle'); attempt.current = null }}>Submit another product</button>
  </section>
  const field = (name, label, props = {}) => <label key={name}>{label}<input name={name} value={values[name]} onChange={update} required {...props} /></label>
  return <form onSubmit={submit} className="sc-form">
    {!endpoint && <p className="sc-note" role="status">Product submissions are opening soon. You can explore the form now; submission will become available when the service is connected.</p>}
    <fieldset disabled={state === 'sending'}>
      <legend>{values.kind === 'update' ? `Request an update to ${values.existing_part_id}` : 'Submit a product for review'}</legend>
      <p>Basic listings are free. Tell people what you make, where you make it, and which public documents support your capability.</p>
      <p className="sc-note">Business email stays private. The remaining product and company information may be published after editorial review. Submit only material you are authorized to share publicly.</p>
      <div className="sc-form-grid">
        {field('company', 'Legal company name *', { maxLength: 160, autoComplete: 'organization' })}
        {field('email', 'Business email — private *', { type: 'email', maxLength: 254, autoComplete: 'email' })}
        {field('website', 'Company website (https://) *', { type: 'url', maxLength: 1000 })}
        <label>Company role *<select name="role" value={values.role} onChange={update} required><option value="">Select role</option>{ROLES.map(role => <option key={role}>{role}</option>)}</select></label>
        {field('product', 'Product or product family *', { maxLength: 180 })}
        <label>Component group *<select name="block" value={values.block} onChange={update} required><option value="">Select group</option>{BLOCKS.map(block => <option key={block}>{block}</option>)}</select></label>
        {field('facility', 'Manufacturing or delivery facility *', { maxLength: 180 })}
        {field('country', 'Facility country *', { maxLength: 100, autoComplete: 'country-name' })}
        <label className="sc-wide">Capability and intended applications *<textarea name="description" value={values.description} onChange={update} required minLength={20} maxLength={2000} rows={4} /></label>
        <div className="sc-wide">{field('document_url', 'Public product documentation (https://) *', { type: 'url', maxLength: 1000 })}</div>
        <label className="sc-wide">Certification evidence — optional<textarea name="certificate" value={values.certificate} onChange={update} maxLength={1000} rows={3} placeholder="Issuer, certificate number, facility and product scope, expiry date, and public certificate link." /></label>
      </div>
      <label className="sc-trap" aria-hidden="true">Fax<input name="fax" value={values.fax} onChange={update} tabIndex={-1} autoComplete="off" /></label>
      <label className="sc-consent"><input type="checkbox" name="consent" checked={values.consent} onChange={update} required /><span>I am authorized to represent this company and permit AtlasEye to review and publish the supplied company and product information. AtlasEye may contact me about this submission. *</span></label>
      <p className="sc-small">An update request does not transfer control of a listing. Company authority and supporting evidence require review. Submission does not establish qualification or regulatory approval.</p>
      <div aria-live="assertive">{error && <p className="sc-error" role="alert">{error}</p>}</div>
      <button className="sc-primary" disabled={state === 'sending' || !endpoint}>{state === 'sending' ? 'Submitting…' : endpoint ? 'Submit for review →' : 'Submissions opening soon'}</button>
    </fieldset>
  </form>
}

export default function Explorer() {
  const params = new URLSearchParams(window.location.search)
  const [query, setQuery] = useState('')
  const [block, setBlock] = useState('')
  const [evidence, setEvidence] = useState('')
  const [selection, setSelected] = useState(catalog.parts.find(part => part.id === params.get('part')) || catalog.parts[0])
  const [view, setView] = useState(params.get('view') === 'submit' ? 'submit' : 'explore')
  const [seed, setSeed] = useState({})
  const [formVersion, setFormVersion] = useState(0)
  const [animation, setAnimation] = useState(false)
  const results = filterParts({ query, block, evidence })
  const selected = results.find(part => part.id === selection.id) || results[0] || selection
  const sources = sourcesFor(selected)
  function select(part) {
    setSelected(part)
    window.history.replaceState(null, '', `?part=${part.id}`)
  }
  function listProduct(part) {
    if (part) {
      setSeed({ kind: 'update', existing_part_id: part.id, company: part.evidence === 'Unresolved' ? '' : part.company, product: part.component, block: part.block })
      setFormVersion(version => version + 1)
    }
    setView('submit')
    window.history.replaceState(null, '', '?view=submit')
  }
  function explore() { setView('explore'); window.history.replaceState(null, '', `?part=${selected.id}`) }
  return <div className="sc-app">
    <a className="sc-skip" href="#sc-main">Skip to content</a>
    <header className="sc-header">
      <a className="sc-brand" href="/"><img src="/favicon.png" width="36" height="36" alt="" />ATLASEYE</a>
      <nav aria-label="Supply chain"><button aria-current={view === 'explore' ? 'page' : undefined} onClick={explore}>Explore components</button><button aria-current={view === 'submit' ? 'page' : undefined} onClick={() => listProduct()}>List a product</button><a href="/mission-control/">Mission Control ↗</a></nav>
    </header>
    <main id="sc-main">
      <div hidden={view !== 'explore'}>
        <section className="sc-intro">
          <div><p className="sc-kicker">NUCLEAR SUPPLY CHAIN / PUBLIC REFERENCE</p><h1>Understand the parts.<br /><span>Discover the makers.</span></h1><p className="sc-lead">Explore the major pieces of a small modular reactor plant and the companies whose published capabilities may support them.</p></div>
          <div className="sc-stats"><div><strong>{catalog.parts.length}</strong><span>component families</span></div><div><strong>{catalog.sources.length}</strong><span>official source records</span></div><div><strong>{catalog.blocks.length}</strong><span>plant systems</span></div></div>
        </section>
        <div className="sc-toolbar"><button onClick={() => setAnimation(!animation)} aria-expanded={animation} aria-controls="sc-assembly">{animation ? 'Close' : 'Watch'} the assembly explainer {animation ? '−' : '+'}</button><a href="/supply-chain/SMR_Parts_and_Manufacturers.xlsx" download>Download research workbook ↓</a><span>Research snapshot · 7 September 2026</span></div>
        {animation && <section id="sc-assembly" className="sc-assembly"><iframe src="/supply-chain/assembly.html" title="Conceptual SMR assembly with step-by-step explanations" /><p>Illustrative water-cooled concept. Not a construction sequence, design specification, or operating guide.</p></section>}
        <aside className="sc-notice"><strong>For information only.</strong> Candidate suppliers are drawn from public sources. Listings do not establish endorsement, compatibility, qualification, regulatory approval, current availability, or delivery commitments. {catalog.scope}</aside>
        <section className="sc-filters" aria-label="Filter components">
          <label>Search components or companies<input type="search" placeholder="Try valves, BWXT, or instrumentation…" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <label>Plant system<select value={block} onChange={event => setBlock(event.target.value)}><option value="">All systems</option>{catalog.blocks.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Evidence type<select value={evidence} onChange={event => setEvidence(event.target.value)}><option value="">All evidence</option>{[...new Set(catalog.parts.map(part => part.evidence))].map(value => <option key={value}>{value}</option>)}</select></label>
        </section>
        <div className="sc-directory">
          <section aria-label="Component results"><div className="sc-result-heading"><span aria-live="polite">{results.length} component families</span><button onClick={() => { setQuery(''); setBlock(''); setEvidence('') }}>Reset filters</button></div>
            <div className="sc-results">{results.length ? results.map(part => <button key={part.id} className={`sc-row ${selected.id === part.id ? 'is-selected' : ''}`} onClick={() => select(part)} aria-pressed={selected.id === part.id} aria-controls="sc-detail"><span className="sc-small">{part.id} · {part.block.slice(3)}</span><strong>{part.component}</strong><span>{part.company}</span><span className="sc-tag">{part.evidence}</span></button>) : <div className="sc-empty"><h2>No matches yet.</h2><p>Try a company name or a broader component term, or reset the filters.</p></div>}</div>
          </section>
          <article id="sc-detail" className="sc-detail" aria-label="Selected component details" aria-live="polite" hidden={!results.length}>
            <p className="sc-kicker">{selected.id} / {selected.block.slice(3)}</p><h2>{selected.component}</h2><p className="sc-purpose">{selected.purpose}</p>
            <h3>{selected.evidence === 'Unresolved' ? 'Research gap' : 'Candidate supplier'}</h3><p className="sc-company">{selected.company}</p><p>{selected.role}</p>
            <dl><div><dt>Evidence category</dt><dd>{selected.evidence}</dd></div><div><dt>Applicability</dt><dd>{selected.applicability}</dd></div><div><dt>Listing origin</dt><dd>AtlasEye public-source research</dd></div><div><dt>Project suitability</dt><dd>Not evaluated</dd></div></dl>
            <div className="sc-gap"><h3>What still needs confirmation</h3><p>{selected.limitation}</p></div>
            <h3>Supporting evidence</h3>{sources.length ? sources.map(source => <div className="sc-source" key={source.id}><a href={source.url} {...external}>{source.title} ↗</a><p>{source.support}</p><small>{source.id} · {source.access}</small></div>) : <p>No supporting manufacturer source has been established for this package.</p>}
            <p className="sc-small">This record was researched on 7 September 2026. It was not submitted or approved by the listed company. Source review does not verify the company’s claims.</p>
            <button className="sc-primary" onClick={() => listProduct(selected)}>{selected.evidence === 'Unresolved' ? 'Help resolve this supplier gap →' : 'Represent this supplier? Request an update →'}</button>
            <a className="sc-permalink" href={`?part=${selected.id}`}>Link to this component</a>
          </article>
        </div>
        <section className="sc-contribute"><div><p className="sc-kicker">HELP BUILD THE DIRECTORY</p><h2>Make your capabilities easier to find.</h2><p>Manufacturers, fabricators, and integrators can submit products and public evidence for a free basic listing.</p></div><button className="sc-primary" onClick={() => listProduct()}>List a product →</button></section>
      </div>
      <section hidden={view !== 'submit'} className="sc-submit"><p className="sc-kicker">MANUFACTURER CONTRIBUTIONS</p><h1>Your expertise.<br /><span>A clearer supply chain.</span></h1><p className="sc-lead">Help visitors discover your products through factual descriptions and traceable public evidence.</p><ManufacturerForm key={formVersion} seed={seed} /><aside className="sc-review"><h2>What happens next</h2><ol><li>We receive the submission in a private review queue.</li><li>We review company authority, product scope, and the cited evidence.</li><li>Accepted information is published with its origin and review date. Updates retain an editorial history.</li></ol><p>Paid placement, if introduced, must be labeled separately and cannot change evidence or qualification status.</p></aside></section>
    </main>
    <footer className="sc-footer"><span>AtlasEye · Nuclear Supply Chain Explorer</span><span>Public information. Qualified human review remains essential.</span><a href="/">Return to AtlasEye</a></footer>
  </div>
}
