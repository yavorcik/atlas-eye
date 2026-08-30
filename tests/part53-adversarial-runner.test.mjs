import assert from 'node:assert/strict'
import test from 'node:test'
import { SOURCE_COMMIT, configFrom, invariantFailures, observableChange, rng } from './part53-adversarial-runner.mjs'

test('configuration is bounded and deterministic', () => {
  const config = configFrom(['--profile', 'soak', '--runs', '99999', '--seed', '7'], {})
  assert.equal(config.runs, 5000)
  assert.equal(config.seed, 7)
  const a = rng(7); const b = rng(7)
  assert.deepEqual([a(), a(), a()], [b(), b(), b()])
})

test('dead-control oracle distinguishes unchanged and changed observations', () => {
  const before = { url: '/', text: 'same', focus: 'x', controls: 1, state: 'AVAILABLE' }
  assert.equal(observableChange(before, before), false)
  assert.equal(observableChange(before, { ...before, state: 'GUIDANCE_ACTIVE' }), true)
})

test('boundary oracle requires provenance and NONE authority effect', () => {
  assert.deepEqual(invariantFailures({ overflow: 0, duplicateIds: [], unnamedControls: [], badAria: [], marker: SOURCE_COMMIT, authorityEffect: 'NONE', consoleErrors: [], failedRequests: [] }), [])
  assert.ok(invariantFailures({ overflow: 1, duplicateIds: [], unnamedControls: [], badAria: [], marker: 'wrong', authorityEffect: 'APPROVE', consoleErrors: [], failedRequests: [] }).length >= 3)
})
