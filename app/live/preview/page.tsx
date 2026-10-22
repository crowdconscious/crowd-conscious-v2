'use client'

/**
 * Dev preview: Conscious Live UI building blocks (mock data).
 * Remove or protect this route in production if desired.
 */
import { StreamEmbed } from '@/components/live/StreamEmbed'
import { FundImpactTicker } from '@/components/live/FundImpactTicker'
import { ViewerCount } from '@/components/live/ViewerCount'


export default function LivePreviewPage() {
  const future = new Date(Date.now() + 3600_000).toISOString()
  return (
    <div className="min-h-screen bg-[#0a0e14] px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <h1 className="text-xl font-bold text-white">Conscious Live — component preview</h1>

        <StreamEmbed youtubeVideoId={null} isLive={false} matchDate={future} />

        <div className="flex flex-wrap items-center gap-3">
          <ViewerCount count={245} isConnected locale="es" />
          <ViewerCount count={12} isConnected={false} locale="en" />
        </div>

        <FundImpactTicker
          totalVotes={1247}
          fundImpact={62.35}
          activeCause="Clean Water CDMX"
          sponsorName="Heineken"
          locale="es"
        />

      </div>
    </div>
  )
}
