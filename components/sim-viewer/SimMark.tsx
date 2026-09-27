/**
 * Persistent in-canvas mark. Must survive 9:16 / square crops of screen
 * recordings — keep it inside the rendered stage, not page chrome.
 */

export const SIM_MARK_LABEL = 'SIMULACIÓN · IA'

export function SimMark({
  subtitle,
  className = '',
  compact = false,
  phoneScale = false,
}: {
  subtitle?: string
  className?: string
  compact?: boolean
  phoneScale?: boolean
}) {
  return (
    <div
      className={`pointer-events-none absolute z-20 rounded border border-dashed border-amber-400/70 bg-[#0f1419]/85 text-center shadow-sm backdrop-blur-sm ${
        phoneScale
          ? 'right-2 top-2 px-2.5 py-1.5'
          : compact
            ? 'right-1.5 top-1.5 px-1.5 py-0.5'
            : 'right-2 top-2 px-2 py-1 sm:right-3 sm:top-3 sm:px-2.5 sm:py-1.5'
      } ${className}`}
      data-sim-mark="true"
      aria-hidden="true"
    >
      <div
        className={`font-bold uppercase tracking-[0.12em] text-amber-300 ${
          phoneScale
            ? 'text-[11px] sm:text-xs'
            : compact
              ? 'text-[8px]'
              : 'text-[9px] sm:text-[10px]'
        }`}
      >
        {SIM_MARK_LABEL}
      </div>
      {subtitle ? (
        <div
          className={`font-medium lowercase tracking-wide text-amber-200/70 ${
            phoneScale
              ? 'mt-0.5 text-[10px]'
              : compact
                ? 'text-[7px]'
                : 'mt-0.5 text-[8px] sm:text-[9px]'
          }`}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  )
}
