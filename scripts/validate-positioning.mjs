import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const publicText = app.toLowerCase()

for (const prohibited of [
  'cognitive operating system',
  'ai operating system for nuclear',
  'nuclear intelligence operating layer',
  'general nuclear cognition',
  'autonomous nuclear decision-maker',
  'end-to-end nuclear operating system',
]) assert.equal(publicText.includes(prohibited), false, `prohibited positioning: ${prohibited}`)

assert.match(app, /An SMR project-readiness and evidence-control platform\./)
assert.match(app, /Know what is ready\. Know what is missing\. Know what must happen next\./)
assert.match(app, /Run the guided demonstration/)
assert.match(app, /https:\/\/lab\.atlaseye\.ai/)
assert.match(app, /Atlas does not design reactors, license projects, operate reactors/)

console.log('Atlas Eye positioning controls: PASS')
