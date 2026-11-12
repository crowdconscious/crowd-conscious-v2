import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatPolicyCell, policyReasonEs } from './policy-labels'

describe('audit policy labels (es)', () => {
  it('maps English seed reasons to Spanish usted', () => {
    assert.match(
      policyReasonEs('matter_member', 'Actor is not a member of this matter'),
      /no es miembro/
    )
    assert.match(
      policyReasonEs('four_eyes', 'Editor cannot give final approval on this output type'),
      /aprobación final/
    )
    assert.match(
      policyReasonEs(null, 'Socio viewed client material in demo seed'),
      /consultó material/
    )
  })

  it('formats viewer cell without English rule text', () => {
    const cell = formatPolicyCell(
      'four_eyes',
      'Editor cannot give final approval on this output type'
    )
    assert.doesNotMatch(cell, /Editor cannot/)
    assert.match(cell, /cuatro ojos/i)
  })
})
