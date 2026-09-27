/**
 * Persistent in-canvas mark. Must survive 9:16 / square crops of screen
 * recordings — keep it inside the rendered stage, not page chrome.
 */

export const SIM_MARK_LABEL = 'SIMULACIÓN · IA'

export function SimMark({
  subtitle,
  className = '',
}: {
  subtitle?: string
  className?: string
}) {
  return (
    <div
      className={`pointer-events-none absolute right-3 top-3 z-20 rounded-md border border-dashed border-amber-400/70 bg-[#0f1419]/85 px-2.5 py-1.5 text-center shadow-sm backdrop-blur-sm sm:right-4 sm:top-4 ${className}`}
      data-sim-mark="true"
      aria-hidden="true"
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300 sm:text-[11px]">
        {SIM_MARK_LABEL}
      </div>
      {subtitle ? (
        <div className="mt-0.5 text-[9px] font-medium lowercase tracking-wide text-amber-200/70 sm:text-[10px]">
          {subtitle}
        </div>
      ) : null}
    </div>
  )
}
