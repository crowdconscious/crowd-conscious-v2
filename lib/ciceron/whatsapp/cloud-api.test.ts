import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildMorningWhatsAppTemplateComponents,
  buildWhatsAppTemplateVariableList,
  CICERON_WHATSAPP_TEMPLATE_BODY_ES,
  CICERON_WHATSAPP_TEMPLATE_BODY_ES_V2,
  CICERON_WHATSAPP_TEMPLATE_V1_NAME,
  CICERON_WHATSAPP_TEMPLATE_V2_NAME,
  formatNextDeadlineWhatsAppParam,
  isMorningWhatsAppTemplateV2,
  maskWhatsAppRecipient,
  pickTopHeadlineWhatsAppParam,
  readWhatsAppCloudConfig,
  sanitizeWhatsAppTemplateParam,
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

  it('posts template to Graph when configured (v1)', async () => {
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
        template: {
          name: string
          components: Array<{
            type: string
            parameters: unknown[]
            sub_type?: string
            index?: string
          }>
        }
      }
      assert.equal(body.to, '525512345678')
      assert.equal(body.template.name, 'ciceron_resumen_manana')
      assert.equal(body.template.components.length, 1)
      assert.equal(body.template.components[0]!.type, 'body')
      assert.equal(body.template.components[0]!.parameters.length, 4)
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

  it('documents Meta body with four variables (v1)', () => {
    assert.match(CICERON_WHATSAPP_TEMPLATE_BODY_ES, /\{\{1\}\}/)
    assert.match(CICERON_WHATSAPP_TEMPLATE_BODY_ES, /\{\{4\}\}/)
    assert.match(CICERON_WHATSAPP_TEMPLATE_BODY_ES, /Datos de demostración/)
  })
})

describe('whatsapp morning template v2', () => {
  it('detects v2 from template name', () => {
    assert.equal(isMorningWhatsAppTemplateV2(CICERON_WHATSAPP_TEMPLATE_V2_NAME), true)
    assert.equal(isMorningWhatsAppTemplateV2('ciceron_resumen_manana_v2'), true)
    assert.equal(isMorningWhatsAppTemplateV2(CICERON_WHATSAPP_TEMPLATE_V1_NAME), false)
    assert.equal(isMorningWhatsAppTemplateV2('ciceron_resumen_manana'), false)
    assert.equal(isMorningWhatsAppTemplateV2(null), false)
  })

  it('documents Meta body with five variables (v2)', () => {
    assert.match(CICERON_WHATSAPP_TEMPLATE_BODY_ES_V2, /\{\{1\}\}/)
    assert.match(CICERON_WHATSAPP_TEMPLATE_BODY_ES_V2, /\{\{5\}\}/)
    assert.match(CICERON_WHATSAPP_TEMPLATE_BODY_ES_V2, /Pendientes por aprobar/)
    assert.match(CICERON_WHATSAPP_TEMPLATE_BODY_ES_V2, /Datos de demostración/)
  })

  it('sanitizes WhatsApp params (no newlines/tabs, collapse spaces, non-empty)', () => {
    assert.equal(
      sanitizeWhatsAppTemplateParam('  Hola\n\tmundo    con    espacios  ', 'fallback'),
      'Hola mundo con espacios'
    )
    assert.equal(sanitizeWhatsAppTemplateParam('   \n\t  ', 'Sin novedades relevantes'), 'Sin novedades relevantes')
    assert.equal(sanitizeWhatsAppTemplateParam('', 'x'), 'x')
  })

  it('formats next deadline or fallback', () => {
    assert.equal(
      formatNextDeadlineWhatsAppParam({
        label: 'Contestar demanda — 1001/2026',
        dueAt: '2026-11-20T23:59:00-06:00',
      }),
      'Contestar demanda — 1001/2026, viernes 20 de noviembre'
    )
    assert.equal(formatNextDeadlineWhatsAppParam(null), 'Sin plazos próximos')
    assert.equal(
      formatNextDeadlineWhatsAppParam({ label: 'Plazo', dueAt: undefined }),
      'Sin plazos próximos'
    )
  })

  it('picks short headline without newlines and falls back', () => {
    const long = 'A'.repeat(120)
    const picked = pickTopHeadlineWhatsAppParam([
      'Primera\nlínea con\ttabs    y    espacios',
      'Segunda',
    ])
    assert.equal(picked.includes('\n'), false)
    assert.equal(picked.includes('\t'), false)
    assert.ok(picked.length <= 90)
    assert.match(picked, /Primera/)

    assert.equal(pickTopHeadlineWhatsAppParam([long]).length, 90)
    assert.equal(pickTopHeadlineWhatsAppParam([]), 'Sin novedades relevantes')
    assert.equal(pickTopHeadlineWhatsAppParam(['', '  ']), 'Sin novedades relevantes')
  })

  it('builds v2 components: 5 body params + url button hoy', () => {
    const components = buildMorningWhatsAppTemplateComponents({
      templateName: CICERON_WHATSAPP_TEMPLATE_V2_NAME,
      bodyVariables: [
        '20 de noviembre de 2026',
        '3',
        '2',
        'Contestar demanda — 1001/2026, viernes 20 de noviembre',
        'Acuerdo relevante del DOF',
      ],
    })
    assert.equal(components.length, 2)
    assert.equal(components[0]!.type, 'body')
    assert.equal(components[0]!.parameters?.length, 5)
    assert.deepEqual(components[1], {
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: 'hoy' }],
    })
  })

  it('builds v1 components: 4 body params, no button', () => {
    const components = buildMorningWhatsAppTemplateComponents({
      templateName: CICERON_WHATSAPP_TEMPLATE_V1_NAME,
      bodyVariables: ['a', '1', '2', 'https://example.com/hoy'],
    })
    assert.equal(components.length, 1)
    assert.equal(components[0]!.type, 'body')
    assert.equal(components[0]!.parameters?.length, 4)
  })

  it('masks WhatsApp recipient for UI', () => {
    assert.equal(maskWhatsAppRecipient('5215512340458'), '••••0458')
    assert.equal(maskWhatsAppRecipient('123'), '••••')
  })

  it('posts v2 template with button when configured', async () => {
    const prev = {
      en: process.env.CICERON_WHATSAPP_ENABLED,
      id: process.env.CICERON_WHATSAPP_PHONE_NUMBER_ID,
      tok: process.env.CICERON_WHATSAPP_ACCESS_TOKEN,
      name: process.env.CICERON_WHATSAPP_TEMPLATE_NAME,
    }
    process.env.CICERON_WHATSAPP_ENABLED = 'true'
    process.env.CICERON_WHATSAPP_PHONE_NUMBER_ID = 'pnid'
    process.env.CICERON_WHATSAPP_ACCESS_TOKEN = 'tok'
    process.env.CICERON_WHATSAPP_TEMPLATE_NAME = CICERON_WHATSAPP_TEMPLATE_V2_NAME

    let calledBody: unknown = null
    const fetchImpl: typeof fetch = async (_url, init) => {
      calledBody = JSON.parse(String(init?.body ?? '{}'))
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.v2' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const result = await sendMorningSummaryWhatsApp({
        toE164Digits: '525512345678',
        templateVariables: ['fecha', '1', '2', 'plazo', 'headline'],
        fetchImpl,
      })
      assert.equal(result.ok, true)
      if (result.ok) assert.equal(result.mode, 'sent')
      const body = calledBody as {
        template: {
          name: string
          components: Array<{ type: string; parameters?: unknown[]; sub_type?: string }>
        }
      }
      assert.equal(body.template.name, CICERON_WHATSAPP_TEMPLATE_V2_NAME)
      assert.equal(body.template.components.length, 2)
      assert.equal(body.template.components[0]!.parameters?.length, 5)
      assert.equal(body.template.components[1]!.type, 'button')
      assert.equal(body.template.components[1]!.sub_type, 'url')
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
})
