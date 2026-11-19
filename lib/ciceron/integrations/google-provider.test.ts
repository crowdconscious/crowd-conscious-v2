import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createGoogleWorkspaceProvider } from './google-provider'
import { GOOGLE_OAUTH_SCOPES } from './types'

describe('google workspace provider', () => {
  it('refuses drafts when flag off', async () => {
    const p = createGoogleWorkspaceProvider()
    const r = await p.createMailDraft({
      toEmail: 'a@b.com',
      subject: 'Asunto',
      body: 'Cuerpo',
    })
    assert.equal(r.ok, false)
  })

  it('uses compose/calendar/drive scopes only', () => {
    assert.ok(GOOGLE_OAUTH_SCOPES.every((s) => !s.includes('gmail.send')))
    assert.ok(GOOGLE_OAUTH_SCOPES.some((s) => s.includes('gmail.compose')))
  })
})
