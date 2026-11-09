import { useEffect, useMemo, useRef, useState } from 'react'
import { gadgetSession, queryGadget } from '../services/gadgetApi.js'
import './GadgetPanel.css'

const MAX_MESSAGES = 8

function controlledContext(messages) {
  return messages.slice(-4).map(({ role, contextText }) => ({
    role,
    content: String(contextText || '').slice(0, 600),
  })).filter(item => item.content)
}

function Response({ payload }) {
  const result = payload?.response || payload
  if (!result) return null
  const model = result.model || {}
  return <article className="gadget-response" aria-label="Gadget response">
    <p className="gadget-classification"><strong>Deterministic Atlas conclusion</strong></p>
    <p>{result.direct_answer || result.answer}</p>
    <p><strong>What this means:</strong> {result.what_this_means}</p>
    <p><strong>Recommended next move:</strong> {result.recommended_next_move}</p>
    {model.status === 'model_backed' ? <section className="gadget-analysis">
      <p className="gadget-classification"><strong>Model analysis / inference</strong></p>
      <p>{model.analysis}</p>
      {model.priorities?.length ? <ol>{model.priorities.map(item => <li key={item}>{item}</li>)}</ol> : null}
      {model.inferences?.length ? <details><summary>Explicit inferences</summary><ul>{model.inferences.map((item, index) => <li key={`${index}-${item.text}`}><span>{item.text}</span><small>{item.basis}</small></li>)}</ul></details> : null}
      {model.follow_up_question ? <p><strong>One useful question:</strong> {model.follow_up_question}</p> : null}
    </section> : <p className="gadget-fallback"><strong>Deterministic fallback:</strong> {model.analysis || 'Model analysis is unavailable.'}</p>}
    <details><summary>Evidence and capability boundary</summary>
      <p><strong>Evidence status:</strong> {result.evidence_message}</p>
      {result.citations?.length ? <ul>{result.citations.map(source => <li key={source.id}><strong>{source.title}</strong> — {source.section} ({source.status})</li>)}</ul> : <p>No evidence-backed fact was returned for this question.</p>}
      <p><strong>Unavailable / unknown:</strong> Gadget cannot access private project records, tools, email, files, approvals, or governed actions.</p>
      <p>{result.boundary}</p>
    </details>
  </article>
}

export default function GadgetPanel({ page, workspace, projectId }) {
  const [session, setSession] = useState({ loading: false, authenticated: false, unchecked: true })
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef(null)
  const returnTo = useMemo(() => window.location.pathname, [])

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  async function connect() {
    setSession({ loading: true, authenticated: false })
    try {
      const value = await gadgetSession()
      setSession({ loading: false, ...value })
    } catch {
      setSession({ loading: false, authenticated: false, unavailable: true })
    }
  }

  async function submit(event) {
    event.preventDefault()
    const clean = question.trim()
    if (!clean || clean.length > 2_000 || busy) return
    setBusy(true)
    setError('')
    const controller = new AbortController()
    abortRef.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 22_000)
    try {
      const payload = await queryGadget({
        assistant: 'gadget', question: clean, interaction: 'ask', mode: 'auto',
        page_context: {
          page: String(page || 'Mission Control').slice(0, 200),
          workspace: String(workspace || 'Public demonstration').slice(0, 200),
          ...(projectId ? { project_or_technology: String(projectId).slice(0, 200) } : {}),
        },
        conversation_context: controlledContext(messages),
      }, session.csrf, controller.signal)
      const response = payload.response || payload
      setMessages(current => [...current,
        { role: 'user', contextText: clean, display: clean },
        { role: 'assistant', contextText: `${response.direct_answer || ''} ${response.model?.analysis || ''}`.slice(0, 600), display: payload },
      ].slice(-MAX_MESSAGES))
      setQuestion('')
    } catch (cause) {
      if (cause.name === 'AbortError') setError('Gadget timed out. The deterministic fallback could not be reached, so no conclusion was returned.')
      else setError(cause.message || 'Gadget is unavailable.')
      if (cause.status === 401) setSession({ loading: false, authenticated: false })
    } finally {
      window.clearTimeout(timeout)
      setBusy(false)
    }
  }

  return <aside className="gadget-panel" aria-labelledby="gadget-title" data-testid="gadget-panel">
    <header>
      <img src="/brand/gadget-mascot.png" alt="Gadget, the AtlasEye assistant mascot" />
      <div><p className="eyebrow">MISSION CONTROL ASSISTANT</p><h2 id="gadget-title">Gadget</h2></div>
      <span className="gadget-read-only">READ-ONLY</span>
    </header>
    <p>Ask for a concise explanation, priority check, or evidence-oriented next step. Gadget can advise. It cannot operate the reactor—or the approval button.</p>
    <p className="gadget-scope">Public-safe demonstration evidence only. No private project records are available.</p>
    {session.unchecked ? <button className="button secondary compact" type="button" onClick={connect}>Open Gadget</button>
      : session.loading ? <p role="status">Checking the airlock…</p>
      : !session.authenticated ? <div className="gadget-auth">
        <p>{session.unavailable ? 'Authenticated Gadget is not configured in this environment.' : 'Sign in to use the model-backed assistant.'}</p>
        {!session.unavailable ? <a className="button secondary compact" href={`/api/gadget/auth/start?returnTo=${encodeURIComponent(returnTo)}`}>Sign in to Gadget</a> : null}
      </div>
        : <>
          <div className="gadget-transcript" aria-live="polite">
            {messages.length ? messages.map((message, index) => message.role === 'user'
              ? <p className="gadget-question" key={index}><strong>You:</strong> {message.display}</p>
              : <Response payload={message.display} key={index} />)
              : <p className="gadget-empty">Try: “What should a qualified reviewer resolve next?”</p>}
          </div>
          <form onSubmit={submit}>
            <label htmlFor="gadget-question">Question</label>
            <textarea id="gadget-question" value={question} maxLength="2000" rows="3" onChange={event => setQuestion(event.target.value)} disabled={busy} />
            <div><small>{question.length}/2,000</small><button className="button primary compact" disabled={busy || !question.trim()}>{busy ? 'Thinking…' : 'Ask Gadget'}</button></div>
          </form>
          {error ? <p className="gadget-error" role="alert">{error}</p> : null}
        </>}
  </aside>
}
