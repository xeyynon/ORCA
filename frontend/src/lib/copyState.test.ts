import { test } from 'node:test'
import assert from 'node:assert/strict'
import { copyMessage, copyState } from './copyState.ts'

test('copyState: idle with no attempt, or when the attempt was for another button', () => {
  assert.equal(copyState(null, 'username'), 'idle')
  assert.equal(copyState({ key: 'password', ok: true }, 'username'), 'idle')
})

test('copyState: copied or failed for this button', () => {
  assert.equal(copyState({ key: 'username', ok: true }, 'username'), 'copied')
  assert.equal(copyState({ key: 'username', ok: false }, 'username'), 'failed')
})

test('copyMessage: names the value when copied, tells you what to do when blocked, silent when idle', () => {
  assert.equal(copyMessage('copied', 'username'), 'Username copied')
  assert.equal(copyMessage('failed', 'username'), 'Copy failed — select the text')
  assert.equal(copyMessage('idle', 'username'), '')
})
