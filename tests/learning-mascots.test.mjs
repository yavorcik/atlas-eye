import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const page = await readFile(new URL('../public/learn/index.html', import.meta.url), 'utf8')
const css = await readFile(new URL('../public/learn/acquisition.css', import.meta.url), 'utf8')

test('each character stays with its own labeled example and has accessible dimensions', async () => {
  for (const [id, filename, alt] of [
    ['scout', 'scout-border-collie.svg', 'Scout, the black-and-white border collie mascot'],
    ['moxie', 'moxie-liver.svg', 'Moxie, the smiling liver mascot'],
  ]) {
    const start = page.indexOf(`id="${id}"`)
    const section = page.slice(start, page.indexOf('</section>', start))
    assert.ok(section.includes(`./characters/${filename}`))
    assert.ok(section.includes(`alt="${alt}`))
    assert.match(section, /<img[^>]+width="\d+" height="\d+" loading="lazy" decoding="async"/)
    const svg = await readFile(new URL(`../public/learn/characters/${filename}`, import.meta.url), 'utf8')
    assert.match(svg, /<title id="title">/)
    assert.doesNotMatch(svg, /<script|<foreignObject|<animate|https?:\/\/(?!www.w3.org)/)
  }
})

test('characters remain responsive and add no animation or external requests', () => {
  assert.match(css, /\.agent-character img\s*\{[^}]*max-width: 100%;[^}]*height: auto;/)
  assert.match(css, /@media \(max-width: 700px\)\s*\{\s*\.moxie-intro\s*\{\s*grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(page, /acquisition.css\?v=20261110-mascots/)
})
