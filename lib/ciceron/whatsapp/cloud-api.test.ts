import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildWhatsAppTemplateVariableList,
  CICERON_WHATSAPP_TEMPLATE_BODY_ES,
  readWhatsAppCloudConfig,
  sendMorningSummaryWhatsApp,
} from './cloud-api'

describe('whatsapp cloud api', () => {
  it('defaults to disabled', () => {
    const cfg = readWhatsAppCloudConfig({})
    assert.equal(cfg.enabled, false)
  })

  it('skips when enabled but credentials missing', async () => {
    const prev = process.env.CICERON_WHATSAPP_ENABLED
    process.env.CICERON_WHATSAPP_ENABLED = 'true'
    try {
      const result = await sendMorningSummaryWhatsApp({
        toE164Digits: '525512345678',
        templateVariables: ['a', '1', '2', 'https://example.com'],
      })
      assert.equal(result.ok, true)
      if (result.ok) assert.equal(result.mode, 'skipped')
    } finally {
      if (prev === undefined) delete process.env.CICERON_WHATSAPP_ENABLED
      else process.env.CICERON_WHATSAPP_ENABLED = prev
    }
  })

  it('posts template to Graph when configured', async () => {
    const prev = {
      en: process.env.CICERON_WHATSAPP_ENABLED,
      id: process.env.CICERON_WHATSAPP_PHONE_NUMBER_ID,
      tok: process.env.CICERON_WHATSAPP_ACCESS_TOKEN,
      name: process.env.CICERON_WHATSAPP_TEMPLATE_NAME,
    }
    process.env.CICERON_WHATSAPP_ENABLED = 'true'
    process.env.CICERON_WHATSAPP_PHONE_NUMBER_ID = 'pnid'
    process.env.CICERON_WHATSAPP_ACCESS_TOKEN = 'tok'
    process.env.CICERON_WHATSAPP_TEMPLATE_NAME = 'ciceron_resumen_manana'

    let calledUrl = ''
    let calledBody: unknown = null
    const fetchImpl: typeof fetch = async (url, init) => {
      calledUrl = String(url)
      calledBody = JSON.parse(String(init?.body ?? '{}'))
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.demo' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const vars = buildWhatsAppTemplateVariableList({
        dateLabel: '19 de noviembre de 2026',
        asuntosConNovedad: 3,
        plazosEstaSemana: 2,
        hoyUrl: 'https://example.com/ciceron/hoy',
      })
      const result = await sendMorningSummaryWhatsApp({
        toE164Digits: '525512345678',
        templateVariables: vars,
        fetchImpl,
      })
      assert.equal(result.ok, true)
      if (result.ok) {
        assert.equal(result.mode, 'sent')
        assert.equal(result.messageId, 'wamid.demo')
      }
      assert.match(calledUrl, /graph\.facebook\.com/)
      const body = calledBody as {
        to: string
        template: { name: string; components: Array<{ parameters: unknown[] }> }
      }
      assert.equal(body.to, '525512345678')
      assert.equal(body.template.name, 'ciceron_resumen_manana')
      assert.equal(body.template.components[0].parameters.length, 4)
    } finally {
      const restore = (k: keyof typeof prev, envKey: string) => {
        if (prev[k] === undefined) delete process.env[envKey]
        else process.env[envKey] = prev[k]
      }
      restore('en', 'CICERON_WHATSAPP_ENABLED')
      restore('id', 'CICERON_WHATSAPP_PHONE_NUMBER_ID')
      restore('tok', 'CICERON_WHATSAPP_ACCESS_TOKEN')
      restore('name', 'CICERON_WHATSAPP_TEMPLATE_NAME')
    }
  })

  it('documents Meta body with four variables', () => {
    assert.match(CICERON_WHATSAPP_TEMPLATE_BODY_ES, /\{\{1\}\}/)
    assert.match(CICERON_WHATSAPP_TEMPLATE_BODY_ES, /\{\{4\}\}/)
    assert.match(CICERON_WHATSAPP_TEMPLATE_BODY_ES, /Datos de demostración/)
  })
})
