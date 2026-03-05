'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatedButton } from '@/components/ui/UIComponents'

interface DashboardNavigationProps {
  showBackToDashboard?: boolean
  customBackPath?: string
  customBackLabel?: string
  className?: string
}

export default function DashboardNavigation({ 
  showBackToDashboard = true, 
  customBackPath,
  customBackLabel,
  className = "mb-6"
}: DashboardNavigationProps) {
  const router = useRouter()

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-4">
        <AnimatedButton
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <span>←</span>
          <span>Back</span>
        </AnimatedButton>
        
        {showBackToDashboard && (
          <Link href="/predictions">
            <AnimatedButton
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
            >
              <span>🏠</span>
              <span>Dashboard</span>
            </AnimatedButton>
          </Link>
        )}

        {customBackPath && (
          <Link href={customBackPath}>
            <AnimatedButton
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
            >
              <span>↩️</span>
              <span>{customBackLabel || 'Back'}</span>
            </AnimatedButton>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link href="/predictions">
          <AnimatedButton variant="ghost" size="sm">
            🔮 Predictions
          </AnimatedButton>
        </Link>
        <Link href="/predictions/markets">
          <AnimatedButton variant="ghost" size="sm">
            📊 Markets
          </AnimatedButton>
        </Link>
        <Link href="/leaderboard">
          <AnimatedButton variant="ghost" size="sm">
            🏆 Leaderboard
          </AnimatedButton>
        </Link>
        <Link href="/predictions/fund">
          <AnimatedButton variant="ghost" size="sm">
            💰 Fund
          </AnimatedButton>
        </Link>
      </div>
    </div>
  )
}
