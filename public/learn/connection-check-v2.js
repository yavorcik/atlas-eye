const form = document.getElementById('connection-check')
const action = document.getElementById('operator-action')
const input = document.getElementById('verification-key')
const button = form.querySelector('button')
const status = document.getElementById('check-status')
let attempted = false
button.disabled = false

form.addEventListener('submit', async event => {
  event.preventDefault()
  if (attempted) return
  const intent = action?.value || 'verify-smtp'
  if (!['verify-smtp', 'send-owner-test'].includes(intent)) return
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
  if (action) action.disabled = true
  status.textContent = 'Running selected action…'
  try {
    const response = await fetch('/learn/intake', {
      method: 'POST',
      headers: { 'X-Workshop-Diagnostic': intent, Authorization: `Bearer ${token}` },
      mode: 'same-origin', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(45000),
    })
    status.textContent = response.status === 200
      ? 'Request completed. Review the private operator records for the result.'
      : 'Action unavailable. Review the configuration and private operator records before another attempt.'
  } catch {
    status.textContent = 'The action outcome could not be confirmed. Review private operator records before another attempt.'
  } finally {
    // eslint-disable-next-line no-useless-assignment -- Drop this temporary secret reference after the request.
    token = ''
  }
})
