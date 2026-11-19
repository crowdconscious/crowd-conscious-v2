import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import {
  personaHomeKind,
  personaHomeTarget,
  unavailableActionIdsFor,
} from './persona-home-pure'

describe('personaHomeTarget', () => {
  it('sends coordinador to the board', () => {
    const t = personaHomeTarget('asociado', CICERON_SEED.personas.coordinador)
    assert.equal(t.kind, 'coordinador')
    assert.equal(t.href, '/ciceron/boletines/coordinador')
  })

  it('keeps socio and pasante on Su mañana', () => {
    assert.equal(personaHomeTarget('socio').href, '/ciceron/hoy')
    assert.equal(personaHomeTarget('pasante').href, '/ciceron/hoy')
    assert.equal(personaHomeKind('pasante'), 'pasante')
  })
})

describe('unavailableActionIdsFor', () => {
  it('lists pasante limits for the access showcase', () => {
    const ids = unavailableActionIdsFor('pasante')
    assert.ok(ids.includes('confirm-deadline'))
    assert.ok(ids.includes('assign-manual'))
  })
})
