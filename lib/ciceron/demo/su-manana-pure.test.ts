import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildSuMananaSummary,
  orderSuMananaActions,
  SU_MANANA_RAIL_GROUPS,
  uniqueNoveltyCount,
  type SuMananaAction,
} from './su-manana-pure'

describe('uniqueNoveltyCount', () => {
  it('dedupes across bulletin and DOF keys and ignores blanks', () => {
    assert.equal(
      uniqueNoveltyCount(
        ['Nexora', 'Farma', '', 'Nexora'],
        ['Nexora', 'Viento', null, '  ']
      ),
      3
    )
  })
})

describe('orderSuMananaActions', () => {
  it('orders by kind then priority', () => {
    const actions: SuMananaAction[] = [
      {
        id: 'd1',
        kind: 'deadline',
        priority: 1,
        href: '/ciceron/expedientes',
        title: 'Plazo B',
      },
      {
        id: 'm1',
        kind: 'bulletin_manual',
        priority: 2,
        href: '/ciceron/boletines',
        title: 'Manual Guanajuato',
      },
      {
        id: 'r1',
        kind: 'review',
        priority: 0,
        href: '/ciceron/revision/rev-1',
        title: 'Revisión A',
      },
      {
        id: 'd0',
        kind: 'deadline',
        priority: 0,
        href: '/ciceron/expedientes',
        title: 'Plazo A',
      },
    ]
    const ordered = orderSuMananaActions(actions)
    assert.deepEqual(
      ordered.map((a) => a.id),
      ['m1', 'r1', 'd0', 'd1']
    )
  })
})

describe('buildSuMananaSummary', () => {
  it('builds three metrics and ordered actions', () => {
    const summary = buildSuMananaSummary({
      bulletinNoveltyKeys: ['Nexora', 'Farma'],
      dofNoveltyKeys: ['Nexora', 'Viento'],
      deadlinesThisWeek: 2,
      reviewsPending: 2,
      actions: [
        {
          id: 'hit-1',
          kind: 'bulletin_hit',
          priority: 0,
          href: '/ciceron/boletines',
          title: 'Coincidencia Nexora',
        },
        {
          id: 'man-1',
          kind: 'bulletin_manual',
          priority: 0,
          href: '/ciceron/boletines/coordinador',
          title: 'Revisión manual Guanajuato',
        },
      ],
    })
    assert.deepEqual(
      summary.metrics.map((m) => [m.id, m.value]),
      [
        ['asuntosConNovedad', 3],
        ['plazosEstaSemana', 2],
        ['pendientesRevision', 2],
      ]
    )
    assert.equal(summary.actions[0]?.kind, 'bulletin_manual')
    assert.equal(summary.actions[1]?.kind, 'bulletin_hit')
  })

  it('clamps negative counts to zero', () => {
    const summary = buildSuMananaSummary({
      bulletinNoveltyKeys: [],
      dofNoveltyKeys: [],
      deadlinesThisWeek: -3,
      reviewsPending: -1,
      actions: [],
    })
    assert.deepEqual(
      summary.metrics.map((m) => m.value),
      [0, 0, 0]
    )
  })
})

describe('SU_MANANA_RAIL_GROUPS', () => {
  it('covers primary rooms without duplication', () => {
    const ids = SU_MANANA_RAIL_GROUPS.flatMap((g) => [...g.roomIds])
    assert.equal(new Set(ids).size, ids.length)
    assert.ok(ids.includes('hoy'))
    assert.ok(ids.includes('boletines'))
    assert.ok(ids.includes('revision'))
  })
})
