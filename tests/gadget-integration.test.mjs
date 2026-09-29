import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { chromium } from 'playwright'

async function preview() {
  const child = spawn('./node_modules/.bin/vite', ['preview', '--host', '127.0.0.1', '--port', '4188'], { detached: true, stdio: 'ignore' })
  child.unref()
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch('http://127.0.0.1:4188/')).ok) return child } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('preview did not start')
}

test('Gadget cockpit replaces only the Mission Control default and remains responsive', async () => {
  await readFile('dist/index.html', 'utf8').catch(() => { throw new Error('run npm run build before this browser test') })
  const child = await preview()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.goto('http://127.0.0.1:4188/', { waitUntil: 'networkidle' })
    assert.equal(await page.locator('[data-testid="gadget-panel"]').count(), 0)
    assert.equal(await page.getByRole('link', { name: /ENTER ATLASEYE/ }).getAttribute('href'), '/mission-control/')
    assert.equal(await page.locator('.historical-eye-stage').count(), 1)

    await page.route('**/api/gadget/session.json', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, csrf: 'browser-test-csrf' }),
    }))
    await page.route('**/api/gadget/objectives', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ objective_id: 'obj-1' }) }))
    await page.route('**/api/gadget/objectives/obj-1/overview', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ objective_id: 'obj-1', objective: { objective_text: 'Resolve bounded evidence.' }, working: [], needs_you: [], holds: [], specialists: Array.from({ length: 8 }, (_, i) => ({ label: `Specialist ${i + 1}` })), project_context: { project_id: 'project-1', scope: 'Server resolved' }, recent_activity: [], evidence_summary: { note: 'Record-backed.' }, decision_summary: { note: 'No approval path.' } }) }))
    await page.route('**/api/gadget/objectives/obj-1/work', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }))
    await page.goto('http://127.0.0.1:4188/mission-control/', { waitUntil: 'networkidle' })
    assert.equal(await page.locator('[data-testid="gadget-cockpit"]').count(), 1)
    await page.locator('#objective').fill('Resolve bounded evidence.')
    await page.getByRole('button', { name: 'Create governed objective' }).click()
    await page.getByText('Resolve bounded evidence.').waitFor()
    assert.equal(await page.locator('.specialist-strip span').count(), 8)
    await page.goto('http://127.0.0.1:4188/mission-control/nuclear-readiness/', { waitUntil: 'networkidle' })
    assert.equal(await page.locator('[data-testid="gadget-panel"]').count(), 1)

    await page.setViewportSize({ width: 390, height: 844 })
    const box = await page.locator('[data-testid="gadget-panel"]').boundingBox()
    assert.ok(box.width <= 390)
    assert.ok(box.x >= 0)
  } finally {
    await browser.close()
    try { child.pid && process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

test('built frontend contains no server-side credential names or token literals', async () => {
  const assets = await readdir('dist/assets')
  const text = (await Promise.all([
    readFile('dist/index.html', 'utf8'),
    ...assets.filter(name => /\.(?:js|css)$/.test(name)).map(name => readFile(`dist/assets/${name}`, 'utf8')),
  ])).join('\n')
  assert.doesNotMatch(text, /GADGET_SESSION_SECRET|ATLAS_GADGET_OPENCLAW_TOKEN|ATLAS_GADGET_INTERNAL_TOKEN/)
})
