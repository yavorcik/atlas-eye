export const ROLES = ['Manufacturer / OEM', 'Fabricator', 'System integrator', 'Distributor', 'EPC / constructor', 'Service provider']
export const BLOCKS = ['01 Foundation', '02 Shielding & pool', '03 Reactor module', '04 Turbine & generator', '05 Condenser & feedwater', '06 Heat rejection', '07 Connections & auxiliaries', '08 Controls & electrical', '09 Fuel handling & waste']
const FIELDS = ['request_id', 'kind', 'existing_part_id', 'company', 'email', 'website', 'role', 'product', 'block', 'facility', 'country', 'description', 'document_url', 'certificate', 'consent', 'fax']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function text(value, min, max) {
  if (typeof value !== 'string') throw Error('invalid')
  const clean = value.normalize('NFC').trim()
  if (clean.length < min || clean.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(clean)) throw Error('invalid')
  return clean
}
function publicUrl(value) {
  const clean = text(value, 8, 1000)
  let url
  try { url = new URL(clean) } catch { throw Error('invalid') }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.') || url.hostname === '127.0.0.1') throw Error('invalid')
  return url.href
}
export function validateSubmission(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== FIELDS.length || Object.keys(value).some(key => !FIELDS.includes(key))) throw Error('invalid')
  if (!UUID.test(value.request_id) || value.consent !== true || value.fax !== '' || !ROLES.includes(value.role) || !BLOCKS.includes(value.block) || !['new', 'update'].includes(value.kind)) throw Error('invalid')
  const existing = text(value.existing_part_id, 0, 4)
  if (value.kind === 'update' ? !/^P0(?:[0-6][0-9]|70)$/.test(existing) || existing === 'P000' : existing !== '') throw Error('invalid')
  const email = text(value.email, 5, 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('invalid')
  return {
    request_id: value.request_id, kind: value.kind, existing_part_id: existing,
    company: text(value.company, 2, 160), email, website: publicUrl(value.website), role: value.role,
    product: text(value.product, 2, 180), block: value.block, facility: text(value.facility, 2, 180),
    country: text(value.country, 2, 100), description: text(value.description, 20, 2000),
    document_url: publicUrl(value.document_url), certificate: text(value.certificate, 0, 1000), consent: true,
  }
}
