'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatedButton } from '@/components/ui/UIComponents'

// Mirrors LandingNav: build-time flag, read at module scope so the link
// silently disappears when Signals is disabled in production.
const SIGNALS_ENABLED = process.env.NEXT_PUBLIC_SIGNALS_ENABLED === 'true'

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
        <Link href="/pulse">
          <AnimatedButton variant="ghost" size="sm">
            📊 Pulse
          </AnimatedButton>
        </Link>
        {SIGNALS_ENABLED && (
          <Link href="/signals">
            <AnimatedButton variant="ghost" size="sm" className="inline-flex items-center gap-1.5">
              <span>📢 Signals</span>
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                Beta
              </span>
            </AnimatedButton>
          </Link>
        )}
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
