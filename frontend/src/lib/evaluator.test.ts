import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PASSWORD_MASK, evaluatorCredential } from './evaluator.ts'

test('both halves set: the credential is returned, username trimmed, password kept exactly', () => {
  assert.deepEqual(
    evaluatorCredential({ VITE_EVALUATOR_USERNAME: ' admin ', VITE_EVALUATOR_PASSWORD: ' p a ss ' }),
    { username: 'admin', password: ' p a ss ' },
  )
})

test('a missing or blank half hides the panel instead of showing half a login', () => {
  assert.equal(evaluatorCredential({}), null)
  assert.equal(evaluatorCredential({ VITE_EVALUATOR_USERNAME: 'admin' }), null)
  assert.equal(evaluatorCredential({ VITE_EVALUATOR_PASSWORD: 'secret' }), null)
  assert.equal(evaluatorCredential({ VITE_EVALUATOR_USERNAME: '   ', VITE_EVALUATOR_PASSWORD: 'secret' }), null)
  assert.equal(evaluatorCredential({ VITE_EVALUATOR_USERNAME: 'admin', VITE_EVALUATOR_PASSWORD: '' }), null)
})

test('non-string values are ignored', () => {
  assert.equal(evaluatorCredential({ VITE_EVALUATOR_USERNAME: true, VITE_EVALUATOR_PASSWORD: 123 }), null)
})

test('the mask has a fixed length whatever the password', () => {
  assert.equal([...PASSWORD_MASK].length, 12)
})
