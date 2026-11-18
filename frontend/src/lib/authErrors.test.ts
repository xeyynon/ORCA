import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describeLoginFailure } from './authErrors.ts'

test('wrong password and unreachable server read differently, because the remedy differs', () => {
  const wrong = describeLoginFailure({ kind: 'http', status: 401, message: 'ignored' })
  const down = describeLoginFailure({ kind: 'network', status: null, message: 'Cannot reach http://localhost:8000' })
  assert.equal(wrong.kind, 'rejected')
  assert.equal(down.kind, 'unreachable')
  assert.notEqual(wrong.message, down.message)
})

test('the backend address never reaches the screen', () => {
  const down = describeLoginFailure({ kind: 'network', status: null, message: 'Cannot reach http://localhost:8000' })
  assert.doesNotMatch(down.message, /localhost|http|8000/)
})

test('an unreachable server is said in plain words, with no developer text (audit 2026-11-18 #6)', () => {
  const down = describeLoginFailure({ kind: 'network', status: null, message: 'x' })
  assert.equal(down.message, "Can't reach ORCA's server right now. Try again in a minute.")
  assert.doesNotMatch(down.message, /uvicorn|port|API is running/i)
})

test('lockout and not-configured keep the server\'s actionable message', () => {
  assert.equal(describeLoginFailure({ kind: 'http', status: 429, message: 'Too many failed attempts. Try again in 12 minute(s).' }).message, 'Too many failed attempts. Try again in 12 minute(s).')
  const unconf = describeLoginFailure({ kind: 'http', status: 503, message: 'Authentication is not configured on this server. Run: python auth.py set-password' })
  assert.equal(unconf.kind, 'unconfigured')
  assert.match(unconf.message, /python auth\.py set-password/)
})

test('an unexpected status gets a generic message that still names the status', () => {
  const f = describeLoginFailure({ kind: 'http', status: 500, message: 'Traceback ...' })
  assert.equal(f.kind, 'error')
  assert.match(f.message, /500/)
  assert.doesNotMatch(f.message, /Traceback/)
})

test('the API client never puts developer text in an error a visitor reads (audit 2026-11-18 #6)', () => {
  const src = readFileSync(fileURLToPath(new URL('../api/client.ts', import.meta.url)), 'utf8')
  assert.doesNotMatch(src, /uvicorn|port 8000|API is running/i)
  assert.match(src, /ORCA's server isn't answering right now\. Try again in a minute\./)
})
