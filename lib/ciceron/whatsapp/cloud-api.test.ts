import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  readWhatsAppCloudConfig,
  sendMorningSummaryWhatsAppScaffold,
} from './cloud-api'

describe('whatsapp cloud api scaffold', () => {
  it('defaults to disabled', () => {
    const cfg = readWhatsAppCloudConfig({})
    assert.equal(cfg.enabled, false)
  })

  it('never sends even when enabled with placeholders', async () => {
    const result = await sendMorningSummaryWhatsAppScaffold({
      toE164Digits: '525512345678',
      templateVariables: ['Valeria', '3'],
    })
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.mode, 'skipped')
  })
})
