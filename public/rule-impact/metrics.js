(() => {
  const allowed = new Set(['linkedin', 'facebook']);
  if (!['atlaseye.ai', 'www.atlaseye.ai', 'atlas-eye.netlify.app'].includes(location.hostname)) return;
  const source = new URLSearchParams(location.search).get('utm_source');
  const bucket = allowed.has(source) ? source : 'other';
  const endpoint = 'https://nnudwaqrgtztmcrcwpxn.supabase.co/functions/v1/owner-activity';
  const emitted = new Set();
  const pathFor = (event) => '/rule-impact/' + event + '/' + bucket + '/';
  function report(event) {
    if (!['view', 'start', 'complete'].includes(event) || emitted.has(event)) return;
    // One count per event per page load. No visitor ID, cookies, email, full URL,
    // decision data, referrer, or arbitrary query fields in this payload.
    try {
      if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
      const body = JSON.stringify({
        event_id: crypto.randomUUID(),
        site: 'atlas-eye',
        event_type: event === 'view' ? 'page_view' : 'click',
        occurred_at: new Date().toISOString(),
        path: pathFor(event),
      });
      const request = { method: 'POST', body, headers: {'content-type': 'text/plain'}, credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true };
      emitted.add(event);
      return fetch(endpoint, request).then(result => {
        if (!result.ok) emitted.delete(event);
      }).catch(() => emitted.delete(event));
    } catch { /* Analytics must not interrupt a demo. */ }
  }
  window.atlasRuleImpactMetric = report;
  report('view');
})();
