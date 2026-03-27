import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description:
    'Términos y condiciones de uso de Crowd Conscious — plataforma de predicciones gratuita con impacto social.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${SITE_URL}/terms`,
    languages: {
      'es-MX': `${SITE_URL}/terms`,
      'en-US': `${SITE_URL}/terms`,
    },
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
