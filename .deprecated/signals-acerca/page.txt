import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import {
  getSignalsLocale,
  getStage1Threshold,
  getStage2Threshold,
} from '@/lib/signals/list'
import { SITE_URL } from '@/lib/seo/site'

/**
 * /signals/acerca — public product page for Citizen Signals.
 *
 * Goal: someone who's never heard of the feature lands here, understands
 * the loop (report → moderate → co-sign → escalate → reply), and lands
 * on either /signals (browse) or /signals/nueva (create).
 *
 * Gated by the same SIGNALS_ENABLED flag the feed uses so the surfaces
 * vanish in lockstep.
 */

export const dynamic = 'force-dynamic'

function flagOn(): boolean {
  // Server flag mirrors app/signals/page.tsx — when off the whole product
  // surface 404s. The nav link is also gated on NEXT_PUBLIC_SIGNALS_ENABLED.
  return process.env.SIGNALS_ENABLED === 'true'
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getSignalsLocale()
  const t = getCitizenSignalsCopy(locale)
  return {
    title: { absolute: t.about.metaTitle },
    description: t.about.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/signals/acerca`,
      languages: {
        'es-MX': `${SITE_URL}/signals/acerca`,
        'en-US': `${SITE_URL}/signals/acerca`,
      },
    },
    openGraph: {
      title: t.about.metaTitle,
      description: t.about.metaDescription,
      url: `${SITE_URL}/signals/acerca`,
    },
  }
}

function fillStageTokens(
  body: string,
  stage1: number,
  stage2: number
): string {
  return body.replace('{stage1}', String(stage1)).replace('{stage2}', String(stage2))
}

export default async function SignalsAboutPage() {
  if (!flagOn()) notFound()

  const locale: CitizenSignalsLocale = await getSignalsLocale()
  const t = getCitizenSignalsCopy(locale)
  const stage1 = getStage1Threshold()
  const stage2 = getStage2Threshold()

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      {/* Hero */}
      <section className="mb-16 sm:mb-20">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          {t.about.heroEyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-[1.1] text-white sm:text-5xl md:text-6xl">
          {t.about.heroTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-emerald-300/90 sm:text-xl">
          {t.about.heroTagline}
        </p>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
          {t.about.heroLead}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signals/nueva"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
          >
            {t.about.heroCtaPrimary}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/signals"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#2d3748] bg-[#1a2029] px-6 py-3 text-base font-medium text-slate-200 transition-colors hover:border-emerald-500/40"
          >
            {t.about.heroCtaSecondary}
          </Link>
        </div>
      </section>

      {/* Flow */}
      <section className="mb-16 sm:mb-20">
        <h2 className="mb-8 text-2xl font-bold text-white sm:text-3xl">
          {t.about.flowTitle}
        </h2>
        <ol className="space-y-5">
          {t.about.flowSteps.map((step) => (
            <li
              key={step.n}
              className="rounded-2xl border border-[#2d3748] bg-[#0f1419]/80 p-5 transition-colors hover:border-emerald-500/30 sm:p-6"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                  {step.n}
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400 sm:text-base">
                    {step.n === 4
                      ? fillStageTokens(step.body, stage1, stage2)
                      : step.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Who */}
      <section className="mb-16 sm:mb-20">
        <h2 className="mb-8 text-2xl font-bold text-white sm:text-3xl">
          {t.about.whoTitle}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#2d3748] bg-[#0f1419]/80 p-6">
            <h3 className="text-lg font-semibold text-emerald-300">
              {t.about.whoLeft.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">
              {t.about.whoLeft.body}
            </p>
          </div>
          <div className="rounded-2xl border border-[#2d3748] bg-[#0f1419]/80 p-6">
            <h3 className="text-lg font-semibold text-emerald-300">
              {t.about.whoRight.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">
              {t.about.whoRight.body}
            </p>
          </div>
        </div>
      </section>

      {/* What it is / is not */}
      <section className="mb-16 sm:mb-20">
        <h2 className="mb-8 text-2xl font-bold text-white sm:text-3xl">
          {t.about.pillarsTitle}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
            <h3 className="text-base font-semibold uppercase tracking-wider text-emerald-300">
              {t.about.pillarsIs}
            </h3>
            <ul className="mt-4 space-y-3">
              {t.about.pillarsIsBullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm leading-relaxed text-slate-300"
                >
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
            <h3 className="text-base font-semibold uppercase tracking-wider text-amber-300">
              {t.about.pillarsIsNot}
            </h3>
            <ul className="mt-4 space-y-3">
              {t.about.pillarsIsNotBullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm leading-relaxed text-slate-300"
                >
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-16 sm:mb-20">
        <h2 className="mb-8 text-2xl font-bold text-white sm:text-3xl">
          {t.about.faqTitle}
        </h2>
        <div className="space-y-3">
          {t.about.faqs.map((f, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-[#2d3748] bg-[#0f1419]/80 p-5 transition-colors hover:border-emerald-500/30 sm:p-6"
            >
              <summary className="cursor-pointer list-none text-base font-semibold text-white sm:text-lg">
                <div className="flex items-center justify-between gap-4">
                  <span>{f.q}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-90" />
                </div>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Legal */}
      <section className="mb-16 sm:mb-20">
        <div className="rounded-2xl border border-[#2d3748] bg-[#0f1419]/60 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            {t.legal.noLegalAdviceTitle}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {t.legal.noLegalAdviceBody}
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#0f1419]/60 to-emerald-500/5 p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
          {t.about.footerEyebrow}
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-bold text-white sm:text-3xl">
          {t.about.footerTitle}
        </h2>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signals/nueva"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
          >
            {t.about.footerCtaPrimary}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/signals"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#2d3748] bg-[#1a2029] px-6 py-3 text-base font-medium text-slate-200 transition-colors hover:border-emerald-500/40"
          >
            {t.about.footerCtaSecondary}
          </Link>
        </div>
      </section>
    </main>
  )
}
