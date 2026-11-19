import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  canSendDemoLiveTest,
  readDemoRecipientEmail,
  readDemoRecipientWhatsApp,
} from './demo-recipient'

describe('demo-recipient', () => {
  it('reads email from env', () => {
    assert.equal(
      readDemoRecipientEmail({ CICERON_DEMO_RECIPIENT_EMAIL: 'a@b.co' }),
      'a@b.co'
    )
    assert.equal(readDemoRecipientEmail({}), null)
  })

  it('normalizes WhatsApp to digits', () => {
    assert.equal(
      readDemoRecipientWhatsApp({
        CICERON_DEMO_RECIPIENT_WHATSAPP: '+52 55 1234 5678',
      }),
      '525512345678'
    )
  })

  it('allows socio and admin for live test', () => {
    assert.equal(canSendDemoLiveTest('socio'), true)
    assert.equal(canSendDemoLiveTest('admin'), true)
    assert.equal(canSendDemoLiveTest('pasante'), false)
  })
})
