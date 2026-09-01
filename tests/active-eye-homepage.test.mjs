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

test('active Atlas Eye leads to Mission Control without workspace content on the cover', async () => {
  await import('node:fs/promises').then(fs => fs.access('dist/index.html')).catch(() => { throw new Error('run npm run build before this browser test') })
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  const failed = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push(e.message))
  page.on('requestfailed', request => failed.push(request.url()))
  try {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
    const eye = page.locator('[data-active-eye="true"]')
    const cta = page.locator('[data-primary-cover-cta="true"]')
    await eye.waitFor({ state: 'visible' })
    await cta.waitFor({ state: 'visible' })
    await assertVisible(page, 'text=ENTER ATLAS')
    assert.equal(await page.locator('.module-card').count(), 0)
    assert.equal(await page.locator('#transportation-readiness, #workspace').count(), 0)
    const eyeBox = await eye.boundingBox()
    const ctaBox = await cta.boundingBox()
    assert.ok(eyeBox && eyeBox.width >= 220 && eyeBox.height >= 220, `eye not dominant: ${JSON.stringify(eyeBox)}`)
    assert.ok(ctaBox && ctaBox.y + ctaBox.height <= 720, `CTA below viewport: ${JSON.stringify(ctaBox)}`)
    const before = await page.locator('.eye-core').evaluate(el => getComputedStyle(el).transform)
    await page.mouse.move(1180, 80)
    await page.waitForTimeout(250)
    const after = await page.locator('.eye-core').evaluate(el => getComputedStyle(el).transform)
    assert.notEqual(before, after)
    await cta.click()
    await page.waitForURL('**/mission-control/')
    await assertVisible(page, 'text=Transportation Readiness')
    await page.click('a[href="/transportation/"]')
    await page.waitForURL('**/transportation/')
    await assertVisible(page, '#transport-new-mission')
    await page.goBack({ waitUntil: 'networkidle' })
    await page.click('a[href="/part53/"]')
    await page.waitForURL('**/part53/')
    await assertVisible(page, '#workspace')
    assert.deepEqual(errors, [])
    assert.deepEqual(failed, [])
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

test('active Atlas Eye respects reduced motion', async () => {
  await import('node:fs/promises').then(fs => fs.access('dist/index.html')).catch(() => { throw new Error('run npm run build before this browser test') })
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' })
  try {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
    await assertVisible(page, '[data-active-eye="true"]')
    const animation = await page.locator('[data-active-eye="true"]').evaluate(el => getComputedStyle(el).animationName)
    const transform = await page.locator('.eye-core').evaluate(el => getComputedStyle(el).transform)
    assert.equal(animation, 'none')
    assert.equal(transform, 'none')
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

async function assertVisible(page, selector) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 5000 })
}
