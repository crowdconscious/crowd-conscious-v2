'use client'

import { usePathname } from 'next/navigation'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ConversionCelebration } from '@/components/anon/ConversionCelebration'

/**
 * Crowd Conscious civic chrome (Analytics, SpeedInsights, celebration, org JSON-LD).
 * Must stay client-side so usePathname() covers soft navigations into /ciceron
 * without forcing the root layout dynamic via headers().
 */
export function CivicRootChrome({
  organizationJsonLd,
}: {
  organizationJsonLd: Record<string, unknown>
}) {
  const pathname = usePathname() ?? ''
  if (pathname.startsWith('/ciceron')) return null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />
      <ConversionCelebration />
      <Analytics />
      <SpeedInsights />
    </>
  )
}
