import Link from 'next/link'
import { Radio } from 'lucide-react'
import { IconBadge } from '@/components/ui/IconBadge'

type Props = {
  locale: 'es' | 'en'
}

export function LandingLiveSection({ locale }: Props) {
  const es = locale === 'es'

  return (
    <section id="live" className="scroll-mt-24 border-t border-[#2d3748] px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-2">
        <IconBadge icon={Radio} size="sm" variant="red" />
        <span className="text-sm font-bold uppercase tracking-wider text-red-400">Conscious Live</span>
      </div>
      <h2 className="mt-2 text-3xl font-bold text-white">
        {es ? 'Predicciones en tiempo real durante eventos en vivo' : 'Real-time predictions during live events'}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-gray-400">
        {es
          ? 'Transmisión en vivo + micro-predicciones + leaderboard + chat. La experiencia de segunda pantalla definitiva.'
          : 'Live stream + micro-predictions + leaderboard + chat. The ultimate second-screen experience.'}
      </p>
      <div className="mt-6">
        <Link
          href="/live"
          className="inline-flex items-center justify-center rounded-lg border border-emerald-500/30 px-6 py-3 font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/10"
        >
          {es ? 'Ver eventos en vivo →' : 'View live events →'}
        </Link>
      </div>
    </section>
  )
}
