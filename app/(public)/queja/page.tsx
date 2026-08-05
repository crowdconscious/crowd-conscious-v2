import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { cookies } from 'next/headers'
import LandingNav from '@/app/components/landing/LandingNav'
import { SITE_URL } from '@/lib/seo/site'
import { getCurrentUser } from '@/lib/auth-server'
import { getQuejaCopy, type QuejaLocale } from '@/lib/senal-express/i18n'
import QuejaComingSoon from './QuejaComingSoon'
import QuejaFlow from './QuejaFlow'

/**
 * /queja — Señal Express (§7.1). SEO landing (static prose + full OG/meta) that
 * hosts the 3-screen oficio flow. es-first with an English variant read from the
 * `preferred-language` cookie.
 *
 * Kill switch: SENAL_EXPRESS_ENABLED off ⇒ a coming-soon screen (invisible
 * feature, not an error). Both APIs return 503 while off.
 */

const TITLE_ES =
  'Redacta tu queja oficial a tu alcaldía — gratis, en 60 segundos'
const DESCRIPTION_ES =
  'Foto, ubicación y una frase. Redactamos por ti un oficio formal a tu alcaldía de la Ciudad de México, listo para descargar en PDF. Gratis.'

const Footer = dynamic(() => import('@/components/Footer'))

export const metadata: Metadata = {
  title: { absolute: `${TITLE_ES} | Crowd Conscious` },
  description: DESCRIPTION_ES,
  keywords: [
    'queja alcaldía',
    'oficio ciudadano',
    'reporte bache',
    'reporte alcaldía cdmx',
    'queja formal alcaldía',
    'denuncia ciudadana cdmx',
    'Cuauhtémoc',
    'Miguel Hidalgo',
  ],
  alternates: {
    canonical: `${SITE_URL}/queja`,
    languages: {
      'es-MX': `${SITE_URL}/queja`,
      'en-US': `${SITE_URL}/queja`,
    },
  },
  openGraph: {
    title: `${TITLE_ES} | Crowd Conscious`,
    description: DESCRIPTION_ES,
    url: `${SITE_URL}/queja`,
    siteName: 'Crowd Conscious',
    type: 'website',
    locale: 'es_MX',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: TITLE_ES,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE_ES} | Crowd Conscious`,
    description: DESCRIPTION_ES,
    images: ['/opengraph-image'],
  },
}

export default async function QuejaPage() {
  const cookieStore = await cookies()
  const locale: QuejaLocale =
    cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const t = getQuejaCopy(locale)

  const flagOn = process.env.SENAL_EXPRESS_ENABLED === 'true'

  if (!flagOn) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <LandingNav />
        <QuejaComingSoon locale={locale} />
        <Footer />
      </div>
    )
  }

  // Determine auth server-side for the flow's funnel branch + name prefill.
  let isLoggedIn = false
  let userName: string | null = null
  try {
    const user = await getCurrentUser()
    isLoggedIn = Boolean(user)
    userName = (user?.full_name as string | null) ?? null
  } catch {
    isLoggedIn = false
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.landing.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="pt-20">
        {/* Hero + flow */}
        <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-2 lg:items-start">
            <div className="lg:pt-6">
              <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                {t.landing.eyebrow}
              </span>
              <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[2.75rem]">
                {t.landing.h1}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                {t.landing.subtitle}
              </p>
              <a
                href="#queja-flow"
                className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-600 px-6 font-semibold text-white transition-colors hover:bg-emerald-700 lg:hidden"
              >
                {t.landing.startCta}
              </a>
            </div>

            <QuejaFlow isLoggedIn={isLoggedIn} userName={userName} />
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            {t.landing.howItWorksTitle}
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {t.landing.howItWorks.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 pb-16">
          <h2 className="text-2xl font-bold text-slate-900">
            {t.landing.faqTitle}
          </h2>
          <dl className="mt-6 space-y-6">
            {t.landing.faqs.map((f) => (
              <div key={f.q} className="border-b border-slate-100 pb-6">
                <dt className="text-base font-semibold text-slate-900">
                  {f.q}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-600">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-10">
            <Link
              href="/signals"
              className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
            >
              {locale === 'es'
                ? '← Ver Señales Ciudadanas'
                : '← See Citizen Signals'}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
