import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import test from 'node:test'
import { chromium } from 'playwright'

const root = process.cwd()
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' }

async function withServer(run) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    let path = url.pathname
    if (path === '/part53' || path === '/part53/') path = '/part53/index.html'
    const file = join(root, 'public', path.replace(/^\/+/, ''))
    try {
      const body = await readFile(file)
      res.writeHead(200, {'content-type': mime[extname(file)] || 'application/octet-stream'})
      res.end(body)
    } catch {
      res.writeHead(404)
      res.end('not found')
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try { await run(base) } finally { await new Promise((resolve) => server.close(resolve)) }
}

async function completeIntake(page) {
  for (let field = 1; field <= 14; field += 1) {
    const h1 = await page.locator('#workspace h1').innerText()
    if (/directors and principal officers/i.test(h1)) {
      await page.locator('[data-person="name"]').fill(`Person ${field}`)
      await page.locator('[data-person="title"]').fill('Chief Licensing Officer')
      await page.locator('[data-person="address"]').fill('100 Atlas Way, Washington, DC')
      await page.locator('[data-person="citizenship"]').fill('United States')
      await page.locator('[data-action="continue-people"]').click()
    } else if (/legal eligibility review/i.test(h1)) {
      await page.locator('[data-action="create-eligibility"]').click()
    } else {
      await page.locator('[data-input="answer"]').fill(`Answer ${field}: persisted applicant response for field ${field}.`)
      await page.locator('[data-action="continue"]').click()
    }
    if (field < 14) {
      await page.locator('[data-action="hold-field"]').click()
      await page.locator('[data-action="next-field"]').click()
    }
  }
}

test('Part 53 completes the 14-field intake and restores the application summary', async () => {
  await withServer(async (base) => {
    const browser = await chromium.launch({ headless: true })
    try {
      const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
      const page = await context.newPage()
      await page.goto(`${base}/part53/`, { waitUntil: 'networkidle' })

      await completeIntake(page)

      assert.match(await page.locator('#progress').innerText(), /Application foundation complete/)
      assert.match(await page.locator('#workspace').innerText(), /APPLICATION FOUNDATION COMPLETE/)
      assert.doesNotMatch(await page.locator('#workspace').innerText(), /Next, let’s continue with field 14/)
      assert.match(await page.locator('#workspace').innerText(), /NRC SUBMISSION READINESS\s+NOT READY/)
      assert.match(await page.locator('#workspace').innerText(), /EVIDENCE STILL REQUIRED\s+14/)
      assert.match(await page.locator('#workspace').innerText(), /Field 14/)

      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem(window.__PART53_DEMO__.storageKey)))
      assert.equal(stored.interviewState, 'INTAKE_COMPLETE')
      assert.equal(Object.values(stored.answers).filter((answer) => answer.complete).length, 14)
      assert.equal(stored.answers.history.revisions.length, 1)

      await page.reload({ waitUntil: 'networkidle' })
      assert.match(await page.locator('#workspace').innerText(), /APPLICATION FOUNDATION COMPLETE/)

      await page.goto(`${base}/part53/`, { waitUntil: 'networkidle' })
      assert.match(await page.locator('#workspace').innerText(), /APPLICATION FOUNDATION COMPLETE/)

      await page.goBack()
      await page.goForward()
      const afterNavigation = await page.evaluate(() => JSON.parse(localStorage.getItem(window.__PART53_DEMO__.storageKey)))
      assert.equal(afterNavigation.answers.history.revisions.length, 1)

      await page.locator('[data-action="choose-edit"]').click()
      await page.locator('[data-action="edit-field"][data-field="13"]').click()
      await page.locator('[data-input="answer"]').fill('Updated traceability answer with revision history.')
      await page.locator('[data-action="continue"]').click()
      assert.match(await page.locator('#workspace').innerText(), /Updated traceability answer with revision history/)
      const edited = await page.evaluate(() => JSON.parse(localStorage.getItem(window.__PART53_DEMO__.storageKey)))
      assert.equal(edited.answers.history.revisions.length, 2)

      await page.locator('[data-action="preview"]').click()
      assert.match(await page.locator('#drawer').innerText(), /Application preview/)
      assert.match(await page.locator('#drawer').innerText(), /Updated traceability answer with revision history/)

      const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth))
      assert.equal(overflow, 0)
      await page.setViewportSize({ width: 390, height: 844 })
      const mobileOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth))
      assert.equal(mobileOverflow, 0)
    } finally {
      await browser.close()
    }
  })
})

test('Part 53 incomplete workflow resumes at the first unanswered field', async () => {
  await withServer(async (base) => {
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage()
      await page.goto(`${base}/part53/`, { waitUntil: 'networkidle' })
      await page.locator('[data-input="answer"]').fill('Applicant One')
      await page.locator('[data-action="continue"]').click()
      await page.locator('[data-action="hold-field"]').click()
      await page.locator('[data-action="next-field"]').click()
      await page.reload({ waitUntil: 'networkidle' })
      assert.match(await page.locator('#progress').innerText(), /Field 2 of 14/)
      assert.match(await page.locator('#workspace h1').innerText(), /applicant’s address/)
    } finally {
      await browser.close()
    }
  })
})
