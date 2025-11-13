'use client'

import { memo, ReactNode } from 'react'
import { motion, MotionProps } from 'framer-motion'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface AnimatedButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
}

/**
 * AnimatedButton Component
 * Button with hover/tap animations
 * Respects prefers-reduced-motion
 * Memoized for performance
 */
export const AnimatedButton = memo(function AnimatedButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  onClick,
  type = 'button',
  ...htmlProps
}: AnimatedButtonProps) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700',
    secondary: 'bg-slate-200 text-slate-700 hover:bg-slate-300',
    success: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600',
    danger: 'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600'
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }

  const motionProps: MotionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { scale: 1.02, y: -2 },
        whileTap: { scale: 0.98 }
      }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        rounded-lg font-semibold
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${variant === 'primary' ? 'focus:ring-blue-500' : 'focus:ring-slate-500'}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      disabled={disabled || loading}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...motionProps}
      {...(htmlProps as any)}
      aria-busy={loading}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
          Loading...
        </span>
      ) : (
        children
      )}
    </motion.button>
  )
})

