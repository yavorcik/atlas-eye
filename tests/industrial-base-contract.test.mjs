import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fetchIndustrialBaseContract,
  validateIndustrialBaseContract,
} from '../src/services/industrialBaseApi.js'
import { handler } from '../netlify/functions/industrial-base-contract.js'
import { industrialBaseFixture } from './industrialBaseFixture.mjs'

test('industrial base contract accepts only governed Atlas Nuclear schema', () => {
  const payload = industrialBaseFixture()
  assert.equal(
    validateIndustrialBaseContract(payload).readiness.status,
    'BLOCKED',
  )
  assert.equal(
    validateIndustrialBaseContract(industrialBaseFixture({
      demo_transition: {
        states: [
          {
            status: 'HUMAN_ACCEPTED_FOR_DEFINED_SCOPE',
            decision_basis:
              'Scoped human decision basis from Atlas Nuclear.',
          },
        ],
        final_as_built_evidence_chain: [
          'EV-CONTROLLED-HUMAN-DECISION-LOK-0001',
        ],
      },
    })).demo_transition.states[0].status,
    'HUMAN_ACCEPTED_FOR_DEFINED_SCOPE',
  )

  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      schema_version: 'industrial-base-traceability.v0',
    })),
    /incompatible/,
  )

  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      workflow: ['DEFINE', 'DEMONSTRATE'],
    })),
    /workflow/,
  )
})

test('industrial base contract requires current timestamps', () => {
  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      generated_at: null,
      contract_generated_at: null,
    })),
    /timestamp is missing/,
  )

  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      generated_at: 'not-a-date',
    })),
    /invalid timestamp/,
  )

  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      generated_at: '2026-09-03T12:00:00.000Z',
    }), { now: Date.parse('2026-09-03T12:06:00.000Z') }),
    /stale/,
  )

  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      generated_at: '2026-09-03T12:01:00.000Z',
    }), { now: Date.parse('2026-09-03T12:00:00.000Z') }),
    /future/,
  )
})

test('industrial base contract fails closed on contradictory or unknown readiness', () => {
  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      readiness: {
        status: 'BLOCKED',
        ready_for_human_acceptance: true,
        blockers: ['open NCR remains'],
      },
    })),
    /disagree/,
  )

  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      readiness: {
        status: 'APPROVED',
        ready_for_human_acceptance: false,
        blockers: [],
      },
    })),
    /unknown status/,
  )
})

test('industrial base contract validates every rendered nested collection', () => {
  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      registries: { workforce: null },
    })),
    /registries.workforce/,
  )

  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      supplier_results: [
        {
          organization_id: 'ORG-X',
          legal_entity_name: 'Supplier X',
          roles: ['manufacturer'],
          facilities: [],
          qualification: null,
          status: {
            status: 'APPROVED_SUPPLIER',
            determined_by: 'caller',
            scope: 'all',
            evidence_ids: ['EV-X'],
            conditions: [],
            effective_date: '2026-01-01',
            expiration_date: '2027-01-01',
            current_validity: true,
          },
        },
      ],
    })),
    /unknown status/,
  )

  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      component_inventory: [
        {
          component_id: 'IB-CMP-X',
          part_number: 'X',
          lot_number: 'L',
          heat_number: 'H',
          purchase_order: 'PO',
          line_item: '1',
          lifecycle_status: 'READY',
          installed_location: 'plant',
        },
      ],
    })),
    /unknown status/,
  )

  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      conflict_queue: [{ finding_id: 'FINDING-X' }],
    })),
    /conflict.severity/,
  )

  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      trace: { answers: [{ question: 'Who?', answer: 'Unknown' }] },
    })),
    /trace.answers.evidence_ids/,
  )

  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      demo_transition: {
        states: [{ status: 'ACCEPTED', summary: 'bad' }],
        final_as_built_evidence_chain: ['EV-X'],
      },
    })),
    /unknown status/,
  )
})

test('fetchIndustrialBaseContract rejects unavailable, malformed, and oversized responses', async () => {
  await assert.rejects(
    fetchIndustrialBaseContract({
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => '{}',
      }),
    }),
    /unavailable/,
  )

  await assert.rejects(
    fetchIndustrialBaseContract({
      fetchImpl: async () => ({
        ok: true,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'not json',
      }),
    }),
    /non-JSON/,
  )
})

test('industrial base proxy fails closed without configured upstream', async () => {
  const previous = snapshotEnv()
  delete process.env.ATLAS_INDUSTRIAL_BASE_URL
  delete process.env.ATLAS_INDUSTRIAL_BASE_TENANT_ID
  delete process.env.ATLAS_INDUSTRIAL_BASE_PROJECT_ID
  const response = await handler({ httpMethod: 'GET' })
  restoreEnv(previous)
  assert.equal(response.statusCode, 503)
  assert.match(response.body, /SERVICE_UNAVAILABLE/)
  assert.equal(
    response.headers['Access-Control-Allow-Methods'],
    'GET, OPTIONS',
  )
})

test('industrial base proxy rejects unauthorized mutation methods', async () => {
  const response = await handler({ httpMethod: 'POST' })
  assert.equal(response.statusCode, 405)
  assert.match(response.body, /Method not allowed/)
})

test('industrial base proxy rejects hostile origin and plain HTTP upstream', async () => {
  const previous = snapshotEnv()
  process.env.ATLAS_INDUSTRIAL_BASE_URL =
    'https://atlas-nuclear.example.test/api/industrial-base-traceability'
  process.env.ATLAS_INDUSTRIAL_BASE_TENANT_ID = 'TENANT-ATLAS-DEMO'
  process.env.ATLAS_INDUSTRIAL_BASE_PROJECT_ID = 'PROJECT-ATLAS-ONE-OHIO'
  process.env.ATLAS_EYE_ALLOWED_ORIGINS = 'https://atlaseye.ai'
  let response = await handler({
    httpMethod: 'GET',
    headers: { origin: 'https://hostile.example' },
  })
  assert.equal(response.statusCode, 403)
  assert.equal(response.headers['Access-Control-Allow-Origin'], undefined)

  process.env.ATLAS_INDUSTRIAL_BASE_URL =
    'http://atlas-nuclear.example.test/api/industrial-base-traceability'
  response = await handler({ httpMethod: 'GET', headers: {} })
  restoreEnv(previous)
  assert.equal(response.statusCode, 503)
  assert.match(response.body, /SERVICE_UNAVAILABLE/)
})

test('industrial base proxy preserves governed contract and rejects incompatible upstream', async () => {
  const previous = snapshotEnv()
  process.env.ATLAS_INDUSTRIAL_BASE_URL =
    'https://atlas-nuclear.example.test/api/industrial-base-traceability'
  process.env.ATLAS_INDUSTRIAL_BASE_TENANT_ID = 'TENANT-ATLAS-DEMO'
  process.env.ATLAS_INDUSTRIAL_BASE_PROJECT_ID = 'PROJECT-ATLAS-ONE-OHIO'
  process.env.ATLAS_EYE_ALLOWED_ORIGINS = 'https://atlaseye.ai'
  const previousFetch = globalThis.fetch

  try {
    globalThis.fetch = async () => new Response(
      JSON.stringify(industrialBaseFixture()),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
    const ok = await handler({
      httpMethod: 'GET',
      headers: { origin: 'https://atlaseye.ai' },
    })
    assert.equal(ok.statusCode, 200)
    assert.equal(
      ok.headers['Access-Control-Allow-Origin'],
      'https://atlaseye.ai',
    )
    assert.match(ok.body, /IB-CMP-LOK-0001/)

    globalThis.fetch = async () => new Response(
      JSON.stringify(industrialBaseFixture({ schema_version: 'wrong' })),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
    const bad = await handler({ httpMethod: 'GET' })
    assert.equal(bad.statusCode, 502)
    assert.match(bad.body, /EVIDENCE_NOT_EVALUATED/)
  } finally {
    globalThis.fetch = previousFetch
    restoreEnv(previous)
  }
})

test('industrial base proxy rejects tenant, project, stale, and oversized substitutions', async () => {
  const previous = snapshotEnv()
  const previousFetch = globalThis.fetch
  process.env.ATLAS_INDUSTRIAL_BASE_URL =
    'https://atlas-nuclear.example.test/api/industrial-base-traceability'
  process.env.ATLAS_INDUSTRIAL_BASE_TENANT_ID = 'TENANT-ATLAS-DEMO'
  process.env.ATLAS_INDUSTRIAL_BASE_PROJECT_ID = 'PROJECT-ATLAS-ONE-OHIO'

  try {
    for (const overrides of [
      { tenant_id: 'TENANT-OTHER' },
      { project_id: 'PROJECT-OTHER' },
      { generated_at: '2026-09-03T12:00:00.000Z' },
    ]) {
      globalThis.fetch = async () => new Response(
        JSON.stringify(industrialBaseFixture(overrides)),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
      const response = await handler({ httpMethod: 'GET', headers: {} })
      assert.equal(response.statusCode, 502)
      assert.match(response.body, /EVIDENCE_NOT_EVALUATED/)
    }

    globalThis.fetch = async () => new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(700000))
          controller.close()
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
    const oversized = await handler({ httpMethod: 'GET', headers: {} })
    assert.equal(oversized.statusCode, 502)
    assert.doesNotMatch(oversized.body, /700000|Contract too large/)
  } finally {
    globalThis.fetch = previousFetch
    restoreEnv(previous)
  }
})

function snapshotEnv() {
  return {
    url: process.env.ATLAS_INDUSTRIAL_BASE_URL,
    tenant: process.env.ATLAS_INDUSTRIAL_BASE_TENANT_ID,
    project: process.env.ATLAS_INDUSTRIAL_BASE_PROJECT_ID,
    origins: process.env.ATLAS_EYE_ALLOWED_ORIGINS,
  }
}

function restoreEnv(previous) {
  setEnv('ATLAS_INDUSTRIAL_BASE_URL', previous.url)
  setEnv('ATLAS_INDUSTRIAL_BASE_TENANT_ID', previous.tenant)
  setEnv('ATLAS_INDUSTRIAL_BASE_PROJECT_ID', previous.project)
  setEnv('ATLAS_EYE_ALLOWED_ORIGINS', previous.origins)
}

function setEnv(key, value) {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}
