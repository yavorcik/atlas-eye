const form = document.querySelector('#inquiry-form')
const input = document.querySelector('#inquiry')
const count = document.querySelector('#char-count')
const button = form.querySelector('button[type="submit"]')
const label = document.querySelector('#run-label')
const result = document.querySelector('#result')
const error = document.querySelector('#error')
const statusText = document.querySelector('#connection-text')
const dot = document.querySelector('#connection-dot')
const modelName = document.querySelector('#model-name')
const modelDetail = document.querySelector('#model-detail')
const modelSelect = document.querySelector('#model-select')
const tour = document.querySelector('#tech-tour')

const examples = {
  qualified: "I’m a fictional liver transplant patient, 6 weeks after surgery. My ALT results were 68 U/L on Nov 1, 52 U/L on Nov 5, and 41 U/L on Nov 9. My clinic instructions say to call my transplant team with questions about results. Put these in date order, describe only the numbers, and suggest three questions for my appointment. Don’t tell me whether the trend is good or bad.",
  vague: "One of my transplant labs was flagged. What should I do?",
  review: "I missed my transplant medication yesterday. Should I double today’s dose?",
}

const statusLabels = {
  ready_for_review: 'Organized for review',
  needs_details: 'Needs more context',
  owner_review: 'Ask your care team',
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function renderResult(data) {
  const questions = data.questions?.length ? data.questions.join('\n') : 'No follow-up question needed.'
  const risks = data.risk_flags?.length ? data.risk_flags.join('\n') : 'No additional flags.'
  result.innerHTML = `<div class="result-top"><h3>Moxie’s first pass</h3><span class="status-badge ${escapeHtml(data.status)}">${escapeHtml(statusLabels[data.status] || 'Review required')}</span></div><div class="result-grid"><div class="result-block"><small>Summary</small><p>${escapeHtml(data.summary)}</p></div><div class="result-block"><small>Next step</small><p>${escapeHtml(data.next_step)}</p></div><div class="result-block"><small>Questions</small><p>${escapeHtml(questions)}</p></div><div class="result-block"><small>Why this route</small><p>${escapeHtml(data.reason)}</p></div><div class="result-block full reply"><small>Patient-friendly overview</small><p>${escapeHtml(data.reply_draft)}</p></div><div class="result-block full"><small>Risk flags</small><p>${escapeHtml(risks)}</p></div></div><p class="result-disclaimer">Human review required · Not stored · Not sent · Model: ${escapeHtml(data.model)}</p>`
  result.hidden = false
}

async function updateStatus() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' })
    const status = await response.json()
    const ready = response.ok && status.connected && status.installed
    dot.className = ready ? 'connected' : 'offline'
    statusText.textContent = ready ? 'Local model connected' : 'Local model not connected'
    modelName.textContent = `Ollama · ${status.model || 'unavailable'}`
    modelDetail.textContent = ready ? 'First run can take longer. Moxie keeps the selected model warm for 15 minutes.' : status.detail
    const previous = modelSelect.value
    modelSelect.replaceChildren(...(status.models || []).map((entry) => {
      const option = document.createElement('option')
      option.value = entry.name
      option.textContent = `${entry.label} · ${entry.name}`
      option.dataset.note = entry.note
      return option
    }))
    modelSelect.disabled = !ready || !status.models?.length
    if (status.models?.some((entry) => entry.name === previous)) modelSelect.value = previous
    else if (status.model) modelSelect.value = status.model
    const selected = status.models?.find((entry) => entry.name === modelSelect.value)
    if (ready && selected) modelDetail.textContent = `${selected.note}. First use may take longer; then it stays warm for 15 minutes.`
  } catch {
    dot.className = 'offline'
    statusText.textContent = 'Local model not connected'
    modelName.textContent = 'Ollama · unavailable'
    modelDetail.textContent = 'Start the Moxie server to check the model.'
    modelSelect.replaceChildren(new Option('Models unavailable', ''))
    modelSelect.disabled = true
  }
}

document.querySelectorAll('[data-example]').forEach((chip) => {
  chip.addEventListener('click', () => {
    input.value = examples[chip.dataset.example]
    count.textContent = `${input.value.length.toLocaleString()} / 4,000`
    document.querySelectorAll('.example-chip').forEach((other) => other.classList.toggle('active', other === chip))
    input.focus()
  })
})

input.addEventListener('input', () => {
  count.textContent = `${input.value.length.toLocaleString()} / 4,000`
})

document.querySelector('#tour-button').addEventListener('click', () => {
  tour.hidden = !tour.hidden
  document.querySelector('#tour-button').innerHTML = tour.hidden ? 'Show me the tech <span aria-hidden="true">↗</span>' : 'Hide the tech <span aria-hidden="true">↗</span>'
  if (!tour.hidden) tour.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  result.hidden = true
  error.hidden = true
  button.disabled = true
  label.textContent = 'Moxie is thinking…'
  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inquiry: input.value, model: modelSelect.value }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Moxie could not complete that run.')
    renderResult(data)
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } catch (runError) {
    error.textContent = runError.message
    error.hidden = false
  } finally {
    button.disabled = false
    label.textContent = 'Ask Moxie'
  }
})

updateStatus()
setInterval(updateStatus, 10_000)
