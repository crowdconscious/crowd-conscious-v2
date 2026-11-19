import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  auditActionLabel,
  computationDisplayText,
  eventTypeLabel,
  failureStageLabel,
  findForbiddenUiToken,
  hitReasonLabel,
  isRawSourceTierValue,
  sourceTierLabel,
} from '@/lib/ciceron/copy/labels'

describe('sourceTierLabel (A2)', () => {
  it('maps every internal tier to Spanish words', () => {
    assert.equal(sourceTierLabel('A'), 'Automático')
    assert.equal(sourceTierLabel('B'), 'Revisión asistida')
    assert.equal(sourceTierLabel('C'), 'Revisión gestionada')
    assert.equal(sourceTierLabel('D'), 'Por verificar')
    assert.equal(sourceTierLabel('E'), 'Por verificar')
    assert.equal(sourceTierLabel('not_verified'), 'Por verificar')
  })

  it('fails if a raw enum value would render', () => {
    for (const raw of ['A', 'B', 'C', 'D', 'E', 'not_verified']) {
      const label = sourceTierLabel(raw)
      assert.equal(isRawSourceTierValue(label), false, `raw tier leaked: ${raw} → ${label}`)
      assert.equal(findForbiddenUiToken(label), null)
    }
  })
})

describe('failureStageLabel / hitReasonLabel (A1, D4)', () => {
  it('never surfaces Cloudflare, captcha, or tier letters', () => {
    for (const stage of [
      'fetch',
      'parse',
      'count_check',
      'terms',
      'disabled',
      'manual_required',
    ] as const) {
      const label = failureStageLabel(stage)!
      assert.equal(findForbiddenUiToken(label), null, label)
    }
  })

  it('builds plain-language match reasons', () => {
    const exact = hitReasonLabel({
      matchKind: 'exact',
      expedienteNumber: '123/2026',
      courtName: 'Juzgado Primero Civil',
    })
    assert.match(exact, /Coincide el expediente/)
    assert.equal(findForbiddenUiToken(exact), null)

    const possible = hitReasonLabel({
      matchKind: 'possible',
      partyVariant: 'Fondo Pedregal Inmuebles',
    })
    assert.match(possible, /se parece a/)
    assert.doesNotMatch(possible, /token/i)
    assert.equal(findForbiddenUiToken(possible), null)

    const noCourt = hitReasonLabel({
      matchKind: 'possible',
      numberWithoutCourt: true,
    })
    assert.match(noCourt, /juzgado no aparece/)
  })
})

describe('eventTypeLabel / computationDisplayText (A1, G3)', () => {
  it('translates snake_case event types', () => {
    assert.equal(eventTypeLabel('notificacion_demanda'), 'Notificación de demanda')
    assert.equal(eventTypeLabel('acuerdo_requerimiento'), 'Acuerdo de requerimiento')
  })

  it('rewrites computation text without snake_case tokens or ISO dates', () => {
    const raw =
      'Regla: notificacion_demanda · 15 días hábiles. Cómputo desde el día hábil siguiente a 2026-10-22 → vence 2026-11-14.'
    const display = computationDisplayText(raw)
    assert.doesNotMatch(display, /notificacion_demanda/)
    assert.doesNotMatch(display, /\d{4}-\d{2}-\d{2}/)
    assert.match(display, /Notificación de demanda/)
    assert.match(display, /22 oct 2026/)
    assert.equal(findForbiddenUiToken(display), null)
  })
})

describe('auditActionLabel (G1)', () => {
  it('uses Spanish action names', () => {
    assert.equal(auditActionLabel('view_client_material'), 'Abrió material del cliente')
    assert.equal(auditActionLabel('review_decide'), 'Registró una decisión')
  })
})

describe('display contract for board/hit fields', () => {
  it('tier and failure labels never leak raw enums', () => {
    const rendered = [
      sourceTierLabel('A'),
      sourceTierLabel('not_verified'),
      failureStageLabel('fetch')!,
      failureStageLabel('manual_required')!,
      hitReasonLabel({
        matchKind: 'possible',
        partyVariant: 'Fondo Pedregal Inmuebles',
      }),
      hitReasonLabel({
        matchKind: 'exact',
        expedienteNumber: '512/2026',
        courtName: 'Juzgado 32 Civil',
      }),
      eventTypeLabel('acuerdo_requerimiento'),
      auditActionLabel('view_client_material'),
    ]
    for (const text of rendered) {
      assert.equal(findForbiddenUiToken(text), null, text)
    }
  })
})