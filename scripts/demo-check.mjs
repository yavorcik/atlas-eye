import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const SOURCE_COMMIT = 'd341664ad7ebc205fabbb4bc0b3cdd54c8f88844'
const defaultArtifacts = process.env.PART53_DEMO_ARTIFACTS || 'artifacts/part53-demo'
const mode = process.argv.includes('--rehearsal') ? 'rehearsal' : 'preflight'
const target = process.env.PART53_DEMO_TARGET || (mode === 'preflight' ? 'https://atlaseye.ai/part53/' : 'http://127.0.0.1:4173/part53/')
const artifacts = defaultArtifacts.startsWith('/') ? defaultArtifacts : new URL(`../${defaultArtifacts}/`, import.meta.url).pathname

const errors = []
const failedRequests = []
const actions = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function relativePath(url) {
  try { return new URL(url).pathname } catch { return url }
}

async function snapshot(page) {
  return page.evaluate(() => {
    const controls = [...document.querySelectorAll('button,a,input,textarea,select,summary,[role="button"],[role="radio"]')]
    const visible = controls.filter((control) => {
      const style = getComputedStyle(control); const box = control.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
    })
    return {
      url: location.href,
      workspace: Boolean(document.querySelector('#workspace')),
      marker: document.body.dataset.part53SourceCommit || '',
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      unnamed: visible.filter((control) => !control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby') && !control.textContent?.trim() && !control.getAttribute('placeholder') && !control.labels?.length).map((control) => control.outerHTML.slice(0, 160)),
      progress: document.querySelector('#progress')?.innerText || '',
      primary: [...document.querySelectorAll('button.primary')].filter((button) => button.offsetParent !== null).map((button) => button.innerText.trim()),
    }
  })
}

async function observeAction(page, selector, label) {
  const before = await snapshot(page)
  const control = page.locator(selector).first()
  await control.waitFor({ state: 'visible', timeout: 8_000 })
  await control.scrollIntoViewIfNeeded()
  await control.click()
  await page.waitForTimeout(300)
  const after = await snapshot(page)
  assert(before.url !== after.url || before.progress !== after.progress || before.workspace !== after.workspace || before.primary.join('|') !== after.primary.join('|'), `no observable result for ${label}`)
  actions.push({ label, before: { url: before.url, progress: before.progress }, after: { url: after.url, progress: after.progress } })
}

async function visit(page, path, expectedMarker = true) {
  const response = await page.goto(new URL(path, new URL(target).origin).href, { waitUntil: 'networkidle', timeout: 20_000 })
  assert(response && response.status() < 400, `${path} returned ${response?.status() || 'no response'}`)
  const state = await snapshot(page)
  if (expectedMarker) assert(state.marker === SOURCE_COMMIT, `${path} source marker is missing or changed`)
  assert(state.workspace, `${path} does not render the Part 53 builder workspace`)
  assert(state.overflow === 0, `${path} has ${state.overflow}px horizontal overflow`)
  assert(state.unnamed.length === 0, `${path} has unnamed visible controls`)
}

async function canonical(page) {
  await visit(page, '/part53/')
  const input = page.locator('#answer, [data-input="answer"]').first()
  await input.fill('Demo presenter organization')
  await observeAction(page, '[data-action="continue"]', 'confirm legal name')
  await observeAction(page, '[data-action="hold-field"]', 'hold without supporting document')
  await observeAction(page, '[data-action="next-field"]', 'continue to applicant address')
  const final = await snapshot(page)
  assert(final.progress.includes('Field 2 of 14'), 'canonical journey did not reach applicant address')
}

async function run() {
  const startedAt = new Date().toISOString()
  await mkdir(artifacts, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: mode === 'rehearsal' ? 'reduce' : 'no-preference' })
  const page = await context.newPage()
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('requestfailed', (request) => { if (request.url().startsWith(new URL(target).origin) && !relativePath(request.url()).startsWith('/cdn-cgi/rum')) failedRequests.push(request.url()) })
  await context.tracing.start({ screenshots: true, snapshots: true })
  let result
  try {
    await page.goto(new URL('/', new URL(target).origin).href, { waitUntil: 'networkidle', timeout: 20_000 })
    const home = await snapshot(page)
    assert(home.overflow === 0, `homepage has ${home.overflow}px horizontal overflow`)
    const cta = page.getByRole('link', { name: /Build a Part 53 Application/i }).first()
    assert(await cta.count() === 1 && await cta.getAttribute('href') === '/part53', 'homepage primary CTA is not canonical')
    await observeAction(page, 'a.hero-primary[href="/part53"]', 'homepage primary CTA')
    if (mode === 'preflight') {
      await visit(page, '/part53')
      await visit(page, '/part53/')
      await page.goto(new URL('/part53-demo.html', new URL(target).origin).href, { waitUntil: 'networkidle', timeout: 20_000 })
      assert(page.url().endsWith('/part53/'), 'compatibility route did not resolve to /part53/')
    }
    await canonical(page)
    assert(errors.length === 0, `console errors: ${errors.join(' | ')}`)
    assert(failedRequests.length === 0, `failed first-party requests: ${failedRequests.join(' | ')}`)
    result = { status: 'GO', mode, target, sourceCommit: SOURCE_COMMIT, actions, consoleErrors: errors, failedRequests, startedAt, completedAt: new Date().toISOString() }
    await page.screenshot({ path: `${artifacts}/${mode}-final.png`, fullPage: true })
  } catch (error) {
    result = { status: 'NO-GO', mode, target, sourceCommit: SOURCE_COMMIT, actions, consoleErrors: errors, failedRequests, error: error.message, startedAt, completedAt: new Date().toISOString() }
    await page.screenshot({ path: `${artifacts}/${mode}-failure.png`, fullPage: true }).catch(() => {})
    throw error
  } finally {
    await context.tracing.stop({ path: `${artifacts}/${mode}.zip` }).catch(() => {})
    await context.close(); await browser.close()
    await writeFile(`${artifacts}/${mode}.json`, JSON.stringify(result, null, 2))
    await writeFile(`${artifacts}/${mode}.md`, `# Part 53 ${mode}\n\n- Result: **${result?.status || 'NO-GO'}**\n- Target: ${target}\n- Source: ${SOURCE_COMMIT}\n- Actions: ${actions.length}\n- Console errors: ${errors.length}\n- Failed first-party requests: ${failedRequests.length}\n`)
  }
  console.log(`${result.status}: Part 53 ${mode} passed (${actions.length} actions). Reports: ${artifacts}/${mode}.json and ${artifacts}/${mode}.md`)
}

run().catch((error) => { console.error(`NO-GO: ${error.message}`); process.exitCode = 1 })
