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

/**
 * Reusable {label, url} sources editor. Mirrors the Pulse create-market
 * "Enlaces / Fuentes" inline editor pattern (paired url + label inputs with
 * add/remove) so the blog sources input matches the rest of the platform.
 */
export function SourcesInput({ value, onChange, locale }: Props) {
  const t = getCreatorCopy(locale)

  const update = (i: number, field: keyof SourceItem, v: string) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, [field]: v } : s)))

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, { label: '', url: '' }])

  return (
    <div className="space-y-2">
      {value.map((s, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="url"
            value={s.url}
            onChange={(e) => update(i, 'url', e.target.value)}
            placeholder="https://..."
            className={`flex-1 ${inputSm}`}
          />
          <input
            type="text"
            value={s.label}
            onChange={(e) => update(i, 'label', e.target.value)}
            placeholder={t.editorSourceLabel}
            className={`w-32 ${inputSm}`}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="p-2 text-gray-400 hover:text-red-400"
            aria-label="remove source"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
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
