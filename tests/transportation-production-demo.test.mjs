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

test('Transportation guided demo reaches a downloadable package and invalidates stale review', async () => {
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  const page = await context.newPage()
  try {
    await page.goto('http://127.0.0.1:4173/transportation/', { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'networkidle' })
    await expectText(page, '#transport-step-title', 'START THE GUIDED DEMO')
    assert.equal(await page.locator('#transport-blocker-panel').isHidden(), true)

    await page.click('#transport-start-guided')
    await expectText(page, '#transport-step-title', 'CONFIRM MATERIAL FACTS')
    await assertContains(page, '#transport-blocker-panel', 'HRCQ determination unresolved')
    await page.selectOption('[data-bind="transport-hrcq-status"]', 'HRCQ')
    await page.click('#transport-next')

    await page.click('[data-add-sample="package"]')
    await assertContains(page, '#transport-sample-log', 'PKG-UF6-COC-7712')
    await page.click('#transport-next')
    await page.click('[data-add-sample="carrier"]')
    await page.click('#transport-next')
    await page.click('[data-add-sample="route"]')
    await expectText(page, '#transport-result-status', 'INCOMPLETE')
    await page.click('#transport-back')
    await expectInput(page, '#transport-carrier-evidence', 'truck_supported')
    await page.click('#transport-next')
    await page.click('#transport-next')
    await page.click('[data-add-sample="protection"]')
    await page.click('#transport-next')
    await page.click('[data-add-sample="execution"]')
    await page.click('#transport-next')
    await page.click('[data-add-sample="response"]')
    await page.click('#transport-next')
    await expectText(page, '#transport-result-status', 'READY_FOR_GOVERNED_REVIEW')
    await assertContains(page, '#transport-blocker-panel', 'reviewer not assigned')

    await page.click('[data-review="approve"]')
    await expectText(page, '#transport-final-decision', 'APPROVED_FOR_RELEASE_BY_AUTHORITY')
    await assertContains(page, '#transport-status-message', 'No active hold')
    await page.click('#transport-next')
    await expectText(page, '#transport-step-title', 'YOUR TRANSPORTATION READINESS PACKAGE')
    await assertContains(page, '#transport-package-report', 'DEMO ONLY - NOT SHIPMENT AUTHORIZATION')
    const screenReport = await page.locator('#transport-package-report').innerText()
    assert.match(screenReport, /Quantity\s+12\.0 kgU/)

    const download = await Promise.all([
      page.waitForEvent('download'),
      page.click('#transport-download-report')
    ]).then(([d]) => d)
    const stream = await download.createReadStream()
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const downloaded = Buffer.concat(chunks).toString('utf8')
    assert.match(downloaded, /Quantity:\s+12\.0 kgU/)
    assert.match(downloaded, /APPROVED_FOR_RELEASE_BY_AUTHORITY/)

    await page.locator('details summary').click()
    await page.fill('#transport-quantity', '13.0')
    await page.dispatchEvent('#transport-quantity', 'input')
    await expectText(page, '#transport-final-decision', 'PENDING')
    await assertContains(page, '#transport-package-report', 'Quantity\n13.0 kgU')
    await page.click('#transport-start')
    await expectText(page, '#transport-final-decision', 'PENDING')

    await page.reload({ waitUntil: 'networkidle' })
    await expectText(page, '#transport-step-title', 'YOUR TRANSPORTATION READINESS PACKAGE')
    await assertContains(page, '#transport-package-report', 'Quantity\n13.0 kgU')

    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    const mobile = await context.newPage()
    await mobile.setViewportSize({ width: 390, height: 844 })
    await mobile.goto('http://127.0.0.1:4173/transportation/', { waitUntil: 'networkidle' })
    assert.ok(await mobile.locator('#transport-step-title').isVisible())
    assert.ok(await mobile.locator('#transport-readiness-items').isVisible())
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

async function expectInput(page, selector, text) {
  for (let i = 0; i < 30; i += 1) {
    if ((await page.locator(selector).inputValue()).trim() === text) return
    await page.waitForTimeout(100)
  }
  assert.equal((await page.locator(selector).inputValue()).trim(), text)
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
