import { analyzeInquiry, samples } from './engine.mjs'

const get = id => document.getElementById(id)
let selected = samples[0]
let hasRun = false
const tabs = [...document.querySelectorAll('[role="tab"]')]

function selectTab(tab, focus = false) {
  for (const item of tabs) {
    const active = item === tab
    item.setAttribute('aria-selected', String(active))
    item.tabIndex = active ? 0 : -1
    get(item.getAttribute('aria-controls')).hidden = !active
  }
  if (focus) tab.focus()
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => selectTab(tab))
  tab.addEventListener('keydown', event => {
    const positions = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }
    if (event.key in positions) {
      event.preventDefault()
      selectTab(tabs[positions[event.key]], true)
    }
  })
}

function markChanged() {
  get('char-count').textContent = `${get('inquiry').value.length.toLocaleString()} / 2,000`
  get('form-error').textContent = ''
  if (hasRun) {
    get('stale-note').hidden = false
    get('run-status').textContent = 'Input changed · Run again'
  }
}

function loadSample() {
  get('inquiry').value = selected.text
  hasRun = false
  get('results').hidden = true
  get('empty-state').hidden = false
  get('stale-note').hidden = true
  get('run-status').textContent = 'Ready when you are'
  selectTab(tabs[0])
  markChanged()
}

document.querySelectorAll('input[name="sample"]').forEach(input => input.addEventListener('change', () => {
  selected = samples.find(sample => sample.id === input.value) || samples[0]
  loadSample()
}))
get('inquiry').addEventListener('input', markChanged)
get('reset').addEventListener('click', loadSample)
get('add-budget').addEventListener('click', () => {
  const current = get('inquiry').value
  const budget = 'Budget: $2,500 for an initial pilot'
  const next = /^\s*Budget:.*$/mi.test(current) ? current.replace(/^\s*Budget:.*$/mi, () => budget) : `${current}\n${budget}`
  if (next.length > 2000) {
    get('form-error').textContent = 'Make a little room in the inquiry before adding the sample budget.'
    return
  }
  get('inquiry').value = next
  markChanged()
})

function renderPairs(element, pairs) {
  element.replaceChildren()
  for (const [label, value, missing] of pairs) {
    const row = document.createElement('div')
    const term = document.createElement('dt')
    const detail = document.createElement('dd')
    term.textContent = label
    detail.textContent = value
    if (missing) detail.className = 'missing'
    row.append(term, detail)
    element.append(row)
  }
}

get('inquiry-form').addEventListener('submit', event => {
  event.preventDefault()
  let result
  try { result = analyzeInquiry(get('inquiry').value) } catch (error) {
    get('form-error').textContent = error.message
    get('inquiry').focus()
    return
  }
  hasRun = true
  get('form-error').textContent = ''
  get('empty-state').hidden = true
  get('results').hidden = false
  get('stale-note').hidden = true
  get('run-status').textContent = 'Ready for human review'
  get('route-title').textContent = result.route.name
  get('route-scope').textContent = result.route.scope
  renderPairs(get('fields'), [['Business', result.fields.business], ['Need', result.fields.request], ['Tools', result.fields.tools], ['Volume', result.fields.volume], ['Target timing', result.fields.timeline], ['Budget stated', result.fields.budget]].map(([name, value]) => [name, value || 'Not provided', !value]))
  get('gaps-title').textContent = result.missing.length ? `${result.missing.length} missing ${result.missing.length === 1 ? 'detail' : 'details'} to clarify` : 'Intake fields present. Verification still needed.'
  get('gaps').replaceChildren()
  for (const question of result.questions) {
    const item = document.createElement('li')
    item.textContent = question
    get('gaps').append(item)
  }
  get('warnings').hidden = result.warnings.length === 0
  get('warnings').textContent = result.warnings.join(' ')
  get('next-step').textContent = result.recommended
  get('reply').textContent = result.reply
  get('task-title').textContent = result.route.task
  renderPairs(get('record'), Object.entries(result.record).map(([key, value]) => [key.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()), value]))
  get('review-checks').textContent = result.route.checks
  selectTab(tabs[0])
  get('output-title').focus({ preventScroll: true })
  if (window.matchMedia('(max-width: 760px)').matches) get('output-title').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
})

loadSample()
get('run').disabled = false
