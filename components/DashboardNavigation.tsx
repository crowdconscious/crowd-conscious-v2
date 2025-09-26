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
          <Link href="/dashboard">
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
        <Link href="/communities">
          <AnimatedButton variant="ghost" size="sm">
            🌍 Communities
          </AnimatedButton>
        </Link>
        <Link href="/discover">
          <AnimatedButton variant="ghost" size="sm">
            🔍 Discover
          </AnimatedButton>
        </Link>
      </div>
    </div>
  )
}
