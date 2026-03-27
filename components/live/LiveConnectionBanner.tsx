'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Loader2 } from 'lucide-react'

export interface LiveConnectionBannerProps {
  show: boolean
  browserOffline: boolean
  locale: 'en' | 'es'
}

export function LiveConnectionBanner({ show, browserOffline, locale }: LiveConnectionBannerProps) {
  const msg = browserOffline
    ? locale === 'es'
      ? 'Sin conexión. Comprueba tu red.'
      : 'No connection. Check your network.'
    : locale === 'es'
      ? 'Reconectando…'
      : 'Reconnecting…'

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="sticky top-0 z-[60] flex min-h-[44px] items-center justify-center gap-2 border-b border-amber-500/35 bg-amber-950/95 px-4 py-2.5 text-sm text-amber-100 shadow-md backdrop-blur-md"
        >
          {browserOffline ? (
            <WifiOff className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          ) : (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-300" aria-hidden />
          )}
          <span className="font-medium">{msg}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
