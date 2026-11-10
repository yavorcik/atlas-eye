import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const page = await readFile(new URL('../public/learn/index.html', import.meta.url), 'utf8')
const intake = await readFile(new URL('../public/learn/intake.js', import.meta.url), 'utf8')

function section(id) {
  const start = page.indexOf(`id="${id}"`)
  assert.notEqual(start, -1, `Missing ${id}`)
  return page.slice(start, page.indexOf('</section>', start))
}

test('agent offer and equal build paths precede process, examples and workshop', () => {
  assert.match(page, /<h1[^>]*>AI agents that do work for you, behind the scenes\.<\/h1>/)
  assert.match(page, /What does “headless” mean\?/)
  const order = ['services', 'process', 'examples', 'workshop', 'book', 'projects', 'case-study'].map(id => page.indexOf(`id="${id}"`))
  assert.ok(order.every((n, i) => n >= 0 && (i === 0 || n > order[i - 1])))
  const services = section('services')
  assert.equal((services.match(/class="track service-path"/g) || []).length, 2)
  assert.doesNotMatch(services, /featured/)
  assert.match(services, /Build it for me/)
  assert.match(services, /Build it with me/)
  assert.equal((section('process').match(/<li>/g) || []).length, 4)
})

test('existing commercial terms, workshop and booking links remain available', () => {
  for (const text of ['From $4,500', '$500', 'private 90-minute session', 'Website builds start at $2,500', 'Managed hosting and routine maintenance start at $250/month.', 'any build of $2,500 or more that you book within 30 days.', '2026-11-20T16:00:00-05:00', 'Limited to 25 people', '4:00–4:45 p.m. Eastern', 'https://calendar.app.google/T6uKgFsHYE6okXn28']) assert.ok(page.includes(text), text)
  for (const kind of ['workshop', 'waitlist', 'inquiry']) assert.equal((page.match(new RegExp(`data-intake="${kind}"`, 'g')) || []).length, 1)
  assert.match(page, /id="workshop-waitlist-details"/)
  assert.match(page, /<iframe src="https:\/\/calendar\.google\.com\/calendar\/appointments\/schedules\//)
})

test('examples retain their limits and working interaction hooks', () => {
  for (const text of ['local AI prototype', 'Illustrative workflow · Fictional intake', 'no MyChart connection', 'No diagnosis or lab interpretation.', 'No medication-change advice.', 'no live AI or connected actions', 'Scripted preview.', 'Valley Tote reservations and new payments are closed.']) assert.ok(page.toLowerCase().includes(text.toLowerCase()), text)
  for (const id of ['sample-form', 'sample', 'sample-result', 'sample-found', 'sample-next', 'sample-draft', 'sample-announcement', 'agent-video-dialog', 'agent-video-player']) assert.ok(page.includes(`id="${id}"`), id)
})

test('broadened inquiry collects task, context and build preference with the existing consent flow', () => {
  const inquiry = section('book')
  for (const name of ['context', 'buildPreference', 'task']) assert.match(inquiry, new RegExp(`name="${name}"[^>]*required`))
  for (const value of ['work', 'life', 'both', 'for-me', 'with-me', 'not-sure']) assert.ok(inquiry.includes(`value="${value}"`), value)
  assert.match(inquiry, /name="task"[^>]*maxlength="1200"/)
  assert.match(inquiry, /name="consent"[^>]*required/)
  assert.doesNotMatch(inquiry, /name="(?:business|volume|goal)"/)
  assert.match(intake, /data-build-preference/)
  assert.match(intake, /preference\.value = link\.dataset\.buildPreference/)
})

test('page IDs are unique and every local anchor resolves', () => {
  const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])
  assert.equal(new Set(ids).size, ids.length)
  for (const [, target] of page.matchAll(/href="#([^"\s]+)"/g)) assert.ok(ids.includes(target), `Missing target ${target}`)
  for (const [, target] of page.matchAll(/aria-labelledby="([^"]+)"/g)) assert.ok(ids.includes(target), `Missing label ${target}`)
  for (const id of ['learn', 'custom-bot', 'projects', 'videos', 'demo', 'scout', 'moxie', 'workshop', 'book']) assert.ok(ids.includes(id), `Old anchor ${id}`)
})

test('Atlas Nuclear leads the examples as the flagship with verified public-demo boundaries', () => {
  const exampleStart = page.indexOf('id="examples"')
  const flagshipStart = page.indexOf('id="atlas-nuclear"')
  const valleyStart = page.indexOf('id="valley-smr"')
  const videoStart = page.indexOf('id="videos"')
  assert.ok(exampleStart < flagshipStart && flagshipStart < valleyStart && valleyStart < videoStart)
  const flagship = section('atlas-nuclear')
  assert.match(flagship, /Our flagship agent project/)
  assert.match(flagship, /Atlas Nuclear\./)
  assert.match(flagship, /src="\/brand\/atlas-nuclear-logo.png"/)
  assert.match(flagship, /href="https:\/\/atlaseye.ai\/mission-control\/"/)
  for (const claim of ['Application preparation.', 'Transportation readiness.', 'Evidence control.', 'browser-local storage and simulated review', 'does not submit regulatory applications, authorize shipments or establish supplier qualification']) assert.ok(flagship.includes(claim), claim)
})

test('Valley SMR has a visible main example with the verified address and development caveat', () => {
  const valley = section('valley-smr')
  assert.match(valley, /Website example · Advanced nuclear project development/)
  assert.match(valley, /Youngstown Advanced District Energy/)
  assert.match(valley, /href="https:\/\/valleysmr.com\/"/)
  assert.match(valley, /does not establish regulatory approval, financing or authorization to construct/)
  assert.doesNotMatch(page, /vaslleysmr\.com/)
})
