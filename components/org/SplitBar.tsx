import type { Split } from '@/lib/org/firmness'
import { FIRM_THRESHOLD } from '@/lib/org/firmness'

type Locale = 'es' | 'en'

/**
 * The product chart: Si firme | Si tibio | No tibio | No firme over all
 * responses. Firm = solid; tentative = same hue, lower intensity. Yes in
 * brand green, no in a warm neutral; low certainty is never coloured "bad".
 * Colours chosen so the in-segment labels pass 4.5:1.
 */
export const SEGMENTS = [
  { key: 'firmYes', bg: '#34d399', fg: '#062b1f', es: 'Sí firme', en: 'Firm yes' },
  { key: 'tentativeYes', bg: '#1d6b52', fg: '#ffffff', es: 'Sí tibio', en: 'Tentative yes' },
  { key: 'tentativeNo', bg: '#6b4a2e', fg: '#ffffff', es: 'No tibio', en: 'Tentative no' },
  { key: 'firmNo', bg: '#f0a35e', fg: '#2a1606', es: 'No firme', en: 'Firm no' },
] as const

export type SegmentKey = (typeof SEGMENTS)[number]['key']

export function SplitBar({
  split,
  locale,
  highlight,
  height = 'h-10',
  label,
}: {
  split: Split
  locale: Locale
  highlight?: SegmentKey | null
  height?: string
  label?: string
}) {
  const aria = SEGMENTS.map((s) => `${s[locale]} ${split[s.key]}%`).join(', ')
  return (
    <div>
      {label ? <p className="mb-1.5 text-sm font-semibold text-slate-100">{label}</p> : null}
      <div className={`flex w-full overflow-hidden rounded-lg ${height}`} role="img" aria-label={aria}>
        {SEGMENTS.map((s) => {
          const v = split[s.key]
          if (v <= 0) return null
          const hl = highlight === s.key
          return (
            <div
              key={s.key}
              className={`flex items-center justify-center text-xs font-bold ${hl ? 'relative z-10 ring-2 ring-inset ring-white' : ''}`}
              style={{ width: `${v}%`, background: s.bg, color: s.fg }}
              title={`${s[locale]}: ${v}%`}
            >
              {v >= 7 ? `${v}%` : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SplitLegend({ locale, split }: { locale: Locale; split?: Split }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
      {SEGMENTS.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.bg }} />
          {s[locale]}
          {split ? <span className="font-semibold text-slate-100">{split[s.key]}%</span> : null}
        </li>
      ))}
      <li className="text-slate-400">
        {locale === 'es' ? `Firme = certeza ${FIRM_THRESHOLD}-10` : `Firm = certainty ${FIRM_THRESHOLD}-10`}
      </li>
    </ul>
  )
}

/** 1-10 certainty histogram with yes and no as two separate series. */
export function CertaintyHistogram({ yes, no, locale }: { yes: number[]; no: number[]; locale: Locale }) {
  const max = Math.max(...yes, ...no, 1)
  return (
    <div>
      <div className="flex h-28 items-end gap-1.5">
        {yes.map((y, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end gap-0.5">
              <div className="flex-1 rounded-t bg-[#34d399]" style={{ height: `${(y / max) * 100}%` }} title={`${i + 1} · sí ${y}`} />
              <div className="flex-1 rounded-t bg-[#f0a35e]" style={{ height: `${(no[i] / max) * 100}%` }} title={`${i + 1} · no ${no[i]}`} />
            </div>
            <span className="text-[11px] text-slate-300">{i + 1}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 flex gap-4 text-xs text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[#34d399]" /> {locale === 'es' ? 'Sí' : 'Yes'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[#f0a35e]" /> No
        </span>
        <span className="text-slate-400">{locale === 'es' ? 'Respuestas por certeza (1-10)' : 'Responses by certainty (1-10)'}</span>
      </p>
    </div>
  )
}
