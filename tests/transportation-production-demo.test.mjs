import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { chromium } from 'playwright'

async function server() {
  const child = spawn('./node_modules/.bin/vite', ['preview', '--host', '127.0.0.1', '--port', '4173'], { detached: true, stdio: 'ignore' })
  child.unref()
  for (let i = 0; i < 50; i += 1) {
    try { const r = await fetch('http://127.0.0.1:4173/'); if (r.ok) return child } catch {}
    await new Promise(r => setTimeout(r, 100))
  }
  try { process.kill(-child.pid, 'SIGTERM') } catch {}
  throw new Error('preview did not start')
}

test('Transportation governed demo runs through approval and supersession', async () => {
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  try {
    await page.goto('http://127.0.0.1:4173/transportation/', { waitUntil: 'networkidle' })
    await page.click('#transport-new-mission')
    await expectText(page, '#transport-result-status', 'INCOMPLETE')
    await page.click('[data-rehearsal-action="material"]')
    await expectText(page, '#transport-package-status', 'BLOCKED')
    await page.click('[data-rehearsal-action="package_claimed"]')
    await expectText(page, '#transport-package-status', 'BLOCKED')
    await page.click('[data-rehearsal-action="package_supported"]')
    await expectText(page, '#transport-package-status', 'SUPPORTED')
    for (const action of ['carrier_claimed','carrier_supported','route_claimed','route_supported','security_plan','security_supported','execution_bad_measurement','execution_supported','emergency_blocker','emergency_supported']) await page.click(`[data-rehearsal-action="${action}"]`)
    await expectText(page, '#transport-result-status', 'READY_FOR_GOVERNED_REVIEW')
    await expectText(page, '#transport-final-decision', 'PENDING')
    await page.click('[data-rehearsal-action="reviewer_blocked"]')
    assert.equal(await page.locator('#transport-demo-approve').isDisabled(), true)
    await assertContains(page, '#transport-final-blockers', 'reviewer authority basis missing')
    await page.click('[data-rehearsal-action="review_started"]')
    await expectText(page, '#transport-final-decision', 'REVIEW_IN_PROGRESS')
    await page.click('[data-rehearsal-action="approved"]')
    await expectText(page, '#transport-final-decision', 'APPROVED_FOR_RELEASE_BY_AUTHORITY')
    await assertContains(page, '#transport-governed-summary', 'DEMO ONLY')
    await assertContains(page, '#transport-final-manifest', 'comprehensive coverage claim permitted: false')
    const oldFp = await page.locator('#transport-governed-summary').innerText()
    await page.click('#transport-capture-prior-approval')
    await page.fill('#transport-enrichment', '19.50')
    await page.dispatchEvent('#transport-enrichment', 'input')
    await page.waitForTimeout(250)
    await assertContains(page, '#transport-governed-summary', 'MANIFEST CHANGED')
    await assertContains(page, '#transport-governed-summary', 'PRIOR GOVERNED DECISION: SUPERSEDED')
    await expectText(page, '#transport-final-decision', 'PENDING')
    assert.notEqual(oldFp, await page.locator('#transport-governed-summary').innerText())
    await page.click('[data-rehearsal-action="multimodal"]')
    await expectText(page, '#transport-carrier-status', 'BLOCKED')
    await assertContains(page, '#transport-route-visual', 'VESSEL')
    await page.click('[data-rehearsal-action="multimodal_supported"]')
    await expectText(page, '#transport-emergency-status', 'SUPPORTED')
    await expectText(page, '#transport-final-decision', 'PENDING')
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})
async function expectText(page, selector, text) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'visible', timeout: 5000 })
  for (let i = 0; i < 30; i += 1) {
    if ((await locator.innerText()).trim() === text) return
    await page.waitForTimeout(100)
  }
  assert.equal((await locator.innerText()).trim(), text)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&')
}

async function assertContains(page, selector, text) {
  const pattern = new RegExp(escapeRegExp(text))
  const locator = page.locator(selector)
  for (let i = 0; i < 30; i += 1) {
    const value = await locator.innerText()
    if (pattern.test(value)) return
    await page.waitForTimeout(100)
  }
  assert.match(await locator.innerText(), pattern)
}
