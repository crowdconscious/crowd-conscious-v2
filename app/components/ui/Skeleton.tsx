import React from 'react'
import { skeletonVariants, cn, type SkeletonVariants } from '@/lib/design-system'

interface SkeletonProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    SkeletonVariants {
  width?: string | number
  height?: string | number
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    variant,
    width,
    height,
    className,
    style,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant }), className)}
        style={{
          width,
          height,
          ...style,
        }}
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

// Pre-built skeleton components for common patterns
const SkeletonText = React.forwardRef<HTMLDivElement, {
  lines?: number
  className?: string
}>(({ lines = 3, className }, ref) => (
  <div ref={ref} className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height="1rem"
        width={i === lines - 1 ? '75%' : '100%'}
      />
    ))}
  </div>
))
SkeletonText.displayName = 'SkeletonText'

const SkeletonCard = React.forwardRef<HTMLDivElement, {
  className?: string
}>(({ className }, ref) => (
  <div ref={ref} className={cn('space-y-4 p-6', className)}>
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton height="1rem" width="40%" />
        <Skeleton height="0.75rem" width="60%" />
      </div>
    </div>
    <SkeletonText lines={3} />
    <div className="flex space-x-2">
      <Skeleton height="2rem" width="5rem" className="rounded-full" />
      <Skeleton height="2rem" width="5rem" className="rounded-full" />
    </div>
  </div>
))
SkeletonCard.displayName = 'SkeletonCard'

const SkeletonButton = React.forwardRef<HTMLDivElement, {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}>(({ size = 'md', className }, ref) => {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  }

  return (
    <Skeleton
      ref={ref}
      className={cn(sizeClasses[size], 'rounded-lg', className)}
    />
  )
})
SkeletonButton.displayName = 'SkeletonButton'

const SkeletonAvatar = React.forwardRef<HTMLDivElement, {
  size?: number
  className?: string
}>(({ size = 40, className }, ref) => (
  <Skeleton
    ref={ref}
    className={cn('rounded-full', className)}
    width={size}
    height={size}
  />
))
SkeletonAvatar.displayName = 'SkeletonAvatar'

// Loading skeleton for community cards
const CommunityCardSkeleton = React.forwardRef<HTMLDivElement, {
  className?: string
}>(({ className }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      'bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 space-y-4',
      className
    )}
  >
    <Skeleton height="12rem" className="rounded-lg" />
    <div className="space-y-3">
      <Skeleton height="1.5rem" width="70%" />
      <SkeletonText lines={2} />
      <div className="flex justify-between items-center">
        <Skeleton height="1rem" width="30%" />
        <Skeleton height="1rem" width="40%" />
      </div>
      <div className="flex gap-2">
        <Skeleton height="1.5rem" width="4rem" className="rounded-full" />
        <Skeleton height="1.5rem" width="4rem" className="rounded-full" />
        <Skeleton height="1.5rem" width="2rem" className="rounded-full" />
      </div>
    </div>
  </div>
))
CommunityCardSkeleton.displayName = 'CommunityCardSkeleton'

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonCard, 
  SkeletonButton, 
  SkeletonAvatar,
  CommunityCardSkeleton,
  skeletonVariants 
}
export type { SkeletonProps }
