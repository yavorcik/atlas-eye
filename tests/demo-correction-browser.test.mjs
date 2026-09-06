import test from 'node:test'
import assert from 'node:assert/strict'
import { chromium, firefox } from 'playwright'
import { mkdir, readFile } from 'node:fs/promises'
const base = process.env.ATLAS_PREVIEW_URL || 'http://127.0.0.1:4173'
const output = `test-artifacts/correction-${process.env.ATLAS_PREVIEW_URL ? 'preview' : 'local'}`
const storageKey = 'atlas.publicDemoWorkspace.v2'
const tab = (page, name) => page.locator('.project-tabs').getByRole('button', { name, exact: true }).click()
const contains = (page, selector, text) => page.waitForFunction(({ selector, text }) => document.querySelector(selector)?.innerText.includes(text), { selector, text })
const saved = page => page.waitForFunction(() => document.querySelector('.demo-notice-panel')?.classList.contains('save-saved'))
const project = (page, id = 'fuel-transport') => page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)).projects[id], { key: storageKey, id })
async function ready(page) {
  for (const name of ['Load sample package evidence', 'Resolve HRCQ facts', 'Load sample emergency response evidence', 'Assign demo reviewer']) await page.getByRole('button', { name, exact: true }).click()
  await page.getByLabel('Emergency response evidence').selectOption('domestic_supported')
  await contains(page, '[data-testid="transport-evaluation-state"]', 'ready for review')
  await saved(page)
}
async function reports(page, name, status, browserName) {
  await tab(page, 'Report')
  await contains(page, '.print-report', status)
  const screen = await page.locator('.print-report').innerText()
  assert.doesNotMatch(screen, /Governed Decision:|Package Evidence:|Stage: Evidence blocker|truck_only|domestic_supported|Reviewer: valid|Legal-Name|Focd/)
  for (const [label, extension] of [['Download HTML report', 'html'], ['Download evidence/action register', 'csv']]) {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label, exact: true }).click()])
    const path = `${output}/${browserName}-${name}.${extension}`
    await download.saveAs(path)
    const content = await readFile(path, 'utf8')
    assert.ok(content.includes(status), `${name} ${extension} status`)
    assert.match(content, /scope/i)
    assert.match(content, /Demo Limitations|Demo limitations/)
    assert.match(content, /Responsible role/)
    assert.doesNotMatch(content, /truck_only|domestic_supported|Reviewer: valid|Legal-Name|Focd/)
    if (name.includes('accepted')) { assert.match(content, /Reviewed record|Current simulated decision/); assert.match(content, /sample-transport-package-record|sample-supplier-quality-program-rev-c/) }
  }
  await page.emulateMedia({ media: 'print' })
  assert.ok((await page.locator('.print-report').innerText()).includes(status))
  if (browserName === 'chromium') await page.pdf({ path: `${output}/${browserName}-${name}.pdf`, format: 'A4' })
  await page.emulateMedia({ media: 'screen' })
}

for (const [browserName, engine] of [['chromium', chromium], ['firefox', firefox]]) {
  test(`${browserName}: validation, arbitrary and mismatched evidence, real exports, acceptance and invalidation`, async () => {
    await mkdir(output, { recursive: true })
    const browser = await engine.launch()
    try {
      const page = await browser.newPage({ acceptDownloads: true })
      await page.goto(`${base}/mission-control/transportation/`)
      await contains(page, '[data-testid="transport-evaluation-state"]', 'Exact unresolved prerequisite')
      await reports(page, 'blocked', 'Exact unresolved prerequisite', browserName)
      await tab(page, 'Requirements')
      await ready(page)
      await reports(page, 'ready', 'ready for review', browserName)
      await tab(page, 'Requirements')
      const accept = page.getByRole('button', { name: 'Simulate governed acceptance', exact: true })
      for (const [label, values, restore] of [
        ['U-235 enrichment wt%', ['banana', '', '101', '101%', '19.50', 'Infinity', '19.75x'], '19.75'],
        ['Quantity', ['-5', '0', '', '12 kgU'], '12'], ['Origin', [''], 'Ohio enrichment facility'], ['Destination', [''], 'Pennsylvania advanced-reactor project'],
      ]) {
        for (const value of values) {
          await page.getByLabel(label, { exact: true }).fill(value)
          assert.equal(await accept.isDisabled(), true, `${label} ${value}`)
          await page.waitForFunction(() => document.querySelector('[data-testid="transport-evaluation-state"]')?.textContent.includes('Exact unresolved prerequisite'))
          assert.equal(await accept.isDisabled(), true)
          assert.notEqual((await project(page)).review.simulatedAcceptance, true)
        }
        await page.getByLabel(label, { exact: true }).fill(restore)
        await contains(page, '[data-testid="transport-evaluation-state"]', 'ready for review')
      }
      await accept.click()
      await saved(page)
      await reports(page, 'accepted', 'acceptance is current', browserName)
      await tab(page, 'Requirements')
      await page.getByLabel('Quantity', { exact: true }).fill('13')
      await contains(page, '[data-testid="transport-evaluation-state"]', 'previous review no longer applies')
      await reports(page, 'stale', 'previous review no longer applies', browserName)
      await tab(page, 'Requirements')
      await page.getByLabel('Quantity', { exact: true }).fill('12')
      await contains(page, '[data-testid="transport-evaluation-state"]', 'previous review no longer applies')
      await tab(page, 'Evidence')
      await page.getByRole('button', { name: 'sample-transport-package-record.json', exact: true }).click()
      const original = await project(page)
      const packageId = original.requirements.find(req => req.id === 'trn-package').linkedEvidence[0]
      const record = original.evidence[packageId]
      await page.getByLabel('Replace evidence', { exact: true }).setInputFiles({ name: 'package.txt', mimeType: 'text/plain', buffer: Buffer.from('apples, coffee, bread') })
      await saved(page)
      await tab(page, 'Requirements')
      await contains(page, '.transportation-path', 'Automated applicability assessment is unsupported')
      assert.equal(await accept.isDisabled(), true)
      await reports(page, 'shopping-list-blocked', 'previous review no longer applies', browserName)
      await tab(page, 'Evidence')
      await page.getByRole('button', { name: 'package.txt', exact: true }).click()
      const mismatched = { ...JSON.parse(record.fullText), quantity: '99 kgU' }
      await page.getByLabel('Replace evidence', { exact: true }).setInputFiles({ name: 'scope.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(mismatched)) })
      await saved(page)
      await tab(page, 'Requirements')
      await contains(page, '.transportation-path', 'different material/form, enrichment, or quantity/unit')
      assert.equal(await accept.isDisabled(), true)
      await tab(page, 'Evidence')
      await page.getByRole('button', { name: 'scope.json', exact: true }).click()
      await page.getByLabel('Replace evidence', { exact: true }).setInputFiles({ name: record.filename, mimeType: 'application/json', buffer: Buffer.from(record.fullText) })
      await saved(page)
      await page.getByLabel('Replace evidence', { exact: true }).setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{broken') })
      await contains(page, '[data-testid="evidence-preview"]', 'Prior usable version retained')
      const after = (await project(page)).evidence[packageId]
      assert.equal(after.fullText, record.fullText)
      assert.equal(after.hash, record.hash)
      assert.ok(after.replacements.some(item => item.attempted && item.status === 'failed'))
      await tab(page, 'Requirements')
      await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => b.textContent === 'Simulate governed acceptance').disabled)
      await accept.click()
      await contains(page, '[data-testid="transport-evaluation-state"]', 'acceptance is current')
    } finally { await browser.close() }
  })

  test(`${browserName}: fourteen questions, skip, edit, supplier decisions, keyboard report position at both widths`, async () => {
    await mkdir(output, { recursive: true })
    const browser = await engine.launch()
    try {
      for (const width of [1366, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 844 }, acceptDownloads: true, reducedMotion: 'reduce' })
        const page = await context.newPage()
        await page.goto(`${base}/part53-workspace/`)
        for (let n = 0; n < 14; n++) {
          assert.match(await page.locator('.guided-box').innerText(), new RegExp(`Question ${n + 1} of 14`, 'i'))
          assert.match(await page.locator('.guided-box').innerText(), /Example:|Evidence prompt:/)
          if (n === 8) await page.getByRole('button', { name: 'Skip for now', exact: false }).click()
          else {
            await page.locator('.guided-box textarea').fill(`Entered application answer ${n + 1}`)
            await page.getByRole('button', { name: n === 13 ? 'Finish guided demonstration' : 'Save and continue', exact: true }).click()
          }
        }
        await page.getByTestId('part53-results').waitFor()
        await page.getByRole('button', { name: 'Edit answer', exact: true }).first().click()
        await page.getByLabel('Edit answer').fill('Edited applicant after completion')
        await page.getByRole('button', { name: 'Save edit', exact: true }).click()
        await saved(page)
        await page.reload()
        await contains(page, '[data-testid="part53-results"]', 'Edited applicant after completion')
        const app = await project(page, 'reactor-app')
        assert.equal(app.history.filter(entry => entry.action === 'Completed the guided demonstration and opened application results.').length, 1)
        assert.equal(app.guided.skipped.safety, true)
        for (const [route, cta, id] of [
          [null, 'View your application draft', 'application'],
          ['/mission-control/evidence/', 'View your supplier review report', 'supplier'],
          ['/mission-control/transportation/', 'View your transportation report', 'transportation'],
        ]) {
          if (route) { await page.goto(base + route); await tab(page, 'Overview') }
          await page.getByRole('button', { name: cta, exact: true }).focus()
          await page.keyboard.press('Enter')
          const heading = page.getByRole('heading', { name: 'Project Report', exact: true })
          await heading.waitFor()
          await page.waitForTimeout(100)
          const position = await heading.evaluate(el => ({ focused: document.activeElement === el, top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom, navBottom: document.querySelector('.project-tabs').getBoundingClientRect().bottom, height: innerHeight }))
          assert.equal(position.focused, true)
          assert.ok(position.top >= position.navBottom, JSON.stringify(position))
          assert.ok(position.bottom < position.height - 80, JSON.stringify(position))
          const controls = await page.getByRole('button', { name: 'Download HTML report', exact: true }).boundingBox()
          assert.ok(controls.y + controls.height < 844)
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
          if (id === 'application') await reports(page, `application-${width}`, 'Unresolved gap — skipped for now', browserName)
          await page.screenshot({ path: `${output}/${browserName}-${width}-${id}.png`, fullPage: true })
        }
        await page.goto(`${base}/mission-control/evidence/`)
        await tab(page, 'Requirements')
        for (const button of await page.getByRole('button', { name: 'Load sample evidence', exact: true }).all()) await button.click()
        await page.getByLabel('Decision explanation').fill('Review the transmittal and resolve the remaining item.')
        await page.getByRole('button', { name: 'Request changes', exact: true }).click()
        await saved(page)
        await reports(page, `supplier-changes-${width}`, 'Changes requested', browserName)
        await tab(page, 'Requirements')
        await page.getByLabel('Decision explanation').fill('Reject this sample package pending corrected controlled records.')
        await page.getByRole('button', { name: 'Reject demo package', exact: true }).click()
        await saved(page)
        await reports(page, `supplier-rejected-${width}`, 'Rejected', browserName)
        await tab(page, 'Requirements')
        await page.getByLabel('Decision explanation').fill('Current quality program C and calibration sample reviewed for this limited demo.')
        await page.getByRole('button', { name: 'Simulate supplier acceptance', exact: true }).click()
        await saved(page)
        await reports(page, `supplier-accepted-${width}`, 'Simulated acceptance current', browserName)
        await tab(page, 'Requirements')
        await page.getByRole('button', { name: 'Load sample evidence', exact: true }).first().click()
        await saved(page)
        await reports(page, `supplier-stale-${width}`, 'Prior review stale after change', browserName)
        await context.close()
      }
    } finally { await browser.close() }
  })
}

test('transactional cross-tab isolation, safe merge, conflict recovery, reset tombstone and migration', async () => {
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({ acceptDownloads: true })
    const transport = await context.newPage(), app = await context.newPage(), other = await context.newPage()
    await transport.goto(`${base}/mission-control/transportation/`)
    await saved(transport)
    await app.goto(`${base}/part53-workspace/`)
    await app.locator('.guided-box textarea').fill('Applicant retained across tabs')
    await saved(app)
    await app.reload()
    assert.equal(await app.locator('.guided-box textarea').inputValue(), 'Applicant retained across tabs')
    await transport.getByLabel('Quantity', { exact: true }).fill('13')
    await saved(transport)
    await app.reload()
    assert.equal(await app.locator('.guided-box textarea').inputValue(), 'Applicant retained across tabs')
    await other.goto(`${base}/part53-workspace/`)
    await other.getByRole('button', { name: 'Save and continue', exact: true }).click()
    await other.locator('.guided-box textarea').fill('Independently changed address')
    await saved(other)
    await app.locator('.guided-box textarea').fill('Independently changed name')
    await saved(app)
    const merged = await project(app, 'reactor-app')
    assert.equal(merged.inputs.address, 'Independently changed address')
    assert.equal(merged.inputs['legal-name'], 'Independently changed name')
    await app.reload()
    await other.reload()
    // Both tabs now see the address question; concurrent edits must conflict.
    await app.locator('.guided-box textarea').fill('First tab address')
    await saved(app)
    await other.locator('.guided-box textarea').fill('Second tab recoverable address')
    await contains(other, '.demo-notice-panel', 'Conflicting edits')
    assert.equal((await project(other, 'reactor-app')).inputs.address, 'First tab address')
    const [recovery] = await Promise.all([other.waitForEvent('download'), other.getByRole('button', { name: 'Download recoverable changes' }).click()])
    assert.match(await readFile(await recovery.path(), 'utf8'), /Second tab recoverable address/)
    app.on('dialog', dialog => dialog.accept())
    await app.getByRole('button', { name: 'Reset saved demo' }).click()
    await saved(app)
    await transport.getByLabel('Quantity', { exact: true }).fill('99')
    await contains(transport, '.demo-notice-panel', 'reset in another tab')
    assert.equal((await project(app)).inputs.quantityValue, '12')
    // Simulate an actual v2 browser record and reload through the versioned migration.
    await app.evaluate(key => {
      const saved = JSON.parse(localStorage.getItem(key)); saved.schemaVersion = 2; delete saved.epoch
      const trn = saved.projects['fuel-transport']; trn.inputs.quantity = '17 kgU'; delete trn.inputs.quantityValue; delete trn.inputs.quantityUnit
      saved.projects['reactor-app'].inputs.safety = 'Migrated answer'; localStorage.setItem(key, JSON.stringify(saved))
    }, storageKey)
    await app.goto(`${base}/mission-control/transportation/`)
    assert.equal(await app.getByLabel('Quantity', { exact: true }).inputValue(), '17')
    await saved(app)
    assert.equal((await project(app, 'reactor-app')).inputs.safety, 'Migrated answer')
  } finally { await browser.close() }
})

test('mismatched application links and unsupported migrated units remain explicit blockers', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${base}/part53-workspace/`)
    await page.getByText('Complete requirements register', { exact: true }).click()
    const financial = page.locator('.requirement-card').filter({ has: page.getByRole('heading', { name: 'Financial qualifications', exact: true }) })
    await financial.getByLabel('Link existing evidence').selectOption('ev-formation')
    await contains(page, '.requirement-list', 'Document type and represented scope do not match this requirement')
    assert.match(await financial.innerText(), /CONFLICT/)
    await saved(page)
    await page.goto(`${base}/mission-control/transportation/`)
    await ready(page)
    await page.evaluate(key => {
      const saved = JSON.parse(localStorage.getItem(key))
      saved.projects['fuel-transport'].inputs.quantityUnit = 'pounds'
      localStorage.setItem(key, JSON.stringify(saved))
    }, storageKey)
    await page.reload()
    await contains(page, '[data-testid="transport-evaluation-state"]', 'Select kgU')
    assert.equal(await page.getByRole('button', { name: 'Simulate governed acceptance' }).isDisabled(), true)
    await page.getByLabel('Quantity unit', { exact: false }).selectOption('kgU')
    await contains(page, '[data-testid="transport-evaluation-state"]', 'ready for review')
  } finally { await browser.close() }
})
