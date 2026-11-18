import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SESSION_ENDED, sessionCheckOutcome } from './sessionCheck.ts'

test('only a 401 from the server ends the session', () => {
  assert.deepEqual(sessionCheckOutcome({ kind: 'http', status: 401, message: 'Not authenticated' }), { action: 'signOut', notice: SESSION_ENDED })
})

test('an unreachable server keeps the sign-in and never says the session ended', () => {
  const o = sessionCheckOutcome({ kind: 'network', status: null, message: 'x' })
  assert.equal(o.action, 'keep')
  if (o.action === 'keep') assert.doesNotMatch(o.message, /session ended|uvicorn|8000/i)
})

test('a server error (5xx) keeps the sign-in and names the error', () => {
  for (const status of [500, 502, 503]) {
    const o = sessionCheckOutcome({ kind: 'http', status, message: 'Traceback ...' })
    assert.equal(o.action, 'keep', String(status))
    if (o.action === 'keep') {
      assert.match(o.message, new RegExp(String(status)))
      assert.doesNotMatch(o.message, /Traceback|session ended/i)
    }
  }
})

test('an error that is not from the API at all keeps the sign-in', () => {
  assert.equal(sessionCheckOutcome(new TypeError('boom')).action, 'keep')
  assert.equal(sessionCheckOutcome(null).action, 'keep')
})
