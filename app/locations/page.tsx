import type { Metadata } from 'next'
import LocationsPage from '@/components/locations/LocationsPage'
import type { ApiLocation } from '@/components/locations/LocationsPage'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const metadata: Metadata = {
  title: 'Conscious Locations — Lugares Verificados por la Comunidad | Crowd Conscious',
  description:
    'Descubre establecimientos certificados por la comunidad. Restaurantes, bares, hoteles y marcas que merecen el sello Consciente. Vota y verifica.',
}

export const revalidate = 60

/**
 * Server-render the locations list so anonymous visitors never see a
 * "Cargando…" dead end if the client-side `/api/locations` fetch is slow
 * or fails (Vercel cold start, network flake, etc.). The client still
 * refreshes on mount to pick up per-user `hasVoted` state.
 */
async function getInitialLocations(): Promise<{
  locations: ApiLocation[]
  cities: string[]
}> {
  try {
    const supabase = await createClient()
    const { data: locations } = await supabase
      .from('conscious_locations')
      .select('*')
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true })

    const rows = (locations ?? []) as Array<
      ApiLocation & { current_market_id: string | null }
    >

    const cities = [...new Set(rows.map((r) => r.city).filter(Boolean))].sort()

    const marketIds = rows
      .map((l) => l.current_market_id)
      .filter((id): id is string => Boolean(id))

    type OutcomeRow = ApiLocation['outcomes'][number]
    let outcomesByMarket = new Map<string, OutcomeRow[]>()
    if (marketIds.length > 0) {
      try {
        const admin = createAdminClient()
        const { data: outcomeRows } = await admin
          .from('market_outcomes')
          .select(
            'id, market_id, label, probability, vote_count, total_confidence, sort_order'
          )
          .in('market_id', marketIds)
        for (const o of (outcomeRows ?? []) as OutcomeRow[]) {
          const arr = outcomesByMarket.get(o.market_id) ?? []
          arr.push(o)
          outcomesByMarket.set(o.market_id, arr)
        }
        for (const arr of outcomesByMarket.values()) {
          arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        }
      } catch (err) {
        console.warn('[locations SSR] outcomes admin fetch failed', err)
        outcomesByMarket = new Map()
      }
    }

    const withOutcomes: ApiLocation[] = rows.map((loc) => ({
      ...loc,
      outcomes: loc.current_market_id
        ? outcomesByMarket.get(loc.current_market_id) ?? []
        : [],
      hasVoted: false,
    }))

    return { locations: withOutcomes, cities }
  } catch (err) {
    console.warn('[locations SSR] initial fetch failed', err)
    return { locations: [], cities: [] }
  }
}

export default async function Page() {
  const { locations, cities } = await getInitialLocations()
  return <LocationsPage initialLocations={locations} initialCities={cities} />
}
