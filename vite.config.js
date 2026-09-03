import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const industrialBaseTarget =
  process.env.ATLAS_NUCLEAR_INDUSTRIAL_BASE_TARGET ||
  process.env.VITE_ATLAS_NUCLEAR_INDUSTRIAL_BASE_TARGET

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: industrialBaseTarget
    ? {
        proxy: {
          '/api/industrial-base': {
            target: industrialBaseTarget,
            changeOrigin: true,
            rewrite: () => '/api/industrial-base-traceability',
          },
        },
      }
    : undefined,
})
