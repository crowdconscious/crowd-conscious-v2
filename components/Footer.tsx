'use client'

import Link from 'next/link'
import Logo from '@/components/Logo'
import NewsletterForm from '@/components/NewsletterForm'
import { FundThermometer } from '@/components/fund/FundThermometer'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Footer() {
  const { language, setLanguage } = useLanguage()

  const content = {
    es: {
      platform: 'Plataforma',
      company: 'Empresa',
      legal: 'Legal',
      markets: 'Predicciones',
      locations: 'Lugares',
      live: 'En Vivo',
      leaderboard: 'Leaderboard',
      consciousFund: 'Fondo Consciente',
      forBrands: 'Para Marcas',
      about: 'Acerca de',
      blog: 'Blog',
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
      markets: 'Predictions',
      locations: 'Places',
      live: 'Live',
      leaderboard: 'Leaderboard',
      consciousFund: 'Conscious Fund',
      forBrands: 'For Brands',
      about: 'About',
      blog: 'Blog',
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
        <div className="mb-10 border-b border-gray-800 pb-8">
          <FundThermometer
            variant="compact"
            locale={language === 'en' ? 'en' : 'es'}
            href="/predictions/fund"
          />
        </div>
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
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.849.07 3.252.148 4.771 1.691 4.919 4.919.058 1.266.07 1.645.07 4.849 0 3.205-.012 3.584-.07 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.849.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.919-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.07 4.849-.07zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.98-6.98.058-1.28.072-1.689.072-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
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

        <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">{t.platform}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/pulse" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.markets}
                </Link>
              </li>
              <li>
                <Link href="/locations" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.locations}
                </Link>
              </li>
              <li>
                <Link href="/live" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.live}
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
                <Link href="/blog" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.blog}
                </Link>
              </li>
              <li>
                <Link href="/pulse" className="text-slate-300 transition-colors hover:text-teal-400">
                  {t.forBrands}
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
            <h3 className="mb-4 text-sm font-semibold text-white">
              {language === 'es' ? 'Newsletter' : 'Newsletter'}
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              {language === 'es' ? 'Análisis sin llenar formularios largos.' : 'Analysis without a long signup.'}
            </p>
            <NewsletterForm source="footer" locale={language} compact />
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
