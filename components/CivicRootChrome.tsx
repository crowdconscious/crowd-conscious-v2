'use client'

import { usePathname } from 'next/navigation'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ConversionCelebration } from '@/components/anon/ConversionCelebration'

/**
 * Crowd Conscious civic chrome (Analytics, SpeedInsights, celebration).
 * Must stay client-side so usePathname() covers soft navigations into /ciceron
 * without forcing the root layout dynamic via headers().
 * Site JSON-LD is server-rendered in SiteJsonLd (and also skipped on /ciceron).
 */
export function CivicRootChrome() {
  const pathname = usePathname() ?? ''
  if (pathname.startsWith('/ciceron')) return null

  return (
    <>
      <ConversionCelebration />
      <Analytics />
      <SpeedInsights />
    </>
  )
}
