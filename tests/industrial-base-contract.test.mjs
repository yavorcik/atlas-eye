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

test('industrial base contract fails closed on stale or contradictory readiness', () => {
  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      generated_at: '2026-09-03T12:00:00.000Z',
    }), { now: Date.parse('2026-09-03T12:06:00.000Z') }),
    /stale/,
  )

  assert.throws(
    () => validateIndustrialBaseContract(industrialBaseFixture({
      readiness: {
        status: 'READY_FOR_HUMAN_ACCEPTANCE',
        ready_for_human_acceptance: true,
        blockers: ['open NCR remains'],
      },
    })),
    /disagree/,
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
  const previous = process.env.ATLAS_INDUSTRIAL_BASE_URL
  delete process.env.ATLAS_INDUSTRIAL_BASE_URL
  const response = await handler({ httpMethod: 'GET' })
  process.env.ATLAS_INDUSTRIAL_BASE_URL = previous
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

test('industrial base proxy preserves governed contract and rejects incompatible upstream', async () => {
  const previousUrl = process.env.ATLAS_INDUSTRIAL_BASE_URL
  process.env.ATLAS_INDUSTRIAL_BASE_URL =
    'https://atlas-nuclear.example.test/api/industrial-base-traceability'
  const previousFetch = globalThis.fetch

  try {
    globalThis.fetch = async () => new Response(
      JSON.stringify(industrialBaseFixture()),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
    const ok = await handler({ httpMethod: 'GET' })
    assert.equal(ok.statusCode, 200)
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
    process.env.ATLAS_INDUSTRIAL_BASE_URL = previousUrl
  }
})
