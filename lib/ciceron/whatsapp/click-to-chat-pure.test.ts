import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildClientFriendlyWhatsAppMessage,
  buildWhatsAppClickToChatUrl,
} from './click-to-chat-pure'

describe('whatsapp click-to-chat', () => {
  it('builds Spanish client-friendly copy', () => {
    const msg = buildClientFriendlyWhatsAppMessage({
      clientName: 'Nexora',
      headline: 'Hay una novedad relevante en el DOF.',
      officialUrl: 'https://dof.gob.mx/ejemplo',
    })
    assert.match(msg, /Estimado\/a Nexora/)
    assert.match(msg, /no constituye una notificación judicial/)
    assert.match(msg, /dof\.gob\.mx/)
  })

  it('builds wa.me URL with phone and text', () => {
    const url = buildWhatsAppClickToChatUrl({
      phoneE164Digits: '52 55 1234 5678',
      clientName: 'Nexora',
      headline: 'Novedad',
    })
    assert.match(url, /^https:\/\/wa\.me\/525512345678\?text=/)
    assert.match(url, /Novedad/)
  })
})
