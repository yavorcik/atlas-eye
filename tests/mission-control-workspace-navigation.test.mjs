import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
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

test('customer-testable Mission Control workspace journeys', async () => {
  await readFile('dist/index.html', 'utf8').catch(() => { throw new Error('run npm run build before this browser test') })
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  const page = await context.newPage()
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  try {
    await page.goto('http://127.0.0.1:4173/mission-control/', { waitUntil: 'networkidle' })
    await expectText(page, 'h1', 'Open a sample project.')
    assert.equal(await page.locator('.project-card').count(), 3)
    await assertContains(page, 'body', '7 evidence gaps or review findings')
    await assertContains(page, 'body', 'Saved in this browser')

    await page.click('text=Piketon Advanced Reactor COL Assembly')
    await page.getByRole('button', { name: 'Requirements / application' }).click()
    for (let i = 0; i < 14; i += 1) {
      await page.locator('textarea').first().fill(`Retained answer ${i}`)
      await page.click(i === 13 ? 'text=Finish guided demonstration' : 'text=Save and continue')
      await page.waitForTimeout(140)
    }
    await page.locator('[data-testid="part53-results"]').waitFor({ state: 'visible' })
    await page.getByRole('button', { name: 'Edit answer' }).first().click()
    await page.locator('textarea').first().fill('Edited applicant identity answer')
    await page.click('text=Save edit')
    await assertContains(page, '[data-testid="part53-results"]', 'Edited applicant identity answer')
    await assertContains(page, '[data-testid="part53-results"]', 'Financial, safety, environmental, and legal eligibility evidence still require human review.')
    assert.equal(await page.locator('.application-draft article').count(), 14)

    await page.locator('.project-tabs').getByRole('button', { name: 'Evidence', exact: true }).click()
    await page.getByRole('button', { name: 'sample-formation-record.txt' }).click()
    await assertContains(page, '[data-testid="evidence-preview"]', '5c9617d93085f488')
    await assertContains(page, '[data-testid="evidence-preview"]', 'Entity: Atlas Demo Energy LLC')

    const fixtureDir = path.join(tmpdir(), 'atlas-demo-fixtures')
    await mkdir(fixtureDir, { recursive: true })
    const unsafeFile = path.join(fixtureDir, 'unsafe.txt')
    await writeFile(unsafeFile, '<script>window.__atlasUnsafeExecuted = true</script>\nplain text remains untrusted')
    await page.locator('label:has-text("Attach unlinked evidence") input[type=file]').setInputFiles(unsafeFile)
    await page.waitForTimeout(250)
    assert.equal(await page.evaluate(() => window.__atlasUnsafeExecuted === true), false)
    await page.getByRole('button', { name: 'unsafe.txt' }).click()
    await assertContains(page, '[data-testid="evidence-preview"]', '<script>window.__atlasUnsafeExecuted = true</script>')

    const longFile = path.join(fixtureDir, 'long.txt')
    await writeFile(longFile, `start\n${'x'.repeat(5100)}\nend-marker`)
    await page.locator('label:has-text("Attach unlinked evidence") input[type=file]').setInputFiles(longFile)
    await page.waitForTimeout(250)
    await page.getByRole('button', { name: 'long.txt' }).click()
    await assertContains(page, '[data-testid="evidence-preview"]', 'Preview is limited to the first 5,000 characters')
    await page.click('text=Full retained document text')
    await assertContains(page, '[data-testid="evidence-preview"]', 'end-marker')

    const badJson = path.join(fixtureDir, 'bad.json')
    await writeFile(badJson, '{"missing":')
    await page.locator('label:has-text("Attach unlinked evidence") input[type=file]').setInputFiles(badJson)
    await page.waitForTimeout(250)
    await page.getByRole('button', { name: 'bad.json' }).click()
    await assertContains(page, '[data-testid="evidence-preview"]', 'Malformed JSON')

    await page.locator('.project-tabs').getByRole('button', { name: 'Report', exact: true }).click()
    const reportDownload = await Promise.all([page.waitForEvent('download'), page.click('text=Download HTML report')]).then(([download]) => download)
    const reportPath = await reportDownload.path()
    const report = await readFile(reportPath, 'utf8')
    assert.match(report, /Piketon Advanced Reactor COL Assembly/)
    assert.match(report, /Edited applicant identity answer/)
    assert.match(report, /Evidence gap|Review needed/)
    const registerDownload = await Promise.all([page.waitForEvent('download'), page.click('text=Download evidence/action register')]).then(([download]) => download)
    const register = await readFile(await registerDownload.path(), 'utf8')
    assert.match(register, /Action register/)
    assert.match(register, /Requirement reference,Finding,Status,Action,Responsible role,Basis/)
    assert.match(register, /p53-financial/)

    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('.project-tabs').getByRole('button', { name: 'Requirements / application', exact: true }).click()
    await assertContains(page, 'body', 'Edited applicant identity answer')

    await page.goto('http://127.0.0.1:4173/mission-control/transportation/', { waitUntil: 'networkidle' })
    await assertContains(page, 'body', 'Exact unresolved prerequisite: Package')
    await page.click('text=Load sample package evidence')
    await page.click('text=Resolve HRCQ facts')
    await page.click('text=Load sample emergency response evidence')
    await page.getByLabel('Emergency response evidence').selectOption('domestic_supported')
    await page.click('text=Assign demo reviewer')
    await page.waitForTimeout(250)
    assert.equal(await page.getByRole('button', { name: 'Simulate governed acceptance' }).isEnabled(), true)
    await page.click('text=Simulate governed acceptance')
    await assertContains(page, 'body', 'Demonstration-only acceptance is current')
    await page.getByLabel('U-235 enrichment wt%').fill('19.50')
    await page.waitForTimeout(250)
    await assertContains(page, 'body', 'Prior demonstration review is stale')
    await page.locator('.project-tabs').getByRole('button', { name: 'Report', exact: true }).click()
    const trnDownload = await Promise.all([page.waitForEvent('download'), page.click('text=Download HTML report')]).then(([download]) => download)
    const trnReport = await readFile(await trnDownload.path(), 'utf8')
    assert.match(trnReport, /Prior transportation review marked stale|stale/i)
    assert.match(trnReport, /does not .*real shipment authorization/i)

    await page.goto('http://127.0.0.1:4173/mission-control/evidence/', { waitUntil: 'networkidle' })
    await page.locator('.project-tabs').getByRole('button', { name: 'Requirements', exact: true }).click()
    await assertContains(page, 'body', 'lacks explicit replacement identity metadata')
    const misleading = path.join(fixtureDir, 'supplier-quality-program-rev-c-misleading.txt')
    await writeFile(misleading, 'Quality Program Manual Revision C words, but no controlled metadata.')
    await page.locator('article:has-text("Current quality program document") input[type=file]').setInputFiles(misleading)
    await page.waitForTimeout(250)
    await page.locator('.project-tabs').getByRole('button', { name: 'Findings and actions', exact: true }).click()
    await assertContains(page, 'body', 'lacks explicit replacement identity metadata')
    await page.locator('.project-tabs').getByRole('button', { name: 'Requirements', exact: true }).click()
    const badReplacement = path.join(fixtureDir, 'bad-replacement.json')
    await writeFile(badReplacement, '{"metadata":')
    await page.locator('article:has-text("Current quality program document") input[type=file]').setInputFiles(badReplacement)
    await page.waitForTimeout(250)
    await page.locator('.project-tabs').getByRole('button', { name: 'Evidence', exact: true }).click()
    await page.getByRole('button', { name: 'sample-supplier-quality-program-rev-b.txt' }).click()
    await assertContains(page, '[data-testid="evidence-preview"]', 'Revision: B')
    await page.locator('.project-tabs').getByRole('button', { name: 'Requirements', exact: true }).click()
    await page.getByRole('button', { name: 'Load sample evidence' }).first().click()
    await page.waitForTimeout(250)
    await page.locator('.project-tabs').getByRole('button', { name: 'Findings and actions', exact: true }).click()
    await assertContains(page, 'body', 'Explicit replacement identity and supersession metadata are linked')
    await page.locator('.project-tabs').getByRole('button', { name: 'History', exact: true }).click()
    await assertContains(page, 'body', 'sample-supplier-quality-program-rev-c.txt')

    await page.locator('.project-tabs').getByRole('button', { name: 'Requirements', exact: true }).click()
    await page.getByRole('button', { name: 'Load sample evidence' }).nth(1).click()
    await page.waitForTimeout(250)
    await page.locator('.project-tabs').getByRole('button', { name: 'Evidence', exact: true }).click()
    await assertContains(page, 'body', 'sample-calibration-record.txt')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('http://127.0.0.1:4173/mission-control/', { waitUntil: 'networkidle' })
    await page.keyboard.press('Tab')
    assert.equal(await page.locator('.project-card').count(), 3)
    await mkdir('test-artifacts', { recursive: true })
    await page.screenshot({ path: 'test-artifacts/mission-control-mobile.png', fullPage: true })

    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

test('storage failure shows an error instead of a false saved state', async () => {
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.addInitScript(() => { window.__ATLAS_DEMO_FORCE_STORAGE_FAILURE__ = true })
  try {
    await page.goto('http://127.0.0.1:4173/mission-control/nuclear-readiness/', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Requirements / application' }).click()
    await page.locator('textarea').first().fill('Storage failure test')
    await page.click('text=Save and continue')
    await assertContains(page, 'body', 'Save failed')
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

test('failed supplier replacement keeps prior usable evidence version', async () => {
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.goto('http://127.0.0.1:4173/mission-control/evidence/', { waitUntil: 'networkidle' })
    await page.locator('.project-tabs').getByRole('button', { name: 'Evidence', exact: true }).click()
    await page.getByRole('button', { name: 'sample-supplier-quality-program-rev-b.txt' }).click()
    const fixtureDir = path.join(tmpdir(), 'atlas-demo-fixtures')
    await mkdir(fixtureDir, { recursive: true })
    const malformed = path.join(fixtureDir, 'failed-qap-replacement.json')
    await writeFile(malformed, '{"metadata":')
    await page.locator('label:has-text("Replace evidence") input[type=file]').setInputFiles(malformed)
    await page.waitForTimeout(250)
    await assertContains(page, '[data-testid="evidence-preview"]', 'Prior usable version retained')
    await assertContains(page, '[data-testid="evidence-preview"]', 'Revision: B')
    await assertContains(page, '[data-testid="evidence-preview"]', 'Replacement history')
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

async function expectText(page, selector, text) {
  const locator = page.locator(selector).first()
  await locator.waitFor({ state: 'visible', timeout: 5000 })
  assert.equal((await locator.innerText()).trim(), text)
}

async function assertContains(page, selector, text) {
  const locator = page.locator(selector).first()
  for (let i = 0; i < 40; i += 1) {
    const value = await locator.innerText()
    if (value.includes(text)) return
    await page.waitForTimeout(100)
  }
  assert.match(await locator.innerText(), new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}
