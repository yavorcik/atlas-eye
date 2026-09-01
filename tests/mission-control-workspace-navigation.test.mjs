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

test('Mission Control uses dedicated workspaces without blue branding or hash jumps', async () => {
  await import('node:fs/promises').then(fs => fs.access('dist/index.html')).catch(() => { throw new Error('run npm run build before this browser test') })
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  try {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
    await assertVisible(page, 'text=ENTER MISSION CONTROL')
    assert.equal(await page.locator('[data-primary-cover-cta="true"]').count(), 1)
    await page.click('[data-primary-cover-cta="true"]')
    await page.waitForURL('**/mission-control/')
    await assertVisible(page, 'text=Transportation Readiness')
    assert.equal(await page.locator('#workspace, #transportation-readiness').count(), 0)
    await page.click('a[href="/part53/"]')
    await page.waitForURL('**/part53/')
    await assertVisible(page, 'text=Mission Control / Part 53 Application Workspace')
    assert.equal(await page.locator('#transportation-readiness').count(), 0)
    await page.goBack({ waitUntil: 'networkidle' })
    await page.waitForURL('**/mission-control/')
    await page.click('a[href="/transportation/"]')
    await page.waitForURL('**/transportation/')
    await assertVisible(page, '#transportation-readiness')
    assert.equal(await page.locator('#workspace').count(), 0)
    assert.equal(new URL(page.url()).hash, '')
    await page.reload({ waitUntil: 'networkidle' })
    await assertVisible(page, '#transport-new-mission')
    await page.keyboard.press('PageDown')
    await page.mouse.wheel(0, 600)
    await assertVisible(page, '#transport-new-mission')
    const colors = await page.evaluate(() => [...document.querySelectorAll('*')].slice(0, 500).flatMap(el => { const s = getComputedStyle(el); return [s.color, s.backgroundColor, s.borderColor] }).join(' '))
    assert.doesNotMatch(colors, /0, 216, 255|132, 215, 255|0, 194, 255/i)
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

async function assertVisible(page, selector) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 5000 })
}
