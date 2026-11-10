import 'server-only'

import { z } from 'zod'
import type {
  SourceConnector,
  SourceHealth,
  SourceItem,
  SourceListItem,
} from '@/lib/ciceron/connectors/source'
import { normaliseDofHtml } from '@/lib/ciceron/dof/normalise'
import {
  isoToSidofDate,
  officialDofUrl,
  sidofDateToIso,
} from '@/lib/ciceron/dof/dates'

const PRIMARY = 'https://sidofqa.segob.gob.mx/dof/sidof'
const FALLBACK = 'https://sidof.segob.gob.mx/dof/sidof'
const MIN_GAP_MS = 300
const TIMEOUT_MS = 25_000

const dayListSchema = z.object({
  messageCode: z.union([z.number(), z.string()]).optional(),
  response: z.string().optional(),
  NotasMatutinas: z.array(z.record(z.string(), z.unknown())).optional(),
  NotasVespertinas: z.array(z.record(z.string(), z.unknown())).optional(),
  NotasExtraordinarias: z.array(z.record(z.string(), z.unknown())).optional(),
})

const noteDetailSchema = z.object({
  messageCode: z.union([z.number(), z.string()]).optional(),
  response: z.string().optional(),
  Nota: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).optional(),
  tamanioExcesivo: z.boolean().optional(),
})

function userAgent(): string {
  const custom = process.env.CICERON_DOF_USER_AGENT?.trim()
  if (custom) return custom
  const email = process.env.CICERON_DOF_CONTACT_EMAIL?.trim() || 'ciceron@crowdconscious.app'
  return `CiceronDemo/0.1 (+https://crowdconscious.app/ciceron; contact=${email})`
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function asString(v: unknown): string | null {
  if (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null') return v.trim()
  if (typeof v === 'number') return String(v)
  return null
}

function mapListRow(
  row: Record<string, unknown>,
  editionKind: SourceListItem['editionKind']
): SourceListItem | null {
  const cod = asString(row.codNota)
  if (!cod) return null
  const fecha = asString(row.fecha)
  const date = fecha ? sidofDateToIso(fecha) : ''
  if (!date) return null
  const authority =
    asString(row.nombreCodOrgaDos) ||
    asString(row.nombreCodOrgaUno) ||
    asString(row.codOrgaDos) ||
    asString(row.codOrgaUno)
  return {
    externalId: cod,
    title: asString(row.titulo),
    date,
    editionKind,
    section: asString(row.codSeccion),
    authority,
    raw: row,
  }
}

export class SidofConnector implements SourceConnector {
  readonly sourceKey = 'dof_sidof'
  private lastRequestAt = 0
  private backoffMs = MIN_GAP_MS

  private async throttle() {
    const wait = Math.max(0, this.lastRequestAt + this.backoffMs - Date.now())
    if (wait > 0) await sleep(wait)
  }

  private async fetchJson(path: string): Promise<unknown> {
    const bases = [PRIMARY, FALLBACK]
    let lastError: Error | null = null

    for (const base of bases) {
      for (let attempt = 0; attempt < 3; attempt++) {
        await this.throttle()
        this.lastRequestAt = Date.now()
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
        try {
          const res = await fetch(`${base}${path}`, {
            method: 'GET',
            headers: {
              Accept: 'application/json, text/plain, */*',
              'User-Agent': userAgent(),
            },
            signal: ctrl.signal,
            cache: 'no-store',
          })
          if (res.status === 429 || res.status >= 500) {
            this.backoffMs = Math.min(8_000, Math.max(MIN_GAP_MS, this.backoffMs * 2))
            lastError = new Error(`SIDOF ${res.status} on ${path}`)
            await sleep(this.backoffMs)
            continue
          }
          if (!res.ok) {
            throw new Error(`SIDOF HTTP ${res.status} on ${path}`)
          }
          this.backoffMs = MIN_GAP_MS
          return await res.json()
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          this.backoffMs = Math.min(8_000, Math.max(MIN_GAP_MS, this.backoffMs * 2))
          await sleep(this.backoffMs)
        } finally {
          clearTimeout(timer)
        }
      }
    }
    throw lastError ?? new Error(`SIDOF unreachable for ${path}`)
  }

  async listForDate(isoDate: string): Promise<SourceListItem[]> {
    const sidof = isoToSidofDate(isoDate)
    const json = await this.fetchJson(`/notas/${sidof}`)
    const parsed = dayListSchema.parse(json)
    const out: SourceListItem[] = []
    for (const [key, kind] of [
      ['NotasMatutinas', 'matutina'],
      ['NotasVespertinas', 'vespertina'],
      ['NotasExtraordinarias', 'extraordinaria'],
    ] as const) {
      for (const row of parsed[key] ?? []) {
        const item = mapListRow(row, kind)
        if (item) out.push(item)
      }
    }
    return out
  }

  async fetchItem(
    externalId: string,
    opts?: { listHint?: SourceListItem }
  ): Promise<SourceItem | null> {
    const json = await this.fetchJson(`/notas/nota/${encodeURIComponent(externalId)}`)
    const parsed = noteDetailSchema.parse(json)
    const nota = parsed.Nota
    if (!nota || Array.isArray(nota) || Object.keys(nota).length === 0) {
      return null
    }
    const html = asString(nota.cadenaContenido) ?? ''
    const title =
      asString(nota.titulo) ||
      opts?.listHint?.title ||
      `Nota ${externalId}`
    const fecha = asString(nota.fecha) || (opts?.listHint ? isoToSidofDate(opts.listHint.date) : null)
    if (!fecha) return null
    const iso = sidofDateToIso(fecha)
    if (!html.trim()) {
      // Empty body — skip
      return null
    }
    const authority =
      asString(nota.nombOrganismo) ||
      asString(nota.codOrgaDos) ||
      asString(nota.codOrgaUno) ||
      opts?.listHint?.authority ||
      null

    return {
      externalId: String(asString(nota.codNota) || externalId),
      title,
      date: iso,
      editionKind: opts?.listHint?.editionKind ?? null,
      section: asString(nota.codSeccion) || opts?.listHint?.section || null,
      authority,
      html,
      officialUrl: officialDofUrl(String(externalId), iso),
      raw: json,
    }
  }

  normalise(item: SourceItem) {
    return normaliseDofHtml(item.html, item.title)
  }

  async health(): Promise<SourceHealth> {
    const started = Date.now()
    try {
      // Use a known recent empty-or-full day probe via list
      await this.listForDate('2026-11-07')
      return {
        ok: true,
        sourceKey: this.sourceKey,
        checkedAt: new Date().toISOString(),
        message: 'SIDOF list endpoint reachable',
        latencyMs: Date.now() - started,
      }
    } catch (err) {
      return {
        ok: false,
        sourceKey: this.sourceKey,
        checkedAt: new Date().toISOString(),
        message: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - started,
      }
    }
  }
}

export function createSidofConnector(): SidofConnector {
  return new SidofConnector()
}
