import { useMemo, useState } from 'react'
import './ProjectPath.css'

const projectStages = [
  {
    title: "I'm choosing a reactor",
    summary:
      'Compare candidate designs against the mission, site, schedule, licensing maturity, economics, and deployment risk.',
    support: [
      'Define project requirements',
      'Screen reactor technologies',
      'Compare licensing maturity',
      'Evaluate construction strategy',
      'Model commercial and schedule risk',
      'Recommend a defensible selection',
    ],
    questions: [
      {
        label: 'What is the primary mission?',
        options: [
          'Grid electricity',
          'AI data center',
          'Industrial power',
          'District energy',
        ],
      },
      {
        label: 'What output range are you evaluating?',
        options: [
          'Under 100 MWe',
          '100–300 MWe',
          '300–500 MWe',
          'More than 500 MWe',
        ],
      },
      {
        label: 'What matters most?',
        options: [
          'Licensing maturity',
          'Deployment speed',
          'Lowest capital cost',
          'Long-term economics',
        ],
      },
    ],
  },
  {
    title: "I'm evaluating a site",
    summary:
      'Determine whether a candidate location can support the reactor, infrastructure, licensing, construction, and operating mission.',
    support: [
      'Evaluate site suitability',
      'Review population and emergency-planning factors',
      'Assess grid access and infrastructure',
      'Identify environmental and permitting constraints',
      'Evaluate construction feasibility',
      'Compare candidate locations',
    ],
    questions: [
      {
        label: 'Where is the site?',
        options: [
          'Existing nuclear site',
          'Industrial property',
          'Greenfield property',
          'Site not selected',
        ],
      },
      {
        label: 'What is the intended use?',
        options: [
          'Grid generation',
          'AI data center',
          'Industrial facility',
          'Multiple uses',
        ],
      },
      {
        label: 'What is the current stage?',
        options: [
          'Initial screening',
          'Site control secured',
          'Studies underway',
          'Preparing applications',
        ],
      },
    ],
  },
  {
    title: "I'm preparing for NRC licensing",
    summary:
      'Build a licensing strategy grounded in the selected reactor, site, applicant, jurisdiction, and regulatory record.',
    support: [
      'Define the licensing pathway',
      'Identify applicable requirements',
      'Map application dependencies',
      'Develop the evidence strategy',
      'Evaluate licensing schedule risk',
      'Create a regulatory roadmap',
    ],
    questions: [
      {
        label: 'What has been selected?',
        options: [
          'Reactor and site',
          'Reactor only',
          'Site only',
          'Neither yet',
        ],
      },
      {
        label: 'Which pathway are you considering?',
        options: [
          'Part 50',
          'Part 52',
          'Construction permit',
          'Pathway not determined',
        ],
      },
      {
        label: 'What do you need first?',
        options: [
          'Licensing strategy',
          'Requirements matrix',
          'Application roadmap',
          'Readiness assessment',
        ],
      },
    ],
  },
  {
    title: "I'm planning construction",
    summary:
      'Connect design maturity, licensing conditions, procurement, workforce, schedule, quality, and turnover into one executable plan.',
    support: [
      'Develop the construction strategy',
      'Evaluate long-lead procurement',
      'Build work-package sequencing',
      'Assess workforce and infrastructure',
      'Identify schedule constraints',
      'Plan system turnover and completion',
    ],
    questions: [
      {
        label: 'What is the project stage?',
        options: [
          'Conceptual planning',
          'Design development',
          'Preconstruction',
          'Construction underway',
        ],
      },
      {
        label: 'What is the largest concern?',
        options: [
          'Schedule',
          'Procurement',
          'Workforce',
          'Cost',
        ],
      },
      {
        label: 'What planning output is needed?',
        options: [
          'Integrated schedule',
          'Construction strategy',
          'Readiness review',
          'Risk assessment',
        ],
      },
    ],
  },
  {
    title: "I'm preparing for commissioning",
    summary:
      'Evaluate whether systems, procedures, staffing, evidence, and operating programs are ready for testing and startup.',
    support: [
      'Assess system readiness',
      'Review turnover packages',
      'Plan testing and startup',
      'Evaluate staffing and procedures',
      'Identify incomplete prerequisites',
      'Support fuel-load readiness decisions',
    ],
    questions: [
      {
        label: 'What stage are you approaching?',
        options: [
          'System turnover',
          'Preoperational testing',
          'Fuel-load readiness',
          'Startup testing',
        ],
      },
      {
        label: 'What is the primary concern?',
        options: [
          'Incomplete systems',
          'Procedure readiness',
          'Staffing readiness',
          'Evidence completeness',
        ],
      },
      {
        label: 'What decision is required?',
        options: [
          'Proceed',
          'Proceed with conditions',
          'Delay',
          'Determine readiness',
        ],
      },
    ],
  },
  {
    title: "I'm operating a plant",
    summary:
      'Support operating teams with governed knowledge retrieval, requirements analysis, performance evaluation, and decision support.',
    support: [
      'Retrieve operational requirements',
      'Evaluate plant performance',
      'Analyze corrective actions',
      'Review operating experience',
      'Support outage and maintenance planning',
      'Preserve institutional knowledge',
    ],
    questions: [
      {
        label: 'What type of support is needed?',
        options: [
          'Requirements research',
          'Performance analysis',
          'Corrective action',
          'Outage planning',
        ],
      },
      {
        label: 'What information should Atlas use?',
        options: [
          'Procedures',
          'Operating experience',
          'Plant records',
          'All approved sources',
        ],
      },
      {
        label: 'Who needs the output?',
        options: [
          'Engineering',
          'Operations',
          'Plant leadership',
          'Regulatory affairs',
        ],
      },
    ],
  },
  {
    title: "I'm evaluating an acquisition",
    summary:
      'Integrate technical, regulatory, financial, construction, and operating evidence into a defensible diligence assessment.',
    support: [
      'Evaluate licensing position',
      'Review technical maturity',
      'Assess project readiness',
      'Identify liabilities and gaps',
      'Evaluate schedule and capital exposure',
      'Prepare an executive recommendation',
    ],
    questions: [
      {
        label: 'What are you evaluating?',
        options: [
          'Reactor company',
          'Development project',
          'Operating asset',
          'Technology portfolio',
        ],
      },
      {
        label: 'What is the primary concern?',
        options: [
          'Technical maturity',
          'Licensing risk',
          'Capital exposure',
          'Commercial viability',
        ],
      },
      {
        label: 'What deliverable is needed?',
        options: [
          'Diligence report',
          'Risk register',
          'Investment memorandum',
          'Executive briefing',
        ],
      },
    ],
  },
  {
    title: "I'm building an AI data center",
    summary:
      'Determine whether advanced nuclear energy can support the load, schedule, site, financing, and commercial requirements of the project.',
    support: [
      'Define power and reliability requirements',
      'Evaluate reactor candidates',
      'Assess site and grid strategy',
      'Model licensing and construction schedule',
      'Evaluate commercial viability',
      'Recommend whether and how to proceed',
    ],
    questions: [
      {
        label: 'What power demand are you planning?',
        options: [
          'Under 100 MW',
          '100–300 MW',
          '300–1,000 MW',
          'More than 1 GW',
        ],
      },
      {
        label: 'What is the site status?',
        options: [
          'Operating data center',
          'Site controlled',
          'Sites under review',
          'No site selected',
        ],
      },
      {
        label: 'What is the target timeline?',
        options: [
          'Under 5 years',
          '5–8 years',
          '8–12 years',
          'More than 12 years',
        ],
      },
    ],
  },
]

function ProjectPath() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [assessmentOpen, setAssessmentOpen] = useState(false)
  const [answers, setAnswers] = useState({})

  const selected = projectStages[selectedIndex]

  const completedQuestions = useMemo(
    () => Object.keys(answers).length,
    [answers],
  )

  const assessmentComplete =
    completedQuestions === selected.questions.length

  const selectStage = (index) => {
    setSelectedIndex(index)
    setAnswers({})
    setAssessmentOpen(false)
  }

  const selectAnswer = (questionIndex, answer) => {
    setAnswers((current) => ({
      ...current,
      [questionIndex]: answer,
    }))
  }

  const beginConversation = () => {
    const intake = {
      project: selected.title,
      answers: selected.questions.map((question, index) => ({
        question: question.label,
        answer: answers[index] || 'Not answered',
      })),
    }

    sessionStorage.setItem(
      'atlas-project-intake',
      JSON.stringify(intake),
    )

    document
      .querySelector('#connect')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      className="project-path section"
      id="project-path"
      aria-labelledby="project-path-title"
    >
      <div className="section-heading">
        <div>
          <div className="section-label">
            07 / Your Project
          </div>

          <h2 id="project-path-title">
            Where are you in your project?
          </h2>
        </div>

        <p>
          Select the situation that best describes your work.
          I will show you where I can help and which decisions
          should be evaluated next.
        </p>
      </div>

      <div className="project-path__layout">
        <div
          className="project-path__choices"
          role="tablist"
          aria-label="Project stages"
        >
          {projectStages.map((stage, index) => (
            <button
              key={stage.title}
              type="button"
              role="tab"
              aria-selected={selectedIndex === index}
              className={
                selectedIndex === index
                  ? 'project-path__choice is-active'
                  : 'project-path__choice'
              }
              onClick={() => selectStage(index)}
            >
              <span>
                {String(index + 1).padStart(2, '0')}
              </span>

              <strong>{stage.title}</strong>
            </button>
          ))}
        </div>

        <article
          className="project-path__response"
          role="tabpanel"
        >
          <p className="small-label">
            Here is how I can help
          </p>

          <h3>{selected.title}</h3>

          <p className="project-path__summary">
            {selected.summary}
          </p>

          <div className="project-path__support">
            {selected.support.map((item, index) => (
              <div key={item}>
                <span>
                  {String(index + 1).padStart(2, '0')}
                </span>

                <p>{item}</p>
              </div>
            ))}
          </div>

          {!assessmentOpen && (
            <button
              className="button primary"
              type="button"
              onClick={() => setAssessmentOpen(true)}
            >
              Begin guided assessment
            </button>
          )}

          {assessmentOpen && (
            <div className="project-path__assessment">
              <div className="project-path__assessment-heading">
                <div>
                  <p className="small-label">
                    Initial project assessment
                  </p>

                  <h4>
                    I need a little context.
                  </h4>
                </div>

                <span>
                  {completedQuestions}
                  {' / '}
                  {selected.questions.length}
                </span>
              </div>

              <div className="project-path__questions">
                {selected.questions.map((question, questionIndex) => (
                  <fieldset key={question.label}>
                    <legend>
                      <span>
                        {String(questionIndex + 1).padStart(2, '0')}
                      </span>

                      {question.label}
                    </legend>

                    <div>
                      {question.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={
                            answers[questionIndex] === option
                              ? 'is-selected'
                              : ''
                          }
                          onClick={() =>
                            selectAnswer(questionIndex, option)
                          }
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>

              <div className="project-path__assessment-action">
                <p>
                  {assessmentComplete
                    ? 'I have enough context to begin the conversation.'
                    : 'Select one answer for each question.'}
                </p>

                <button
                  className="button primary"
                  type="button"
                  disabled={!assessmentComplete}
                  onClick={beginConversation}
                >
                  Continue with Atlas
                </button>
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

export default ProjectPath
