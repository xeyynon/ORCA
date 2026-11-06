import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'

// The build the user is looking at: short commit, and `+` when the tree had uncommitted changes. Shown on the Data page.
function buildId(): string {
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    const dirty = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() ? '+' : ''
    return `${sha}${dirty}`
  } catch { return 'unknown' }
}

// The API is reached through this proxy in dev, so the browser never crosses
// origins. Point a built bundle at a remote API with VITE_API_BASE instead.
export default defineConfig({
  plugins: [react()],
  define: { __ORCA_BUILD__: JSON.stringify(buildId()) },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    },
  },
})
