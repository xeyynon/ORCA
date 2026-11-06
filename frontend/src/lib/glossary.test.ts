import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GLOSSARY } from './glossary.ts'

test('every glossary entry is a real sentence, not a placeholder', () => {
  for (const [term, text] of Object.entries(GLOSSARY)) {
    assert.ok(text.length > 30, `${term} is too short to explain anything`)
    assert.ok(text.endsWith('.'), `${term} should end as a sentence`)
  }
})
