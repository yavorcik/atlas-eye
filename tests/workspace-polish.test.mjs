import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.ATLAS_PREVIEW_URL || 'http://127.0.0.1:4173'
const output = process.env.ATLAS_PREVIEW_URL ? 'test-artifacts/polish-preview' : 'test-artifacts/polish-local'
const action = 'Review the replacement quality program and confirm its applicability and supersession of Revision B.'

test('customer polish, actual exports and printable reports on desktop and mobile', async () => {
  await mkdir(output, { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const width of [1366, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, acceptDownloads: true })
      const page = await context.newPage()
      const tab = name => page.locator('.project-tabs').getByRole('button', { name, exact: true }).click()
      const contains = async (selector, text) => {
        await page.waitForFunction(({ selector, text }) => document.querySelector(selector)?.innerText.includes(text), { selector, text })
      }
      const capture = async name => {
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${name} ${width}`)
        await page.screenshot({ path: `${output}/${width}-${name}.png`, fullPage: true })
      }
      await page.goto(`${base}/mission-control/`)
      await page.locator('.project-card').first().waitFor()
      await capture('dashboard')
      for (const [route, id, cta] of [
        ['nuclear-readiness', 'reactor-app', 'View your application draft'],
        ['evidence', 'supplier-qualification', 'View your supplier review report'],
        ['transportation', 'fuel-transport', 'View your transportation report'],
      ]) {
        await page.goto(`${base}/mission-control/${route}/`)
        if (id === 'reactor-app') {
          await tab('Requirements / application')
          for (let n = 0; n < 14; n++) {
            await page.locator('textarea').first().fill(`Customer answer ${n}`)
            await page.getByRole('button', { name: n === 13 ? 'Finish guided demonstration' : 'Save and continue', exact: true }).click()
          }
          await page.getByTestId('part53-results').waitFor()
        } else if (id === 'supplier-qualification') {
          await tab('Requirements')
          await page.getByRole('button', { name: 'Load sample evidence', exact: true }).first().click()
          await tab('Findings and actions')
          await contains('body', action)
          await tab('Overview')
          await contains('body', action)
          await page.waitForTimeout(150)
          await page.goto(`${base}/mission-control/`)
          await contains('.project-list', action)
          await page.goto(`${base}/mission-control/evidence/`)
          await tab('Overview')
        } else {
          await page.getByRole('button', { name: 'Load sample package evidence', exact: true }).click()
          await page.getByRole('button', { name: 'Resolve HRCQ facts', exact: true }).click()
          await page.getByRole('button', { name: 'Load sample emergency response evidence', exact: true }).click()
          await page.getByLabel('Emergency response evidence').selectOption('domestic_supported')
          await page.getByRole('button', { name: 'Assign demo reviewer' }).click()
          await contains('[data-testid="transport-evaluation-state"]', 'ready for review')
          await page.getByRole('button', { name: 'Simulate governed acceptance' }).click()
          await contains('[data-testid="transport-evaluation-state"]', 'acceptance is current')
          await page.getByLabel('U-235 enrichment wt%').fill('19.50')
          await contains('[data-testid="transport-evaluation-state"]', 'previous review no longer applies')
          await tab('History')
          await page.getByText('Evaluation details and prior records', { exact: true }).click()
          await contains('body', 'Fingerprint:')
          await tab('Requirements')
        }
        await capture(`${id}-work`)
        await page.getByRole('button', { name: cta, exact: true }).focus()
        await page.keyboard.press('Enter')
        assert.equal(await page.getByRole('heading', { name: 'Project Report', exact: true }).evaluate(el => el === document.activeElement), true)
        await capture(`${id}-report`)
        const screen = await page.locator('.print-report').innerText()
        for (const [label, ext] of [['Download HTML report', 'html'], ['Download evidence/action register', 'csv']]) {
          const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label, exact: true }).click()])
          const file = `${output}/${width}-${id}.${ext}`
          await download.saveAs(file)
          const content = await readFile(file, 'utf8')
          assert.match(content, /Review needed|Evidence gap/)
          assert.match(content, /scope/i)
          assert.match(content, /demo limitations/i)
          assert.match(content, /review/i)
          if (ext === 'csv') assert.match(content, /Action,Responsible role/)
          if (id === 'supplier-qualification') assert.ok(content.includes(action))
          if (id === 'reactor-app') assert.ok(content.includes('Customer answer 13'))
          if (id === 'fuel-transport') {
            assert.ok(content.includes('19.50'))
            assert.ok(content.includes('previous review no longer applies'))
            assert.ok(!content.includes('Demonstration-only acceptance is current'))
          }
          if (ext === 'html') {
            const document = await context.newPage()
            await document.goto(`file://${process.cwd()}/${file}`)
            assert.equal((await document.locator('h1').innerText()), screen.split('\n')[0])
            await document.pdf({ path: `${output}/${width}-${id}.pdf`, format: 'A4' })
            await document.screenshot({ path: `${output}/${width}-${id}-download.png`, fullPage: true })
            await document.close()
          }
        }
        await page.reload()
        await tab(id === 'reactor-app' ? 'Requirements / application' : 'Overview')
        if (id === 'reactor-app') await contains('body', 'Customer answer 13')
        if (id === 'supplier-qualification') await contains('body', action)
      }
      await context.close()
    }
  } finally { await browser.close() }
})
