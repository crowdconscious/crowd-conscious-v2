import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { LocationCard, type LocationCardRow } from '@/components/locations/LocationCard'

export default function LandingLocationsSection({
  locations,
  locale,
}: {
  locations: LocationCardRow[]
  locale: 'es' | 'en'
}) {
  if (locations.length === 0) return null

  return (
    <section className="border-t border-cc-border bg-[#0f1419] px-4 py-14 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">Conscious Locations</h2>
            <p className="mt-1 text-slate-400">
              {locale === 'es' ? 'Lugares verificados por la comunidad' : 'Places verified by the community'}
            </p>
          </div>
          <Link
            href="/locations"
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            {locale === 'es' ? 'Ver todos los lugares' : 'See all locations'}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {locations.map((loc) => (
            <LocationCard key={loc.id} location={loc} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  )
}
