const query = new URLSearchParams(window.location.search)
const allowedSources = ['referral', 'linkedin', 'tiktok', 'email', 'event']
const incomingSource = query.get('utm_source')?.toLowerCase()
const source = allowedSources.includes(incomingSource) ? incomingSource : incomingSource ? 'other' : 'direct'
const campaign = query.get('utm_campaign') || ''

function openWaitlist(prefill = {}) {
  const details = document.getElementById('workshop-waitlist-details')
  const form = details?.querySelector('[data-intake="waitlist"]')
  if (!details || !form) return
  details.open = true
  if (prefill.name) form.elements.namedItem('name').value = prefill.name
  if (prefill.email) form.elements.namedItem('email').value = prefill.email
}

for (const form of document.querySelectorAll('[data-intake]')) {
  if (form.dataset.intake === 'workshop') {
    const start = document.getElementById('workshop-start')
    if (start && Date.now() >= Date.parse(start.dateTime)) {
      form.hidden = true
      document.getElementById('workshop-closed').hidden = false
      openWaitlist()
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
        signal: AbortSignal.timeout(45000),
      })
      const result = await response.json()
      if (!response.ok || result.saved !== true) {
        status.textContent = result.error || 'We could not save your submission. Please try again.'
        if (form.dataset.intake === 'workshop' && (response.status === 409 || response.status === 410)) {
          openWaitlist(data)
        }
        return
      }

      form.reset()
      submittedData = undefined
      requestId = undefined
      status.textContent = form.dataset.intake === 'workshop'
        ? result.confirmationEmail === 'accepted'
          ? 'Your registration is saved for November 20, 4–4:45 p.m. Eastern. Our email provider accepted your confirmation with the Google Meet link. Check your inbox and spam folder. If it does not arrive, use the free-call link below for help.'
          : 'Your registration is saved for November 20, 4–4:45 p.m. Eastern, but we cannot confirm that the joining-instructions email was sent. You do not need to register again. Use the free-call link below for help getting the Google Meet link.'
        : form.dataset.intake === 'waitlist'
          ? 'You’re on the next-session notification list, not registered for November 20. No seat is reserved. We’ll email you when a new free live workshop date is announced; no confirmation email is sent now.'
          : 'Your inquiry is saved for review. If you’d like to talk sooner, you can book a free call below.'
    } catch {
      status.textContent = 'We could not confirm the submission. Please try again.'
    } finally {
      submit.disabled = false
      submit.textContent = buttonText
    }
  })
}

// Keep the two service paths connected to the same inquiry and booking flow.
for (const link of document.querySelectorAll('[data-build-preference]')) {
  link.addEventListener('click', () => {
    const preference = document.querySelector('[data-intake="inquiry"] select[name="buildPreference"]')
    if (preference) preference.value = link.dataset.buildPreference
  })
}
