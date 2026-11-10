const form = document.getElementById('owner-registration')
const input = document.getElementById('verification-key')
const button = form.querySelector('button')
const status = document.getElementById('check-status')
let attempted = false
button.disabled = false

form.addEventListener('submit', async event => {
  event.preventDefault()
  if (attempted) return
  let token = input.value.trim()
  if (!/^[a-f0-9]{64}$/.test(token)) {
    input.value = ''
    status.textContent = 'Enter a valid temporary verification key.'
    return
  }
  attempted = true
  input.value = ''
  input.disabled = true
  button.disabled = true
  status.textContent = 'Registering configured attendee…'
  try {
    const response = await fetch('/learn/intake', {
      method: 'POST',
      headers: { 'X-Workshop-Owner-Registration': 'register-waitlist', Authorization: `Bearer ${token}` },
      mode: 'same-origin', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(45000),
    })
    status.textContent = [200, 201].includes(response.status)
      ? 'Registration saved. Review the private operator records. No email was sent by this action.'
      : 'Action unavailable. Review the configuration and private operator records before another attempt.'
  } catch {
    status.textContent = 'The action outcome could not be confirmed. Review private operator records before another attempt.'
  } finally {
    // eslint-disable-next-line no-useless-assignment -- Drop this temporary secret reference after the request.
    token = ''
  }
})
