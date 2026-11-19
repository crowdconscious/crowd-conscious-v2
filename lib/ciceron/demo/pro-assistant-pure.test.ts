import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PRO_DEMO_CLIENTS,
  buildProDraft,
  buildProSuggestions,
  isProAssistantLlmEnabled,
  parseProIntent,
} from './pro-assistant-pure'

describe('pro-assistant-pure', () => {
  it('parses notify intent for Nexora with real entry', () => {
    const intent = parseProIntent('escríbele a Nexora sobre el auto de hoy', {
      role: 'socio',
      clients: PRO_DEMO_CLIENTS,
    })
    assert.equal(intent.kind, 'notify')
    if (intent.kind === 'notify') {
      assert.match(intent.client.name, /Nexora/)
      assert.equal(intent.denied, false)
      assert.match(intent.entry.expedienteNumber, /123\/2026|1001\/2026/)
      assert.match(intent.entry.courtName, /Juzgado/)
      assert.match(intent.entry.acuerdoPlain, /presentado el escrito de demanda|vista/)
    }
  })

  it('denies pasante for unassigned matter', () => {
    const intent = parseProIntent('escríbele a Nexora sobre el auto', {
      role: 'pasante',
      clients: PRO_DEMO_CLIENTS.map((c) =>
        c.id === 'nexora' ? { ...c, allowedMatterIds: [] } : c
      ),
    })
    assert.equal(intent.kind, 'notify')
    if (intent.kind === 'notify') {
      assert.equal(intent.denied, true)
      assert.ok(intent.denyReason)
    }
  })

  it('builds a draft that cites expediente, juzgado, acuerdo and never sends', () => {
    const intent = parseProIntent('escríbele a Nexora sobre el auto de hoy', {
      role: 'socio',
      clients: PRO_DEMO_CLIENTS,
    })
    const draft = buildProDraft(intent)
    assert.ok(draft)
    assert.match(draft!.body, /expediente 123\/2026|expediente 1001\/2026/)
    assert.match(draft!.body, /Juzgado/)
    assert.match(draft!.body, /Se tiene por presentado|Se ordena vista/)
    assert.match(draft!.body, /Siguiente paso sugerido/)
    assert.match(draft!.body, /no se envía automáticamente/i)
    assert.match(draft!.body, /demostración/i)
    assert.match(draft!.resolution.clientName, /Nexora/)
    assert.ok(draft!.resolution.expedienteNumber)
    assert.doesNotMatch(draft!.body, /\d{4}-\d{2}-\d{2}/)
  })

  it('exposes alternate matters when ambiguous', () => {
    const intent = parseProIntent('escríbele a Nexora', {
      role: 'socio',
      clients: PRO_DEMO_CLIENTS,
    })
    const draft = buildProDraft(intent)
    assert.ok(draft)
    assert.ok(draft!.alternateMatters.length >= 1)
  })

  it('keeps LLM flag off by default', () => {
    assert.equal(isProAssistantLlmEnabled({}), false)
  })

  it('builds suggestion chips', () => {
    const chips = buildProSuggestions({ plazosSoonCount: 1, clientsMovedCount: 3 })
    assert.ok(chips.some((c) => /plazo/i.test(c.label)))
    assert.ok(chips.some((c) => /3 clientes/i.test(c.label)))
  })
})
