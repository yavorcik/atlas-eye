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

test('Transportation workspace resolves blocker, records demo acceptance, and stales on material change', async () => {
  await readFile('dist/index.html', 'utf8').catch(() => { throw new Error('run npm run build before this browser test') })
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  try {
    await page.goto('http://127.0.0.1:4173/transportation/', { waitUntil: 'networkidle' })
    await page.waitForURL('**/mission-control/transportation/')
    await assertContains(page, 'body', 'Your transportation readiness package')
    await assertContains(page, 'body', 'Exact unresolved prerequisite: package compatibility evidence')
    await assertContains(page, 'body', '4 unresolved findings')

    await page.click('text=Load sample package evidence')
    await page.click('text=Resolve HRCQ facts')
    await page.waitForTimeout(250)
    assert.equal(await page.getByRole('button', { name: 'Simulate governed acceptance' }).isEnabled(), true)
    await page.click('text=Simulate governed acceptance')
    await assertContains(page, 'body', 'Demonstration-only acceptance is current')
    await assertContains(page, 'body', 'not a real shipment authorization')

    await page.getByLabel('U-235 enrichment wt%').fill('19.50')
    await page.waitForTimeout(250)
    await assertContains(page, 'body', 'Prior demonstration review is stale')
    assert.equal(await page.getByRole('button', { name: 'Simulate governed acceptance' }).isEnabled(), true)

    await page.click('text=Optional maritime/change scenarios')
    await page.click('text=Apply optional maritime destination')
    assert.equal(await page.getByLabel('Destination').inputValue(), 'Demo marine terminal and overseas receiving site')

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

async function assertContains(page, selector, text) {
  const locator = page.locator(selector).first()
  for (let i = 0; i < 40; i += 1) {
    const value = await locator.innerText()
    if (value.includes(text)) return
    await page.waitForTimeout(100)
  }
  assert.match(await locator.innerText(), new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}
