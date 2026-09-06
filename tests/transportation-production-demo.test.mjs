import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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

test('Transportation workspace enforces each gate, hashes manifest, accepts only completed evaluation, and stales on changes', async () => {
  await readFile('dist/index.html', 'utf8').catch(() => { throw new Error('run npm run build before this browser test') })
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  try {
    await page.goto('http://127.0.0.1:4173/transportation/', { waitUntil: 'networkidle' })
    await page.waitForURL('**/mission-control/transportation/')
    await assertContains(page, 'body', 'Your transportation readiness package')
    await assertContains(page, 'body', 'Exact unresolved prerequisite: Package')
    await assertContains(page, 'body', 'transportation blockers')
    assert.equal(await page.getByRole('button', { name: 'Simulate governed acceptance' }).isDisabled(), true)

    await page.getByLabel('HRCQ threshold status').selectOption('claimed_only')
    await page.getByLabel('HRCQ sample basis').fill('arbitrary words')
    await page.waitForTimeout(250)
    await assertContains(page, 'body', 'HRCQ threshold status is unresolved')
    assert.equal(await page.getByRole('button', { name: 'Simulate governed acceptance' }).isDisabled(), true)

    await page.click('text=Load sample package evidence')
    await page.click('text=Resolve HRCQ facts')
    await page.click('text=Load sample emergency response evidence')
    await page.getByLabel('Emergency response evidence').selectOption('domestic_supported')
    await page.click('text=Assign demo reviewer')
    await page.waitForTimeout(250)
    const firstFingerprint = await fingerprint(page)
    assert.match(firstFingerprint, /^[a-f0-9]{16}$/)
    assert.equal(await page.getByRole('button', { name: 'Simulate governed acceptance' }).isEnabled(), true)
    await page.click('text=Simulate governed acceptance')
    await assertContains(page, 'body', 'Demonstration-only acceptance is current')
    await assertContains(page, 'body', 'not a real shipment authorization')

    await page.getByLabel('U-235 enrichment wt%').fill('19.50')
    await page.waitForTimeout(250)
    assert.notEqual(await fingerprint(page), firstFingerprint)
    await assertContains(page, 'body', 'Prior demonstration review is stale')
    assert.equal(await page.getByRole('button', { name: 'Simulate governed acceptance' }).isEnabled(), true)

    await page.click('text=Optional maritime/change scenarios')
    await page.click('text=Apply optional maritime scope')
    assert.equal(await page.getByLabel('Destination').inputValue(), 'Demo marine terminal and overseas receiving site')
    await assertContains(page, 'body', 'port/terminal operator evidence unresolved')
    assert.equal(await page.getByRole('button', { name: 'Simulate governed acceptance' }).isDisabled(), true)
    await page.click('text=Resolve maritime sample scope')
    await page.waitForTimeout(250)
    assert.equal(await page.getByRole('button', { name: 'Simulate governed acceptance' }).isEnabled(), true)

    await page.locator('.project-tabs').getByRole('button', { name: 'Report', exact: true }).click()
    const download = await Promise.all([page.waitForEvent('download'), page.click('text=Download HTML report')]).then(([item]) => item)
    const report = await readFile(await download.path(), 'utf8')
    assert.match(report, /HALEU UF6 Highway Shipment Readiness/)
    assert.match(report, /Prior transportation review marked stale|stale/i)
    assert.match(report, /does not upload documents to Atlas|does not .*real shipment authorization/i)
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

test('each missing transportation gate prevents acceptance', async () => {
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  try {
    const gates = [
      ['Atlas has not established an authorized package for the proposed contents/enrichment.', 'package', null],
      ['shipper / offeror identity missing', '', async () => page.getByLabel('Carrier evidence').selectOption('none')],
      ['route evidence missing', '', async () => page.getByLabel('Route evidence').selectOption('none')],
      ['plan adequacy review unresolved', '', async () => page.getByLabel('Security evidence').selectOption('plan_only')],
      ['measurement exceeds represented limit', '', async () => page.getByLabel('Execution evidence').selectOption('measurement_out_of_range')],
      ['response organization missing', 'emergency', null],
      ['reviewer not assigned', 'reviewer', null],
    ]
    for (const [message, omit, mutate] of gates) {
      await page.goto('http://127.0.0.1:4173/mission-control/transportation/', { waitUntil: 'networkidle' })
      await page.evaluate(() => localStorage.clear())
      await page.reload({ waitUntil: 'networkidle' })
      await completeTransport(page, omit)
      if (mutate) await mutate()
      await page.waitForTimeout(250)
      await assertContains(page, 'body', message)
      assert.equal(await page.getByRole('button', { name: 'Simulate governed acceptance' }).isDisabled(), true)
    }
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

async function completeTransport(page, omit = '') {
  if (omit !== 'package') await page.click('text=Load sample package evidence')
  await page.click('text=Resolve HRCQ facts')
  if (omit !== 'emergency') {
    await page.click('text=Load sample emergency response evidence')
    await page.getByLabel('Emergency response evidence').selectOption('domestic_supported')
  }
  if (omit !== 'reviewer') await page.click('text=Assign demo reviewer')
  await page.waitForTimeout(250)
}

async function fingerprint(page) {
  const text = await page.locator('.sticky-step').innerText()
  return text.match(/manifest ([a-f0-9]{16})/)?.[1] || ''
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
