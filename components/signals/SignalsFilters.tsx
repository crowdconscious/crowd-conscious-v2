'use client'

import {
  SIGNAL_CATEGORIES,
  SIGNAL_SEVERITIES,
  SIGNAL_TARGET_KINDS,
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
  type SignalCategory,
  type SignalSeverity,
  type SignalTargetKind,
} from '@/lib/i18n/citizen-signals'

export type SignalsFilterState = {
  category: SignalCategory | 'all'
  severity: SignalSeverity | 'all'
  targetKind: SignalTargetKind | 'all'
  sort: 'recent' | 'cosigns'
}

export const DEFAULT_FILTERS: SignalsFilterState = {
  category: 'all',
  severity: 'all',
  targetKind: 'all',
  sort: 'recent',
}

type Props = {
  locale: CitizenSignalsLocale
  value: SignalsFilterState
  onChange: (next: SignalsFilterState) => void
}

export default function SignalsFilters({ locale, value, onChange }: Props) {
  const t = getCitizenSignalsCopy(locale)
  const isDirty =
    value.category !== 'all' ||
    value.severity !== 'all' ||
    value.targetKind !== 'all' ||
    value.sort !== 'recent'

  return (
    <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max items-center gap-2 sm:flex-wrap sm:min-w-0">
        <FilterSelect
          label={t.feed.filters.category}
          value={value.category}
          onChange={(v) =>
            onChange({ ...value, category: v as SignalCategory | 'all' })
          }
          options={[
            { value: 'all', label: t.feed.filters.allCategories },
            ...SIGNAL_CATEGORIES.map((c) => ({
              value: c,
              label: t.categoryLabel(c),
            })),
          ]}
        />
        <FilterSelect
          label={t.feed.filters.severity}
          value={value.severity}
          onChange={(v) =>
            onChange({ ...value, severity: v as SignalSeverity | 'all' })
          }
          options={[
            { value: 'all', label: t.feed.filters.allSeverities },
            ...SIGNAL_SEVERITIES.map((s) => ({
              value: s,
              label: t.severityLabel(s),
            })),
          ]}
        />
        <FilterSelect
          label={t.feed.filters.target}
          value={value.targetKind}
          onChange={(v) =>
            onChange({ ...value, targetKind: v as SignalTargetKind | 'all' })
          }
          options={[
            { value: 'all', label: t.feed.filters.allTargets },
            ...SIGNAL_TARGET_KINDS.map((tk) => ({
              value: tk,
              label: t.targetKindLabel(tk),
            })),
          ]}
        />
        <FilterSelect
          label={t.feed.filters.sort}
          value={value.sort}
          onChange={(v) =>
            onChange({ ...value, sort: v === 'cosigns' ? 'cosigns' : 'recent' })
          }
          options={[
            { value: 'recent', label: t.feed.filters.sortRecent },
            { value: 'cosigns', label: t.feed.filters.sortCosigns },
          ]}
        />

        {isDirty && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="ml-1 inline-flex min-h-[36px] items-center rounded-full border border-[#2d3748] bg-transparent px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300"
          >
            {t.feed.filters.clear}
          </button>
        )}
      </div>
    </div>
  )
}

type Option = { value: string; label: string }

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Option[]
}) {
  return (
    <label className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-[#2d3748] bg-[#1a2029] px-3 py-1.5 text-xs text-slate-300 transition focus-within:border-emerald-500/50">
      <span className="font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer border-0 bg-transparent text-xs font-medium text-slate-100 focus:outline-none focus:ring-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#1a2029]">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
