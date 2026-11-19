import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildMorningEmailPayload,
  escapeHtml,
  renderMorningEmailHtml,
} from './morning-email-pure'

describe('morning-email-pure', () => {
  it('builds Spanish subject and empty intro', () => {
    const p = buildMorningEmailPayload({
      displayName: 'Valeria',
      dateLabel: '19 de noviembre de 2026',
      baseUrl: 'https://example.com',
      unsubscribePath: '/ciceron/preferencias/correo/baja?t=abc',
      novedades: [],
      plazos: [],
      assignments: [],
    })
    assert.match(p.subject, /Su mañana/)
    assert.match(p.greeting, /Valeria/)
    assert.match(p.intro, /Sin novedades/)
  })

  it('renders one primary button per item and unsubscribe', () => {
    const p = buildMorningEmailPayload({
      displayName: 'Valeria',
      dateLabel: '19 de noviembre de 2026',
      baseUrl: 'https://example.com',
      unsubscribePath: '/ciceron/preferencias/correo/baja?t=abc',
      novedades: [
        {
          id: '1',
          kind: 'novedad',
          title: 'Nota DOF',
          href: 'https://example.com/ciceron/monitor-dof',
          ctaLabel: 'Abrir',
        },
      ],
      plazos: [],
      assignments: [],
    })
    const html = renderMorningEmailHtml(p)
    assert.match(html, /Abrir/)
    assert.match(html, /cancele la suscripción/)
    assert.equal(escapeHtml('<x>'), '&lt;x&gt;')
  })
})
