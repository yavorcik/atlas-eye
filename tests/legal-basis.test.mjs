import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { authorities, requirements, questionParents, sourceSupport, basisFor, snapshotBasis } from '../src/legalBasis.js'
import { basisHtml, traceabilityHtml, traceabilityRows } from '../src/basisReport.js'
import { evidenceApplicability } from '../src/demoValidation.js'
const app = readFileSync('src/App.jsx', 'utf8')
const project = { id: 'fuel-transport', revision: 7, inputs: { material: 'HALEU', form: 'UF6', enrichment: '19.75', quantityValue: '12', quantityUnit: 'kgU', routeProfile: 'truck_only' }, requirements: [{ id: 'trn-package' }, { id: 'trn-material' }], evidence: {} }
test('all represented requirements, fourteen questions and decisions have explicit basis records', () => {
  const ids = [...app.matchAll(/\{ id: '((?:p53|trn|sup)-[^']+)', title:/g)].map(m => m[1])
  assert.equal(ids.length, 18)
  assert.equal(Object.keys(questionParents).length, 14)
  for (const id of [...ids, ...Object.keys(questionParents).map(id => `q-${id}`), 'supplier-decision', 'trn-governed-review', 'trn-maritime']) {
    assert.ok(requirements[id], id)
    assert.ok(requirements[id].authorityIds.length, id)
    for (const authority of requirements[id].authorityIds) assert.ok(authorities[authority], `${id}: ${authority}`)
  }
})
test('missing and broken references cannot become supported legal conclusions', () => {
  assert.match(sourceSupport(['absent']), /verification pending/)
  assert.match(sourceSupport([]), /verification pending/)
  assert.match(basisFor('absent', project).authorityStatus, /verification pending/)
  assert.match(basisFor('trn-material', project, {}).authorityStatus, /verification pending/)
})
test('controls, guidance, standards, proposals and future rules retain actual status', () => {
  assert.match(basisHtml(basisFor('sup-qap-current', project)), /Atlas workflow control/)
  for (const category of ['C', 'D']) {
    const record = { ...authorities['dot-hrcq'], category, legalStatus: 'nonbinding' }
    assert.equal(sourceSupport(['fixture'], { fixture: record }), 'nonstatutory basis')
  }
  for (const extra of [{ legalStatus: 'proposed' }, { effectiveDate: '2027-01-01' }, { legalStatus: 'superseded' }]) assert.match(sourceSupport(['fixture'], { fixture: { ...authorities['dot-hrcq'], ...extra } }), /not effective binding law/)
  assert.match(sourceSupport(['fixture'], { fixture: { ...authorities['dot-hrcq'], sourceStatus: 'pending' } }), /verification pending/)
})
test('missing facts and sample HRCQ buttons do not establish legal applicability', () => {
  assert.equal(basisFor('trn-package', { ...project, inputs: {} }).applicability.state, 'Applicability unresolved')
  assert.equal(basisFor('trn-material', { ...project, inputs: { ...project.inputs, hrcqStatus: 'resolved_sample_basis', hrcqBasis: 'citation' } }).applicability.state, 'Applicability unresolved')
  assert.equal(basisFor('trn-maritime', project).applicability.state, 'Not applicable')
  assert.match(basisFor('trn-maritime', project).applicability.reason, /highway only/)
  assert.equal(basisFor('trn-package', { ...project, inputs: { ...project.inputs, quantityValue: '13' } }).applicability.state, 'Outside the implemented demo scope')
})
test('citations and unrelated evidence never satisfy a package evidence gate', () => {
  for (const fullText of ['49 CFR 173.403', 'shopping list', JSON.stringify({ url: authorities['dot-hrcq'].url })]) assert.notEqual(evidenceApplicability(project, 'trn-package', { fullText, status: 'processed' }, {}).status, 'established')
})
test('snapshot is independent of subsequent authority, fact and decision changes; exports share it', () => {
  const snapshot = snapshotBasis(project)
  const html = traceabilityHtml(snapshot)
  const rows = traceabilityRows(snapshot)
  for (const basis of snapshot.requirements) {
    assert.ok(html.includes(basis.id)); assert.ok(html.includes(basis.applicability.state))
    assert.ok(rows.some(row => row[0] === basis.id && row.includes(basis.applicability.state)))
  }
  const old = authorities['dot-hrcq'].version
  try { authorities['dot-hrcq'].version = 'future revision'; assert.equal(traceabilityHtml(snapshot), html) } finally { authorities['dot-hrcq'].version = old }
  assert.equal(snapshot.projectRevision, 7)
  assert.match(traceabilityHtml(), /legacy decision did not capture/)
})
test('untrusted facts are escaped in rendered basis and links stay official', () => {
  const html = basisHtml(basisFor('trn-material', { ...project, inputs: { ...project.inputs, material: '<script>bad</script>' } }))
  assert.ok(!html.includes('<script>'))
  for (const a of Object.values(authorities)) if (a.url) assert.equal(new URL(a.url).hostname, 'www.ecfr.gov')
})
