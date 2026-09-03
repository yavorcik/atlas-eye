import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { chromium } from 'playwright'

const BASE_URL = 'http://127.0.0.1:4173'
const HISTORICAL_ASSET = '/brand/atlas-nuclear-logo.png'
const HISTORICAL_ASSET_SHA256 = '1dcc430946954a873b8e00b06916a6a3d0c97ebfb106ea50347fecfe292ecf81'

async function server() {
  const child = spawn('./node_modules/.bin/vite', ['preview', '--host', '127.0.0.1', '--port', '4173'], { detached: true, stdio: 'ignore' })
  child.unref()
  for (let i = 0; i < 50; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`)
      if (response.ok) return child
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  try { process.kill(-child.pid, 'SIGTERM') } catch {}
  throw new Error('preview did not start')
}

test('homepage restores the historical Atlas Nuclear launch eye and enters Mission Control once', async () => {
  await import('node:fs/promises').then((fs) => fs.access('dist/index.html')).catch(() => { throw new Error('run npm run build before this browser test') })
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  const failed = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('requestfailed', (request) => failed.push(request.url()))

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })

    await assertVisible(page, '[data-historical-atlas-eye="true"]')
    await assertVisible(page, `.launch-logo[src="${HISTORICAL_ASSET}"]`)
    await assertVisible(page, '.launch-orbit.orbit-one')
    await assertVisible(page, '.launch-orbit.orbit-two')
    await assertVisible(page, '.launch-orbit.orbit-three')
    await assertVisible(page, '.launch-sweep')
    await assertVisible(page, '[data-primary-cover-cta="true"]')
    await assertVisible(page, 'text=ENTER ATLAS')

    assert.equal(await page.locator('[data-active-eye="true"], .eye-core, .eye-aperture').count(), 0)
    assert.equal(await page.locator('.module-card').count(), 0)
    assert.equal(await page.locator('#transportation-readiness, #workspace').count(), 0)

    const logoBox = await page.locator('.launch-logo').boundingBox()
    const ctaBox = await page.locator('[data-primary-cover-cta="true"]').boundingBox()
    assert.ok(logoBox && logoBox.width >= 700 && logoBox.height >= 380, `historical eye not dominant: ${JSON.stringify(logoBox)}`)
    assert.ok(ctaBox && ctaBox.y + ctaBox.height <= 720, `CTA below viewport: ${JSON.stringify(ctaBox)}`)

    assert.equal(
      await page.locator('.launch-logo').evaluate((element) => getComputedStyle(element).animationName.includes('atlasEpicBreathing')),
      true,
    )
    assert.equal(
      await page.locator('.launch-core-glow').evaluate((element) => getComputedStyle(element).animationName),
      'coreBreathing',
    )
    assert.equal(
      await page.locator('.orbit-one').evaluate((element) => getComputedStyle(element).animationDuration),
      '34s',
    )
    assert.equal(
      await page.locator('.orbit-two').evaluate((element) => getComputedStyle(element).animationDuration),
      '52s',
    )
    assert.equal(
      await page.locator('.launch-sweep').evaluate((element) => getComputedStyle(element).animationName),
      'sweepRotate',
    )

    const transformBefore = await page.locator('.launch-logo').evaluate((element) => getComputedStyle(element).transform)
    await page.mouse.move(1180, 80)
    await page.waitForTimeout(250)
    const transformAfter = await page.locator('.launch-logo').evaluate((element) => getComputedStyle(element).transform)
    assert.notEqual(transformBefore, transformAfter)

    const assetResponse = await page.request.get(`${BASE_URL}${HISTORICAL_ASSET}`)
    assert.equal(assetResponse.ok(), true)
    assert.equal(assetResponse.headers()['content-type']?.includes('image/png'), true)
    assert.equal(await sha256Hex(await assetResponse.body()), HISTORICAL_ASSET_SHA256)

    const colorAudit = await visibleColorAudit(page)
    assert.deepEqual(colorAudit.blueCyanTeal, [])

    await page.locator('[data-primary-cover-cta="true"]').click()
    await page.waitForURL('**/mission-control/')
    await assertVisible(page, 'text=Transportation Readiness')
    await assertVisible(page, 'text=SUPPLIERS & COMPONENTS')
    assert.equal(await page.locator('.module-card').count(), 5)

    await page.goto(`${BASE_URL}/part53/`, { waitUntil: 'networkidle' })
    await assertVisible(page, '#workspace')
    await page.goto(`${BASE_URL}/transportation/`, { waitUntil: 'networkidle' })
    await assertVisible(page, '#transport-new-mission')

    assert.deepEqual(errors, [])
    assert.deepEqual(failed, [])
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

test('historical eye preserves a static reduced-motion presentation', async () => {
  await import('node:fs/promises').then((fs) => fs.access('dist/index.html')).catch(() => { throw new Error('run npm run build before this browser test') })
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' })

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
    await assertVisible(page, '[data-historical-atlas-eye="true"]')
    await assertVisible(page, '.launch-logo')
    await assertVisible(page, '[data-primary-cover-cta="true"]')

    const movingSelectors = [
      '.historical-eye-stage',
      '.launch-logo',
      '.launch-core-glow',
      '.launch-orbit',
      '.launch-sweep',
    ]
    for (const selector of movingSelectors) {
      const animationName = await page.locator(selector).first().evaluate((element) => getComputedStyle(element).animationName)
      assert.equal(animationName, 'none', `${selector} still animates`)
    }

    await page.mouse.move(1180, 80)
    await page.waitForTimeout(250)
    const logoTransform = await page.locator('.launch-logo').evaluate((element) => getComputedStyle(element).transform)
    const atmosphereTransform = await page.locator('.launch-atmosphere').evaluate((element) => getComputedStyle(element).transform)
    assert.equal(logoTransform, 'none')
    assert.equal(atmosphereTransform, 'none')
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

async function assertVisible(page, selector) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 5000 })
}

async function sha256Hex(buffer) {
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(buffer).digest('hex')
}

async function visibleColorAudit(page) {
  return page.evaluate(() => {
    const blueCyanTeal = []
    const elements = Array.from(document.querySelectorAll('body *')).filter((element) => {
      const box = element.getBoundingClientRect()
      return box.width > 0 && box.height > 0
    })

    for (const element of elements) {
      const style = getComputedStyle(element)
      for (const property of ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor']) {
        const match = style[property].match(/rgba?\(([^)]+)\)/)
        if (!match) continue
        const [red, green, blue] = match[1].split(',').map((value) => Number.parseFloat(value.trim()))
        if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)) continue
        const isBlueCyanTeal = blue > 95 && green > 65 && red < 90
        if (isBlueCyanTeal) {
          blueCyanTeal.push({ selector: element.className || element.tagName, property, value: style[property] })
        }
      }
    }

    return { blueCyanTeal }
  })
}
