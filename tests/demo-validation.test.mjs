import test from 'node:test'
import assert from 'node:assert/strict'
import { validateShipment, evidenceApplicability } from '../src/demoValidation.js'
import { mergeProject, migrateWorkspace } from '../src/workspacePersistence.js'
const inputs = { material: 'HALEU', form: 'UF6', enrichment: '19.75', quantityValue: '12', quantityUnit: 'kgU', origin: 'Ohio', destination: 'Pennsylvania', routeProfile: 'truck_only' }
for (const [key, values] of Object.entries({ enrichment: ['banana', '', '101', '101%', 'Infinity', 'NaN', '19.50', '1e2', '19.75junk'], quantityValue: ['-5', '0', '', 'Infinity', '12 kgU'], quantityUnit: ['', 'kg', 'pounds'], origin: [''], destination: [''], material: ['LEU'], form: ['metal'], routeProfile: ['unknown'] })) {
  test(`shipment rejects invalid ${key}`, () => { for (const value of values) assert.equal(validateShipment({ ...inputs, [key]: value }).valid, false, value) })
}
test('valid shipment recovers', () => assert.equal(validateShipment(inputs).valid, true))
test('processing does not establish applicability; structured mismatch is explicit', () => {
  const project = { inputs }
  assert.equal(evidenceApplicability(project, 'trn-package', { status: 'processed', fullText: 'apples, coffee, bread' }, {}).status, 'unknown')
  assert.equal(evidenceApplicability(project, 'trn-package', { status: 'processed', fullText: JSON.stringify({ shopping: ['apples', 'coffee', 'bread'] }) }, {}).status, 'unknown')
  const record = { documentType: 'atlas-demo-package-compatibility', documentIdentity: 'ATLAS-SAMPLE-PACKAGE-001', scope: 'Fuel transportation', material: 'HALEU UF6', form: 'UF6', enrichmentWtPercent: 19.75, quantity: '12 kgU' }
  const item = body => ({ status: 'processed', fullText: JSON.stringify(body) })
  assert.equal(evidenceApplicability(project, 'trn-package', item(record), {}).status, 'established')
  for (const field of ['documentIdentity', 'scope', 'material', 'form', 'enrichmentWtPercent', 'quantity']) assert.equal(evidenceApplicability(project, 'trn-package', item({ ...record, [field]: 'wrong' }), {}).status, 'mismatched', field)
})
test('three-way merge preserves independent fields and refuses conflicting edits', () => {
  const base = { inputs: { name: 'old', address: 'old' }, revision: 1 }
  assert.deepEqual(mergeProject(base, { ...base, inputs: { name: 'new', address: 'old' } }, { inputs: { name: 'old', address: 'remote' }, revision: 2 }).inputs, { name: 'new', address: 'remote' })
  assert.throws(() => mergeProject(base, { ...base, inputs: { name: 'mine', address: 'old' } }, { ...base, inputs: { name: 'theirs', address: 'old' } }), /Conflicting edits to inputs.name/)
})
test('v2 migration preserves answers, evidence, history and malformed legacy quantity', () => {
  for (const quantity of ['12 kgU', '-5 kgU', 'banana', '']) {
    const original = { schemaVersion: 2, projects: { 'fuel-transport': { id: 'fuel-transport', inputs: { quantity }, evidence: { retained: { fullText: 'original' } }, history: [{ id: 'original' }] }, application: { inputs: { answer: 'preserved' } } } }
    const migrated = migrateWorkspace(structuredClone(original), {})
    assert.equal(migrated.schemaVersion, 3)
    assert.deepEqual(migrated.projects.application.inputs, original.projects.application.inputs)
    assert.deepEqual(migrated.projects['fuel-transport'].history, original.projects['fuel-transport'].history)
    assert.deepEqual(migrated.projects['fuel-transport'].evidence, original.projects['fuel-transport'].evidence)
    assert.equal(migrated.projects['fuel-transport'].inputs.quantity, quantity)
  }
})
