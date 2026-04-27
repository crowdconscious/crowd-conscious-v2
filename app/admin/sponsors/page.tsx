import type { Metadata } from 'next'
import AdminSponsorsClient from './AdminSponsorsClient'

export const metadata: Metadata = {
  title: 'Sponsors | Admin',
  robots: { index: false, follow: false },
}

export default function AdminSponsorsPage() {
  return <AdminSponsorsClient />
}
