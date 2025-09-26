import React, { useEffect, useState } from 'react'
import { progressVariants, cn, type ProgressVariants } from '@/lib/design-system'

interface ProgressProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    ProgressVariants {
  value: number
  max?: number
  showLabel?: boolean
  label?: string
  animated?: boolean
  pulse?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    value, 
    max = 100,
    variant, 
    size, 
    animated = true,
    pulse = false,
    showLabel = false,
    label,
    className,
    ...props 
  }, ref) => {
    const [displayValue, setDisplayValue] = useState(0)
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    // Animate the progress fill
    useEffect(() => {
      if (animated) {
        const timer = setTimeout(() => {
          setDisplayValue(percentage)
        }, 100)
        return () => clearTimeout(timer)
      } else {
        setDisplayValue(percentage)
      }
    }, [percentage, animated])

    return (
      <div
        ref={ref}
        className={cn('w-full', className)}
        {...props}
      >
        {showLabel && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {label}
            </span>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
        
        <div
          className={cn(
            progressVariants({ variant, size, animated }),
            'relative overflow-hidden'
          )}
        >
          <div
            className={cn(
              'h-full transition-all duration-1000 ease-out rounded-full relative',
              pulse && 'animate-pulse',
            )}
            style={{
              width: `${displayValue}%`,
              transition: animated ? 'width 1000ms cubic-bezier(0.65, 0, 0.35, 1)' : 'none',
            }}
          >
            {/* Shimmer effect for animated progress */}
            {animated && displayValue > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite] rounded-full" />
            )}
          </div>
          
          {/* Pulse indicator for active progress */}
          {pulse && displayValue > 0 && (
            <div 
              className="absolute top-0 w-1 h-full bg-white/40 rounded-full animate-pulse"
              style={{ left: `${displayValue}%` }}
            />
          )}
        </div>
      </div>
    )
  }
)

Progress.displayName = 'Progress'

// Specialized funding progress component
interface FundingProgressProps extends Omit<ProgressProps, 'value' | 'max'> {
  currentFunding: number
  goalFunding: number
  currency?: string
}

const FundingProgress = React.forwardRef<HTMLDivElement, FundingProgressProps>(
  ({ 
    currentFunding, 
    goalFunding, 
    currency = '$',
    className,
    ...props 
  }, ref) => {
    const percentage = (currentFunding / goalFunding) * 100
    const isOverfunded = percentage > 100

    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Funding Progress
          </span>
          <span className={cn(
            "text-sm font-semibold",
            isOverfunded ? "text-green-600 dark:text-green-400" : "text-neutral-600 dark:text-neutral-400"
          )}>
            {Math.round(percentage)}%
          </span>
        </div>
        
        <Progress
          value={currentFunding}
          max={goalFunding}
          variant={isOverfunded ? 'success' : 'primary'}
          animated
          pulse={isOverfunded}
          {...props}
        />
        
        <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
          <span>
            Raised: <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {currency}{currentFunding.toLocaleString()}
            </span>
          </span>
          <span>
            Goal: <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {currency}{goalFunding.toLocaleString()}
            </span>
          </span>
        </div>
      </div>
    )
  }
)

FundingProgress.displayName = 'FundingProgress'

export { Progress, FundingProgress, progressVariants }
export type { ProgressProps, FundingProgressProps }
