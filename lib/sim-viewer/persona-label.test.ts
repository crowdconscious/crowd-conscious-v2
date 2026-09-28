import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isHumanReadablePersonaKey,
  isUuidLike,
  personaDisplayLabel,
} from './persona-label.ts'

test('isUuidLike detects standard UUID strings', () => {
  assert.equal(
    isUuidLike('14850982-416b-4160-8f13-34e9ddd96fd7'),
    true,
  )
  assert.equal(isUuidLike('mh-fixture-c-001'), false)
  assert.equal(isUuidLike(null), false)
})

test('personaDisplayLabel prefers human persona_key', () => {
  assert.equal(
    personaDisplayLabel('mh-fixture-c-001', 0),
    'mh-fixture-c-001',
  )
})

test('personaDisplayLabel never surfaces UUIDs', () => {
  assert.equal(
    personaDisplayLabel('14850982-416b-4160-8f13-34e9ddd96fd7', 33),
    'Persona 34',
  )
  assert.equal(personaDisplayLabel(null, 0), 'Persona 1')
  assert.equal(personaDisplayLabel('', 5), 'Persona 6')
})

test('isHumanReadablePersonaKey rejects UUIDs and blanks', () => {
  assert.equal(isHumanReadablePersonaKey('cuauhtemoc-d-plus-012'), true)
  assert.equal(
    isHumanReadablePersonaKey('929779b3-87ad-433d-9069-0cdd970a6a5d'),
    false,
  )
  assert.equal(isHumanReadablePersonaKey('  '), false)
})
