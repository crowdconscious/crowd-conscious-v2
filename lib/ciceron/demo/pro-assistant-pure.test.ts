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
  it('parses notify intent for Nexora', () => {
    const intent = parseProIntent('escríbele a Nexora sobre el auto de hoy', {
      role: 'socio',
      clients: PRO_DEMO_CLIENTS,
    })
    assert.equal(intent.kind, 'notify')
    if (intent.kind === 'notify') {
      assert.match(intent.client.name, /Nexora/)
      assert.equal(intent.denied, false)
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

  it('builds a draft that never claims to send', () => {
    const intent = parseProIntent('recuérdame el plazo de Farma Sierra', {
      role: 'socio',
      clients: PRO_DEMO_CLIENTS,
    })
    const draft = buildProDraft(intent)
    assert.ok(draft)
    assert.match(draft!.body, /no se envía automáticamente/i)
    assert.match(draft!.body, /demostración/i)
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
