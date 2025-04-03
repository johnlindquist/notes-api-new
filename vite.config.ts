/// <reference types="vitest" />
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrHotReload from 'vite-plugin-ssr-hot-reload'

export default defineConfig({
  plugins: [
    ssrHotReload(),
    // Conditionally add cloudflare plugin only when not running tests
    !process.env.VITEST ? cloudflare() : null,
  ],
  test: {
    globals: true,
    environment: 'edge-runtime',
  },
})
