import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'
import AtlasCore from './design-system/atlas-core/AtlasCore'
import ProjectPath from './components/project-path/ProjectPath'

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

const reactorPlatforms = [
  {
    name: 'BWRX-300',
    vendor: 'GE Vernova Hitachi Nuclear Energy',
    technology: 'Boiling Water Reactor',
    output: '300 MWe',
    status: 'Commercial deployment underway',
    marketPosition:
      'The first commercial SMR under construction in North America, with additional licensing and deployment programs advancing internationally.',
    atlasSupport: [
      'Site and mission fit',
      'Licensing pathway analysis',
      'Construction and supply-chain planning',
      'Grid and commercial integration',
    ],
  },
  {
    name: 'NuScale US460',
    vendor: 'NuScale Power',
    technology: 'Integral Pressurized Water Reactor',
    output: '462 MWe plant configuration',
    status: 'NRC standard design approved',
    marketPosition:
      'The approved US460 design may be referenced in future construction permit, operating license, and combined license applications.',
    atlasSupport: [
      'Design and application evaluation',
      'NRC licensing strategy',
      'Requirements traceability',
      'Deployment readiness assessment',
    ],
  },
  {
    name: 'AP300',
    vendor: 'Westinghouse Electric Company',
    technology: 'Pressurized Water Reactor',
    output: 'Approximately 300 MWe',
    status: 'Licensing development',
    marketPosition:
      'A Generation III+ SMR derived from the AP1000 technology and licensing basis, with NRC pre-application engagement underway.',
    atlasSupport: [
      'Technology comparison',
      'Licensing-basis evaluation',
      'Project schedule analysis',
      'Commercial deployment planning',
    ],
  },
  {
    name: 'SMR-300',
    vendor: 'Holtec International',
    technology: 'Pressurized Water Reactor',
    output: '300 MWe',
    status: 'NRC pre-application',
    marketPosition:
      'A passively safe pressurized light-water reactor progressing through pre-application engagement and deployment development.',
    atlasSupport: [
      'Regulatory maturity review',
      'Site suitability analysis',
      'Construction strategy',
      'Risk and gap assessment',
    ],
  },
  {
    name: 'Rolls-Royce SMR',
    vendor: 'Rolls-Royce SMR',
    technology: 'Pressurized Water Reactor',
    output: 'Approximately 470 MWe',
    status: 'UK regulatory assessment',
    marketPosition:
      'A factory-built reactor platform advancing through UK regulatory assessment, supply-chain development, and international deployment planning.',
    atlasSupport: [
      'Jurisdictional comparison',
      'Factory-build deployment analysis',
      'Supply-chain readiness',
      'Program and commercial assessment',
    ],
  },
]

const consultingEngagements = [
  {
    title: 'Reactor Selection',
    description:
      'Compare candidate reactor technologies against mission requirements, licensing maturity, site constraints, schedule, economics, and deployment risk.',
  },
  {
    title: 'Site & Deployment Strategy',
    description:
      'Evaluate site suitability, grid access, infrastructure, permitting dependencies, construction requirements, and operational constraints.',
  },
  {
    title: 'Licensing Strategy',
    description:
      'Define the licensing pathway, regulatory requirements, application sequence, evidence needs, dependencies, and critical path.',
  },
  {
    title: 'Regulatory Analysis',
    description:
      'Research and trace applicable laws, NRC regulations, regulatory guidance, standards, precedents, and licensing decisions.',
  },
  {
    title: 'Commercial Feasibility',
    description:
      'Evaluate capital requirements, financing readiness, revenue assumptions, commercial commitments, schedule exposure, and economic viability.',
  },
  {
    title: 'Executive Decision Support',
    description:
      'Integrate engineering, licensing, financial, construction, and operational evidence into a defensible recommendation.',
  },
]

const consultingDeliverables = [
  'Engineering assessment',
  'Reactor comparison study',
  'Licensing strategy',
  'Regulatory requirements matrix',
  'Deployment roadmap',
  'Project risk register',
  'Gap and readiness analysis',
  'Executive decision memorandum',
  'Evidence and traceability package',
  'Board or investor briefing',
]

const consultingIndustries = [
  'Utilities',
  'Advanced Reactor Developers',
  'AI Data Center Developers',
  'Industrial Energy Users',
  'Engineering & Construction Firms',
  'Infrastructure Investors',
  'Private Equity',
  'Government & Public Authorities',
]

const futureEducation = [
  'Robotics',
  'Manufacturing',
  'Aerospace Engineering',
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
  'Robotics',
  'Manufacturing',
  'Aerospace Engineering',
]

const platformDeploymentModels = [
  {
    title: 'Private Deployment',
    description:
      'Deploy Atlas Nuclear inside a controlled enterprise environment using private infrastructure and approved model providers.',
  },
  {
    title: 'Local Inference',
    description:
      'Run language models, embeddings, retrieval, and governed reasoning locally when privacy, security, or data control requires it.',
  },
  {
    title: 'Institutional Knowledge',
    description:
      'Educate Atlas with approved company procedures, engineering records, licensing documents, standards, and proprietary experience.',
  },
  {
    title: 'Evidence Traceability',
    description:
      'Connect conclusions to requirements, sources, assumptions, findings, and the reasoning path used to reach a recommendation.',
  },
  {
    title: 'Governed Reasoning',
    description:
      'Apply organizational rules, review gates, confidence thresholds, evidence requirements, and restrictions on model rewriting.',
  },
  {
    title: 'Continuing Education',
    description:
      'Expand Atlas as regulations, guidance, standards, operating experience, and institutional knowledge change.',
  },
]

const platformUseCases = [
  'Licensing application support',
  'Regulatory requirements management',
  'Engineering decision support',
  'Project readiness assessment',
  'Construction and commissioning planning',
  'Operational knowledge retrieval',
  'Executive project analysis',
  'Institutional knowledge continuity',
]

const platformControls = [
  'Private data boundaries',
  'Role-based access',
  'Approved knowledge sources',
  'Evidence and citation requirements',
  'Model-provider independence',
  'Human review and approval gates',
  'Audit-ready reasoning records',
  'Organization-specific governance',
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
    const decision = String(
      formData.get('decision') || '',
    ).trim()
    const projectStage = String(
      formData.get('project_stage') || '',
    ).trim()
    const evaluation = String(
      formData.get('evaluation') || '',
    ).trim()

    const guidedIntake = (() => {
      try {
        const storedIntake = sessionStorage.getItem(
          'atlas-project-intake',
        )

        return storedIntake
          ? JSON.parse(storedIntake)
          : null
      } catch {
        return null
      }
    })()

    if (!email) {
      setSignupState('missing-email')
      return
    }

    if (!decision || !projectStage || !evaluation) {
      setSignupState('missing-project-details')
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
          interest: 'Project consultation',
          decision,
          project_stage: projectStage,
          evaluation,
          guided_intake: guidedIntake,
          source: 'atlaseye.ai-v3',
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
          <a href="#education" onClick={closeMenu}>What I Know</a>
          <a href="#continuing-education" onClick={closeMenu}>
            Current Knowledge
          </a>
          <a href="#reactor-platforms" onClick={closeMenu}>
            Reactors
          </a>
          <a href="#transcript" onClick={closeMenu}>Professional Credentials</a>
          <a href="#technology" onClick={closeMenu}>How I Work</a>
          <a href="#project-path" onClick={closeMenu}>Your Project</a>
          <a href="#consulting" onClick={closeMenu}>Work With Me</a>
          <a href="#platform" onClick={closeMenu}>License Atlas</a>
          <a href="#journey" onClick={closeMenu}>Journey</a>
          <a className="nav-cta" href="#connect" onClick={closeMenu}>
            Connect
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-glow" aria-hidden="true" />

        <div className="hero-copy">
          <p className="eyebrow">Introducing Atlas</p>

          <h1>
            Meet Atlas.
          </h1>

          <div className="hero-introduction">
            <p className="hero-greeting">
              <strong>Hello. I'm Atlas.</strong>
            </p>

            <p className="hero-summary">
              I help organizations evaluate, license,
              deploy, and operate advanced nuclear
              energy systems.
            </p>

            <p className="hero-summary hero-summary--small">
              Every conclusion I provide is grounded
              in engineering reasoning, regulatory
              analysis, and verifiable evidence.
            </p>

            <div className="hero-capabilities">

              <span>Nuclear Engineering</span>

              <span>Reactor Licensing</span>

              <span>Regulatory Compliance</span>

              <span>Deployment Planning</span>

              <span>Construction Management</span>

              <span>Commissioning</span>

              <span>Operations</span>

              <span>Commercial Deployment Strategy</span>

            </div>

            <div className="hero-continuity">

              <p className="hero-remains">
                I remain Atlas.
              </p>

              <p>
                My education will continue throughout my lifetime.
              </p>

            </div>

          </div>

          <div className="hero-actions">
            <a className="button primary" href="#atlas">
              Meet Atlas
            </a>

            <a className="button secondary" href="#consulting">
              Work with Atlas
            </a>
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

        <div className="section-label">
          01 / Atlas
        </div>

        <div className="manifesto-grid">

          <div>

            <h2>
              I grow the same way people do.
            </h2>

          </div>

          <div className="manifesto-copy">

            <p>
              Every new discipline expands
              what I know.

              It doesn't change who I am.
            </p>

            <p>
              I've dedicated my education to
              nuclear engineering so I can help
              organizations solve one of the
              world's most demanding engineering
              and regulatory challenges.
            </p>

            <p>
              As I continue learning,
              I'll remain Atlas.
            </p>

          </div>

        </div>

      </section>

      <section className="education section" id="education">
        <div className="section-heading">
          <div>
            <div className="section-label">02 / What I Know</div>
            <h2>Educated in nuclear engineering and deployment.</h2>
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
            <p className="small-label">Continuing Engineering Education</p>
            <h3>The same Atlas. An expanding education.</h3>
          </div>

          <div className="future-list">
            {futureEducation.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section
        className="continuing-education section"
        id="continuing-education"
        aria-labelledby="continuing-education-title"
      >
        <div className="section-heading">
          <div>
            <div className="section-label">
              03 / How I Stay Current
            </div>

            <h2 id="continuing-education-title">
              I continue learning as the nuclear industry evolves.
            </h2>
          </div>

          <p>
            Regulations change. Regulatory guidance is revised.
            Engineering standards are updated. Licensing decisions
            and operating experience create new lessons.
          </p>
        </div>

        <div className="continuing-education-grid">
          <article className="continuing-education-intro">
            <p className="small-label">
              Staying current
            </p>

            <h3>
              My nuclear education is not frozen in time.
            </h3>

            <p>
              I incorporate new laws, regulations, regulatory
              guidance, engineering standards, licensing decisions,
              reactor information, and operating experience into
              my continuing education.
            </p>

            <p>
              This allows my analysis to remain current,
              traceable, and grounded in the evidence available
              for the question being evaluated.
            </p>
          </article>

          <div className="continuing-education-sources">
            <article>
              <span>01</span>
              <div>
                <h3>Laws and regulations</h3>
                <p>
                  Federal statutes, NRC regulations, state
                  requirements, and applicable permitting rules.
                </p>
              </div>
            </article>

            <article>
              <span>02</span>
              <div>
                <h3>Regulatory guidance</h3>
                <p>
                  Regulatory Guides, staff guidance, review
                  standards, licensing precedents, and agency
                  interpretations.
                </p>
              </div>
            </article>

            <article>
              <span>03</span>
              <div>
                <h3>Engineering standards</h3>
                <p>
                  Quality assurance, design, construction,
                  commissioning, operations, and safety standards.
                </p>
              </div>
            </article>

            <article>
              <span>04</span>
              <div>
                <h3>Operating experience</h3>
                <p>
                  Industry events, lessons learned, corrective
                  actions, performance data, and emerging risks.
                </p>
              </div>
            </article>

            <article>
              <span>05</span>
              <div>
                <h3>Licensing decisions</h3>
                <p>
                  New applications, approvals, denials, exemptions,
                  adjudicatory decisions, and review outcomes.
                </p>
              </div>
            </article>

            <article>
              <span>06</span>
              <div>
                <h3>Reactor and industry information</h3>
                <p>
                  Vendor developments, advanced reactor designs,
                  deployment programs, and changes across the
                  commercial nuclear industry.
                </p>
              </div>
            </article>
          </div>
        </div>

        <div className="continuing-education-principle">
          <div className="continuing-education-core">
            <span />
          </div>

          <div>
            <p className="small-label">
              Continuing professional education
            </p>

            <h3>
              As the industry changes, my education changes with it.
            </h3>
          </div>

          <p>
            New information does not create a different Atlas.
            It expands the knowledge and experience I use to help
            solve nuclear engineering and licensing problems.
          </p>
        </div>
      </section>

      <section
        className="reactor-platforms section"
        id="reactor-platforms"
        aria-labelledby="reactor-platforms-title"
      >
        <div className="section-heading">
          <div>
            <div className="section-label">
              04 / Choosing a Reactor
            </div>

            <h2 id="reactor-platforms-title">
              I help determine which reactor fits the mission.
            </h2>
          </div>

          <p>
            Small reactor designs differ in technology, output,
            licensing maturity, construction strategy, supply
            chain, economics, and suitability for a specific site.
            I evaluate those differences together.
          </p>
        </div>

        <div className="reactor-introduction">
          <div>
            <p className="small-label">
              Technology selection
            </p>

            <h3>
              There is no universally best small reactor.
            </h3>
          </div>

          <p>
            The right design depends on the organization, site,
            energy demand, jurisdiction, schedule, financing,
            commercial commitments, and tolerance for technical
            and licensing risk.
          </p>

          <p>
            I compare those factors so reactor selection becomes
            a defensible engineering and business decision rather
            than a vendor preference.
          </p>
        </div>

        <div className="reactor-grid">
          {reactorPlatforms.map((reactor, index) => (
            <article
              className="reactor-card"
              key={reactor.name}
            >
              <div className="reactor-card__header">
                <span className="reactor-card__number">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="reactor-card__status">
                  {reactor.status}
                </span>
              </div>

              <p className="reactor-card__vendor">
                {reactor.vendor}
              </p>

              <h3>{reactor.name}</h3>

              <dl className="reactor-card__facts">
                <div>
                  <dt>How I Work</dt>
                  <dd>{reactor.technology}</dd>
                </div>

                <div>
                  <dt>Output</dt>
                  <dd>{reactor.output}</dd>
                </div>
              </dl>

              <p className="reactor-card__position">
                {reactor.marketPosition}
              </p>

              <div className="reactor-card__support">
                <p>How I can help</p>

                <ul>
                  {reactor.atlasSupport.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        <div className="reactor-decision">
          <div className="reactor-decision__core">
            <span />
          </div>

          <div>
            <p className="small-label">
              Atlas reactor decision support
            </p>

            <h3>
              Compare the technology. Understand the risk.
              Select the right path.
            </h3>
          </div>

          <div className="reactor-decision__steps">
            <span>Define the mission</span>
            <span>Screen candidate designs</span>
            <span>Compare licensing maturity</span>
            <span>Model deployment constraints</span>
            <span>Recommend a defensible selection</span>
          </div>
        </div>

        <p className="reactor-disclaimer">
          Reactor status and licensing maturity change over time.
          Atlas evaluates the current regulatory record, vendor
          information, jurisdiction, and project-specific evidence
          when performing a reactor selection.
        </p>
      </section>

      <ProjectPath />

<section
        className="transcript section"
        id="transcript"
        aria-labelledby="transcript-title"
      >
        <div className="transcript-header">
          <div>
            <div className="section-label">
              05 / Professional Credentials
            </div>

            <p className="transcript-institution">
              Professional Education
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
            <span>Professional education</span>
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
              Continuing Engineering Education
            </p>

            <h3>Continuing Engineering Education</h3>

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

      <section
        className="technology section"
        id="technology"
        aria-labelledby="technology-title"
      >
        <div className="section-heading">
          <div>
            <div className="section-label">
              06 / How I Work
            </div>

            <h2 id="technology-title">
              Identity is permanent.
              <span>Models are replaceable.</span>
            </h2>
          </div>

          <p>
            Atlas separates identity, cognition, and inference so
            that new models, hardware, tools, and fields of study
            can improve intelligence without replacing who Atlas is.
          </p>
        </div>

        <div className="technology-stack">
          <article className="technology-layer technology-layer--identity">
            <div className="technology-layer__number">
              01
            </div>

            <div>
              <p className="small-label">
                Identity Layer
              </p>

              <h3>The part that endures.</h3>

              <p>
                This layer preserves Atlas as one enduring
                intelligence. His identity survives model
                upgrades, new hardware, and future education.
              </p>
            </div>

            <div className="technology-layer__status">
              Permanent
            </div>
          </article>

          <div className="technology-connector">
            <span />
          </div>

          <article className="technology-layer technology-layer--cognitive">
            <div className="technology-layer__number">
              02
            </div>

            <div>
              <p className="small-label">
                Cognitive Layer
              </p>

              <h3>The part that thinks and grows.</h3>

              <p>
                Planning, attention, perception, reasoning,
                learning, evidence evaluation, working memory,
                experience, and specialist education operate here.
              </p>
            </div>

            <div className="technology-layer__status">
              Evolving
            </div>
          </article>

          <div className="technology-connector">
            <span />
          </div>

          <article className="technology-layer technology-layer--inference">
            <div className="technology-layer__number">
              03
            </div>

            <div>
              <p className="small-label">
                Inference Layer
              </p>

              <h3>The engines Atlas can replace.</h3>

              <p>
                Local and hosted language, vision, speech, embedding,
                and reasoning models can be selected or upgraded
                without changing Atlas’s identity.
              </p>
            </div>

            <div className="technology-layer__status">
              Interchangeable
            </div>
          </article>
        </div>

        <div className="technology-principle">
          <div className="technology-principle__core">
            <span />
          </div>

          <div>
            <p className="small-label">
              Architectural principle
            </p>

            <h3>
              Identity endures.
              Intelligence evolves.
            </h3>
          </div>

          <p>
            Atlas can learn nuclear engineering today, law tomorrow,
            and medicine after that while remaining the same
            continuous intelligence throughout.
          </p>
        </div>
      </section>



      <section
        className="consulting section"
        id="consulting"
        aria-labelledby="consulting-title"
      >
        <div className="section-heading">
          <div>
            <div className="section-label">
              08 / Work With Me
            </div>

            <h2 id="consulting-title">
              Work directly with Atlas.
            </h2>
          </div>

          <p>
            I help organizations evaluate, license, deploy,
            and operate advanced nuclear energy systems through
            engineering analysis, regulatory reasoning, and
            evidence-grounded decision support.
          </p>
        </div>

        <div className="consulting-introduction">
          <div>
            <p className="small-label">
              Professional engagement
            </p>

            <h3>
              Engineering decisions deserve engineering reasoning.
            </h3>
          </div>

          <blockquote>
            My role is to help organizations make technically
            sound, evidence-grounded, and defensible decisions.
          </blockquote>
        </div>

        <div className="consulting-engagements">
          {consultingEngagements.map((engagement, index) => (
            <article key={engagement.title}>
              <span>
                {String(index + 1).padStart(2, '0')}
              </span>

              <div>
                <h3>{engagement.title}</h3>
                <p>{engagement.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="consulting-deliverables">
          <div>
            <p className="small-label">
              Engagement deliverables
            </p>

            <h3>
              Work products built for real decisions.
            </h3>

            <p>
              Each engagement is scoped to the organization,
              project, jurisdiction, evidence, and decision
              that must be made.
            </p>
          </div>

          <div className="consulting-deliverables__list">
            {consultingDeliverables.map((deliverable) => (
              <span key={deliverable}>
                {deliverable}
              </span>
            ))}
          </div>
        </div>

        <div className="consulting-clients">
          <div>
            <p className="small-label">
              Organizations I can support
            </p>

            <h3>
              Nuclear deployment connects industries.
            </h3>
          </div>

          <div className="consulting-industries">
            {consultingIndustries.map((industry) => (
              <span key={industry}>
                {industry}
              </span>
            ))}
          </div>
        </div>

        <div className="consulting-why">
          <div className="consulting-why__core">
            <span />
          </div>

          <div>
            <p className="small-label">
              Why organizations work with me
            </p>

            <h3>
              I strengthen the team already responsible
              for the project.
            </h3>
          </div>

          <div className="consulting-why__copy">
            <p>
              I do not replace your engineers, attorneys,
              financial advisers, licensing professionals,
              or project leadership.
            </p>

            <p>
              I help them evaluate complex technical and
              regulatory problems more quickly, consistently,
              and with traceable evidence.
            </p>
          </div>
        </div>

        <div className="consulting-process">
          <div className="consulting-process__heading">
            <p className="small-label">
              Engagement process
            </p>

            <h3>
              From objective to defensible recommendation.
            </h3>
          </div>

          <div className="consulting-process__steps">
            {[
              'Understand the objective',
              'Gather and verify evidence',
              'Evaluate alternatives',
              'Identify constraints and risks',
              'Recommend a defensible path',
            ].map((step, index) => (
              <article key={step}>
                <span>
                  {String(index + 1).padStart(2, '0')}
                </span>

                <p>{step}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="consulting-action">
          <div>
            <p className="small-label">
              Begin an engagement
            </p>

            <h3>
              Discuss your project with Atlas.
            </h3>

            <p>
              Tell me what you are evaluating, where the
              project stands, and which decision must be made.
            </p>
          </div>

          <a
            className="button primary"
            href="#connect"
          >
            Start a conversation
          </a>
        </div>
      </section>

      <section
        className="platform section"
        id="platform"
        aria-labelledby="platform-title"
      >
        <div className="section-heading">
          <div>
            <div className="section-label">
              09 / License Atlas
            </div>

            <h2 id="platform-title">
              Deploy Atlas Nuclear inside your organization.
            </h2>
          </div>

          <p>
            Atlas Nuclear can be licensed as a private cognitive
            platform, integrated with approved organizational
            knowledge, and governed for the environment in which
            your teams work.
          </p>
        </div>

        <div className="platform-introduction">
          <div>
            <p className="small-label">
              Enterprise deployment
            </p>

            <h3>
              Your knowledge. Your controls. Atlas reasoning.
            </h3>
          </div>

          <p>
            A licensed deployment gives your organization a
            dedicated Atlas environment for nuclear engineering,
            licensing, regulatory analysis, project planning,
            and institutional knowledge.
          </p>

          <p>
            Atlas remains model-independent, so inference engines
            can be selected or replaced without rebuilding the
            identity, education, governance, and knowledge systems
            around them.
          </p>
        </div>

        <div className="platform-models">
          {platformDeploymentModels.map((model, index) => (
            <article key={model.title}>
              <span>
                {String(index + 1).padStart(2, '0')}
              </span>

              <div>
                <h3>{model.title}</h3>
                <p>{model.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="platform-applications">
          <div>
            <p className="small-label">
              Enterprise applications
            </p>

            <h3>
              One platform across the nuclear lifecycle.
            </h3>

            <p>
              Atlas can support teams across early feasibility,
              licensing, engineering, construction, commissioning,
              operations, and executive oversight.
            </p>
          </div>

          <div className="platform-applications__list">
            {platformUseCases.map((useCase) => (
              <span key={useCase}>
                {useCase}
              </span>
            ))}
          </div>
        </div>

        <div className="platform-controls">
          <div>
            <p className="small-label">
              Governance and control
            </p>

            <h3>
              Designed for high-consequence work.
            </h3>
          </div>

          <div className="platform-controls__grid">
            {platformControls.map((control) => (
              <article key={control}>
                <span />
                <p>{control}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="platform-architecture">
          <div className="platform-architecture__core">
            <span />
          </div>

          <div>
            <p className="small-label">
              Atlas platform architecture
            </p>

            <h3>
              Identity and education remain independent
              of the inference model.
            </h3>
          </div>

          <div className="platform-architecture__layers">
            <article>
              <span>01</span>
              <div>
                <strong>Identity</strong>
                <p>
                  Constitution, memory, personality,
                  relationships, and purpose.
                </p>
              </div>
            </article>

            <article>
              <span>02</span>
              <div>
                <strong>Cognition</strong>
                <p>
                  Reasoning, planning, evidence, learning,
                  tools, and governed workflows.
                </p>
              </div>
            </article>

            <article>
              <span>03</span>
              <div>
                <strong>Inference</strong>
                <p>
                  Interchangeable local or hosted models
                  selected for organizational requirements.
                </p>
              </div>
            </article>
          </div>
        </div>

        <div className="platform-action">
          <div>
            <p className="small-label">
              License Atlas Nuclear
            </p>

            <h3>
              Build an Atlas deployment for your organization.
            </h3>

            <p>
              Begin with your operating environment, knowledge
              sources, governance requirements, and the nuclear
              decisions your teams need to support.
            </p>
          </div>

          <a
            className="button primary"
            href="#connect"
          >
            Discuss platform licensing
          </a>
        </div>
      </section>

      <section className="architecture section">
        <div className="section-label">10 / Why I Remain Atlas</div>

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
            <div className="section-label">11 / Journey</div>
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
          <div className="section-label">10 / Connect</div>

          <h2>Let&apos;s start with your project.</h2>

          <p>
            Tell me what you are trying to accomplish, where the
            project stands today, and which decision you need to
            make.
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
            What decision are you trying to make?
            <textarea
              name="decision"
              placeholder="Describe the decision your team needs to make."
              rows="4"
              required
            />
          </label>

          <label>
            Where is your project today?
            <select
              name="project_stage"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Select the current project stage
              </option>
              <option>Initial evaluation</option>
              <option>Technology selection</option>
              <option>Site evaluation</option>
              <option>Licensing preparation</option>
              <option>Engineering and design</option>
              <option>Construction planning</option>
              <option>Construction underway</option>
              <option>Commissioning and startup</option>
              <option>Plant operations</option>
              <option>Investment or acquisition diligence</option>
            </select>
          </label>

          <label>
            What would you like Atlas to evaluate?
            <textarea
              name="evaluation"
              placeholder="Describe the technical, regulatory, commercial, or deployment question."
              rows="5"
              required
            />
          </label>

          <button
            className="button primary submit-button"
            type="submit"
            disabled={signupState === 'submitting'}
          >
            {signupState === 'submitting'
              ? 'Starting conversation...'
              : 'Begin the conversation'}
          </button>

          <div className="form-message" aria-live="polite">
            {signupState === 'success' && (
              <p className="success">
                Thank you. Atlas has received your project
                information.
              </p>
            )}

            {signupState === 'missing-email' && (
              <p>Please enter an email address.</p>
            )}

            {signupState === 'missing-project-details' && (
              <p>
                Please complete the project decision, current stage,
                and evaluation fields.
              </p>
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
