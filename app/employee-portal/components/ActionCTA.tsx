'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface ActionCTAProps {
  title: string
  description: string
  action: string
  href: string
  variant?: 'primary' | 'success' | 'warning'
  icon?: 'arrow' | 'sparkles' | 'trending'
  pulse?: boolean
}

export default function ActionCTA({
  title,
  description,
  action,
  href,
  variant = 'primary',
  icon = 'arrow',
  pulse = true
}: ActionCTAProps) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const variants = {
    primary: 'from-teal-600 to-purple-600',
    success: 'from-green-500 to-emerald-600',
    warning: 'from-orange-500 to-red-600'
  }

  const icons = {
    arrow: ArrowRight,
    sparkles: Sparkles,
    trending: TrendingUp
  }

  const Icon = icons[icon]

  return (
    <motion.div
      className={`bg-gradient-to-r ${variants[variant]} rounded-xl p-6 text-white shadow-lg relative overflow-hidden`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0.1 : 0.5 }}
      whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
    >
      {/* Animated background pattern */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl sm:text-2xl font-bold mb-2">{title}</h3>
            <p className="text-white/90 text-sm sm:text-base mb-4">{description}</p>
            <Link
              href={href}
              className="inline-flex items-center gap-2 bg-white text-teal-600 px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors group"
            >
              <span>{action}</span>
              <Icon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          {pulse && !prefersReducedMotion && (
            <motion.div
              className="hidden sm:block"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1
              }}
            >
              <Icon className="w-12 h-12 text-white/30" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

