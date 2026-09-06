import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { env } from 'node:process'

const commit = env.COMMIT_REF || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), {
    name: 'atlas-preview-identity',
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify({ commit }) }) },
  }],
})
