import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const document = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const publicText = `${app}\n${document}`.toLowerCase()

for (const prohibited of [
  'cognitive operating system',
  'ai operating system for nuclear',
  'nuclear intelligence operating layer',
  'general nuclear cognition',
  'autonomous nuclear decision-maker',
  'end-to-end nuclear operating system',
]) assert.equal(publicText.includes(prohibited), false, `prohibited positioning: ${prohibited}`)

assert.match(app, /ENTER ATLAS/)
assert.match(app, /ATLAS EYE/)
assert.match(app, /From concept to governed readiness\./)
assert.match(app, /Open a sample project/)
assert.match(app, /saved project workspace/)
assert.match(app, /Piketon Advanced Reactor COL Assembly/)
assert.match(app, /HALEU UF6 Highway Shipment Readiness/)
assert.match(app, /ForgeWorks Safety-Related Valve Supplier Review/)
assert.match(app, /Part 53 Application/)
assert.match(app, /Transportation Readiness/)
assert.match(app, /Evidence \/ Governance/)
assert.match(app, /does not upload documents to Atlas/)
assert.match(app, /does not mean the application is complete or accepted/)
assert.doesNotMatch(app, /href="#|scrollIntoView|location\.hash|hashchange/)
assert.doesNotMatch(app, />Demonstration</)
assert.match(document, /Atlas Nuclear \| SMR Project Readiness \+ Evidence Control/)

console.log('Atlas Eye positioning controls: PASS')
