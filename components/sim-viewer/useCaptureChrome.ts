'use client'

/**
 * Capture-mode side effects:
 * - Tag <html> so CSS can hide site chrome (nav, toasts, Next overlay).
 * - Fade transport controls after 2s of idle pointer movement.
 */

import { useEffect, useRef, useState } from 'react'

const IDLE_MS = 2000

export function useCaptureChrome(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const root = document.documentElement
    root.dataset.simCapture = '1'
    // Hide Next.js / Turbopack issue overlays that spoil recordings.
    const style = document.createElement('style')
    style.setAttribute('data-sim-capture-overlay-hide', '1')
    style.textContent = `
      html[data-sim-capture="1"] nextjs-portal,
      html[data-sim-capture="1"] [data-nextjs-dialog-overlay],
      html[data-sim-capture="1"] [data-nextjs-toast],
      html[data-sim-capture="1"] #__next-build-watcher {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `
    document.head.appendChild(style)
    return () => {
      delete root.dataset.simCapture
      style.remove()
    }
  }, [active])
}

/**
 * Returns whether transport chrome should be visible.
 * In capture mode: visible on pointer activity, fades after IDLE_MS.
 * Outside capture: always visible.
 */
export function useCaptureControlsVisibility(captureMode: boolean): {
  controlsVisible: boolean
  onPointerActivity: () => void
} {
  const [controlsVisible, setControlsVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const armIdle = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setControlsVisible(false)
    }, IDLE_MS)
  }

  const onPointerActivity = () => {
    if (!captureMode) return
    setControlsVisible(true)
    armIdle()
  }

  useEffect(() => {
    if (!captureMode) {
      setControlsVisible(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    setControlsVisible(true)
    armIdle()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- arm on capture toggle only
  }, [captureMode])

  return { controlsVisible, onPointerActivity }
}
