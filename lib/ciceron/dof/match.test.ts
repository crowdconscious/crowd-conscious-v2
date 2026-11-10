import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { scoreCandidates } from './match-score'

describe('ciceron DOF candidate scoring (fail-soft vectors)', () => {
  const note = {
    id: 'n1',
    title: 'Acuerdo por el que se modifican disposiciones aplicables a instituciones de crédito',
    authority: 'CNBV',
    labels: ['financiero y fintech'],
    summary: 'Modifica obligaciones de PLD y conservación de registros.',
    document_type: 'acuerdo',
    chunks: [
      {
        id: 'c1',
        text: 'Las instituciones deberán conservar registros de prevención de lavado por diez años.',
        embedding: null,
      },
    ],
  }

  const profiles = [
    {
      id: 'p-nexora',
      client_id: 'c1',
      subject_areas: ['financiero y fintech', 'datos personales'],
      authorities: ['CNBV', 'Banxico'],
      keywords: ['PLD', 'fintech', 'instituciones de crédito'],
      norms_of_interest: ['LFPIORPI'],
      description: 'Emisora de pagos',
      embedding: null,
    },
    {
      id: 'p-farma',
      client_id: 'c2',
      subject_areas: ['salud y regulación sanitaria'],
      authorities: ['COFEPRIS'],
      keywords: ['cadena de frío'],
      norms_of_interest: ['LISSA'],
      description: 'Farmacéutica',
      embedding: null,
    },
  ]

  it('ranks CNBV/PLD profile above unrelated health profile without embeddings', () => {
    const ranked = scoreCandidates(note, profiles)
    assert.ok(ranked.length >= 1)
    assert.equal(ranked[0]!.profile.id, 'p-nexora')
    assert.equal(ranked[0]!.vectorUsed, false)
    assert.match(ranked[0]!.why, /embeddings pending/i)
  })

  it('uses vector contribution when both embeddings exist', () => {
    const withVec = {
      ...note,
      chunks: [
        {
          id: 'c1',
          text: note.chunks[0]!.text,
          embedding: [1, 0, 0],
        },
      ],
    }
    const profilesVec = profiles.map((p) =>
      p.id === 'p-nexora'
        ? { ...p, embedding: [1, 0, 0] }
        : { ...p, embedding: [0, 1, 0] }
    )
    const ranked = scoreCandidates(withVec, profilesVec)
    assert.equal(ranked[0]!.profile.id, 'p-nexora')
    assert.equal(ranked[0]!.vectorUsed, true)
  })
})
