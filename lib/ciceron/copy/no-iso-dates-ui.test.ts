/**
 * Fail if lawyer-facing pure builders emit raw ISO calendar dates (YYYY-MM-DD).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildClientTimeline } from '@/lib/ciceron/demo/client-timeline-pure'
import { formatDateLongEs, formatDateRangeEs } from '@/lib/ciceron/copy/format-date'

const ISO_DATE = /\d{4}-\d{2}-\d{2}/

function assertNoIsoInUi(label: string, text: string) {
  assert.doesNotMatch(
    text,
    ISO_DATE,
    `${label} must not contain ISO dates; got: ${text}`
  )
}

describe('Cicerón UI dates — no ISO in rendered labels', () => {
  it('formatDateLongEs / formatDateRangeEs stay Spanish', () => {
    assertNoIsoInUi('long', formatDateLongEs('2026-11-18'))
    assertNoIsoInUi('range', formatDateRangeEs('2026-11-16', '2026-11-22'))
  })

  it('client timeline dateLabel is Spanish', () => {
    const events = buildClientTimeline({
      bulletinHits: [
        {
          id: 'h1',
          summary: 'Se tuvo por presentado el escrito de demanda',
          courtName: 'Juzgado Primero Civil',
          publicationDate: '2026-11-18',
          expedienteNumber: '123/2026',
        },
      ],
      dofNotes: [],
      deadlines: [],
    })
    for (const e of events) {
      assertNoIsoInUi(`timeline:${e.id}`, e.dateLabel)
      if (e.deadlineLabel) assertNoIsoInUi(`deadline:${e.id}`, e.deadlineLabel)
    }
  })
})
