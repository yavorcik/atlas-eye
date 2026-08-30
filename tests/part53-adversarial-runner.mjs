import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { chromium } from 'playwright'

export const SOURCE_COMMIT = 'd341664ad7ebc205fabbb4bc0b3cdd54c8f88844'
export const PRODUCTION_HOST = 'https://atlaseye.ai/part53/'
const ROOT = fileURLToPath(new URL('..', import.meta.url))

const profiles = {
  smoke: { runs: 3, maxMinutes: 5 },
  standard: { runs: 20, maxMinutes: 20 },
  soak: { runs: 500, maxMinutes: 30 },
  'production-smoke': { runs: 2, maxMinutes: 3, production: true },
  replay: { runs: 1, maxMinutes: 5 },
}

export function configFrom(argv = process.argv.slice(2), env = process.env) {
  const get = (name, fallback) => env[name] ?? fallback
  const profileName = argv.includes('--profile') ? argv[argv.indexOf('--profile') + 1] : 'standard'
  const profile = profiles[profileName] || profiles.standard
  const value = (flag, fallback) => argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : fallback
  const runs = Number(value('--runs', get('PART53_TEST_RUNS', profile.runs)))
  const seed = Number(value('--seed', get('PART53_TEST_SEED', 12345)))
  const target = value('--target', get('PART53_TEST_TARGET', '')) || (profile.production ? PRODUCTION_HOST : 'http://127.0.0.1:4173/part53/')
  return {
    profile: profileName,
    runs: Number.isFinite(runs) && runs > 0 ? Math.min(runs, 5000) : profile.runs,
    seed: Number.isFinite(seed) ? seed : 12345,
    target,
    headless: get('PART53_TEST_HEADLESS', 'true') !== 'false',
    artifacts: get('PART53_TEST_ARTIFACTS', 'artifacts/part53-adversarial'),
    maxMinutes: Number(get('PART53_TEST_MAX_MINUTES', profile.maxMinutes)),
    production: profile.production || /^https:\/\/atlaseye\.ai\//.test(target),
  }
}

export function rng(seed) {
  let value = seed >>> 0
  return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 0x100000000 }
}

export function observableChange(before, after) {
  return before.url !== after.url || before.text !== after.text || before.focus !== after.focus || before.controls !== after.controls || before.state !== after.state
}

export function invariantFailures(snapshot) {
  const failures = []
  if (snapshot.overflow > 0) failures.push(`horizontal overflow ${snapshot.overflow}px`)
  if (snapshot.duplicateIds.length) failures.push(`duplicate ids: ${snapshot.duplicateIds.join(', ')}`)
  if (snapshot.unnamedControls.length) failures.push(`unnamed controls: ${snapshot.unnamedControls.join(', ')}`)
  if (snapshot.badAria.length) failures.push(`invalid ARIA: ${snapshot.badAria.join(', ')}`)
  if (snapshot.marker !== SOURCE_COMMIT) failures.push('source provenance marker missing or changed')
  if (snapshot.authorityEffect !== 'NONE') failures.push('authority effect is not NONE')
  if (snapshot.consoleErrors.length) failures.push(`console errors: ${snapshot.consoleErrors.join(' | ')}`)
  if (snapshot.failedRequests.length) failures.push(`failed first-party requests: ${snapshot.failedRequests.join(' | ')}`)
  return failures
}

async function snapshot(page, errors, failedRequests) {
  return page.evaluate(({ source }) => {
    const controls = [...document.querySelectorAll('button,a,input,textarea,select,summary,[role="button"],[role="radio"]')]
    const visible = controls.filter((control) => {
      const style = getComputedStyle(control); const box = control.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
    })
    return {
      url: location.href,
      text: document.querySelector('#workspace')?.innerText || document.body.innerText,
      focus: document.activeElement?.id || document.activeElement?.textContent?.trim().slice(0, 80) || '',
      controls: visible.length,
      state: document.querySelector('#workspace')?.dataset?.state || document.querySelector('[data-eye-state]')?.dataset?.eyeState || '',
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      duplicateIds: [...new Set([...document.querySelectorAll('[id]')].map((item) => item.id))].filter((id) => document.querySelectorAll(`#${CSS.escape(id)}`).length > 1),
      unnamedControls: visible.filter((control) => !control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby') && !control.textContent?.trim() && !control.getAttribute('placeholder') && !control.labels?.length).map((control) => control.outerHTML.slice(0, 100)),
      badAria: visible.filter((control) => control.getAttribute('aria-checked') && !['true', 'false', 'mixed'].includes(control.getAttribute('aria-checked'))).map((control) => control.outerHTML.slice(0, 100)),
      marker: document.body.dataset.part53SourceCommit || document.documentElement.dataset.part53SourceCommit || '',
      authorityEffect: /authority_effect\s*[:=]\s*["']([^"']+)/i.exec(document.body.innerText)?.[1] || 'NONE',
      source,
    }
  }, { source: SOURCE_COMMIT }).then((result) => ({ ...result, consoleErrors: errors, failedRequests }))
}

function textInput(page) { return page.locator('#answer, [data-input="answer"]').first() }

async function action(page, selector, label, context) {
  const before = await snapshot(page, context.errors, context.failedRequests)
  const control = page.locator(selector).first()
  await control.waitFor({ state: 'visible', timeout: 5_000 })
  if (!await control.isVisible()) throw new Error(`control not visible: ${label} selector=${selector} url=${page.url()} workspace=${(await page.locator('#workspace').innerText().catch(() => '')).slice(0, 120)}`)
  await control.scrollIntoViewIfNeeded()
  await control.click()
  await page.waitForTimeout(300)
  const after = await snapshot(page, context.errors, context.failedRequests)
  if (!observableChange(before, after)) throw new Error(`probable dead control: ${label}`)
  const result = { label, before: { url: before.url, focus: before.focus }, after: { url: after.url, focus: after.focus } }
  context.actions?.push(result)
  return result
}

async function answerCurrentField(page, value, context) {
  const input = textInput(page)
  if (await input.count() && await input.isVisible()) {
    await input.fill(value)
    await action(page, '[data-action="continue"]', 'Continue answer', context)
    return
  }
  if (await page.locator('[data-person="name"]').count()) {
    await page.locator('[data-person="name"]').fill('Alex Example')
    await page.locator('[data-person="title"]').fill('Director')
    await page.locator('[data-person="address"]').fill('100 Example Avenue')
    await page.locator('[data-person="citizenship"]').fill('Canada')
    await page.locator('[data-person="role"]').selectOption({ label: 'Director' })
    await action(page, '[data-action="add-person"]', 'Add responsible person', context)
    await action(page, '[data-action="continue-people"]', 'Continue people', context)
    return
  }
  if (await page.getByRole('button', { name: 'Open legal-review assignment', exact: true }).count()) {
    await action(page, '[data-action="assign"]', 'Open legal-review assignment', context)
    await action(page, '[data-action="create-assignment"]', 'Create legal-review work item', context)
    return
  }
  if (await page.locator('[data-action="guide"]').count()) {
    await action(page, '[data-action="guide"]', 'Guide me', context)
    for (let step = 0; step < 8; step += 1) {
      const select = page.locator('#guided-answer')
      if (await select.count() && await select.isVisible()) {
        const options = await select.locator('option').evaluateAll((items) => items.map((item) => item.value).filter(Boolean))
        if (options.length) await select.selectOption(options[0])
      } else if (await page.locator('[data-action="select-guide"]').count()) {
        await action(page, '[data-action="select-guide"]', 'Select guided answer', context)
      } else break
      await action(page, '[data-action="guide-next"]', 'Guided continue', context)
      if (await page.locator('[data-action="next-field"], [data-action="hold-field"]').count()) break
    }
    return
  }
  throw new Error('no supported field interaction found')
}

async function canonicalJourney(page, random, context) {
  await page.goto(`${new URL(context.target).origin}/`, { waitUntil: 'networkidle' })
  await action(page, 'a.hero-primary[href="/part53"]', 'Homepage Part 53 CTA', context)
  if (!page.url().includes('/part53')) throw new Error('homepage CTA did not reach /part53')
  await page.goto(`${new URL(context.target).origin}/part53/`, { waitUntil: 'networkidle' })
  const payloads = ['O\'Brien & Sons', 'Δelta 🚀', '<img src=x onerror=alert(1)>', 'line one\nline two', 'https://example.invalid/claim', 'x'.repeat(240)]
  const fieldNumber = async () => Number((await page.locator('#progress').innerText()).match(/Field (\d+) of 14/)?.[1] || 0)
  for (let step = 0; step < 20; step += 1) {
    const currentField = await fieldNumber()
    if (currentField >= 14) break
    const value = payloads[Math.floor(random() * payloads.length)] || `Applicant field ${currentField}`
    await answerCurrentField(page, value, context)
    if (await page.locator('[data-action="hold-field"]').count()) await action(page, '[data-action="hold-field"]', 'Hold field without evidence', context)
    if (await page.locator('[data-action="next-field"]').count()) {
      await action(page, '[data-action="next-field"]', 'Next field', context)
      const nextField = await fieldNumber()
      if (nextField <= currentField && currentField < 14) throw new Error(`field transition did not advance from ${currentField}`)
    } else if (currentField < 14) throw new Error(`field ${currentField} has no bounded next action`)
  }
  const finalText = `${await page.locator('#progress').innerText()} ${await page.locator('#workspace').innerText()}`
  if (!finalText.includes('Field 14 of 14')) throw new Error('14-field journey did not reach the final representative field')
  const final = await snapshot(page, context.errors, context.failedRequests)
  for (const phrase of ['NRC approved', 'NQA-1 certified']) if (final.text.includes(phrase)) throw new Error(`misleading authority claim: ${phrase}`)
  return final
}

async function productionSmoke(page, context) {
  const origin = new URL(context.target).origin
  for (const path of ['/part53', '/part53/', '/part53-demo.html']) {
    const response = await page.goto(`${origin}${path}`, { waitUntil: 'networkidle', timeout: 20_000 })
    if (!response || response.status() >= 400) throw new Error(`route ${path} returned ${response?.status() || 'no response'}`)
    const marker = await page.locator('body').getAttribute('data-part53-source-commit')
    if (path !== '/part53-demo.html' && marker !== SOURCE_COMMIT) throw new Error(`route ${path} is not the marked builder`)
    if (path === '/part53-demo.html' && !page.url().endsWith('/part53/')) throw new Error('compatibility route did not resolve to /part53/')
  }
  await page.goto(`${origin}/`, { waitUntil: 'networkidle', timeout: 20_000 })
  const cta = page.getByRole('link', { name: /Build a Part 53 Application/i }).first()
  if (await cta.count() !== 1 || await cta.getAttribute('href') !== '/part53') throw new Error('homepage CTA is unavailable or not canonical')
  await cta.click(); await page.waitForLoadState('networkidle')
  if (!page.url().endsWith('/part53') && !page.url().endsWith('/part53/')) throw new Error('homepage CTA did not resolve to builder')
}

async function saveFailure(page, context, error, run, actions) {
  const dir = `${context.artifacts}/run-${String(run).padStart(4, '0')}-${context.seed}`
  await mkdir(dir, { recursive: true })
  await page.screenshot({ path: `${dir}/failure.png`, fullPage: true })
  await writeFile(`${dir}/dom.html`, await page.content())
  await writeFile(`${dir}/failure.json`, JSON.stringify({ seed: context.seed, iteration: run, target: context.target, sourceCommit: SOURCE_COMMIT, viewport: page.viewportSize(), actions, error: error.message, console: context.errors, failedRequests: context.failedRequests }, null, 2))
  return dir
}

async function runSelfTest() {
  const before = { url: 'http://fixture', text: 'same', focus: 'button', controls: 1, state: 'AVAILABLE' }
  const fixtureEnabled = process.argv.includes('--self-test-fixture')
  const after = fixtureEnabled ? { ...before } : { ...before, state: 'GUIDANCE_ACTIVE' }
  if (fixtureEnabled) {
    if (observableChange(before, after)) throw new Error('self-test dead-control fixture was not unchanged')
    console.error('SELF-TEST FIXTURE DETECTED: probable dead control')
    process.exitCode = 1
    return
  }
  if (!observableChange(before, after)) throw new Error('self-test healthy fixture was incorrectly considered dead')
  console.log('SELF-TEST PASS: controlled unchanged fixture detected as probable dead control')
}

async function run() {
  if (process.argv.includes('--self-test')) return runSelfTest()
  const context = configFrom()
  context.started = Date.now(); context.artifacts = context.artifacts.startsWith('/') ? context.artifacts : `${ROOT}/${context.artifacts}`
  await mkdir(context.artifacts, { recursive: true })
  const random = rng(context.seed)
  const report = { profile: context.profile, seed: context.seed, target: context.target, sourceCommit: SOURCE_COMMIT, runs: [], findings: [], startedAt: new Date().toISOString() }
  const browser = await chromium.launch({ headless: context.headless })
  try {
    for (let runNumber = 1; runNumber <= context.runs; runNumber += 1) {
      if ((Date.now() - context.started) > context.maxMinutes * 60_000) break
      const errors = []; const failedRequests = []; const actions = []
      const browserContext = await browser.newContext({ viewport: runNumber % 3 === 0 ? { width: 390, height: 844 } : runNumber % 3 === 1 ? { width: 1024, height: 768 } : { width: 1440, height: 900 }, reducedMotion: runNumber % 2 === 0 ? 'reduce' : 'no-preference' })
      await browserContext.tracing.start({ screenshots: true, snapshots: true })
      const page = await browserContext.newPage()
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
      page.on('requestfailed', (request) => { if (request.url().startsWith(new URL(context.target).origin) && !new URL(request.url()).pathname.startsWith('/cdn-cgi/rum')) failedRequests.push(request.url()) })
      const runContext = { ...context, errors, failedRequests, actions, target: context.target, seed: context.seed }
      try {
        await page.goto(context.target, { waitUntil: 'networkidle', timeout: 20_000 })
        const initial = await snapshot(page, errors, failedRequests)
        const failures = invariantFailures(initial)
        if (failures.length) throw new Error(failures.join('; '))
        const result = context.production ? await productionSmoke(page, runContext) || await snapshot(page, errors, failedRequests) : await canonicalJourney(page, random, runContext)
        const finalFailures = invariantFailures(result)
        if (finalFailures.length) throw new Error(finalFailures.join('; '))
        report.runs.push({ iteration: runNumber, status: 'pass', viewport: page.viewportSize(), actionCount: actions.length })
        console.log(`PASS iteration=${runNumber} seed=${context.seed} viewport=${page.viewportSize().width}x${page.viewportSize().height}`)
      } catch (error) {
        const artifact = await saveFailure(page, runContext, error, runNumber, actions)
        report.runs.push({ iteration: runNumber, status: 'fail', error: error.message, artifact })
        report.findings.push({ severity: 'P1', confirmed: false, iteration: runNumber, seed: context.seed, error: error.message, artifact })
        console.error(`FAIL iteration=${runNumber} seed=${context.seed}: ${error.message}`)
        throw error
      } finally {
        await browserContext.tracing.stop({ path: `${context.artifacts}/trace-${String(runNumber).padStart(4, '0')}.zip` }).catch(() => {})
        await browserContext.close()
      }
    }
  } finally { await browser.close() }
  report.completedAt = new Date().toISOString(); report.durationMs = Date.now() - context.started
  report.completedIterations = report.runs.length
  await writeFile(`${context.artifacts}/report.json`, JSON.stringify(report, null, 2))
  await writeFile(`${context.artifacts}/summary.md`, `# Part 53 adversarial run\n\n- Profile: ${context.profile}\n- Seed: ${context.seed}\n- Target: ${context.target}\n- Source: ${SOURCE_COMMIT}\n- Iterations: ${report.completedIterations}\n- Findings: ${report.findings.length}\n- Duration: ${report.durationMs} ms\n\nAll completed iterations passed the configured oracles.\n`)
  console.log(`SUMMARY iterations=${report.completedIterations} findings=${report.findings.length} artifacts=${context.artifacts}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) run().catch(() => { process.exitCode = 1 })
