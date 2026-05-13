'use client'

import { useCallback, useId, useRef, useState } from 'react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'

export type EvidenceItem =
  | {
      kind: 'image'
      storage_path: string
      caption: string
      preview_url?: string
      filename?: string
    }
  | { kind: 'link'; external_url: string; caption: string }

// Pilot scope is images-only. HEIC/HEIF are included so iPhone photos taken
// with the default camera format upload without manual conversion. Keep in
// lock-step with `ALLOWED_TYPES` in app/api/signals/upload/route.ts.
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])
const MAX_FILES = 5
const MAX_BYTES = 10 * 1024 * 1024

type Props = {
  locale: CitizenSignalsLocale
  items: ReadonlyArray<EvidenceItem>
  onChange: (next: EvidenceItem[]) => void
}

/**
 * Drag-and-drop evidence uploader. Hits POST /api/signals/upload for files
 * and stores the returned `storage_path` so the client can attach it to
 * the signal POST. Links go straight into state — no upload round-trip.
 *
 * The component owns its file input and its drop zone visual state, but
 * the canonical evidence array lives in the parent so it can be persisted
 * to localStorage alongside the rest of the wizard draft.
 */
export default function EvidenceUploader({ locale, items, onChange }: Props) {
  const t = getCitizenSignalsCopy(locale)
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const isFull = items.length >= MAX_FILES

  const uploadFile = useCallback(
    async (file: File) => {
      if (items.length >= MAX_FILES) {
        setError(t.compose.validation.evidenceMax(MAX_FILES))
        return
      }
      if (!ALLOWED_TYPES.has(file.type)) {
        setError(t.compose.validation.fileWrongType)
        return
      }
      if (file.size > MAX_BYTES) {
        setError(t.compose.validation.fileTooLarge)
        return
      }
      setError(null)
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/signals/upload', {
          method: 'POST',
          body: fd,
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? `HTTP ${res.status}`)
        }
        const j = (await res.json()) as {
          storage_path: string
          kind: 'image'
        }
        const next: EvidenceItem = {
          kind: 'image',
          storage_path: j.storage_path,
          caption: '',
          filename: file.name,
          preview_url: URL.createObjectURL(file),
        }
        onChange([...items, next])
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Upload failed'
        setError(message)
      } finally {
        setUploading(false)
      }
    },
    [items, onChange, t]
  )

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const remaining = MAX_FILES - items.length
      const list = Array.from(files).slice(0, remaining)
      for (const file of list) {
        await uploadFile(file)
      }
    },
    [items.length, uploadFile]
  )

  const updateCaption = (idx: number, caption: string) => {
    const copy = items.slice()
    copy[idx] = { ...copy[idx], caption }
    onChange(copy)
  }

  const remove = (idx: number) => {
    const removed = items[idx]
    if (removed && 'preview_url' in removed && removed.preview_url) {
      try {
        URL.revokeObjectURL(removed.preview_url)
      } catch {
        // best-effort cleanup
      }
    }
    onChange(items.filter((_, i) => i !== idx))
  }

  const addLink = () => {
    const url = linkValue.trim()
    setLinkError(null)
    if (!url) return
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('protocol')
      }
    } catch {
      setLinkError(t.compose.validation.invalidUrl)
      return
    }
    if (items.length >= MAX_FILES) {
      setError(t.compose.validation.evidenceMax(MAX_FILES))
      return
    }
    onChange([...items, { kind: 'link', external_url: url, caption: '' }])
    setLinkValue('')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">{t.compose.evidence.intro}</p>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!isFull && !uploading) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (isFull || uploading) return
          void handleFiles(e.dataTransfer.files)
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? 'border-emerald-400 bg-emerald-500/10'
            : isFull
              ? 'border-[#2d3748] bg-[#0b1018] opacity-60'
              : 'border-[#2d3748] bg-[#0f1419] hover:border-emerald-400/60'
        }`}
      >
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          disabled={isFull || uploading}
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <label
          htmlFor={inputId}
          className={`block ${
            isFull || uploading ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <p className="text-sm font-semibold text-emerald-300">
            {uploading
              ? t.compose.wizard.uploadingCta
              : t.compose.wizard.dropHere}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t.compose.evidence.helpImage} ·{' '}
            {t.compose.wizard.evidenceCount(items.length, MAX_FILES)}
          </p>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-[#2d3748] bg-[#0f1419] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t.compose.wizard.addLink}
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder="https://"
            className="flex-1 rounded-lg border border-[#2d3748] bg-[#0b1018] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={addLink}
            disabled={isFull || !linkValue.trim()}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.compose.wizard.addLinkCta}
          </button>
        </div>
        {linkError && (
          <p role="alert" className="mt-2 text-xs text-rose-300">
            {linkError}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          {t.compose.evidence.helpLink}
        </p>
      </div>

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((ev, i) => (
            <li
              key={i}
              className="flex flex-col gap-3 rounded-lg border border-[#2d3748] bg-[#0f1419] p-3 sm:flex-row"
            >
              <div className="flex w-full shrink-0 items-center gap-3 sm:w-32">
                {ev.kind === 'image' && 'preview_url' in ev && ev.preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ev.preview_url}
                    alt=""
                    className="h-20 w-full rounded-md object-cover sm:h-20 sm:w-32"
                  />
                ) : (
                  <div className="flex h-20 w-full items-center justify-center rounded-md border border-[#2d3748] bg-[#0b1018] text-xs uppercase text-slate-400 sm:w-32">
                    {ev.kind}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-xs text-slate-400">
                    {ev.kind === 'link'
                      ? ev.external_url
                      : 'filename' in ev && ev.filename
                        ? ev.filename
                        : ev.storage_path}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="shrink-0 text-xs text-rose-300 hover:text-rose-200"
                  >
                    {t.compose.wizard.removeItem}
                  </button>
                </div>
                <input
                  type="text"
                  value={ev.caption}
                  onChange={(e) => updateCaption(i, e.target.value)}
                  maxLength={500}
                  placeholder={t.compose.wizard.captionPlaceholder}
                  className="w-full rounded-md border border-[#2d3748] bg-[#0b1018] px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
