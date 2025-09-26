import React from 'react'
import { badgeVariants, cn, type BadgeVariants } from '@/lib/design-system'

interface BadgeProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    BadgeVariants {
  children: React.ReactNode
  icon?: React.ReactNode
  pulse?: boolean
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ 
    children, 
    variant, 
    size, 
    icon,
    pulse = false,
    className,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          badgeVariants({ variant, size }),
          pulse && 'animate-pulse',
          'relative',
          className
        )}
        {...props}
      >
        {pulse && (
          <div className="absolute inset-0 rounded-full bg-current opacity-25 animate-ping" />
        )}
        <div className="relative flex items-center gap-1">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
        </div>
      </div>
    )
  }
)

Badge.displayName = 'Badge'

// Specialized impact badges for core values
interface ImpactBadgeProps extends Omit<BadgeProps, 'variant'> {
  impact: 'clean-air' | 'clean-water' | 'safe-cities' | 'zero-waste' | 'fair-trade'
}

const ImpactBadge = React.forwardRef<HTMLDivElement, ImpactBadgeProps>(
  ({ impact, children, ...props }, ref) => {
    const impactIcons = {
      'clean-air': '🌱',
      'clean-water': '💧',
      'safe-cities': '🏙️',
      'zero-waste': '♻️',
      'fair-trade': '🤝',
    }

    return (
      <Badge
        ref={ref}
        variant={impact}
        icon={impactIcons[impact]}
        {...props}
      >
        {children}
      </Badge>
    )
  }
)

ImpactBadge.displayName = 'ImpactBadge'

export { Badge, ImpactBadge, badgeVariants }
export type { BadgeProps, ImpactBadgeProps }
