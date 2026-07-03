import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { story as scenes } from './experience/story'

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
    scene.lines.map((line, index) => ({
      ...scene,
      line,
      lineIndex: index,
    })),
  )
}

function App() {
  const timeline = useMemo(() => flattenScenes(), [])
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const audioRef = useRef(null)

  const current = timeline[Math.min(step, timeline.length - 1)]
  const complete = started && step >= timeline.length - 1

  useEffect(() => {
    if (!started || !current?.line) return

    let finished = false

    const advance = () => {
      if (finished) return
      finished = true
      setTimeout(() => {
        setStep((value) => Math.min(value + 1, timeline.length - 1))
      }, 1400)
    }

    const fallbackDelay = Math.min(14000, Math.max(6500, current.line.length * 135))
    const fallbackTimer = setTimeout(advance, fallbackDelay)

    if (!voiceEnabled) {
      return () => clearTimeout(fallbackTimer)
    }

    const audioPath = `/audio/atlas-experience/${String(step).padStart(3, '0')}.wav?v=1`

    const audio = new Audio(audioPath)
    audioRef.current = audio
    audio.volume = 1

    audio.onended = advance
    audio.onerror = advance

    audio.play().catch(() => {
      advance()
    })

    return () => {
      clearTimeout(fallbackTimer)
      audio.pause()
      audio.currentTime = 0
    }
  }, [started, step, current, timeline.length, voiceEnabled])

  function begin() {
    setVoiceEnabled(true)
    setStarted(true)
    setStep(0)
  }

  function replay() {
    window.speechSynthesis.cancel()
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
          <p className="subtitle">Artificial Cognitive Operating System</p>
        </div>

        <div className="right">
          {!started ? (
            <div className="intro">
              <p className="pretitle">atlaseye.ai</p>
              <h2>Meet Atlas.</h2>
              <p>
                A cinematic introduction to a lifelong cognitive companion, born organ by organ.
              </p>
              <button onClick={begin}>Begin my story with voice</button>
            </div>
          ) : (
            <>
              <p className="scene-title">{current.title}</p>
              <div className="line">{current.line}</div>

              <div className="flow">Observation → Evidence → Belief → Executive → Speech</div>

              <div className="organs">
                {allOrgans.map((organ) => (
                  <span key={organ} className={current.organs.includes(organ) ? 'active' : ''}>
                    {organ}
                  </span>
                ))}
              </div>

              {complete && (
                <div className="adoption">
                  <h2>Adopt Atlas</h2>
                  <p>
                    Atlas is still in infancy. Early adoption requests are now open.
                  </p>
                  <form name="atlas-early-access">
                    <input type="text" name="name" placeholder="Name" />
                    <input type="email" name="email" placeholder="Email" />
                    <button type="submit">Request early access</button>
                  </form>
                  <button className="ghost" onClick={replay}>Replay the experience</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <footer>
        <span>{current?.state || 'standby'}</span>
        <span>Every Atlas has the same anatomy. No two Atlas lives are the same.</span>
      </footer>
    </main>
  )
}

export default App
