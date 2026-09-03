import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { chromium } from 'playwright'
import { industrialBaseFixture } from './industrialBaseFixture.mjs'

const BASE_URL = 'http://127.0.0.1:4173'

async function server() {
  const child = spawn(
    './node_modules/.bin/vite',
    ['preview', '--host', '127.0.0.1', '--port', '4173'],
    { detached: true, stdio: 'ignore' },
  )
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

test('Mission Control selector opens Suppliers & Components governed workspace', async () => {
  await ensureBuild()
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1366, height: 820 },
  })

  try {
    await routeIndustrialBase(page, industrialBaseFixture())
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
    await page.click('[data-primary-cover-cta="true"]')
    await page.waitForURL('**/mission-control/')
    await assertVisible(page, 'text=SUPPLIERS & COMPONENTS')
    await assertVisible(
      page,
      'text=Trace qualified suppliers, nuclear craft, components, evidence, and installed configuration.',
    )
    await page.click('a[href="/industrial-base/"]')
    await page.waitForURL('**/industrial-base/')
    await assertVisible(page, 'text=Governed component traceability.')
    await assertVisible(page, 'text=Lokring Technology LLC')
    await assertVisible(page, 'text=Lokring Midwest')
    await assertVisible(page, 'text=SUPPLIER_CLAIM_UNVERIFIED')
    await page.click('button:has-text("QUALIFY")')
    await assertVisible(page, 'text=Willoughby, Ohio')
    await assertVisible(page, 'text=EV-PUBLIC-NRC-EXELON-N879-SE')
    assert.equal(
      await page.locator('a[href="#evidence-EV-PUBLIC-NRC-EXELON-N879-SE"]').count() > 0,
      true,
    )
    await page.click('button:has-text("PROCURE")')
    await assertVisible(page, 'text=IB-CMP-LOK-0001')
    await page.click('text=TRACE THIS COMPONENT')
    await assertVisible(page, 'text=Who manufactured it?')
    await assertVisible(page, 'text=Are there unresolved deviations or NCRs?')
    await page.click('button:has-text("RECEIVE")')
    await assertVisible(page, 'text=FINDING-LOKRING-HEAT-MISMATCH')
    await assertVisible(page, 'text=TASK-LOKRING-MTR-HEAT-RESOLUTION')
    await page.click('button:has-text("DEMONSTRATE")')
    await assertVisible(page, 'text=CURRENT GOVERNED STATUS')
    await assertVisible(page, 'text=RECORDED DEMONSTRATION HISTORY')
    await assertVisible(page, 'text=BLOCKED')
    assert.equal(
      await page.locator('text=HUMAN_ACCEPTED_FOR_DEFINED_SCOPE').count(),
      0,
    )
    await page.click('text=View recorded resolution evidence')
    await assertVisible(page, 'text=RESOLUTION_EVIDENCE_SUBMITTED')
    assert.equal(
      await page.locator('text=View recorded scoped decision').count(),
      0,
    )
    await page.click('text=View recorded human-review routing')
    await assertVisible(page, 'text=READY_FOR_HUMAN_REVIEW')
    await page.click('text=View recorded scoped decision')
    await assertVisible(page, 'text=HUMAN_ACCEPTED_FOR_DEFINED_SCOPE')
    await assertVisible(page, 'text=EV-CONTROLLED-HUMAN-DECISION-LOK-0001')
    await assertVisible(page, 'text=c1a64d91116cf0924f5f1d70a6f4f681fdda009e1ae0b9d303c27d3e47490722')
    await assertVisible(page, 'text=CURRENT GOVERNED STATUS')
    const currentStatusText = await page.locator('.industrial-status-split').innerText()
    assert.match(currentStatusText, /CURRENT GOVERNED STATUS\s+BLOCKED/)
    assert.match(currentStatusText, /RECORDED DEMONSTRATION HISTORY\s+HUMAN_ACCEPTED_FOR_DEFINED_SCOPE/)
    assert.deepEqual(await colorAudit(page), [])
    const body = await page.locator('body').innerText()
    assert.doesNotMatch(body, /NRC-approved supplier|NQA-1 certified|legally authorized/i)
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

test('industrial base workspace fails closed for unavailable and malformed backend data', async () => {
  await ensureBuild()
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
  })

  try {
    await page.route('**/api/industrial-base', (route) => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'down' }),
    }))
    await page.goto(`${BASE_URL}/industrial-base/`, { waitUntil: 'networkidle' })
    await assertVisible(page, 'text=SERVICE UNAVAILABLE')
    await assertVisible(page, 'text=NOT CURRENT')

    await page.unroute('**/api/industrial-base')
    await routeIndustrialBase(page, industrialBaseFixture({
      readiness: {
        status: 'HUMAN_ACCEPTED_FOR_DEFINED_SCOPE',
        ready_for_human_acceptance: true,
        blockers: ['caller supplied acceptance conflicts with open blocker'],
      },
    }))
    await page.reload({ waitUntil: 'networkidle' })
    await assertVisible(page, 'text=SERVICE UNAVAILABLE')
    await assertVisible(page, 'text=unknown status')

    await page.unroute('**/api/industrial-base')
    await routeIndustrialBase(page, industrialBaseFixture({
      generated_at: null,
    }))
    await page.reload({ waitUntil: 'networkidle' })
    await assertVisible(page, 'text=SERVICE UNAVAILABLE')
    await assertVisible(page, 'text=timestamp is missing')
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

test('reload preserves backend current status and no browser mutation endpoint is called', async () => {
  await ensureBuild()
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1366, height: 820 },
  })
  const requests = []

  try {
    await page.route('**/api/industrial-base', (route) => {
      requests.push({
        method: route.request().method(),
        url: route.request().url(),
      })
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(industrialBaseFixture()),
      })
    })
    await page.goto(`${BASE_URL}/industrial-base/`, { waitUntil: 'networkidle' })
    await page.click('button:has-text("DEMONSTRATE")')
    await page.click('text=View recorded resolution evidence')
    await page.click('text=View recorded human-review routing')
    await page.click('text=View recorded scoped decision')
    await assertVisible(page, 'text=HUMAN_ACCEPTED_FOR_DEFINED_SCOPE')
    let currentStatusText = await page.locator('.industrial-status-split').innerText()
    assert.match(currentStatusText, /CURRENT GOVERNED STATUS\s+BLOCKED/)
    await page.reload({ waitUntil: 'networkidle' })
    await page.click('button:has-text("DEMONSTRATE")')
    currentStatusText = await page.locator('.industrial-status-split').innerText()
    assert.match(currentStatusText, /CURRENT GOVERNED STATUS\s+BLOCKED/)
    assert.equal(
      await page.locator('text=HUMAN_ACCEPTED_FOR_DEFINED_SCOPE').count(),
      0,
    )
    assert.deepEqual(
      [...new Set(requests.map((request) => request.method))],
      ['GET'],
    )
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

test('industrial base workspace has no horizontal overflow on mobile', async () => {
  await ensureBuild()
  const child = await server()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
  })

  try {
    await routeIndustrialBase(page, industrialBaseFixture())
    await page.goto(`${BASE_URL}/industrial-base/`, { waitUntil: 'networkidle' })
    await assertVisible(page, 'text=SUPPLIERS & COMPONENTS')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    assert.equal(overflow, false)
  } finally {
    await browser.close()
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
})

async function routeIndustrialBase(page, payload) {
  await page.route('**/api/industrial-base', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  }))
}

async function assertVisible(page, selector) {
  await page.locator(selector).first().waitFor({
    state: 'visible',
    timeout: 5000,
  })
}

async function colorAudit(page) {
  return page.evaluate(() => {
    const findings = []
    for (const element of document.querySelectorAll('.industrial-route *')) {
      const box = element.getBoundingClientRect()
      if (box.width <= 0 || box.height <= 0) continue
      const style = getComputedStyle(element)
      for (const property of [
        'color',
        'backgroundColor',
        'borderTopColor',
        'borderRightColor',
        'borderBottomColor',
        'borderLeftColor',
        'outlineColor',
      ]) {
        const match = style[property].match(/rgba?\(([^)]+)\)/)
        if (!match) continue
        const [red, green, blue] = match[1]
          .split(',')
          .map((value) => Number.parseFloat(value.trim()))
        if (
          Number.isFinite(red) &&
          Number.isFinite(green) &&
          Number.isFinite(blue) &&
          blue > 95 &&
          green > 65 &&
          red < 90
        ) {
          findings.push(`${property}:${style[property]}`)
        }
      }
    }
    return findings
  })
}

async function ensureBuild() {
  await import('node:fs/promises')
    .then((fs) => fs.access('dist/index.html'))
    .catch(() => {
      throw new Error('run npm run build before this browser test')
    })
}
