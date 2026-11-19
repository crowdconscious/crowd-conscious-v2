import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createMicrosoft365Provider } from './microsoft-provider'

describe('microsoft365 provider', () => {
  it('creates draft-only mail results', async () => {
    const p = createMicrosoft365Provider()
    const r = await p.createMailDraft({
      toEmail: 'a@b.com',
      subject: 'Asunto',
      body: 'Cuerpo',
    })
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.mode, 'draft_only')
  })
})
