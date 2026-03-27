import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description:
    'Cómo Crowd Conscious usa cookies y tecnologías similares para mejorar la experiencia en la plataforma.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${SITE_URL}/cookies`,
    languages: {
      'es-MX': `${SITE_URL}/cookies`,
      'en-US': `${SITE_URL}/cookies`,
    },
  },
}

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children
}
