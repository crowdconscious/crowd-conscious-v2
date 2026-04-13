import type { Metadata } from 'next'
import LocationsPage from '@/components/locations/LocationsPage'

export const metadata: Metadata = {
  title: 'Conscious Locations — Lugares Verificados por la Comunidad | Crowd Conscious',
  description:
    'Descubre establecimientos certificados por la comunidad. Restaurantes, bares, hoteles y marcas que merecen el sello Consciente. Vota y verifica.',
}

export default function Page() {
  return <LocationsPage />
}
