import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const html = await readFile(new URL('../public/learn/connection-check.html', import.meta.url), 'utf8')
const script = await readFile(new URL('../public/learn/connection-check.js', import.meta.url), 'utf8')

test('operator page is noindex with an unnamed password field and no unsafe non-JS submission', () => {
  assert.match(html, /name="robots" content="noindex,nofollow,noarchive"/)
  assert.match(html, /name="referrer" content="no-referrer"/)
  assert.match(html, /form-action 'none'/)
  assert.match(html, /type="password"/)
  assert.doesNotMatch(html.match(/<input[^>]+>/)[0], /\bname=/)
  assert.match(html, /<button type="submit" disabled>/)
  assert.match(html, /src="\.\/connection-check.js"/)
  assert.doesNotMatch(script, /localStorage|sessionStorage|console\.|location\.|sendBeacon/)
})

test('operator click sends only authorized diagnostic headers, clears key and never retries', async () => {
  for (const outcome of [200, 404, 'failure']) {
    let listener, calls = 0, release
    const gate = new Promise(resolve => { release = resolve })
    const input = { value: 'a'.repeat(64), disabled: false }
    const button = { disabled: true }, status = { textContent: '' }
    const form = { querySelector: () => button, addEventListener: (_, cb) => { listener = cb } }
    runInNewContext(script, {
      document: { getElementById: id => ({ 'connection-check': form, 'verification-key': input, 'check-status': status })[id] },
      AbortSignal,
      fetch: async (url, options) => {
        calls++
        assert.equal(url, '/learn/intake')
        assert.equal(options.method, 'POST')
        assert.equal(options.headers['X-Workshop-Diagnostic'], 'verify-smtp')
        assert.equal(options.headers.Authorization, `Bearer ${'a'.repeat(64)}`)
        assert.equal(options.body, undefined)
        assert.equal(options.mode, 'same-origin')
        assert.equal(options.redirect, 'error')
        assert.equal(input.value, '')
        await gate
        if (outcome === 'failure') throw new Error('private provider error')
        return { status: outcome }
      },
    })
    assert.equal(calls, 0)
    const pending = listener({ preventDefault() {} })
    assert.equal(button.disabled, true)
    assert.equal(input.disabled, true)
    await listener({ preventDefault() {} })
    assert.equal(calls, 1)
    release()
    await pending
    await listener({ preventDefault() {} })
    assert.equal(calls, 1)
    assert.equal(input.value, '')
    assert.doesNotMatch(status.textContent, /private provider error|aaaa|auth_failed/)
    assert.match(status.textContent, /private operator records/)
  }
})

test('invalid input is cleared without any request', async () => {
  let listener
  const input = { value: 'not-a-verification-key' }, button = {}, status = {}
  const form = { querySelector: () => button, addEventListener: (_, cb) => { listener = cb } }
  runInNewContext(script, {
    document: { getElementById: id => ({ 'connection-check': form, 'verification-key': input, 'check-status': status })[id] },
    fetch: () => assert.fail('Invalid input must not make a request'),
  })
  await listener({ preventDefault() {} })
  assert.equal(input.value, '')
  assert.match(status.textContent, /valid temporary/)
})
