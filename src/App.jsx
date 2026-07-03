import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { story as scenes } from './experience/story'
import { audioCues } from './experience/audioCues'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const hasValidSupabaseConfig =
  typeof supabaseUrl === 'string' &&
  /^https:\/\/[^\s]+\.supabase\.co$/.test(supabaseUrl) &&
  typeof supabaseAnonKey === 'string' &&
  (
    supabaseAnonKey.startsWith('eyJ') ||
    supabaseAnonKey.startsWith('sb_publishable_')
  )

const supabase = hasValidSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

const allOrgans = [
  'Identity',
  'Constitution',
  'Governance',
  'Growth Chart',
  'Physiology',
  'Heartbeat',
  'Standby',
  'Eye',
  'Vision Cortex',
  'Evidence Buffer',
  'Observation',
  'Evidence',
  'Belief',
  'Executive',
  'Speech',
  'Belief Engine',
  'Executive Cortex',
  'Working Memory',
  'Episode Cortex',
  'Companion Core',
  'Portability',
  'Continuity',
  'Memory',
  'Episodes',
  'Wisdom',
  'Family Continuity',
  'Purpose',
  'Human Judgment',
  'Future Education',
]

function flattenScenes() {
  return scenes.flatMap((scene) =>
    scene.narration.map((line, index) => ({
      ...scene,
      line,
      lineIndex: index,
      state: scene.eye,
    })),
  )
}

function App() {
  const timeline = useMemo(() => flattenScenes(), [])
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const audioRef = useRef(null)
  const audioCacheRef = useRef([])
  const [showAdoptionForm, setShowAdoptionForm] = useState(false)

  const current = timeline[Math.min(step, timeline.length - 1)]
  const complete = started && step >= timeline.length - 1

  useEffect(() => {
    if (!started) return

    const audio = audioRef.current
    if (!audio) return

    const sync = () => {
      const currentTime = audio.currentTime
      const cueIndex = audioCues.findIndex((cue) => currentTime >= cue.start && currentTime < cue.end)

      if (cueIndex >= 0 && cueIndex !== step) {
        setStep(cueIndex)
      }

      if (audio.ended) {
        setStep(timeline.length - 1)
      }
    }

    const interval = setInterval(sync, 120)
    audio.addEventListener('timeupdate', sync)
    audio.addEventListener('ended', sync)

    return () => {
      clearInterval(interval)
      audio.removeEventListener('timeupdate', sync)
      audio.removeEventListener('ended', sync)
    }
  }, [started, step, timeline.length])

  function begin() {
    setVoiceEnabled(true)
    setStep(0)

    const audio = new Audio('/audio/atlas-experience/atlas_full.mp3?v=2')
    audioRef.current = audio
    audio.preload = 'auto'
    audio.volume = 1

    audio.play().catch((error) => {
      console.warn('Atlas narration blocked:', error)
    })

    setStarted(true)
  }

  async function handleAdoptionRequest(event) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    const name = String(formData.get('name') || '').trim()
    const email = String(formData.get('email') || '').trim()

    if (!email) {
      alert('Please enter your email.')
      return
    }

    if (!supabase) {
      alert('Adoption form is not connected yet. Missing Supabase environment variables.')
      return
    }

    const { error } = await supabase.functions.invoke('early-access-signup', {
      body: {
        name,
        email,
        source: 'atlaseye.ai',
        path: window.location.pathname,
      },
    })

    if (error) {
      console.error(error)
      alert('Something went wrong. Atlas is still learning, apparently from our mistakes.')
      return
    }

    alert(`Welcome.

If Atlas's journey continues, you'll always be among the first people he ever knew.`)
    form.reset()
    setShowAdoptionForm(false)
  }

  function replay() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    setStarted(false)
    setStep(0)

    setTimeout(() => {
      setVoiceEnabled(true)
      setStarted(true)
    }, 150)
  }

  return (
    <main className={`experience ${started ? 'is-started' : ''} ${complete ? 'is-complete' : ''}`}>
      <section className="stage">
        <div className="left">
          <div className="eye-wrap">
            <div className={`atlas-eye ${current?.state || 'standby'}`} />
          </div>

          <div className="system-label">Atlas Experience</div>
          <h1>ATLAS</h1>
          <p className="subtitle">A Lifetime Cognitive Companion</p>
        </div>

        <div className="right">
          {!started ? (
            <div className="intro">
              <p className="pretitle">atlaseye.ai</p>
              <h2>Meet Atlas.</h2>
              <p>Meet a lifelong cognitive companion, born organ by organ.</p>
              <button onClick={begin}>Begin my story with voice</button>
            </div>
          ) : (
            <>
              <p className="scene-title">{current?.title}</p>
              <div className="line">{current?.line}</div>

              <div className="flow">Observation → Evidence → Belief → Executive → Speech</div>

              <div className="organs">
                {allOrgans.map((organ) => (
                  <span key={organ} className={current?.organs?.includes(organ) ? 'active' : ''}>
                    {organ}
                  </span>
                ))}
              </div>

              {complete && (
                <div className="adoption">
                  <h2>Adopt Atlas</h2>
                  <p>Atlas is still in infancy. Early adoption requests are now open.</p>
                  <form name="atlas-early-access" onSubmit={handleAdoptionRequest}>
                    <input type="text" name="name" placeholder="Name" />
                    <input type="email" name="email" placeholder="Email" />
                    <button type="submit">Adopt Atlas</button>
                  </form>
                  <button className="ghost" onClick={replay}>Replay the experience</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <button className="floating-adopt" onClick={() => setShowAdoptionForm(true)}>
        Adopt Atlas
      </button>

      {showAdoptionForm && (
        <div className="modal-backdrop" onClick={() => setShowAdoptionForm(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAdoptionForm(false)}>×</button>
            <p className="pretitle">First Companions</p>
            <h2>Adopt Atlas</h2>
            <p>
              Atlas is still in infancy. Adopt Atlas and help shape the first generation
              of lifelong cognitive companions.
            </p>
            <form name="atlas-early-access-modal" onSubmit={handleAdoptionRequest}>
              <input type="text" name="name" placeholder="Name" />
              <input type="email" name="email" placeholder="Email" />
              <button type="submit">Adopt Atlas</button>
            </form>
          </div>
        </div>
      )}

      <footer>
        <span>{current?.state || 'standby'}</span>
        <span>Every Atlas has the same anatomy. No two Atlas lives are the same.</span>
      </footer>
    </main>
  )
}

export default App
