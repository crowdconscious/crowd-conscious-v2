import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { humanizeDemoTestError } from './demo-test-send-pure'

describe('humanizeDemoTestError', () => {
  it('maps known codes without echoing env or tokens', () => {
    assert.match(humanizeDemoTestError('email_disabled', 'email'), /no está activado/i)
    assert.match(humanizeDemoTestError('whatsapp_disabled', 'whatsapp'), /no está activado/i)
    assert.match(humanizeDemoTestError('recipient_missing', 'email'), /destinatario/i)
    assert.match(humanizeDemoTestError('recipient_missing', 'whatsapp'), /WhatsApp/i)
    assert.match(humanizeDemoTestError('forbidden', 'email'), /socio o administrador/i)
  })

  it('never echoes secrets from upstream errors', () => {
    const msg = humanizeDemoTestError(
      'Bearer tok_live_abc Authorization failed',
      'whatsapp',
      '••••0458'
    )
    assert.equal(msg.includes('tok_live'), false)
    assert.equal(msg.includes('Bearer'), false)
    assert.match(msg, /No se pudo enviar/i)
  })

  it('can mention masked recipient on generic whatsapp failure', () => {
    const msg = humanizeDemoTestError('http_500', 'whatsapp', '••••0458')
    assert.match(msg, /••••0458/)
    assert.equal(msg.includes('http_500'), false)
  })
})
