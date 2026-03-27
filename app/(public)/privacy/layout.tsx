import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: 'Aviso de Privacidad',
  description:
    'Aviso de privacidad y protección de datos personales de Crowd Conscious (México y RGPD cuando aplique).',
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${SITE_URL}/privacy`,
    languages: {
      'es-MX': `${SITE_URL}/privacy`,
      'en-US': `${SITE_URL}/privacy`,
    },
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
