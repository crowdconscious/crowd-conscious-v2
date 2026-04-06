'use client'

const INPUT_CLASS =
  'min-h-[44px] w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-3 text-sm text-white focus:border-emerald-500/50 focus:outline-none'

const OPTIONS = [60, 90, 100, 120, 180, 240, 360, 480, 720, 0] as const

export function LiveEventDurationField({
  value,
  onChange,
  locale,
}: {
  value: number
  onChange: (minutes: number) => void
  locale: 'en' | 'es'
}) {
  const es = locale === 'es'
  return (
    <div className="mb-4">
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {es ? 'Duración del evento' : 'Event duration'}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <select
          value={OPTIONS.includes(value as (typeof OPTIONS)[number]) ? value : 120}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className={`${INPUT_CLASS} max-w-md`}
        >
          <option value={60}>1 {es ? 'hora' : 'hour'}</option>
          <option value={90}>1.5 {es ? 'horas' : 'hours'}</option>
          <option value={100}>
            100 {es ? 'min (partido estándar)' : 'min (standard match)'}
          </option>
          <option value={120}>2 {es ? 'horas' : 'hours'}</option>
          <option value={180}>3 {es ? 'horas' : 'hours'}</option>
          <option value={240}>4 {es ? 'horas' : 'hours'}</option>
          <option value={360}>6 {es ? 'horas' : 'hours'}</option>
          <option value={480}>8 {es ? 'horas' : 'hours'}</option>
          <option value={720}>12 {es ? 'horas' : 'hours'}</option>
          <option value={0}>{es ? 'Sin límite (solo manual)' : 'No limit (manual end only)'}</option>
        </select>
        <span className="text-xs text-slate-500">
          {es
            ? 'El evento terminará automáticamente o cuando hagas clic en «Finalizar».'
            : 'The event ends automatically or when you click End event.'}
        </span>
      </div>
    </div>
  )
}
