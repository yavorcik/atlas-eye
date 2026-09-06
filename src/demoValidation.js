const numeric = value => typeof value !== 'boolean' && /^\d+(?:\.\d+)?$/.test(String(value ?? '').trim()) && Number.isFinite(Number(value))

export function validateShipment(inputs) {
  const errors = {}
  for (const key of ['material', 'form', 'enrichment', 'quantityValue', 'quantityUnit', 'origin', 'destination', 'routeProfile']) {
    if (!String(inputs[key] ?? '').trim()) errors[key] = 'Required. Enter this shipment fact before demo review.'
  }
  if (!numeric(inputs.enrichment) || Number(inputs.enrichment) <= 0 || Number(inputs.enrichment) > 100) errors.enrichment = 'Enter a finite enrichment greater than 0 and at most 100 wt%, using digits and a decimal point only.'
  else if (Number(inputs.enrichment) !== 19.75) errors.enrichment = 'This bounded HALEU sample represents exactly 19.75 wt%. Restore 19.75; a different enrichment needs evidence and assessment outside this demo.'
  if (!numeric(inputs.quantityValue) || Number(inputs.quantityValue) <= 0) errors.quantityValue = 'Enter a positive finite quantity using digits and a decimal point only.'
  if (inputs.quantityUnit !== 'kgU') errors.quantityUnit = 'Select kgU. Other units are outside the represented demo scope.'
  if (inputs.material !== 'HALEU') errors.material = 'Only the represented HALEU scenario is supported. Enter HALEU.'
  if (inputs.form !== 'UF6') errors.form = 'Only the represented UF6 form is supported. Enter UF6.'
  if (!['truck_only', 'truck_port_vessel'].includes(inputs.routeProfile)) errors.routeProfile = 'Choose the highway or optional maritime scenario.'
  return { valid: !Object.keys(errors).length, errors, quantity: numeric(inputs.quantityValue) ? Number(inputs.quantityValue) : null, unit: inputs.quantityUnit, enrichment: numeric(inputs.enrichment) ? Number(inputs.enrichment) : null }
}

const sampleRequirement = {
  formationRecord: 'p53-legal', safetySummary: 'p53-safety', financialPlan: 'p53-financial', environmentalReport: 'p53-environment',
  transportPackage: 'trn-package', carrier: 'trn-carrier', emergencyResponse: 'trn-response', routeRecord: 'trn-route', securityRecord: 'trn-security', executionRecord: 'trn-execution',
  supplierCurrent: 'sup-qap-current', supplierSuperseded: 'sup-qap-current', calibrationRecord: 'sup-calibration',
}
export function evidenceApplicability(project, requirementId, item, samples) {
  const unknown = reason => ({ status: 'unknown', reason })
  const mismatch = reason => ({ status: 'mismatched', reason })
  if (!item || !['processed', 'pending_review'].includes(item.status)) return unknown('No successfully processed record is linked. Attach a supported document.')
  const text = item.fullText || item.preview || ''
  const legacyPackage = JSON.stringify({ label: 'Sample transport package compatibility record', material: 'HALEU UF6', enrichmentWtPercent: 19.75, quantity: '12 kgU', packageEvidence: 'Demo package compatibility record loaded for public demonstration', reviewerStatus: 'Pending governed review' }, null, 2)
  const sampleKey = text === legacyPackage ? 'transportPackage' : Object.keys(samples).find(key => samples[key].text === text)
  let record
  try { record = JSON.parse(text) } catch { /* Arbitrary text remains inspectable. */ }
  if (record?.documentType || record?.documentIdentity === 'ATLAS-SAMPLE-PACKAGE-001' || sampleKey === 'transportPackage') {
    if (requirementId !== 'trn-package') return mismatch('Package compatibility evidence does not support this requirement.')
    const legacySample = sampleKey === 'transportPackage'
    if (!legacySample && (record.documentType !== 'atlas-demo-package-compatibility' || record.documentIdentity !== 'ATLAS-SAMPLE-PACKAGE-001' || record.scope !== 'Fuel transportation')) return mismatch('Declared package identity, document type, or scope does not match the bounded sample.')
    const facts = validateShipment(project.inputs)
    if (!facts.valid) return mismatch('Correct the shipment field errors before checking package applicability.')
    if (record.material !== 'HALEU UF6' || (!legacySample && record.form !== 'UF6') || Number(record.enrichmentWtPercent) !== facts.enrichment || record.quantity !== `${facts.quantity} ${facts.unit}`) return mismatch('Package record represents different material/form, enrichment, or quantity/unit. The supplied sample covers exactly 19.75 wt% and 12 kgU; no broader limits are declared.')
    return { status: 'established', reason: 'Declared sample package identity and exact shipment facts match for this bounded demo only. Authenticity, legal authorization, and broader limits are not established.' }
  }
  if (!sampleKey || !sampleRequirement[sampleKey]) return unknown('Automated applicability assessment is unsupported for this uploaded document. Processing, filenames, and keywords do not establish relevance. Use the bounded sample or obtain qualified assessment outside this demo.')
  if (sampleRequirement[sampleKey] !== requirementId) return mismatch('Document type and represented scope do not match this requirement. Link the appropriate supporting record.')
  if (sampleKey === 'routeRecord' && (project.inputs.origin !== 'Ohio enrichment facility' || project.inputs.destination !== 'Pennsylvania advanced-reactor project' || project.inputs.routeProfile !== 'truck_only')) return mismatch('The supplied route record covers only the stated Ohio-to-Pennsylvania highway route. Changed endpoints or maritime scope require different evidence.')
  if (sampleKey === 'supplierSuperseded') return mismatch('Quality program Revision B is superseded. Load Revision C and review it.')
  if (project.id === 'supplier-qualification' && (project.inputs.supplier !== 'ForgeWorks Demo Components' || (requirementId === 'sup-qap-current' && (item.metadata?.documentIdentity !== project.inputs.expectedQualityProgramIdentity || item.metadata?.documentVersion !== project.inputs.expectedQualityProgramVersion)))) return mismatch('Supplier identity or controlled document version differs from the represented sample.')
  if (project.id === 'reactor-app' && ['formationRecord', 'financialPlan'].includes(sampleKey) && project.inputs['legal-name'] !== 'Atlas Demo Energy LLC') return mismatch('The sample names Atlas Demo Energy LLC. Obtain evidence for the entered applicant identity.')
  if (project.id === 'fuel-transport' && !validateShipment(project.inputs).valid) return mismatch('Correct the shipment field errors before assessing this record.')
  return { status: 'established', reason: 'Exact supplied sample content matches this requirement within its declared scope. Qualified review remains separate; this is not real-world acceptance.' }
}
