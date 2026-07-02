import './App.css'

function App() {
  return (
    <main className="page">
      <section className="hero">
        <div className="eye" aria-label="Atlas Eye">
          <div className="eye-core" />
        </div>

        <p className="eyebrow">Command AI presents</p>
        <h1>Atlas Eye</h1>
        <p className="tagline">Artificial Cognitive Operating System</p>

        <div className="status-card">
          <span className="status-dot" />
          <div>
            <strong>Atlas is awake.</strong>
            <p>Condition: Healthy · Cognitive State: Standby</p>
          </div>
        </div>

        <div className="actions">
          <a href="https://github.com/yavorcik/atlas-eye">GitHub</a>
          <a href="#mission">Mission</a>
        </div>
      </section>

      <section id="mission" className="mission">
        <h2>Observe. Reason. Understand.</h2>
        <p>
          Atlas Eye makes artificial cognition visible through state, motion, memory, and interaction.
        </p>
      </section>
    </main>
  )
}

export default App
