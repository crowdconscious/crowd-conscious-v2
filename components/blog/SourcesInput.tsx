'use client'

import { Link2, X } from 'lucide-react'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'

export type SourceItem = { label: string; url: string }

type Props = {
  value: SourceItem[]
  onChange: (next: SourceItem[]) => void
  locale: CreatorLocale
}

const inputSm =
  'w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:outline-none'

/** Empty rows are filtered out on save, so only flag non-empty malformed URLs. */
function isValidSourceUrl(raw: string): boolean {
  const v = raw.trim()
  if (!v) return true
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Reusable {label, url} sources editor. Each row pairs a URL with an optional
 * short title; both render in the "Fuentes" block at the foot of the article
 * (the title becomes the link text — see BlogSources).
 */
export function SourcesInput({ value, onChange, locale }: Props) {
  const t = getCreatorCopy(locale)

  const update = (i: number, field: keyof SourceItem, v: string) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, [field]: v } : s)))

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, { label: '', url: '' }])

  return (
    <div className="space-y-2">
      {value.map((s, i) => {
        const invalid = !isValidSourceUrl(s.url)
        return (
          <div key={i} className="space-y-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <input
                type="url"
                inputMode="url"
                value={s.url}
                onChange={(e) => update(i, 'url', e.target.value)}
                placeholder="https://..."
                aria-label={t.editorSourceUrl}
                aria-invalid={invalid}
                className={`sm:flex-[2] ${inputSm} ${
                  invalid ? 'border-red-500/60 focus:border-red-500/80' : ''
                }`}
              />
              <input
                type="text"
                value={s.label}
                onChange={(e) => update(i, 'label', e.target.value)}
                placeholder={t.editorSourceLabel}
                aria-label={t.editorSourceLabel}
                className={`sm:flex-1 ${inputSm}`}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="self-start p-2 text-gray-400 hover:text-red-400"
                aria-label={t.editorRemoveSource}
                title={t.editorRemoveSource}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {invalid && <p className="text-xs text-red-400">{t.editorSourceInvalidUrl}</p>}
          </div>
        )
      })}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
      >
        <Link2 className="h-4 w-4" />
        {t.editorAddSource}
      </button>
    </div>
  )
}
