const endpoint = import.meta.env.VITE_OWNER_ACTIVITY_ENDPOINT || ''
const site = 'atlas-eye'
const send = (eventType) => {
  if (!endpoint) return
  const body = JSON.stringify({ event_id: crypto.randomUUID(), site, event_type: eventType, occurred_at: new Date().toISOString(), path: location.pathname })
  try { navigator.sendBeacon(endpoint, new Blob([body], { type: 'text/plain' })) } catch { /* aggregate analytics never block the page */ }
}
export function startOwnerActivity() {
  send('page_view')
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]')
    if (!link) return
    const href = link.getAttribute('href') || ''
    const isDownload = link.hasAttribute('download') || /\.(pdf|zip|docx?|xlsx?|csv)(?:$|[?#])/i.test(href)
    send(isDownload ? 'download' : 'click')
  }, { capture: true })
}
