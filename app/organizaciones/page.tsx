import type { Metadata } from 'next'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowRight, Check, ShieldCheck } from 'lucide-react'
import { getOrgCopy } from '@/lib/i18n/organizaciones'
import { ORG_CONTACT_EMAIL, ORG_PRICES, formatMxn } from '@/lib/organizaciones/pricing'
import { getOrgLocale } from './locale'

const Footer = dynamic(() => import('@/components/Footer'))

export async function generateMetadata(): Promise<Metadata> {
  const t = getOrgCopy(await getOrgLocale())
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: '/organizaciones' },
    openGraph: {
      title: t.metaTitle,
      description: t.metaDescription,
      url: '/organizaciones',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title: t.metaTitle, description: t.metaDescription },
  }
}

const card = 'rounded-2xl border border-[#2d3748] bg-[#1a2029]'
const btnPrimary =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400'
const btnGhost =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-6 py-3 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20'

function CertaintyBar({ label, pct, certainty, tone }: { label: string; pct: number; certainty: number; tone: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-white">{label}</span>
        <span className="text-slate-400">
          {pct}% · <span className="font-semibold text-white">{certainty.toFixed(1)}</span>
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${certainty * 10}%` }} />
      </div>
    </div>
  )
}

export default async function OrganizacionesPage() {
  const locale = await getOrgLocale()
  const t = getOrgCopy(locale)
  const fmt = (n: number) => formatMxn(n, locale)
  const mailto = `mailto:${ORG_CONTACT_EMAIL}?subject=${encodeURIComponent(t.callSubject)}`
  const proposal = (plan: string) => `/organizaciones/contratar?modo=propuesta&plan=${plan}`

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      {/* Hero */}
      <section className="px-4 pb-14 pt-14 sm:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">{t.eyebrow}</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-5xl">{t.heroTitle}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">{t.heroSub}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/organizaciones/contratar" className={btnPrimary}>
              {t.ctaPilot} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/organizaciones/demo" className={btnGhost}>
              {t.ctaDemo}
            </Link>
            <a href={mailto} className="inline-flex min-h-[48px] items-center px-4 text-sm font-semibold text-slate-300 hover:text-white">
              {t.ctaCall}
            </a>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-white/10 px-4 py-14">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t.problemTitle}</p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{t.problemHeadline}</h2>
            <p className="mt-4 text-slate-300">{t.problemFoot}</p>
          </div>
          <div className={`${card} p-6`}>
            <p className="mb-5 inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              {t.fictitious}
            </p>
            <div className="space-y-5">
              <CertaintyBar label={`${t.companyA} · 98% ${t.saidYes}`} pct={98} certainty={9.1} tone="bg-emerald-400" />
              <CertaintyBar label={`${t.companyB} · 98% ${t.saidYes}`} pct={98} certainty={5.8} tone="bg-amber-400" />
            </div>
            <p className="mt-4 text-xs text-slate-500">{t.avgCertainty} (1-10)</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/10 px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">{t.howTitle}</h2>
          <p className="mt-2 text-center text-slate-400">{t.howSub}</p>
          <ol className="mt-10 grid gap-5 md:grid-cols-4">
            {t.steps.map((s, i) => (
              <li key={s.t} className={`${card} p-5 ${i === 1 ? 'border-emerald-500/50' : ''}`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-400">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold text-white">{s.t}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why */}
      <section className="border-t border-white/10 px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">{t.whyTitle}</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {t.why.map((w) => (
              <div key={w.t} className={`${card} flex gap-4 p-5`}>
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <h3 className="font-semibold text-white">{w.t}</h3>
                  <p className="mt-1 text-sm text-slate-400">{w.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precios" className="scroll-mt-24 border-t border-white/10 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">{t.pricingTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">{t.pricingSub}</p>

          <p className="mt-10 text-sm font-semibold uppercase tracking-wider text-emerald-400">{t.step1}</p>
          <div className={`${card} mt-3 border-emerald-500/60 p-6 sm:p-8`}>
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{t.pilotName}</h3>
                <p className="mt-2">
                  <span className="text-4xl font-bold text-emerald-400">{fmt(ORG_PRICES.pilot)}</span>{' '}
                  <span className="text-sm text-slate-400">{t.pilotUnit}</span>
                </p>
                <ul className="mt-5 space-y-2">
                  {t.pilotBullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex shrink-0 flex-col gap-3 md:w-56">
                <Link href="/organizaciones/contratar" className={btnPrimary}>
                  {t.ctaPilot}
                </Link>
                <a href={mailto} className={btnGhost}>
                  {t.ctaCall}
                </a>
              </div>
            </div>
          </div>

          <p className="mt-10 text-sm font-semibold uppercase tracking-wider text-emerald-400">{t.step2}</p>
          <div className="mt-3 grid gap-5 md:grid-cols-2">
            {[
              { id: 'anual', name: t.annualName, price: ORG_PRICES.annual, unit: t.annualUnit, note: '', bullets: t.annualBullets },
              { id: 'continua', name: t.contName, price: ORG_PRICES.continuousMonthly, unit: t.contUnit, note: t.contNote, bullets: t.contBullets },
            ].map((p) => (
              <div key={p.id} className={`${card} flex flex-col p-6`}>
                <h3 className="text-lg font-bold text-white">{p.name}</h3>
                <p className="mt-2">
                  <span className="text-3xl font-bold text-white">{fmt(p.price)}</span>{' '}
                  <span className="text-sm text-slate-400">{p.unit}</span>
                </p>
                {p.note ? <p className="text-xs text-slate-500">{p.note}</p> : null}
                <ul className="mt-4 flex-1 space-y-2">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {b}
                    </li>
                  ))}
                </ul>
                <Link href={proposal(p.id)} className={`${btnGhost} mt-6`}>
                  {t.requestProposal}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-10 text-sm font-semibold uppercase tracking-wider text-emerald-400">{t.step3}</p>
          <div className={`${card} mt-3 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between`}>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{t.selloName}</h3>
              <p className="mt-1">
                <span className="text-2xl font-bold text-white">+{fmt(ORG_PRICES.selloMonthlyAddon)}</span>{' '}
                <span className="text-sm text-slate-400">{t.selloUnit}</span>
              </p>
              <p className="mt-2 text-sm text-slate-400">{t.selloDesc}</p>
            </div>
            <Link href={proposal('sello')} className={`${btnGhost} shrink-0`}>
              {t.requestProposal}
            </Link>
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">{t.cfdiNote}</p>
        </div>
      </section>

      {/* Public vs private + who */}
      <section className="border-t border-white/10 px-4 py-14">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <div className={`${card} p-6`}>
            <h2 className="text-xl font-bold text-white">{t.publicTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{t.publicBody}</p>
          </div>
          <div className={`${card} p-6`}>
            <h2 className="text-xl font-bold text-white">{t.whoTitle}</h2>
            <p className="mt-3 text-sm text-slate-300">{t.whoBody}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {t.sectors.map((s) => (
                <span key={s} className="rounded-full border border-[#2d3748] px-3 py-1 text-xs text-slate-300">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="border-t border-white/10 px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">{t.methodTitle}</h2>
          <dl className="mt-8 space-y-4">
            {t.method.map((m) => (
              <div key={m.t} className="border-l-2 border-emerald-500/50 pl-4">
                <dt className="font-semibold text-white">{m.t}</dt>
                <dd className="mt-1 text-sm text-slate-400">{m.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Fund */}
      <section className="border-t border-white/10 px-4 py-14">
        <div className="mx-auto max-w-4xl rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#1a2029] to-[#1a2029] p-8 text-center">
          <h2 className="text-2xl font-bold text-white">{t.fundTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">{t.fundBody}</p>
          <p className="mt-2 text-sm text-emerald-300">{t.fundExample}</p>
          <Link href="/predictions/fund" className="mt-4 inline-block text-sm font-semibold text-emerald-400 hover:underline">
            {t.fundLink} →
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/10 px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.finalTitle}</h2>
        <p className="mt-2 text-sm text-slate-400">{t.finalSub}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/organizaciones/contratar" className={btnPrimary}>
            {t.ctaPilot} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/organizaciones/demo" className={btnGhost}>
            {t.ctaDemo}
          </Link>
          <a href={mailto} className={btnGhost}>
            {t.ctaCall}
          </a>
        </div>
        <p className="mt-10 text-xs text-slate-500">
          <Link href="/patrocinio" className="hover:text-emerald-400 hover:underline">
            {t.communityLink}
          </Link>
        </p>
      </section>

      <Footer />
    </div>
  )
}
