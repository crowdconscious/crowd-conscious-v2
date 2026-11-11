import type { Metadata, Viewport } from 'next'
import { Atkinson_Hyperlegible, Outfit, Spectral } from 'next/font/google'

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-ciceron-serif',
  display: 'swap',
})

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-ciceron-sans',
  display: 'swap',
})

/** Geometric sans for the Cicerón.ai wordmark only (brand board). */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-ciceron-brand',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { absolute: 'Cicerón.ai · Demostración' },
  description:
    'Demostración de Cicerón.ai, inteligencia jurídica para despachos mexicanos. Datos de demostración.',
  applicationName: 'Cicerón.ai',
  icons: {
    icon: [{ url: '/ciceron/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/ciceron/apple-touch-icon.png', sizes: '180x180' }],
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

export const viewport: Viewport = {
  themeColor: '#020612',
  colorScheme: 'dark',
}

export default function CiceronRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${spectral.variable} ${atkinson.variable} ${outfit.variable}`}
      data-ciceron-root=""
    >
      {children}
    </div>
  )
}
