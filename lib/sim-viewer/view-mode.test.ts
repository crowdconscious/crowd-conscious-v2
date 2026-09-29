import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  applyViewModeChange,
  parseSimViewModeParam,
  simViewModeToParam,
} from './view-mode.ts'

test('parseSimViewModeParam accepts mapa/map and columnas/columns', () => {
  assert.equal(parseSimViewModeParam('mapa'), 'map')
  assert.equal(parseSimViewModeParam('MAP'), 'map')
  assert.equal(parseSimViewModeParam('columnas'), 'columns')
  assert.equal(parseSimViewModeParam('columns'), 'columns')
  assert.equal(parseSimViewModeParam('nope'), null)
  assert.equal(parseSimViewModeParam(null), null)
})

test('simViewModeToParam uses Spanish share tokens', () => {
  assert.equal(simViewModeToParam('map'), 'mapa')
  assert.equal(simViewModeToParam('columns'), 'columnas')
})

test('applyViewModeChange does not restart the shared playback clock', () => {
  const before = {
    viewMode: 'columns' as const,
    beat: 'vote',
    votedCount: 47,
    playing: true,
  }
  const after = applyViewModeChange(before, 'map')
  assert.equal(after.viewMode, 'map')
  assert.equal(after.beat, 'vote')
  assert.equal(after.votedCount, 47)
  assert.equal(after.playing, true)

  const back = applyViewModeChange(after, 'columns')
  assert.equal(back.viewMode, 'columns')
  assert.equal(back.votedCount, 47)
  assert.equal(back.beat, 'vote')
})
