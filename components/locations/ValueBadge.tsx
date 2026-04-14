import { CONSCIOUS_VALUE_OPTIONS } from '@/lib/locations/conscious-values'

type Locale = 'es' | 'en'

export function ValueBadge({
  value,
  locale = 'es',
  size = 'xs',
}: {
  value: string
  locale?: Locale
  size?: 'xs' | 'sm'
}) {
  const config = CONSCIOUS_VALUE_OPTIONS.find((o) => o.key === value)
  if (!config) return null

  const Icon = config.icon
  const text = config.label[locale] ?? config.label.es
  const textCls = size === 'sm' ? 'text-sm' : 'text-xs'
  const iconCls = size === 'sm' ? 'h-3.5 w-3.5' : 'h-3 w-3'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 ${textCls} text-emerald-400`}
    >
      <Icon className={`shrink-0 ${iconCls}`} aria-hidden />
      {text}
    </span>
  )
}

export function ValueBadgeRow({
  values,
  locale,
  size = 'xs',
  className = '',
}: {
  values: string[]
  locale: Locale
  size?: 'xs' | 'sm'
  className?: string
}) {
  if (!values.length) return null
  return (
    <div className={`mt-3 flex flex-wrap gap-1.5 ${className}`}>
      {values.map((v) => (
        <ValueBadge key={v} value={v} locale={locale} size={size} />
      ))}
    </div>
  )
}
