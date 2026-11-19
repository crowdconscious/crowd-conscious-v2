import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  containsBraceDelimitedObject,
  formatClientNotifyPreview,
} from '@/lib/ciceron/case-files/notify-preview'

const FALLBACK = {
  subject: 'Actualización de su expediente 123/2026',
  body: [
    'Estimado(a) representante de Cliente Demo:',
    '',
    'Le informamos sobre una actuación reciente en el expediente 123/2026.',
    '',
    'Quedamos a su disposición.',
  ].join('\n'),
}

describe('formatClientNotifyPreview', () => {
  it('parses fenced JSON into subject and body', () => {
    const raw = [
      '```json',
      '{',
      '  "subject": "Aviso sobre su expediente 123/2026",',
      '  "body": "Estimado cliente:\\n\\nLe informamos del acuerdo publicado."',
      '}',
      '```',
    ].join('\n')
    const out = formatClientNotifyPreview(raw, FALLBACK)
    assert.equal(out.subject, 'Aviso sobre su expediente 123/2026')
    assert.match(out.body, /Estimado cliente/)
    assert.equal(containsBraceDelimitedObject(out.body), false)
    assert.equal(containsBraceDelimitedObject(out.subject), false)
  })

  it('parses prose-wrapped JSON', () => {
    const raw =
      'Aquí tiene el borrador:\n{"subject":"Asunto limpio","body":"Cuerpo limpio sin llaves."}\nFin.'
    const out = formatClientNotifyPreview(raw, FALLBACK)
    assert.equal(out.subject, 'Asunto limpio')
    assert.equal(out.body, 'Cuerpo limpio sin llaves.')
  })

  it('fails the preview contract when output still contains a brace-delimited object', () => {
    const cases = [
      '{"subject":"X","body":"Y"}',
      '```json\n{"subject":"X","body":"Y"}\n```',
      'Respuesta:\n{\n  "subject": "X",\n  "body": "Y"\n}',
    ]
    for (const raw of cases) {
      const out = formatClientNotifyPreview(raw, FALLBACK)
      assert.equal(
        containsBraceDelimitedObject(out.body),
        false,
        `preview body must not contain brace object for: ${raw.slice(0, 40)}`
      )
      assert.equal(
        containsBraceDelimitedObject(out.subject),
        false,
        `preview subject must not contain brace object for: ${raw.slice(0, 40)}`
      )
    }
  })

  it('keeps plain Spanish text when it is not an object', () => {
    const plain =
      'Estimado cliente:\n\nLe informamos que el juzgado publicó un acuerdo.'
    const out = formatClientNotifyPreview(plain, FALLBACK)
    assert.equal(out.body, plain)
    assert.equal(out.subject, FALLBACK.subject)
  })

  it('uses fallback when parsed fields themselves look like objects', () => {
    const raw = '{"subject":"{bad}","body":"{also bad}"}'
    const out = formatClientNotifyPreview(raw, FALLBACK)
    assert.equal(out.subject, FALLBACK.subject)
    assert.equal(out.body, FALLBACK.body)
  })
})
