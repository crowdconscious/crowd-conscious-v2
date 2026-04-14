import { type LucideIcon } from 'lucide-react'

export interface IconBadgeProps {
  icon: LucideIcon
  size?: 'sm' | 'md' | 'lg'
  variant?: 'emerald' | 'amber' | 'red' | 'gray'
  className?: string
}

const sizes = {
  sm: { container: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4' },
  md: { container: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5' },
  lg: { container: 'w-12 h-12 rounded-xl', icon: 'w-6 h-6' },
}

const variants = {
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400' },
  gray: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
}

export function IconBadge({
  icon: Icon,
  size = 'md',
  variant = 'emerald',
  className = '',
}: IconBadgeProps) {
  const s = sizes[size]
  const v = variants[variant]

  return (
    <div
      className={`${s.container} ${v.bg} flex shrink-0 items-center justify-center ${className}`}
      aria-hidden
    >
      <Icon className={`${s.icon} ${v.text}`} />
    </div>
  )
}
