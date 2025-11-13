'use client'

import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'

// ✅ PHASE 4: Lazy load CelebrationModal for better performance
const CelebrationModal = lazy(() => import('./CelebrationModal').then(module => ({ default: module.CelebrationModal })))

interface LazyCelebrationModalProps {
  isOpen: boolean
  type: 'lesson_completed' | 'module_completed' | 'tier_up' | 'achievement' | 'sponsor' | 'purchase'
  title: string
  message: string
  xpGained?: number
  achievements?: Array<{
    type: string
    name: string
    description: string
    icon: string
  }>
  onClose: () => void
}

/**
 * Lazy-loaded wrapper for CelebrationModal
 * Reduces initial bundle size by code-splitting the celebration component
 */
export function LazyCelebrationModal(props: LazyCelebrationModalProps) {
  if (!props.isOpen) return null

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="animate-pulse space-y-4">
              <div className="h-16 bg-slate-200 rounded-full w-16 mx-auto" />
              <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto" />
              <div className="h-4 bg-slate-200 rounded w-full" />
            </div>
          </motion.div>
        </div>
      }
    >
      <CelebrationModal {...props} />
    </Suspense>
  )
}

