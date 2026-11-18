import { test } from 'node:test'
import assert from 'node:assert/strict'
import { columnBreakpoints, visibleColumns, widthBand } from './tableColumns.ts'

const cols = [{ id: 'risk' }, { id: 'pair' }, { id: 'pc' }, { id: 'miss', hideBelow: 600 }, { id: 'tca', hideBelow: 600 }, { id: 'epoch', hideBelow: 520 }]
const ids = (cs: readonly { id: string }[]) => cs.map((c) => c.id)

test('columnBreakpoints: distinct widths, smallest first, none when no column hides', () => {
  assert.deepEqual(columnBreakpoints(cols), [520, 600])
  assert.deepEqual(columnBreakpoints(cols.slice(0, 3)), [])
})

test('visibleColumns: a column hides only below its width; columns without hideBelow always show', () => {
  assert.deepEqual(ids(visibleColumns(cols, 375)), ['risk', 'pair', 'pc'])
  assert.deepEqual(ids(visibleColumns(cols, 520)), ['risk', 'pair', 'pc', 'epoch'])
  assert.deepEqual(ids(visibleColumns(cols, 599)), ['risk', 'pair', 'pc', 'epoch'])
  assert.deepEqual(ids(visibleColumns(cols, 600)), ids(cols))
  assert.deepEqual(ids(visibleColumns(cols, Number.POSITIVE_INFINITY)), ids(cols), 'no window (server render): everything shows')
})

test('widthBand: widths in one band show the same columns', () => {
  const bps = columnBreakpoints(cols)
  assert.equal(widthBand(375, bps), 0)
  assert.equal(widthBand(520, bps), 520)
  assert.equal(widthBand(599, bps), 520)
  assert.equal(widthBand(1440, bps), 600)
  for (const w of [320, 519, 520, 580, 599, 600, 900]) assert.deepEqual(visibleColumns(cols, widthBand(w, bps)), visibleColumns(cols, w), String(w))
})
