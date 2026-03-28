'use client'

import Link from 'next/link'
import Logo from '@/components/Logo'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Footer() {
  const { language, setLanguage } = useLanguage()

  const content = {
    es: {
      platform: 'Plataforma',
      company: 'Empresa',
      legal: 'Legal',
      markets: 'Mercados',
      leaderboard: 'Leaderboard',
      consciousFund: 'Fondo Consciente',
      sponsorCta: 'Patrocinar',
      about: 'Acerca de',
      sponsors: 'Patrocinadores',
      contact: 'Contacto',
      termsShort: 'Términos',
      privacyShort: 'Privacidad',
      cookiesShort: 'Cookies',
      description:
        'Predicciones gratuitas sobre el Mundial, tu ciudad y lo que te importa. Las marcas patrocinan el impacto.',
      tagline: 'Predicciones con propósito.',
      madeIn: 'Hecho con ❤️ en México',
    },
    en: {
      platform: 'Platform',
      company: 'Company',
      legal: 'Legal',
      markets: 'Markets',
      leaderboard: 'Leaderboard',
      consciousFund: 'Conscious Fund',
      sponsorCta: 'Sponsor',
      about: 'About',
      sponsors: 'Sponsors',
      contact: 'Contact',
      termsShort: 'Terms',
      privacyShort: 'Privacy',
      cookiesShort: 'Cookies',
      description:
        'Free predictions on the World Cup, your city, and what matters. Brands sponsor the impact.',
      tagline: 'Predictions with purpose.',
      madeIn: 'Made with ❤️ in Mexico',
    },
  }

  const t = content[language]

  return (
    <footer className="border-t border-cc-border bg-cc-nav-bg text-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Logo | description | social + language */}
        <div className="mb-10 grid grid-cols-1 gap-8 border-b border-gray-800 pb-10 lg:grid-cols-[auto_1fr_auto] lg:items-start lg:gap-12">
          <div className="shrink-0">
            <Logo size="sm" linkTo="/" />
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-slate-300">{t.description}</p>
          <div className="flex flex-col gap-4 lg:items-end">
            <div className="flex gap-4">
              <a
                href="https://x.com/crowd_conscious"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-teal-400"
                aria-label="X (Twitter)"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/crowdconscious/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-teal-400"
                aria-label="Instagram"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C8.396 0 7.989.013 7.041.048 6.094.083 5.52.204 5.012.388a6.5 6.5 0 00-2.346 1.529c-.794.793-1.254 1.45-1.529 2.346C.953 4.771.832 5.347.797 6.294.762 7.241.75 7.648.75 12.017c0 4.368.013 4.776.048 5.723.035.947.156 1.523.34 2.031.185.508.503 1.07 1.296 1.863.793.794 1.355 1.112 1.863 1.296.508.185 1.084.306 2.031.34.947.035 1.355.048 5.723.048 4.368 0 4.776-.013 5.723-.048.947-.034 1.523-.155 2.031-.34a6.5 6.5 0 002.346-1.529c.794-.793 1.254-1.45 1.529-2.346.185-.508.306-1.084.34-2.031.035-.947.048-1.355.048-5.723 0-4.368-.013-4.776-.048-5.723-.034-.947-.155-1.523-.34-2.031a6.5 6.5 0 00-1.529-2.346c-.793-.794-1.45-1.254-2.346-1.529-.508-.185-1.084-.306-2.031-.34C16.776.013 16.368 0 12.017 0zm0 2.16c4.281 0 4.787.012 6.476.066.876.004 1.405.016 2.123.084.537.05.83.141 1.25.334.482.232.823.499 1.187.862.364.364.63.705.862 1.187.193.42.284.713.334 1.25.068.718.08 1.247.084 2.123.054 1.689.066 2.195.066 6.476s-.012 4.787-.066 6.476c-.004.876-.016 1.405-.084 2.123-.05.537-.141.83-.334 1.25-.232.482-.499.823-.862 1.187-.364.364-.705.63-1.187.862-.42.193-.713.284-1.25.334-.718.068-1.247.08-2.123.084-1.689.054-2.195.066-6.476.066z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/crowd-conscious"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-teal-400"
                aria-label="LinkedIn"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLanguage('es')
                  localStorage.setItem('preferred-language', 'es')
                }}
                className={`rounded px-3 py-1 text-xs transition-colors ${
                  language === 'es' ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                🇲🇽 ES
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage('en')
                  localStorage.setItem('preferred-language', 'en')
                }}
                className={`rounded px-3 py-1 text-xs transition-colors ${
                  language === 'en' ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                🇺🇸 EN
              </button>
            </div>
          </div>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">{t.platform}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/markets" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.markets}
                </Link>
              </li>
              <li>
                <Link href="/predictions/leaderboard" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.leaderboard}
                </Link>
              </li>
              <li>
                <Link href="/predictions/fund" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.consciousFund}
                </Link>
              </li>
              <li>
                <Link href="/sponsor" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.sponsorCta}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">{t.company}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.about}
                </Link>
              </li>
              <li>
                <Link href="/sponsor" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.sponsors}
                </Link>
              </li>
              <li>
                <a
                  href="mailto:comunidad@crowdconscious.app"
                  className="text-slate-300 transition-colors hover:text-teal-400"
                >
                  {t.contact}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">{t.legal}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.termsShort}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.privacyShort}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.cookiesShort}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-1 border-t border-gray-800 pt-8">
          <p className="text-xs text-gray-500">
            © 2026 Crowd Conscious. {t.tagline}
          </p>
          <p className="text-xs text-slate-500">{t.madeIn}</p>
        </div>
      </div>
    </footer>
  )
}
