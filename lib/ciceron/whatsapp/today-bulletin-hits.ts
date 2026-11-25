import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { CICERON_BOLETIN_SOURCES } from '@/lib/ciceron/boletines/seed-ids'
import { todayInMexicoCity } from '@/lib/ciceron/dof/dates'
import {
  formatTodayBulletinWhatsAppHeadline,
  pickSampleBulletinHit,
  type TodayBulletinHit,
} from './today-bulletin-headline-pure'

export type TodayBulletinWhatsAppHighlight = {
  count: number
  headline: string
  bulletinNumber: string | null
  stateCode: string
}

/**
 * Today's is_demo bulletin hits for a firm (entry publication_date in
 * America/Mexico_City). Prefers the CDMX source when present.
 */
export async function loadTodayBulletinWhatsAppHighlight(
  firmId: string,
  now = new Date()
): Promise<TodayBulletinWhatsAppHighlight | null> {
  const today = todayInMexicoCity(now)
  const db = tryCreateCiceronAdminClient()
  if (!db) return null

  const { data: entries, error: entErr } = await db
    .from('bulletin_entries')
    .select('id, court_name, expediente_number, source_id, run_id, publication_date')
    .eq('firm_id', firmId)
    .eq('is_demo', true)
    .eq('publication_date', today)

  if (entErr || !Array.isArray(entries) || entries.length === 0) return null

  const entryRows = entries as Array<{
    id: string
    court_name: string | null
    expediente_number: string | null
    source_id: string
    run_id: string
  }>
  const entryIds = entryRows.map((e) => e.id)

  const { data: hits, error: hitErr } = await db
    .from('bulletin_hits')
    .select('id, entry_id')
    .eq('firm_id', firmId)
    .eq('is_demo', true)
    .in('entry_id', entryIds)

  if (hitErr || !Array.isArray(hits) || hits.length === 0) return null

  const hitEntryIds = new Set(
    (hits as Array<{ entry_id: string }>).map((h) => h.entry_id)
  )
  const matchedEntries = entryRows.filter((e) => hitEntryIds.has(e.id))
  if (!matchedEntries.length) return null

  const cdmxId = CICERON_BOLETIN_SOURCES.cdmx
  const cdmxEntries = matchedEntries.filter((e) => e.source_id === cdmxId)
  const focused = cdmxEntries.length ? cdmxEntries : matchedEntries

  const runIds = [...new Set(focused.map((e) => e.run_id))]
  const { data: runs } = runIds.length
    ? await db
        .from('bulletin_runs')
        .select('id, bulletin_number, source_id')
        .in('id', runIds)
    : { data: [] }
  const runMap = new Map(
    (Array.isArray(runs) ? runs : []).map((r) => [
      (r as { id: string }).id,
      r as { id: string; bulletin_number: string | null; source_id: string },
    ])
  )

  const focusedHits: TodayBulletinHit[] = focused.map((e) => ({
    sourceId: e.source_id,
    bulletinNumber: runMap.get(e.run_id)?.bulletin_number ?? null,
    courtName: e.court_name,
    expediente: e.expediente_number,
  }))
  const sample = pickSampleBulletinHit(focusedHits)
  const stateCode = cdmxEntries.length ? 'CDMX' : 'MX'
  const headline = formatTodayBulletinWhatsAppHeadline({
    stateCode,
    bulletinNumber: sample?.bulletinNumber ?? focusedHits[0]?.bulletinNumber ?? null,
    count: focused.length,
    courtName: sample?.courtName,
    expediente: sample?.expediente,
  })
  if (!headline) return null

  return {
    count: focused.length,
    headline,
    bulletinNumber: sample?.bulletinNumber ?? null,
    stateCode,
  }
}
