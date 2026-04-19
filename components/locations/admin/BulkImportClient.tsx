'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Upload } from 'lucide-react'
import { LOCATION_CATEGORY_FORM_OPTIONS } from '@/lib/locations/categories'

const LIST_PATH = '/predictions/admin/locations'

const CSV_HEADERS = [
  'name',
  'category',
  'neighborhood',
  'city',
  'address',
  'lat',
  'lng',
  'instagram_handle',
  'website',
  'contact_email',
  'description_es',
  'description_en',
  'why_conscious_es',
  'why_conscious_en',
] as const

type CsvRow = Record<(typeof CSV_HEADERS)[number], string>

type ApiRow = {
  name: string
  category?: string
  neighborhood?: string
  city?: string
  address?: string
  latitude?: number | null
  longitude?: number | null
  instagram_handle?: string
  website?: string
  contact_email?: string
  description_es?: string
  description_en?: string
  why_conscious_es?: string
  why_conscious_en?: string
}

type RowResult = {
  index: number
  ok: boolean
  name: string
  slug: string
  error?: string
  location_id?: string
  inserted?: boolean
}

type ImportResponse = {
  dry_run: boolean
  total: number
  valid?: number
  invalid?: number
  inserted?: number
  failed?: number
  results: RowResult[]
}

const SAMPLE_CSV = `name,category,neighborhood,city,address,lat,lng,instagram_handle,website,contact_email,description_es,description_en,why_conscious_es,why_conscious_en
La Bikina,restaurant,Polanco,CDMX,"Calle Ejemplo 123",,,@labikina.mx,https://labikina.mx,hola@labikina.mx,Cocina mexicana contemporánea,Contemporary Mexican kitchen,Ingredientes locales y producto temporal,Local ingredients and seasonal sourcing
`

function splitCsvLine(line: string): string[] {
  // Tiny CSV splitter that respects double-quoted fields with commas inside.
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function parseCsv(text: string): { rows: CsvRow[]; error: string | null } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return { rows: [], error: 'CSV vacío' }
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const missing = ['name'].filter((h) => !header.includes(h))
  if (missing.length > 0) {
    return { rows: [], error: `Falta columna obligatoria: ${missing.join(', ')}` }
  }
  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i])
    const row = {} as CsvRow
    header.forEach((h, idx) => {
      if ((CSV_HEADERS as readonly string[]).includes(h)) {
        row[h as keyof CsvRow] = cells[idx] ?? ''
      }
    })
    if (!row.name) continue
    rows.push(row)
  }
  return { rows, error: null }
}

function csvRowToApi(r: CsvRow): ApiRow {
  const lat = r.lat?.trim() ? Number(r.lat) : null
  const lng = r.lng?.trim() ? Number(r.lng) : null
  return {
    name: r.name,
    category: r.category || undefined,
    neighborhood: r.neighborhood || undefined,
    city: r.city || undefined,
    address: r.address || undefined,
    latitude: lat != null && Number.isFinite(lat) ? lat : null,
    longitude: lng != null && Number.isFinite(lng) ? lng : null,
    instagram_handle: r.instagram_handle || undefined,
    website: r.website || undefined,
    contact_email: r.contact_email || undefined,
    description_es: r.description_es || undefined,
    description_en: r.description_en || undefined,
    why_conscious_es: r.why_conscious_es || undefined,
    why_conscious_en: r.why_conscious_en || undefined,
  }
}

export default function BulkImportClient() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [csvText, setCsvText] = useState('')
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportResponse | null>(null)
  const [committing, setCommitting] = useState(false)
  const [committed, setCommitted] = useState<ImportResponse | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const validCount = useMemo(
    () => preview?.results.filter((r) => r.ok).length ?? 0,
    [preview]
  )
  const invalidCount = useMemo(
    () => preview?.results.filter((r) => !r.ok).length ?? 0,
    [preview]
  )

  const onFile = async (file: File) => {
    const text = await file.text()
    setCsvText(text)
    runParse(text)
  }

  const runParse = (text: string) => {
    setPreview(null)
    setCommitted(null)
    setServerError(null)
    const { rows, error } = parseCsv(text)
    if (error) {
      setParseError(error)
      setParsedRows([])
      return
    }
    setParseError(null)
    setParsedRows(rows)
  }

  const runDryRun = async () => {
    if (parsedRows.length === 0) return
    setServerError(null)
    setPreview(null)
    setCommitted(null)
    try {
      const res = await fetch('/api/admin/locations/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedRows.map(csvRowToApi),
          dry_run: true,
        }),
      })
      const json = (await res.json()) as ImportResponse | { error: string }
      if (!res.ok || 'error' in json) {
        setServerError('error' in json ? json.error : 'Error desconocido')
        return
      }
      setPreview(json)
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Network error')
    }
  }

  const runImport = async () => {
    if (parsedRows.length === 0 || validCount === 0) return
    setCommitting(true)
    setCommitted(null)
    setServerError(null)
    try {
      const res = await fetch('/api/admin/locations/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedRows.map(csvRowToApi),
          dry_run: false,
        }),
      })
      const json = (await res.json()) as ImportResponse | { error: string }
      if (!res.ok || 'error' in json) {
        setServerError('error' in json ? json.error : 'Error desconocido')
        return
      }
      setCommitted(json)
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setCommitting(false)
    }
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'conscious-locations-sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={LIST_PATH}
          className="inline-flex items-center gap-1 text-sm text-cc-text-secondary hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a ubicaciones
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-white">Bulk import — Conscious Locations</h1>
        <p className="mt-1 text-sm text-cc-text-secondary">
          Sube un CSV con hasta 200 filas. Cada lugar entra como{' '}
          <span className="font-mono text-amber-300">pending</span> — vuelve al editor para
          activar el mercado de votación.
        </p>
      </div>

      {/* Step 1 — drop a CSV */}
      <section className="rounded-xl border border-cc-border bg-[#1a2029] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">1. Cargar CSV</h2>
            <p className="text-xs text-cc-text-secondary">
              Columnas aceptadas: {CSV_HEADERS.join(', ')}. Solo <span className="font-mono">name</span> es obligatoria.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadSample}
            className="inline-flex items-center gap-1 rounded-lg border border-cc-border px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10"
          >
            <Download className="h-3.5 w-3.5" />
            CSV de ejemplo
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onFile(f)
            }}
            className="block w-full max-w-xs text-xs text-cc-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-emerald-500"
          />
          {parsedRows.length > 0 && (
            <span className="text-xs text-emerald-400">
              {parsedRows.length} fila(s) detectada(s)
            </span>
          )}
        </div>

        <details className="mt-4 text-xs text-cc-text-secondary">
          <summary className="cursor-pointer text-emerald-400">o pega el CSV aquí</summary>
          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value)
              runParse(e.target.value)
            }}
            rows={6}
            className="mt-2 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] p-2 font-mono text-xs text-white"
            placeholder={`name,category,neighborhood,...\nLa Bikina,restaurant,Polanco,...`}
          />
        </details>

        <details className="mt-4 text-xs text-cc-text-secondary">
          <summary className="cursor-pointer text-emerald-400">
            Categorías permitidas ({LOCATION_CATEGORY_FORM_OPTIONS.length})
          </summary>
          <p className="mt-1 font-mono">
            {LOCATION_CATEGORY_FORM_OPTIONS.map((c) => c.value).join(', ')}
          </p>
        </details>

        {parseError && (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
            {parseError}
          </p>
        )}
      </section>

      {/* Step 2 — preview */}
      <section className="rounded-xl border border-cc-border bg-[#1a2029] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">2. Previsualizar (dry run)</h2>
          <button
            type="button"
            disabled={parsedRows.length === 0}
            onClick={() => void runDryRun()}
            className="rounded-lg border border-cc-border bg-cc-card px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Validar {parsedRows.length || ''} fila(s)
          </button>
        </div>

        {preview && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400">
                {validCount} válida(s)
              </span>
              <span className="rounded-full bg-red-500/10 px-3 py-1 text-red-300">
                {invalidCount} con error(es)
              </span>
              <span className="rounded-full bg-cc-card px-3 py-1 text-cc-text-secondary">
                {preview.total} total
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-cc-border">
              <table className="w-full text-xs">
                <thead className="bg-[#0f1419] text-cc-text-secondary">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Slug</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.results.map((r) => (
                    <tr key={`${r.index}-${r.slug}`} className="border-t border-cc-border">
                      <td className="px-3 py-1.5 text-cc-text-secondary">{r.index + 1}</td>
                      <td className="px-3 py-1.5 text-white">{r.name || '—'}</td>
                      <td className="px-3 py-1.5 font-mono text-cc-text-secondary">
                        {r.slug || '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        {r.ok ? (
                          <span className="text-emerald-400">OK</span>
                        ) : (
                          <span className="text-red-300">{r.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Step 3 — commit */}
      <section className="rounded-xl border border-cc-border bg-[#1a2029] p-5">
        <h2 className="text-base font-semibold text-white">3. Importar</h2>
        <p className="mt-1 text-xs text-cc-text-secondary">
          Solo se insertan filas con estado <span className="text-emerald-400">OK</span> en la
          previsualización. Las filas con error se ignoran.
        </p>
        <button
          type="button"
          disabled={committing || !preview || validCount === 0}
          onClick={() => void runImport()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {committing
            ? 'Importando…'
            : preview
              ? `Importar ${validCount} fila(s) válida(s)`
              : 'Primero previsualiza'}
        </button>

        {committed && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              Se insertaron <strong>{committed.inserted ?? 0}</strong> ubicación(es) en estado
              <span className="font-mono"> pending</span>.
              {(committed.failed ?? 0) > 0 && (
                <>
                  {' '}
                  <span className="text-amber-300">{committed.failed} fila(s) fallaron.</span>
                </>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-cc-border">
              <table className="w-full text-xs">
                <thead className="bg-[#0f1419] text-cc-text-secondary">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Slug</th>
                    <th className="px-3 py-2 text-left font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {committed.results.map((r) => (
                    <tr key={`${r.index}-${r.slug}`} className="border-t border-cc-border">
                      <td className="px-3 py-1.5 text-white">{r.name}</td>
                      <td className="px-3 py-1.5 font-mono text-cc-text-secondary">{r.slug}</td>
                      <td className="px-3 py-1.5">
                        {r.inserted ? (
                          <Link
                            href={`${LIST_PATH}/${r.location_id}/edit`}
                            className="text-emerald-400 hover:underline"
                          >
                            Editar →
                          </Link>
                        ) : (
                          <span className="text-red-300">{r.error ?? 'no insertada'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {serverError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {serverError}
        </p>
      )}
    </div>
  )
}
