export function industrialBaseFixture(overrides = {}) {
  const payload = {
    workspace: 'INDUSTRIAL_BASE',
    schema_version: 'industrial-base-traceability.v1',
    tenant_id: 'TENANT-ATLAS-DEMO',
    project_id: 'PROJECT-ATLAS-ONE-OHIO',
    record_hash:
      '6a1de250e1f07d2ce12729c26051e27391254c3673a881b831a5c32b70a95eab',
    workflow: [
      'DEFINE',
      'QUALIFY',
      'PROCURE',
      'RECEIVE',
      'INSTALL',
      'INSPECT',
      'DEMONSTRATE',
    ],
    readiness: {
      status: 'BLOCKED',
      ready_for_human_acceptance: false,
      blockers: [
        'material report heat or lot number does not match the component identity',
        'final human review is absent',
      ],
    },
    registries: {
      workforce: [
        {
          worker_id: 'WKR-1044',
          identity: 'Qualified pipefitter WKR-1044',
          employer_organization_id: 'ORG-ATLAS-DEMO-INSTALLER',
          craft_or_trade: 'pipefitter',
          credential_ids: ['CRED-WKR-1044-IB041'],
        },
      ],
    },
    supplier_results: [
      {
        organization_id: 'ORG-LOKRING-MIDWEST',
        legal_entity_name: 'Lokring Midwest',
        roles: ['distributor'],
        status: scopedStatus({
          status: 'SUPPLIER_CLAIM_UNVERIFIED',
          determined_by: 'Atlas demo data steward',
          scope: 'Distributor identity only; not manufacturing qualification',
          evidence_ids: ['EV-PUBLIC-LOKRING-PRODUCT-SPEC'],
          conditions: [
            'Do not use distributor identity as manufacturer qualification.',
          ],
        }),
        facilities: [],
        qualification: null,
      },
      {
        organization_id: 'ORG-LOKRING-TECHNOLOGY-LLC',
        legal_entity_name: 'Lokring Technology LLC',
        roles: ['manufacturer'],
        status: scopedStatus({
          status: 'EVIDENCE_VERIFIED',
          determined_by: 'Customer supplier quality reviewer',
          scope: 'Manufacturer identity for bounded demonstration product family',
          evidence_ids: [
            'EV-PUBLIC-LOKRING-PRODUCT-SPEC',
            'EV-CONTROLLED-QA-BASIS-LOKRING-DEMO',
          ],
          conditions: [
            'Customer qualification controls required before procurement acceptance.',
          ],
        }),
        facilities: [
          {
            facility_id: 'FAC-LOKRING-WILLOUGHBY-OH',
            physical_location:
              'Willoughby, Ohio manufacturing/service location metadata',
          },
        ],
        qualification: {
          qualification_id:
            'QUAL-LOKRING-TECH-FAC-WILLOUGHBY-2026',
          authorized_scope: {
            summary:
              'NPS 2 or smaller carbon-steel Lokring mechanical fittings for Class 2/3 non-boric-acid demonstration service at the named customer project.',
          },
          qualification_basis:
            'Customer supplier qualification file plus public Code Case N-879 and NRC alternative metadata',
          limitations: [
            'No Class 1 use.',
            'No boric-acid service.',
            'Human acceptance required.',
          ],
          evidence_ids: [
            'EV-CONTROLLED-QA-BASIS-LOKRING-DEMO',
            'EV-PUBLIC-NRC-EXELON-N879-SE',
          ],
          effective_date: '2026-07-01',
          expiration_date: '2027-07-01',
          human_reviewer: 'QA-REVIEWER-17',
          decision_record_id: 'DEC-QUAL-LOKRING-2026-001',
        },
      },
    ],
    component_inventory: [
      {
        component_id: 'IB-CMP-LOK-0001',
        part_number: 'LKR-CS-100-DEMO',
        lot_number: 'L-8821',
        heat_number: 'H-15V24-042',
        purchase_order: 'PO-90017',
        line_item: '03',
        lifecycle_status: 'BLOCKED',
        installed_location:
          'ATLAS-ONE-OHIO / CCW / Train A / sample rack CCW-1A-SAMPLE-RACK',
      },
    ],
    conflict_queue: [
      {
        finding_id: 'FINDING-LOKRING-HEAT-MISMATCH',
        severity: 'BLOCKING',
        issue:
          'IB-CMP-LOK-0001 declares lot L-8821 and heat H-15V24-042, but EV-CONTROLLED-MTR-15V24-043 does not match both identifiers.',
        affected_component_ids: ['IB-CMP-LOK-0001'],
        affected_installation_ids: ['INST-LOK-0001'],
        preserved_evidence_ids: ['EV-CONTROLLED-MTR-15V24-043'],
        resolution_task: 'TASK-LOKRING-MTR-HEAT-RESOLUTION',
        requires_human_review: true,
      },
    ],
    trace: {
      component_id: 'IB-CMP-LOK-0001',
      answers: [
        {
          question: 'Who manufactured it?',
          answer: 'Lokring Technology LLC',
          evidence_ids: ['EV-PUBLIC-LOKRING-PRODUCT-SPEC'],
        },
        {
          question: 'Who installed it?',
          answer: 'Qualified pipefitter WKR-1044',
          evidence_ids: ['CRED-WKR-1044-IB041'],
        },
        {
          question: 'Where is it installed?',
          answer:
            'ATLAS-ONE-OHIO / CCW / Train A / sample rack CCW-1A-SAMPLE-RACK',
          evidence_ids: ['EV-CONTROLLED-ASBUILT-AB-5501'],
        },
        {
          question: 'Are there unresolved deviations or NCRs?',
          answer:
            'NCR-LOKRING-MTR-MISMATCH is open until controlled disposition.',
          evidence_ids: ['EV-CONTROLLED-MTR-15V24-043'],
        },
      ],
    },
    demo_transition: {
      states: [
        {
          status: 'BLOCKED',
          summary:
            'Initial material evidence heat number conflicts with component identity.',
        },
        {
          status: 'RESOLUTION_EVIDENCE_SUBMITTED',
          summary:
            'Controlled replacement evidence added; original MTR and finding remain preserved.',
        },
        {
          status: 'READY_FOR_HUMAN_REVIEW',
          summary:
            'NCR is dispositioned through an authorized role; qualified-human decision still required.',
        },
        {
          status: 'HUMAN_ACCEPTED_FOR_DEFINED_SCOPE',
          summary:
            'IB-CMP-LOK-0001 accepted by INDEPENDENT-REVIEWER-04 for the exact component and application only.',
          evidence_set_hash:
            'c1a64d91116cf0924f5f1d70a6f4f681fdda009e1ae0b9d303c27d3e47490722',
          reviewer: 'INDEPENDENT-REVIEWER-04',
          role_authority: 'independent_reviewer',
        },
      ],
      final_as_built_evidence_chain: [
        'EV-CONTROLLED-MTR-15V24-043',
        'EV-CONTROLLED-ASBUILT-AB-5501',
        'EV-CONTROLLED-MTR-15V24-042-REV2',
        'EV-CONTROLLED-HUMAN-DECISION-LOK-0001',
      ],
    },
  }

  return deepMerge(payload, overrides)
}

function scopedStatus(overrides = {}) {
  return {
    status: 'EVIDENCE_VERIFIED',
    determined_by: 'Customer supplier quality reviewer',
    scope: 'Defined scope only',
    evidence_ids: ['EV-CONTROLLED-QA-BASIS-LOKRING-DEMO'],
    conditions: [],
    effective_date: '2026-07-01',
    expiration_date: '2027-07-01',
    current_validity: true,
    ...overrides,
  }
}

function deepMerge(base, overrides) {
  if (Array.isArray(base) || Array.isArray(overrides)) {
    return overrides === undefined ? base : overrides
  }

  if (
    base &&
    overrides &&
    typeof base === 'object' &&
    typeof overrides === 'object'
  ) {
    return Object.fromEntries(
      [...new Set([...Object.keys(base), ...Object.keys(overrides)])]
        .map((key) => [key, deepMerge(base[key], overrides[key])]),
    )
  }

  return overrides === undefined ? base : overrides
}
