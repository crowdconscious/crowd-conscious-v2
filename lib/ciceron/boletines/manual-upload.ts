import 'server-only'

import {
  buildUploadStoragePath,
  isTextProcessable,
  MAX_BULLETIN_TEXT_CHARS,
  TEXT_TOO_LONG_ES,
  type AllowedUploadMime,
  type ManualUploadInput,
} from '@/lib/ciceron/boletines/manual-upload-validation'
import {
  MANUAL_TEXT_PARSER_VERSION,
  validateAndParseManualText,
} from '@/lib/ciceron/boletines/manual-text-parser'
import { matchEntries, type CatalogueMatter } from '@/lib/ciceron/boletines/matcher'
import { findStateDirectoryEntry } from '@/lib/ciceron/boletines/state-directory'
import { PARSER_VERSION } from '@/lib/ciceron/boletines/types'
import {
  createCiceronAdminStorage,
  tryCreateCiceronAdminClient,
} from '@/lib/ciceron/db/client'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'

function isDemoFirm(firmId: string): boolean {
  return firmId === CICERON_SEED.firmDemo || firmId === CICERON_SEED.firmContraste
}

export type ManualUploadResult = {
  ok: boolean
  message: string
  uploadId?: string
  runId?: string
  status?: string
  entriesFound?: number
  hitsFound?: number
  policyId?: string
  policyReason?: string
}

function canUpload(role: string): boolean {
  return role === 'socio' || role === 'asociado' || role === 'admin'
}

async function removeStoredUpload(path: string | null): Promise<void> {
  if (!path) return
  try {
    const storage = createCiceronAdminStorage()
    await storage.remove([path])
  } catch {
    // Best-effort cleanup after a failed create_bulletin_upload.
  }
}

function textOverLimit(text: string | null | undefined): boolean {
  return Boolean(text && text.length > MAX_BULLETIN_TEXT_CHARS)
}

async function loadCatalogue(
  db: NonNullable<ReturnType<typeof tryCreateCiceronAdminClient>>,
  firmId: string,
  stateCode: string,
  isDemo: boolean
): Promise<CatalogueMatter[]> {
  let q = db
    .from('bulletin_matter_catalogue')
    .select(
      'id, court_name, expediente_number, party_name_variants, matter_id, case_file_id, state_code'
    )
    .eq('firm_id', firmId)
    .eq('is_active', true)
    .eq('state_code', stateCode)
  if (isDemo) q = q.eq('is_demo', true)
  const { data, error } = await q
  if (error || !data) return []
  const rows = data as Array<Record<string, unknown>>
  return rows.map((row) => ({
    id: String(row.id),
    courtName: String(row.court_name),
    expedienteNumber: String(row.expediente_number),
    partyNameVariants: (row.party_name_variants as string[] | null) ?? [],
    matterId: (row.matter_id as string | null) ?? null,
    caseFileId: (row.case_file_id as string | null) ?? null,
    stateCode: String(row.state_code),
  }))
}

async function maybeCloseManualCheck(opts: {
  db: NonNullable<ReturnType<typeof tryCreateCiceronAdminClient>>
  firmId: string
  sourceId: string
  publicationDate: string
  actorId: string
  isDemo: boolean
}): Promise<void> {
  const { db, firmId, sourceId, publicationDate, actorId, isDemo } = opts
  let q = db
    .from('bulletin_manual_checks')
    .select('id, status')
    .eq('firm_id', firmId)
    .eq('source_id', sourceId)
    .eq('check_date', publicationDate)
    .in('status', ['pendiente', 'asignado'])
    .limit(1)
  if (isDemo) q = q.eq('is_demo', true)
  const { data } = await q
  const rows = (data as Array<{ id?: string }> | null) ?? []
  const row = rows[0]
  if (!row?.id) return
  await db.rpc('complete_bulletin_manual_check', {
    p_firm_id: firmId,
    p_check_id: row.id,
    p_actor: actorId,
    p_notes: 'Cerrada por carga manual con coincidencias.',
  })
}

export async function processManualBulletinUpload(opts: {
  persona: DemoPersona
  input: ManualUploadInput
  fileBytes?: Uint8Array | null
  fileMime?: AllowedUploadMime | null
}): Promise<ManualUploadResult> {
  const { persona, input } = opts
  if (!canUpload(persona.role)) {
    return {
      ok: false,
      policyId: 'rbac_role',
      policyReason:
        'Solo socio, asociado o administrador puede subir boletines.',
      message:
        'Solo socio, asociado o administrador puede subir boletines.',
    }
  }

  const entry = findStateDirectoryEntry(input.stateCode)
  if (!entry) {
    return { ok: false, message: 'Seleccione una entidad federativa válida.' }
  }

  const dbClient = tryCreateCiceronAdminClient()
  if (!dbClient) {
    return { ok: false, message: 'Sin conexión a datos. Intente de nuevo más tarde.' }
  }
  const db = dbClient

  // Catalogue / run is_demo still follows the seed firm ids for demo board filters.
  // RPC create_bulletin_upload ignores p_is_demo and copies firms.is_demo.
  const isDemo = isDemoFirm(persona.firmId)
  const uploadId = crypto.randomUUID()
  const mime = opts.fileMime ?? input.mime ?? null
  let storagePath: string | null = null
  let pastedText = input.pastedText?.trim() || null

  // Reject oversized text BEFORE storage.upload or the RPC.
  if (textOverLimit(pastedText)) {
    return { ok: false, message: TEXT_TOO_LONG_ES, policyId: 'text_too_long' }
  }
  if (opts.fileBytes && mime === 'text/plain' && !pastedText) {
    pastedText = new TextDecoder('utf-8').decode(opts.fileBytes)
    if (textOverLimit(pastedText)) {
      return { ok: false, message: TEXT_TOO_LONG_ES, policyId: 'text_too_long' }
    }
  }

  if (opts.fileBytes && mime) {
    storagePath = buildUploadStoragePath({
      firmId: persona.firmId,
      publicationDate: input.publicationDate,
      uploadId,
      mime,
    })
    try {
      const storage = createCiceronAdminStorage()
      const body = Buffer.from(opts.fileBytes)
      const { error: upErr } = await storage.upload(storagePath, body, {
        contentType: mime,
        upsert: false,
      })
      if (upErr) {
        return {
          ok: false,
          message: 'No se pudo guardar el archivo. Intente de nuevo.',
        }
      }
    } catch {
      return {
        ok: false,
        message: 'No se pudo guardar el archivo. Intente de nuevo.',
      }
    }
  }

  async function createUploadRow(
    args: Record<string, unknown>
  ): Promise<{ ok: true; data: Record<string, unknown> | null } | { ok: false; message: string; policyId?: string; policyReason?: string }> {
    const { data, error } = await db.rpc('create_bulletin_upload', args)
    if (error) {
      await removeStoredUpload(storagePath)
      return {
        ok: false,
        message: 'No se pudo registrar la carga.',
        policyReason: error.message,
      }
    }
    const row = data as Record<string, unknown> | null
    if (row && row.ok === false) {
      await removeStoredUpload(storagePath)
      return {
        ok: false,
        policyId: String(row.policy_id ?? 'rbac_role'),
        policyReason: String(row.policy_reason ?? 'Denegado.'),
        message: String(row.policy_reason ?? 'Denegado.'),
      }
    }
    return { ok: true, data: row }
  }

  const textOk = isTextProcessable(mime, pastedText ?? undefined)

  // Scanned PDF / images: store only, honest needs_review copy.
  if (!textOk) {
    const created = await createUploadRow({
      p_firm_id: persona.firmId,
      p_actor: persona.id,
      p_state_code: entry.stateCode,
      p_state_name: entry.stateName,
      p_publication_date: input.publicationDate,
      p_source_id: entry.sourceId,
      p_mime: mime,
      p_storage_path: storagePath,
      p_pasted_text: null,
      p_status: 'needs_review',
      p_entries_found: 0,
      p_hits_found: 0,
      p_parser_notes:
        'Recibido. La lectura automática de boletines escaneados llega pronto; el equipo lo revisará.',
      p_run_id: null,
      p_is_demo: isDemo,
      p_retention_days: 30,
      p_upload_id: uploadId,
    })
    if (!created.ok) return created
    return {
      ok: true,
      uploadId,
      status: 'needs_review',
      entriesFound: 0,
      hitsFound: 0,
      message:
        'Recibido. La lectura automática de boletines escaneados llega pronto; el equipo lo revisará.',
    }
  }

  const parsed = validateAndParseManualText(pastedText ?? '')
  if (!parsed.ok) {
    const created = await createUploadRow({
      p_firm_id: persona.firmId,
      p_actor: persona.id,
      p_state_code: entry.stateCode,
      p_state_name: entry.stateName,
      p_publication_date: input.publicationDate,
      p_source_id: entry.sourceId,
      p_mime: mime ?? 'text/plain',
      p_storage_path: storagePath,
      p_pasted_text: pastedText,
      p_status: 'needs_review',
      p_entries_found: 0,
      p_hits_found: 0,
      p_parser_notes: parsed.error ?? 'Sin entradas detectadas.',
      p_run_id: null,
      p_is_demo: isDemo,
      p_retention_days: 30,
      p_upload_id: uploadId,
    })
    if (!created.ok) {
      return {
        ok: false,
        message: parsed.error ?? 'No se pudo interpretar el texto.',
      }
    }
    return {
      ok: true,
      uploadId,
      status: 'needs_review',
      entriesFound: 0,
      hitsFound: 0,
      message:
        parsed.error ??
        'Recibido. No se detectaron entradas; el equipo lo revisará.',
    }
  }

  if (!entry.sourceId) {
    return {
      ok: false,
      message: 'Esta fuente federal no admite carga de boletín estatal.',
    }
  }

  const catalogue = await loadCatalogue(db, persona.firmId, entry.stateCode, isDemo)
  const hits = matchEntries(parsed.entries, catalogue)
  const hitsExact = hits.filter((h) => h.matchKind === 'exact').length
  const hitsPossible = hits.filter((h) => h.matchKind === 'possible').length
  const status = hits.length > 0 ? 'ok' : 'ok'
  const uploadStatus = hits.length > 0 ? 'matched' : 'no_matches'

  const startedAt = new Date().toISOString()
  const { data: runId, error: runErr } = await db.rpc('record_bulletin_run', {
    p_firm_id: persona.firmId,
    p_source_id: entry.sourceId,
    p_publication_date: input.publicationDate,
    p_status: status,
    p_bulletin_number: null,
    p_failure_stage: null,
    p_failure_message: null,
    p_entries_parsed: parsed.entries.length,
    p_matters_searched: catalogue.length,
    p_hits_exact: hitsExact,
    p_hits_possible: hitsPossible,
    p_duration_ms: null,
    p_parser_version: `${PARSER_VERSION}+${MANUAL_TEXT_PARSER_VERSION}`,
    p_source_url: entry.landingUrl,
    p_is_demo: isDemo,
    p_metadata: {
      origin: 'manual_upload',
      upload_id: uploadId,
    },
    p_started_at: startedAt,
    p_run_id: null,
  })

  if (runErr || !runId) {
    return {
      ok: false,
      message: 'No se pudo registrar la corrida del boletín.',
      policyReason: runErr?.message,
    }
  }

  for (const hit of hits) {
    await db.rpc('record_bulletin_hit', {
      p_firm_id: persona.firmId,
      p_run_id: runId as string,
      p_source_id: entry.sourceId,
      p_publication_date: input.publicationDate,
      p_match_kind: hit.matchKind,
      p_score: hit.score,
      p_reason: hit.reason,
      p_court_name: hit.entry.courtName ?? null,
      p_expediente_number: hit.entry.expedienteNumber ?? null,
      p_party_names: hit.entry.partyNames ?? null,
      p_summary: hit.entry.summary ?? null,
      p_source_url: entry.landingUrl,
      p_raw_excerpt: null,
      p_catalogue_id: hit.catalogueId,
      p_matter_id: hit.matterId,
      p_case_file_id: hit.caseFileId,
      p_retention_days: 30,
      p_is_demo: isDemo,
    })
  }

  const created = await createUploadRow({
    p_firm_id: persona.firmId,
    p_actor: persona.id,
    p_state_code: entry.stateCode,
    p_state_name: entry.stateName,
    p_publication_date: input.publicationDate,
    p_source_id: entry.sourceId,
    p_mime: mime ?? 'text/plain',
    p_storage_path: storagePath,
    p_pasted_text: pastedText,
    p_status: uploadStatus,
    p_entries_found: parsed.entries.length,
    p_hits_found: hits.length,
    p_parser_notes: `Parser ${MANUAL_TEXT_PARSER_VERSION}; ${hits.length} coincidencia(s).`,
    p_run_id: runId as string,
    p_is_demo: isDemo,
    p_retention_days: 30,
    p_upload_id: uploadId,
  })

  if (!created.ok) {
    return {
      ok: false,
      message: 'La corrida se registró, pero falló el recibo de carga.',
      runId: runId as string,
    }
  }

  if (uploadStatus === 'matched') {
    try {
      await maybeCloseManualCheck({
        db,
        firmId: persona.firmId,
        sourceId: entry.sourceId,
        publicationDate: input.publicationDate,
        actorId: persona.id,
        isDemo,
      })
    } catch {
      // Closing the manual check is best-effort for the MVP.
    }
  }

  const hitsLabel = hits.length === 1 ? '1 coincidencia' : `${hits.length} coincidencias`
  return {
    ok: true,
    uploadId,
    runId: runId as string,
    status: uploadStatus,
    entriesFound: parsed.entries.length,
    hitsFound: hits.length,
    message: `Recibido · ${hitsLabel}`,
  }
}
