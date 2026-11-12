import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ManualCaptureConnector,
  PublicLookupConnector,
  SampleConnector,
} from '@/lib/ciceron/connectors/case-file'

describe('CaseFileConnector', () => {
  it('SampleConnector returns is_sample events labelled for demo', async () => {
    const c = new SampleConnector()
    const events = await c.ingest({ limit: 2 })
    assert.ok(events.length >= 1)
    assert.equal(events[0]!.isSample, true)
    assert.match(events[0]!.text, /Datos de demostración/i)
    const h = await c.health()
    assert.equal(h.ok, true)
  })

  it('ManualCaptureConnector parses pasted notification text', async () => {
    const c = new ManualCaptureConnector()
    const events = await c.ingest({
      kind: 'paste',
      text: 'TFJA Sala Regional Metropolitana. Expediente DEMO-TFJA-1001/2026. Notificación de demanda el 22 de octubre de 2026.',
    })
    assert.equal(events.length, 1)
    assert.equal(events[0]!.captureKind, 'paste')
    assert.ok(events[0]!.fileNumber?.includes('DEMO-TFJA-1001'))
    assert.match(events[0]!.eventType, /notif|demanda|actuacion/i)
  })

  it('PublicLookupConnector throws not enabled', async () => {
    const c = new PublicLookupConnector()
    assert.equal(c.describe().enabled, process.env.CICERON_PUBLIC_LOOKUP_ENABLED === '1')
    await assert.rejects(() => c.ingest({}), /not enabled: requires legal clearance/)
    const h = await c.health()
    assert.equal(h.ok, false)
  })
})
