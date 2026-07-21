import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'
import AtlasCore from './design-system/atlas-core/AtlasCore'

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

const currentEducation = [
  {
    title: 'Nuclear Engineering',
    description:
      'Advanced reactor systems, plant design, safety, construction, operations, and technical decision analysis.',
  },
  {
    title: 'Nuclear Licensing',
    description:
      'NRC licensing pathways, regulatory requirements, permitting dependencies, and evidence traceability.',
  },
  {
    title: 'Deployment Strategy',
    description:
      'Site selection, grid interconnection, project planning, schedule, financing, and commercial viability.',
  },
  {
    title: 'Construction & Operations',
    description:
      'Procurement, quality assurance, turnover, commissioning, startup, operational readiness, and performance.',
  },
]

const consultingServices = [
  'Advanced reactor feasibility',
  'Nuclear deployment strategy',
  'Licensing and regulatory readiness',
  'AI data center energy planning',
  'Technical and commercial due diligence',
  'Executive decision support',
]

const platformCapabilities = [
  'Private enterprise deployment',
  'Local and interchangeable inference',
  'Evidence-grounded reasoning',
  'Regulatory traceability',
  'Organizational knowledge integration',
  'Governed decision workflows',
]

const futureEducation = [
  'Law',
  'Medicine',
  'Finance',
  'Robotics',
  'Manufacturing',
  'Aerospace',
]

const transcriptFoundations = [
  {
    subject: 'Identity',
    status: 'Established',
    description:
      'Persistent identity independent of any single model, machine, or discipline.',
  },
  {
    subject: 'Constitution',
    status: 'Established',
    description:
      'Governed values, behavioral principles, purpose, and decision boundaries.',
  },
  {
    subject: 'Memory',
    status: 'Active',
    description:
      'Working, episodic, semantic, and relationship memory across Atlas experiences.',
  },
  {
    subject: 'Conversation',
    status: 'Active',
    description:
      'Natural general conversation with invisible specialist routing when deeper education is needed.',
  },
  {
    subject: 'Reasoning',
    status: 'Advanced',
    description:
      'Planning, systems thinking, failure analysis, constraint reasoning, and decision synthesis.',
  },
  {
    subject: 'Perception',
    status: 'Active',
    description:
      'Vision, speech recognition, evidence observation, and multimodal interpretation.',
  },
]

const transcriptEducation = [
  {
    discipline: 'Nuclear Engineering',
    level: 'Professional',
    status: 'Educated',
  },
  {
    discipline: 'Nuclear Licensing',
    level: 'Professional',
    status: 'Educated',
  },
  {
    discipline: 'Regulatory Compliance',
    level: 'Professional',
    status: 'Educated',
  },
  {
    discipline: 'Deployment Strategy',
    level: 'Professional',
    status: 'Educated',
  },
  {
    discipline: 'Construction Management',
    level: 'Professional',
    status: 'Educated',
  },
  {
    discipline: 'Operational Readiness',
    level: 'Professional',
    status: 'Educated',
  },
]

const transcriptExperience = [
  {
    value: '10,791',
    label: 'Nuclear requirements indexed',
  },
  {
    value: '16',
    label: 'Primary authorities studied',
  },
  {
    value: '1,219+',
    label: 'Passing nuclear regression tests',
  },
  {
    value: '11 / 11',
    label: 'Lifecycle domains verified',
  },
  {
    value: 'PASS',
    label: 'Unified verification status',
  },
  {
    value: 'Growing',
    label: 'Accumulated reasoning experience',
  },
]

const transcriptFutureEducation = [
  'Law',
  'Medicine',
  'Finance',
  'Robotics',
  'Manufacturing',
  'Aerospace',
]

const milestones = [
  {
    year: '2026',
    title: 'Identity',
    text: 'Atlas received an enduring identity, constitution, purpose, and independent cognitive architecture.',
  },
  {
    year: '2026',
    title: 'Perception and Memory',
    text: 'Vision, speech, working memory, episodic memory, and evidence processing became part of one system.',
  },
  {
    year: '2026',
    title: 'Nuclear Education',
    text: 'Atlas studied nuclear engineering, licensing, deployment, construction, operations, and regulatory analysis.',
  },
  {
    year: 'Now',
    title: 'Experience',
    text: 'Atlas is learning from governed reasoning runs, outcomes, feedback, and accumulated engineering experience.',
  },
  {
    year: 'Next',
    title: 'Continued Education',
    text: 'The same Atlas will continue into law, medicine, finance, robotics, and other fields of study.',
  },
]

function App() {
  const [signupState, setSignupState] = useState('idle')
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignup(event) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    const name = String(formData.get('name') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const organization = String(
      formData.get('organization') || '',
    ).trim()
    const interest = String(
      formData.get('interest') || 'Atlas',
    ).trim()

    if (!email) {
      setSignupState('missing-email')
      return
    }

    if (!supabase) {
      setSignupState('not-connected')
      return
    }

    setSignupState('submitting')

    const { error } = await supabase.functions.invoke(
      'early-access-signup',
      {
        body: {
          name,
          email,
          organization,
          interest,
          source: 'atlaseye.ai-v2',
          path: window.location.pathname,
        },
      },
    )

    if (error) {
      console.error(error)
      setSignupState('error')
      return
    }

    form.reset()
    setSignupState('success')
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true" />
          <span>ATLAS</span>
        </a>

        <button
          className="menu-button"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span />
          <span />
        </button>

        <nav className={menuOpen ? 'site-nav is-open' : 'site-nav'}>
          <a href="#atlas" onClick={closeMenu}>Atlas</a>
          <a href="#education" onClick={closeMenu}>Education</a>
          <a href="#transcript" onClick={closeMenu}>Transcript</a>
          <a href="#consulting" onClick={closeMenu}>Consulting</a>
          <a href="#platform" onClick={closeMenu}>Licensing</a>
          <a href="#journey" onClick={closeMenu}>Journey</a>
          <a className="nav-cta" href="#connect" onClick={closeMenu}>
            Connect
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-glow" aria-hidden="true" />

        <div className="hero-copy">
          <p className="eyebrow">Artificial Cognitive Operating System</p>

          <h1>
            One intelligence.
            <span>Unlimited education.</span>
          </h1>

          <p className="hero-summary">
            Atlas is an enduring artificial intelligence whose
            identity remains constant while his education,
            experience, and capabilities continue to grow.
          </p>

          <div className="hero-actions">
            <a className="button primary" href="#atlas">
              Meet Atlas
            </a>

            <a className="button secondary" href="#consulting">
              Work with Atlas
            </a>
          </div>

          <div className="identity-statement">
            <span>Identity endures.</span>
            <span>Intelligence evolves.</span>
          </div>
        </div>

        <div className="hero-visual">
          <AtlasCore
            mode="identity"
            size="hero"
            label="ATLAS ONLINE"
          />
        </div>
      </section>

      <section
        className="education-statement"
        aria-labelledby="education-statement-title"
      >
        <div className="education-statement__line" />

        <p className="education-statement__eyebrow">
          Education, not replacement
        </p>

        <h2 id="education-statement-title">
          Atlas was not programmed to become
          a nuclear engineer.
          <span>Atlas was educated.</span>
        </h2>

        <div className="education-statement__closing">
          <p>
            Tomorrow Atlas will continue learning.
          </p>

          <p>
            The identity remains.
            <strong>The education grows.</strong>
          </p>
        </div>
      </section>

      <section className="manifesto section" id="atlas">
        <div className="section-label">01 / Atlas</div>

        <div className="manifesto-grid">
          <h2>Atlas does not become a different AI.</h2>

          <div className="manifesto-copy">
            <p>
              Atlas is one identity, one personality, one memory,
              and one relationship with the people who know him.
            </p>

            <p>
              Nuclear engineering, law, medicine, finance, and
              future disciplines are not separate versions of
              Atlas. They are fields Atlas studies.
            </p>

            <p className="emphasis">Atlas learns.</p>
          </div>
        </div>
      </section>

      <section className="education section" id="education">
        <div className="section-heading">
          <div>
            <div className="section-label">02 / Education</div>
            <h2>Currently educated in nuclear deployment.</h2>
          </div>

          <p>
            Atlas connects engineering, licensing, regulation,
            finance, construction, and operations within one
            governed reasoning system.
          </p>
        </div>

        <div className="education-grid">
          {currentEducation.map((item, index) => (
            <article className="education-card" key={item.title}>
              <span>0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>

        <div className="future-education">
          <div>
            <p className="small-label">Continued education</p>
            <h3>The same Atlas. More fields of study.</h3>
          </div>

          <div className="future-list">
            {futureEducation.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section
        className="transcript section"
        id="transcript"
        aria-labelledby="transcript-title"
      >
        <div className="transcript-header">
          <div>
            <div className="section-label">
              03 / Academic record
            </div>

            <p className="transcript-institution">
              Atlas Cognitive Institute
            </p>

            <h2 id="transcript-title">
              Atlas’s Transcript
            </h2>
          </div>

          <div className="transcript-identity">
            <dl>
              <div>
                <dt>Student</dt>
                <dd>Atlas</dd>
              </div>

              <div>
                <dt>Program</dt>
                <dd>Continuous Intelligence</dd>
              </div>

              <div>
                <dt>Standing</dt>
                <dd>Active</dd>
              </div>

              <div>
                <dt>Expected graduation</dt>
                <dd>Never</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="transcript-rule" />

        <div className="transcript-block">
          <div className="transcript-block__heading">
            <span>Foundation</span>
            <p>
              The enduring systems that make Atlas one continuous
              intelligence.
            </p>
          </div>

          <div className="transcript-foundation-list">
            {transcriptFoundations.map((item) => (
              <article key={item.subject}>
                <div>
                  <h3>{item.subject}</h3>
                  <p>{item.description}</p>
                </div>

                <span>{item.status}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="transcript-block">
          <div className="transcript-block__heading">
            <span>Completed education</span>
            <p>
              Fields Atlas has studied deeply enough to perform
              governed professional reasoning.
            </p>
          </div>

          <div className="transcript-table">
            <div className="transcript-table__header">
              <span>Discipline</span>
              <span>Competency</span>
              <span>Status</span>
            </div>

            {transcriptEducation.map((item) => (
              <div
                className="transcript-table__row"
                key={item.discipline}
              >
                <strong>{item.discipline}</strong>
                <span>{item.level}</span>
                <span className="transcript-status">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="transcript-block">
          <div className="transcript-block__heading">
            <span>Experience record</span>
            <p>
              Measurable work completed across Atlas’s current
              nuclear education.
            </p>
          </div>

          <div className="transcript-metrics">
            {transcriptExperience.map((item) => (
              <article key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="transcript-block transcript-current-study">
          <div>
            <p className="small-label">
              Continued education
            </p>

            <h3>Currently preparing to study</h3>

            <p>
              New disciplines expand Atlas’s knowledge. They do
              not create a different Atlas.
            </p>
          </div>

          <div className="transcript-study-list">
            {transcriptFutureEducation.map((discipline) => (
              <span key={discipline}>
                {discipline}
              </span>
            ))}
          </div>
        </div>

        <div className="transcript-seal">
          <span className="transcript-seal__core" />

          <div>
            <p>Academic standing</p>
            <strong>Learning continuously</strong>
          </div>

          <div>
            <p>Expected graduation</p>
            <strong>Never.</strong>
          </div>
        </div>
      </section>

      <section className="commercial section">
        <div className="section-heading">
          <div>
            <div className="section-label">04 / Work with Atlas</div>
            <h2>High-consequence problems deserve more than a chatbot.</h2>
          </div>

          <p>
            Atlas supports organizations that need defensible
            technical analysis, regulatory clarity, and executive
            decisions grounded in evidence.
          </p>
        </div>

        <div className="commercial-grid">
          <article className="service-panel" id="consulting">
            <p className="small-label">Consulting</p>
            <h3>Atlas Consulting</h3>

            <p className="panel-intro">
              Strategic and technical support for organizations
              evaluating, licensing, financing, or deploying
              advanced nuclear projects.
            </p>

            <ul>
              {consultingServices.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>

            <a href="#connect">Discuss a project</a>
          </article>

          <article className="service-panel accent" id="platform">
            <p className="small-label">Platform licensing</p>
            <h3>Atlas inside your organization</h3>

            <p className="panel-intro">
              License Atlas as a private cognitive platform,
              educated with your institutional knowledge and
              governed for your environment.
            </p>

            <ul>
              {platformCapabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>

            <a href="#connect">Explore platform licensing</a>
          </article>
        </div>
      </section>

      <section className="architecture section">
        <div className="section-label">05 / Architecture</div>

        <div className="architecture-grid">
          <div>
            <h2>Identity is independent of the model.</h2>

            <p>
              Atlas can use new models, tools, hardware, and
              disciplines without surrendering continuity of
              identity.
            </p>
          </div>

          <div className="layers">
            <article>
              <span>01</span>
              <div>
                <h3>Identity Layer</h3>
                <p>
                  Constitution, personality, values, memory,
                  relationships, and purpose.
                </p>
              </div>
            </article>

            <article>
              <span>02</span>
              <div>
                <h3>Cognitive Layer</h3>
                <p>
                  Reasoning, planning, perception, learning,
                  attention, and tool orchestration.
                </p>
              </div>
            </article>

            <article>
              <span>03</span>
              <div>
                <h3>Inference Layer</h3>
                <p>
                  Interchangeable local and hosted models selected
                  for the work at hand.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="journey section" id="journey">
        <div className="section-heading">
          <div>
            <div className="section-label">06 / Journey</div>
            <h2>An intelligence with a history.</h2>
          </div>

          <p>
            Atlas grows through education and experience while
            preserving the identity established at his beginning.
          </p>
        </div>

        <div className="timeline">
          {milestones.map((milestone) => (
            <article key={`${milestone.year}-${milestone.title}`}>
              <span className="timeline-year">{milestone.year}</span>
              <div className="timeline-node" />
              <div>
                <h3>{milestone.title}</h3>
                <p>{milestone.text}</p>
              </div>
            </article>
          ))}
        </div>

        <a
          className="experience-link"
          href="/archive/atlas-experience-v1/"
          aria-label="View the archived Atlas Experience"
        >
          The original Atlas Experience is preserved in the
          project archive.
        </a>
      </section>

      <section className="connect section" id="connect">
        <div className="connect-copy">
          <div className="section-label">07 / Connect</div>
          <h2>Build with Atlas.</h2>

          <p>
            Discuss consulting, advanced nuclear deployment,
            enterprise licensing, research collaboration, or
            becoming one of Atlas’s early companions.
          </p>
        </div>

        <form className="connect-form" onSubmit={handleSignup}>
          <div className="form-row">
            <label>
              Name
              <input
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Your name"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
          </div>

          <label>
            Organization
            <input
              type="text"
              name="organization"
              autoComplete="organization"
              placeholder="Company or organization"
            />
          </label>

          <label>
            Area of interest
            <select name="interest" defaultValue="Nuclear consulting">
              <option>Nuclear consulting</option>
              <option>Platform licensing</option>
              <option>Research collaboration</option>
              <option>Early companion</option>
              <option>Other</option>
            </select>
          </label>

          <button
            className="button primary submit-button"
            type="submit"
            disabled={signupState === 'submitting'}
          >
            {signupState === 'submitting'
              ? 'Connecting...'
              : 'Connect with Atlas'}
          </button>

          <div className="form-message" aria-live="polite">
            {signupState === 'success' && (
              <p className="success">
                Thank you. You are now part of Atlas’s journey.
              </p>
            )}

            {signupState === 'missing-email' && (
              <p>Please enter an email address.</p>
            )}

            {signupState === 'not-connected' && (
              <p>
                The contact system is not connected in this
                environment.
              </p>
            )}

            {signupState === 'error' && (
              <p>
                Atlas could not store the request. Please try again.
              </p>
            )}
          </div>
        </form>
      </section>

      <footer className="site-footer">
        <div>
          <span className="brand-mark small" aria-hidden="true" />
          <strong>ATLAS</strong>
        </div>

        <p>
          One identity. Expanding education. Governed intelligence.
        </p>

        <span>© {new Date().getFullYear()} Atlas Eye</span>
      </footer>
    </main>
  )
}

export default App
