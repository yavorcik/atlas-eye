// Intentionally deterministic. No model calls, integrations, storage, or network access.
export const samples = [
  {
    id: 'inquiries', title: 'A busy service inbox', category: 'Customer inquiries',
    text: 'Business: Cedar & Co. Home Services (fictional)\nRequest: We receive quote requests by email and lose track of the next step. Organize each inquiry, flag missing job details and draft a reply for our team to review.\nTools: Gmail and Google Sheets\nVolume: About 25 inquiries a week\nTimeline: Within 4 weeks\nBudget: Not decided',
  },
  {
    id: 'orders', title: 'The same order questions', category: 'Customer support',
    text: 'Business: Paper Moon Studio (fictional)\nRequest: Customers keep asking for order status and delivery updates. Prepare a reply using a verified order record, and flag exceptions for a person.\nTools: Not specified\nVolume: About 40 questions a week\nTimeline: Not decided\nBudget: $1,500 for an initial pilot',
  },
  {
    id: 'reporting', title: 'Friday reporting, simplified', category: 'Weekly reporting',
    text: 'Business: Northfield Creative (fictional)\nRequest: Turn weekly project updates into a concise status report. Highlight blockers and prepare follow-up tasks for review.\nTools: Google Sheets and email\nVolume: 12 active projects\nTimeline: Within 6 weeks\nBudget: $2,000 for an initial pilot',
  },
]

const definitions = [
  ['business', 'Business', 'Which business or team is this for?'],
  ['request', 'Request', 'What task should the workflow help with?'],
  ['tools', 'Tools', 'Which tools hold the source information?'],
  ['volume', 'Volume', 'How much work does the team handle?'],
  ['timeline', 'Timeline', 'What target timing should we plan around?'],
  ['budget', 'Budget', 'What budget range should we scope around?'],
]

const routes = [
  { id: 'orders', test: /\b(order|delivery|shipping|shipment)\b/i, name: 'Order-support assistant', scope: 'Read a verified order record, prepare a status reply, and flag exceptions for human review.', checks: 'Verify order identity, source freshness and delivery details. Never invent a status or promise a refund.', task: 'Review the order-support pilot and exception rules' },
  { id: 'reporting', test: /\b(report|reporting|weekly|status update|blockers)\b/i, name: 'Project-reporting assistant', scope: 'Organize project updates into a reviewable summary with blockers and suggested follow-up tasks.', checks: 'Keep links to source updates, distinguish facts from missing information, and have the project owner approve follow-ups.', task: 'Review the reporting pilot and source fields' },
  { id: 'inquiries', test: /\b(inquiry|inquiries|quote|lead|inbox|requests)\b/i, name: 'Inquiry-to-brief assistant', scope: 'Organize incoming inquiries, flag missing details, and prepare a brief and reply for human review.', checks: 'Confirm the customer request and source details. A person approves scope, pricing and every outgoing reply.', task: 'Review the inquiry pilot and required intake fields' },
]

export function analyzeInquiry(input) {
  const text = typeof input === 'string' ? input.trim() : ''
  if (text.length < 20) throw new Error('Add a fictional inquiry of at least 20 characters, or choose a sample above.')
  if (text.length > 2000) throw new Error('Keep the sample inquiry to 2,000 characters or fewer.')
  const fields = {}, evidence = {}, missing = [], warnings = []
  const parsed = Object.fromEntries(definitions.map(([key]) => [key, []]))
  let activeField = null
  for (const line of text.split(/\r?\n/)) {
    const labeled = line.match(/^[ \t]*(Business|Request|Tools|Volume|Timeline|Budget):[ \t]*(.*)$/i)
    if (labeled) {
      activeField = labeled[1].toLowerCase()
      parsed[activeField].push(labeled[2].trim())
    } else if (activeField && line.trim()) {
      const values = parsed[activeField]
      values[values.length - 1] = `${values[values.length - 1]} ${line.trim()}`.trim()
    } else if (line.trim()) {
      warnings.push('Text before the first labeled field was not extracted. Review the source inquiry.')
    }
  }
  for (const [key, label, question] of definitions) {
    const values = parsed[key]
    const value = values[0] || ''
    const unknown = !value || /^(not (specified|decided|known|provided)|unknown|tbd|n\/a|none|\?)\.?$/i.test(value)
    fields[key] = unknown ? null : value
    evidence[key] = value || 'No labeled field found'
    if (unknown) missing.push({ key, label, question })
    if (values.length > 1) warnings.push(`More than one ${label.toLowerCase()} field was found. The first is shown; review the source.`)
  }
  const matches = routes.filter(route => route.test.test(fields.request || ''))
  const route = matches[0] || { id: 'review', name: 'Needs a closer look', scope: 'Clarify the task and source information with the owner before recommending an automation.', checks: 'The request does not match this prototype’s limited rules. Do not assume an automated solution is a fit.', task: 'Clarify the proposed workflow with the owner' }
  if (matches.length > 1) warnings.push('The request matches more than one rule. The first match is shown; a person should confirm the right scope.')
  const recommended = missing.length ? 'Clarify the missing details before scoping a pilot.' : route.id === 'review' ? 'Discuss the request with a person before choosing a workflow.' : 'Discuss a small pilot, then verify access, safeguards and feasibility.'
  const questions = missing.length ? missing.map(item => item.question) : ['Who will review drafts, and what would a successful pilot look like?', 'Can we verify access to the proposed source tools?']
  const reply = `Hi,\n\nThanks for outlining the request${fields.business ? ` for ${fields.business}` : ''}. ${route.id === 'review' ? 'We would like to understand the task better before recommending a solution.' : `A possible starting point is ${/^[aeiou]/i.test(route.name) ? 'an' : 'a'} ${route.name.toLowerCase()}.`}\n\n${fields.request ? `You described this need: “${fields.request}”\n\n` : ''}Before we suggest a scope, could you help with the following?\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n${fields.timeline ? `We have noted your target timing: ${fields.timeline}. This is a requested target, not a delivery commitment.\n\n` : ''}We can discuss the fit on a free introductory call. Scope, pricing, integrations and delivery terms would be agreed before paid work.\n\nAtlasEye`
  return { fields, evidence, missing, warnings, route, recommended, questions, reply, status: 'Human review required', record: { business: fields.business || 'Not provided', workflow: route.name, source: 'Fictional demo inquiry', tools: fields.tools || 'Needs clarification', requested_timeline: fields.timeline || 'Needs clarification', customer_budget: fields.budget || 'Needs clarification', stage: 'Draft only — not saved', approval: 'Human review required' } }
}
