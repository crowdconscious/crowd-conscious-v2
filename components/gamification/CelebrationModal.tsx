'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { Trophy, Sparkles, Star, X } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface Achievement {
  type: string
  name: string
  description: string
  icon: string
}

interface CelebrationModalProps {
  isOpen: boolean
  type: 'lesson_completed' | 'module_completed' | 'tier_up' | 'achievement' | 'sponsor' | 'purchase'
  title: string
  message: string
  xpGained?: number
  achievements?: Achievement[]
  onClose: () => void
}

export function CelebrationModal({
  isOpen,
  type,
  title,
  message,
  xpGained,
  achievements = [],
  onClose
}: CelebrationModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    if (!isOpen || prefersReducedMotion) return

    // Confetti burst
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      })
    }, 250)

    // Additional bursts for major achievements
    if (type === 'tier_up' || type === 'module_completed') {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        })
        confetti({
          particleCount: 100,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        })
      }, 500)
    }

    return () => clearInterval(interval)
  }, [isOpen, type, prefersReducedMotion])

  const getIcon = () => {
    switch (type) {
      case 'tier_up':
        return <Trophy className="w-16 h-16 text-yellow-500" />
      case 'module_completed':
        return <Star className="w-16 h-16 text-purple-500" />
      case 'achievement':
        return <Sparkles className="w-16 h-16 text-blue-500" />
      default:
        return <Trophy className="w-16 h-16 text-green-500" />
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="celebration-title"
            aria-describedby="celebration-message"
          >
            <motion.div
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl pointer-events-auto"
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 50 }}
              transition={{
                type: 'spring',
                duration: prefersReducedMotion ? 0.1 : 0.5,
                bounce: prefersReducedMotion ? 0 : 0.3
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close celebration"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <motion.div
                className="flex justify-center mb-4"
                animate={prefersReducedMotion ? {} : {
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.5,
                  repeat: prefersReducedMotion ? 0 : 2
                }}
              >
                {getIcon()}
              </motion.div>

              {/* Title */}
              <h2
                id="celebration-title"
                className="text-2xl sm:text-3xl font-bold text-center mb-2 text-slate-900"
              >
                {title}
              </h2>

              {/* Message */}
              <p
                id="celebration-message"
                className="text-center text-slate-600 mb-6"
              >
                {message}
              </p>

              {/* XP Gained */}
              {xpGained && xpGained > 0 && (
                <motion.div
                  className="text-center p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: prefersReducedMotion ? 0 : 0.2 }}
                >
                  <p className="text-sm opacity-90">XP Gained</p>
                  <p className="text-3xl font-bold">+{xpGained}</p>
                </motion.div>
              )}

              {/* Achievements */}
              {achievements.length > 0 && (
                <div className="space-y-2 mb-6">
                  <p className="text-sm font-semibold text-slate-700 text-center mb-2">
                    New Achievements Unlocked!
                  </p>
                  {achievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.type}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: prefersReducedMotion ? 0 : 0.3 + index * 0.1 }}
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{achievement.name}</p>
                        <p className="text-sm text-slate-600">{achievement.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Continue button */}
              <motion.button
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                aria-label="Continue"
              >
                Continue
              </motion.button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

