'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Info } from 'lucide-react'

type Props = {
  /** Short phrase shown inside the popover. Pulled from METRIC_LABELS.tooltip_*. */
  text: string
  /** Optional aria-label override; defaults to "Información". */
  label?: string
  /** Optional className merged onto the trigger button. */
  className?: string
}

/**
 * MetricTooltip — tiny, hover+tap-friendly info popover for public-facing
 * numbers. Deliberately not a Radix/headless-ui tooltip because those assume a
 * desktop hover model; we want the same bubble to work with a single tap on
 * mobile Safari without trapping focus.
 *
 * UX choices:
 *  - 44px touch target via `p-1.5 inline-flex` (icon is 14px inside).
 *  - Desktop: opens on hover + focus, closes on blur or pointerleave.
 *  - Mobile: tap toggles; tapping outside closes (document pointerdown listener).
 *  - aria-describedby wires the popover to the trigger so screen readers
 *    announce the definition without us having to replicate the text.
 */
export function MetricTooltip({ text, label, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const wrapperRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label ?? 'Información'}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-11 w-11 items-center justify-center text-slate-500 hover:text-slate-300 focus:outline-none focus-visible:text-slate-200 sm:h-7 sm:w-7"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-1 w-64 -translate-x-1/2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs leading-relaxed text-slate-200 shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  )
}

export default MetricTooltip
