/**
 * Court-file connectors (Prompt 6).
 * Rule 9: never log in to judiciary systems, store credentials/signatures,
 * solve captchas, or scrape case pages. Data enters only through this interface.
 *
 * PublicLookupConnector is intentionally unimplemented — see DECISIONS.md (P8 / Prompt 6).
 */

import { z } from 'zod'

export const caseEventSchema = z.object({
  courtName: z.string().nullable(),
  fileNumber: z.string().nullable(),
  eventType: z.string().min(1),
  occurredAt: z.string().min(8), // ISO
  text: z.string().min(1),
  summary: z.string().nullable().optional(),
  rawPayload: z.record(z.string(), z.unknown()).default({}),
  isSample: z.boolean().default(true),
  captureKind: z.enum(['paste', 'pdf', 'email', 'sample']).optional(),
  originalStoragePath: z.string().nullable().optional(),
  originalMime: z.string().nullable().optional(),
})

export type NormalisedCaseEvent = z.infer<typeof caseEventSchema>

export type CaseFileConnectorDescribe = {
  kind: 'sample' | 'manual' | 'public_lookup'
  displayName: string
  enabled: boolean
  notes: string
}

export type CaseFileConnectorHealth = {
  ok: boolean
  kind: CaseFileConnectorDescribe['kind']
  checkedAt: string
  message: string
}

export type ManualCaptureInput = {
  kind: 'paste' | 'pdf' | 'email'
  text?: string
  pdfBase64?: string
  fileName?: string
  mimeType?: string
  /** Optional hints from the lawyer */
  courtNameHint?: string
  fileNumberHint?: string
}

export type SampleIngestInput = {
  caseFileId?: string
  limit?: number
}

export type CaseFileIngestInput = ManualCaptureInput | SampleIngestInput | Record<string, never>

/**
 * Normalised ingress for court-file updates. Implementations must not call
 * judiciary domains.
 */
export interface CaseFileConnector {
  describe(): CaseFileConnectorDescribe
  ingest(input: CaseFileIngestInput): Promise<NormalisedCaseEvent[]>
  health(): Promise<CaseFileConnectorHealth>
}

/** Seeded sample cases — everything is_sample and labelled Datos de demostración. */
export class SampleConnector implements CaseFileConnector {
  describe(): CaseFileConnectorDescribe {
    return {
      kind: 'sample',
      displayName: 'Casos de demostración',
      enabled: true,
      notes: 'Sirve expedientes ficticios etiquetados «Datos de demostración».',
    }
  }

  async ingest(input: CaseFileIngestInput): Promise<NormalisedCaseEvent[]> {
    const limit =
      input && typeof input === 'object' && 'limit' in input && typeof input.limit === 'number'
        ? Math.max(1, Math.min(20, input.limit))
        : 5
    const { SAMPLE_CASE_EVENTS } = await import('@/lib/ciceron/case-files/sample-events')
    return SAMPLE_CASE_EVENTS.slice(0, limit).map((e) => caseEventSchema.parse(e))
  }

  async health(): Promise<CaseFileConnectorHealth> {
    return {
      ok: true,
      kind: 'sample',
      checkedAt: new Date().toISOString(),
      message: 'Sample connector ready (Datos de demostración).',
    }
  }
}

/**
 * Lawyer personally consulted the court system and brings the update in:
 * pasted text, uploaded PDF, or forwarded notification email.
 * Parse → confirm UI → save (caller persists + stores original).
 */
export class ManualCaptureConnector implements CaseFileConnector {
  describe(): CaseFileConnectorDescribe {
    return {
      kind: 'manual',
      displayName: 'Captura manual',
      enabled: true,
      notes:
        'El abogado consulta el expediente en el portal oficial y aporta el texto, PDF o correo. Sin automatización judicial.',
    }
  }

  async ingest(input: CaseFileIngestInput): Promise<NormalisedCaseEvent[]> {
    if (!input || typeof input !== 'object' || !('kind' in input)) {
      throw new Error('ManualCaptureConnector requires paste, pdf, or email input')
    }
    const manual = input as ManualCaptureInput
    const { parseManualCapture } = await import('@/lib/ciceron/case-files/parse-manual')
    const parsed = parseManualCapture(manual)
    return [caseEventSchema.parse(parsed)]
  }

  async health(): Promise<CaseFileConnectorHealth> {
    return {
      ok: true,
      kind: 'manual',
      checkedAt: new Date().toISOString(),
      message: 'Manual capture ready. No judiciary network access.',
    }
  }
}

/**
 * Stub only. Enabling requires legal clearance (DECISIONS.md P8 / Prompt 6).
 * Flag: CICERON_PUBLIC_LOOKUP_ENABLED (default off). Do not implement the body.
 */
export class PublicLookupConnector implements CaseFileConnector {
  describe(): CaseFileConnectorDescribe {
    const enabled = process.env.CICERON_PUBLIC_LOOKUP_ENABLED === '1'
    return {
      kind: 'public_lookup',
      displayName: 'Consulta pública (no habilitada)',
      enabled,
      notes:
        'Stub. Requires legal clearance before any implementation — see docs/ciceron/DECISIONS.md.',
    }
  }

  async ingest(_input: CaseFileIngestInput): Promise<NormalisedCaseEvent[]> {
    // See DECISIONS.md — counsel clearance required before enabling PublicLookupConnector.
    // Intentionally no judiciary HTTP, credentials, captcha, or scrape logic.
    void _input
    throw new Error('not enabled: requires legal clearance')
  }

  async health(): Promise<CaseFileConnectorHealth> {
    return {
      ok: false,
      kind: 'public_lookup',
      checkedAt: new Date().toISOString(),
      message: 'not enabled: requires legal clearance',
    }
  }
}

export function getCaseFileConnector(
  kind: CaseFileConnectorDescribe['kind']
): CaseFileConnector {
  switch (kind) {
    case 'sample':
      return new SampleConnector()
    case 'manual':
      return new ManualCaptureConnector()
    case 'public_lookup':
      return new PublicLookupConnector()
    default: {
      const _exhaustive: never = kind
      throw new Error(`Unknown connector: ${String(_exhaustive)}`)
    }
  }
}
