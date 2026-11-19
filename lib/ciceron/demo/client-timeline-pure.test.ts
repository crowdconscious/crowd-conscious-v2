import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildClientTimeline } from './client-timeline-pure'

describe('buildClientTimeline', () => {
  it('orders newest first and marks deadlines', () => {
    const events = buildClientTimeline({
      bulletinHits: [
        {
          id: 'h1',
          summary: 'Demanda presentada',
          courtName: 'Juzgado 1',
          publicationDate: '2026-11-18',
          expedienteNumber: '123/2026',
        },
      ],
      dofNotes: [
        {
          id: 'd1',
          title: 'Acuerdo CNBV',
          date: '10 de noviembre de 2026',
          reason: 'Plazo de conservación',
          sortIso: '2026-11-10',
        },
      ],
      deadlines: [
        {
          id: 'dl1',
          label: 'Contestar demanda',
          due: '19 de noviembre de 2026',
          dueAt: '2026-11-19T23:59:00-06:00',
        },
      ],
    })
    assert.equal(events[0]?.kind, 'deadline')
    assert.equal(events[1]?.kind, 'bulletin')
    assert.ok(events.find((e) => e.kind === 'deadline')?.deadlineLabel)
  })
})
