const query = new URLSearchParams(window.location.search)
const allowedSources = ['referral', 'linkedin', 'email', 'event']
const incomingSource = query.get('utm_source')?.toLowerCase()
const source = allowedSources.includes(incomingSource) ? incomingSource : incomingSource ? 'other' : 'direct'
const campaign = query.get('utm_campaign') || ''

for (const form of document.querySelectorAll('[data-intake]')) {
  if (form.dataset.intake === 'workshop') {
    const start = document.getElementById('workshop-start')
    if (start && Date.now() >= Date.parse(start.dateTime)) {
      form.hidden = true
      document.getElementById('workshop-closed').hidden = false
      continue
    }
  }

  const status = form.querySelector('[role="status"]')
  const submit = form.querySelector('button[type="submit"]')
  const buttonText = submit.textContent
  let requestId
  let submittedData

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submit.disabled) return

    const data = Object.fromEntries(new FormData(form))
    const fingerprint = JSON.stringify(data)
    if (fingerprint !== submittedData) {
      requestId = crypto.randomUUID()
      submittedData = fingerprint
    }

    submit.disabled = true
    submit.textContent = 'Saving…'
    status.textContent = ''

    try {
      const response = await fetch('/learn/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          kind: form.dataset.intake,
          consent: data.consent === 'yes',
          source,
          campaign,
          requestId,
        }),
        signal: AbortSignal.timeout(12000),
      })
      const result = await response.json()
      if (!response.ok || result.saved !== true) {
        status.textContent = result.error || 'We could not save your submission. Please try again.'
        return
      }

      form.reset()
      submittedData = undefined
      requestId = undefined
      status.textContent = form.dataset.intake === 'workshop'
        ? 'Your registration is saved for November 20. We’ll share the Google Meet joining instructions using the email you provided.'
        : 'Your inquiry is saved for review. If you’d like to talk sooner, you can book a free call below.'
    } catch {
      status.textContent = 'We could not confirm the submission. Please try again.'
    } finally {
      submit.disabled = false
      submit.textContent = buttonText
    }
  })
}
