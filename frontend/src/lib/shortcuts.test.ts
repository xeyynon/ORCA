import assert from 'node:assert/strict'
import test from 'node:test'
import { pressesFocusedControl } from './shortcuts'

test('Space and Enter belong to a focused button, link or summary', () => {
  for (const tag of ['BUTTON', 'A', 'SUMMARY', 'button']) {
    assert.equal(pressesFocusedControl(' ', tag, null), true, `Space on ${tag}`)
    assert.equal(pressesFocusedControl('Enter', tag, null), true, `Enter on ${tag}`)
  }
})

test('an element with a control role also keeps Space and Enter', () => {
  assert.equal(pressesFocusedControl(' ', 'DIV', 'button'), true)
  assert.equal(pressesFocusedControl('Enter', 'SPAN', 'tab'), true)
})

test('Space with nothing interactive focused still reaches the shortcut', () => {
  assert.equal(pressesFocusedControl(' ', 'BODY', null), false)
  assert.equal(pressesFocusedControl(' ', 'CANVAS', null), false)
  assert.equal(pressesFocusedControl(' ', 'DIV', 'region'), false)
})

test('other keys are never claimed, even on a button', () => {
  for (const key of ['1', 't', '?', '/', 'Escape']) assert.equal(pressesFocusedControl(key, 'BUTTON', null), false, key)
})
