import type { Metadata } from 'next'
import { Atkinson_Hyperlegible, Spectral } from 'next/font/google'

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

export const metadata: Metadata = {
  title: { absolute: 'Cicerón · Demostración' },
  description:
    'Demostración de Cicerón, inteligencia jurídica para despachos mexicanos. Datos de demostración.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

export default function CiceronRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${spectral.variable} ${atkinson.variable}`} data-ciceron-root="">
      {children}
    </div>
  )
}
