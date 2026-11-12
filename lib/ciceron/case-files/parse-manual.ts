import type { ManualCaptureInput } from '@/lib/ciceron/connectors/case-file'
import type { NormalisedCaseEvent } from '@/lib/ciceron/connectors/case-file'
import { CICERON_DEMO_LABEL } from '@/lib/ciceron/config'

const DATE_RE =
  /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i
const ISO_RE = /(\d{4})-(\d{2})-(\d{2})/
const FILE_RE =
  /(?:expediente|exp\.?|n[uú]mero)\s*[:\s#]*([A-Z0-9ÁÉÍÓÚÑ./-]{4,40})/i
const COURT_RE =
  /((?:Tribunal|Juzgado|Sala|SCJN|TFJA|Pleno)[^\n.]{0,80})/i

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

function extractDate(text: string): string {
  const iso = ISO_RE.exec(text)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T12:00:00.000Z`
  const m = DATE_RE.exec(text)
  if (m) {
    const day = String(Number(m[1])).padStart(2, '0')
    const month = String(MONTHS[m[2]!.toLowerCase()] ?? 1).padStart(2, '0')
    return `${m[3]}-${month}-${day}T12:00:00.000Z`
  }
  return new Date().toISOString()
}

function guessEventType(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('requerimiento')) return 'acuerdo_requerimiento'
  if (t.includes('emplaz')) return 'emplazamiento'
  if (t.includes('sentencia')) return 'notificacion_sentencia'
  if (t.includes('notific')) return 'notificacion_demanda'
  if (t.includes('audiencia')) return 'audiencia'
  if (t.includes('acuerdo')) return 'acuerdo'
  return 'actuacion'
}

/**
 * Lightweight heuristic parse for confirmation UI. Lawyer must confirm before save.
 */
export function parseManualCapture(input: ManualCaptureInput): NormalisedCaseEvent {
  let text = (input.text ?? '').trim()
  if (input.kind === 'pdf' && input.pdfBase64) {
    // Demo: we do not decode PDF binaries in-repo; lawyer paste remains the text source.
    text =
      text ||
      `[PDF aportado por el abogado: ${input.fileName ?? 'acuerdo.pdf'}]\n` +
        'Contenido textual pendiente de confirmación manual.'
  }
  if (!text) {
    throw new Error('Debe aportar texto, PDF con nota, o correo reenviado.')
  }

  const labelled = text.includes(CICERON_DEMO_LABEL)
    ? text
    : `${CICERON_DEMO_LABEL}. ${text}`

  const fileFromText = FILE_RE.exec(text)?.[1] ?? null
  const courtFromText = COURT_RE.exec(text)?.[1]?.trim() ?? null

  return {
    courtName: input.courtNameHint?.trim() || courtFromText,
    fileNumber: input.fileNumberHint?.trim() || fileFromText,
    eventType: guessEventType(text),
    occurredAt: extractDate(text),
    text: labelled,
    summary: labelled.slice(0, 280),
    rawPayload: {
      source: 'manual',
      captureKind: input.kind,
      fileName: input.fileName ?? null,
      label: CICERON_DEMO_LABEL,
    },
    isSample: true,
    captureKind: input.kind,
    originalStoragePath: null,
    originalMime: input.mimeType ?? (input.kind === 'pdf' ? 'application/pdf' : 'text/plain'),
  }
}
