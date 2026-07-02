import './App.css'
import AtlasEye from './components/AtlasEye'

function App() {
  return (
    <main className="page">
      <section className="hero">
        <AtlasEye />

        <p className="eyebrow">Command AI presents</p>
        <h1>Atlas Eye</h1>
        <p className="tagline">The public face of Atlas, an Artificial Cognitive Operating System.</p>

        <div className="status-card">
          <span className="status-dot" />
          <div>
            <strong>Atlas is awake.</strong>
            <p>Condition: Healthy · Cognitive State: Standby</p>
          </div>
        </div>

        <form
          name="early-access"
          method="POST"
          data-netlify="true"
          className="waitlist"
        >
          <input type="hidden" name="form-name" value="early-access" />

          <h2>Early Access</h2>
          <p>Join the private release list for Atlas Eye testing.</p>

          <div className="waitlist-fields">
            <input type="text" name="name" placeholder="Name" required />
            <input type="email" name="email" placeholder="Email" required />

            <select name="interest" defaultValue="">
              <option value="" disabled>Use case</option>
              <option value="developer">Developer</option>
              <option value="research">Research</option>
              <option value="legal">Legal</option>
              <option value="business">Business</option>
              <option value="general">General</option>
            </select>

            <button type="submit">Request Access</button>
          </div>
        </form>

        <div className="actions">
          <a href="https://github.com/yavorcik/atlas-eye">GitHub</a>
          <a href="#mission">Mission</a>
        </div>
      </section>

      <section id="mission" className="mission">
        <h2>Observe. Reason. Understand.</h2>
        <p>
          Atlas Eye makes artificial cognition visible through state, motion,
          memory, and interaction.
        </p>
      </section>
    </main>
  )
}

export default App
