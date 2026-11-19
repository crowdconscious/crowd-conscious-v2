import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CICERON_READABILITY_TOKENS as T,
  contrastRatio,
  meetsWcagAaLarge,
  meetsWcagAaNormal,
  parseHexColor,
} from './contrast-pure'

describe('ciceron contrast-pure', () => {
  it('parses short and long hex', () => {
    assert.deepEqual(parseHexColor('#abc'), { r: 170, g: 187, b: 204 })
    assert.deepEqual(parseHexColor('#020612'), { r: 2, g: 6, b: 18 })
  })

  it('ink meets AA normal on bg and surfaces', () => {
    assert.ok(meetsWcagAaNormal(T.ink, T.bg))
    assert.ok(meetsWcagAaNormal(T.ink, T.surface))
    assert.ok(meetsWcagAaNormal(T.ink, T.surface2))
    assert.ok(contrastRatio(T.ink, T.bg) >= 7)
  })

  it('muted meets AA normal on bg and surfaces', () => {
    assert.ok(meetsWcagAaNormal(T.muted, T.bg), `muted/bg ${contrastRatio(T.muted, T.bg)}`)
    assert.ok(
      meetsWcagAaNormal(T.muted, T.surface),
      `muted/surface ${contrastRatio(T.muted, T.surface)}`
    )
    assert.ok(
      meetsWcagAaNormal(T.muted, T.surface2),
      `muted/surface2 ${contrastRatio(T.muted, T.surface2)}`
    )
  })

  it('accent mint meets AA large on bg (links / marks)', () => {
    assert.ok(meetsWcagAaLarge(T.accentMint, T.bg))
    assert.ok(contrastRatio(T.accentMint, T.bg) >= 4.5)
  })
})
