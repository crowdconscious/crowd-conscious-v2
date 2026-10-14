import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import TryIt from '@/components/org/TryIt'
import { SplitBar, SplitLegend } from '@/components/org/SplitBar'
import { getOrgCopy } from '@/lib/i18n/organizaciones'
import { SAMPLE_PDF_HREF, callHref } from '@/lib/org/config'
import { ILLUSTRATIVE_PAIR } from '@/lib/org/demo-data'
import { questionStats } from '@/lib/org/firmness'
import ExecutiveSummary from '@/components/org/ExecutiveSummary'
import { DEMO_DEFAULT_READING_ID, DEMO_ORG, DEMO_READINGS } from '@/lib/org/demo-data'
import { toClientReading } from '@/lib/org/readings'
import { getOrgLocale } from './locale'

export async function generateMetadata(): Promise<Metadata> {
  const t = getOrgCopy(await getOrgLocale())
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: '/organizaciones' },
    openGraph: { title: t.metaTitle, description: t.metaDescription, url: '/organizaciones', type: 'website' },
    twitter: { card: 'summary_large_image', title: t.metaTitle, description: t.metaDescription },
  }
}

const card = 'rounded-2xl border border-[#2d3748] bg-[#1a2029]'
const btnPrimary =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-[#0f1419] transition-colors hover:bg-emerald-300'
const btnGhost =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-400 px-6 py-3 text-sm font-semibold text-slate-100 transition-colors hover:border-emerald-300'

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((b) => (
        <li key={b} className="flex gap-2 text-sm text-slate-200">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> {b}
        </li>
      ))}
    </ul>
  )
}

export default async function OrganizacionesPage() {
  const locale = await getOrgLocale()
  const t = getOrgCopy(locale)
  const call = callHref()
  const ext = /^https?:/.test(call) ? { target: '_blank', rel: 'noopener noreferrer' } : {}
  const proposal = (plan: string) => `/organizaciones/contratar?modo=propuesta&plan=${plan}`
  const previewReading = toClientReading(DEMO_READINGS.find((r) => r.id === DEMO_DEFAULT_READING_ID)!)
  const pair = ILLUSTRATIVE_PAIR.map((p) => ({ name: p.name[locale], stats: questionStats(p.counts) }))

  return (
    <div>
      {/* 1. Hero */}
      <section className="px-4 pb-12 pt-12 sm:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">{t.eyebrow}</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-5xl">{t.heroTitle}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-200">{t.heroSub}</p>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300">{t.credentials}</p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href="/organizaciones/demo" className={btnPrimary}>
              {t.ctaDemo}
            </Link>
            <a href={call} {...ext} className={btnGhost}>
              {t.ctaCall}
            </a>
          </div>
        </div>
      </section>

      {/* 2. Try it */}
      <section className="border-t border-white/10 px-4 py-12">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.tryTitle}</h2>
            <p className="mt-2 text-slate-200">{t.trySub}</p>
          </div>
          <TryIt locale={locale} />
        </div>
      </section>

      {/* 3. Same number, two readings */}
      <section className="border-t border-white/10 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.pairTitle}</h2>
            <span className="rounded-full border border-amber-300/60 px-3 py-1 text-xs font-semibold text-amber-200">{t.illustrative}</span>
          </div>
          <p className="mt-2 text-slate-200">{t.pairSub}</p>
          <div className={`${card} mt-6 space-y-6 p-5 sm:p-6`}>
            {pair.map((p) => (
              <div key={p.name}>
                <p className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-white">
                    {p.name} · {p.stats.pctYes}% «sí»
                  </span>
                  <span className="text-slate-200">{t.firmOfYes(p.stats.pctFirmOfYes)}</span>
                </p>
                <SplitBar split={p.stats.split} locale={locale} />
              </div>
            ))}
            <SplitLegend locale={locale} />
          </div>
        </div>
      </section>

      {/* 4. How it works */}
      {/* 3b. Non-interactive preview of the executive summary (fictitious demo data) */}
      <section className="border-t border-white/10 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.previewTitle}</h2>
          <p className="mt-2 text-slate-200">{t.previewSub}</p>
          <Link href="/organizaciones/demo" aria-label={t.previewCta} className="group mt-6 block">
            <div className="relative max-h-[560px] overflow-hidden rounded-xl ring-1 ring-white/10" inert aria-hidden="true">
              <div className="pointer-events-none select-none">
                <ExecutiveSummary reading={previewReading} orgName={DEMO_ORG.name} locale={locale} demo />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0f1419] to-transparent" />
            </div>
            <span className="mt-4 inline-block text-sm font-semibold text-emerald-300 group-hover:underline">{t.previewCta} →</span>
          </Link>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-20 border-t border-white/10 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.howTitle}</h2>
          <p className="mt-2 text-slate-200">{t.howSub}</p>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {t.steps.map((s, i) => (
              <li key={s.t} className={`${card} p-5`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-sm font-bold text-[#0f1419]">{i + 1}</span>
                <h3 className="mt-3 font-semibold text-white">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. You decide / you do not decide */}
      <section className="border-t border-white/10 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={`${card} p-6`}>
              <h2 className="text-xl font-bold text-white">{t.decideTitle}</h2>
              <ul className="mt-4 space-y-3">
                {t.decide.map((d) => (
                  <li key={d} className="flex gap-2 text-base text-slate-100">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" /> {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${card} border-[#f0a35e]/40 p-6`}>
              <h2 className="text-xl font-bold text-white">{t.notDecideTitle}</h2>
              <ul className="mt-4 space-y-3">
                {t.notDecide.map((d) => (
                  <li key={d} className="flex gap-2 text-base text-slate-100">
                    <X className="mt-1 h-4 w-4 shrink-0 text-[#f0a35e]" /> {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-center text-slate-200">{t.decideFoot}</p>
        </div>
      </section>

      {/* 6. Packages */}
      <section id="precios" className="scroll-mt-20 border-t border-white/10 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.pricingTitle}</h2>
          <p className="mt-2 text-slate-200">{t.pricingSub}</p>

          <div className={`${card} mt-8 border-emerald-400/70 p-6 sm:p-8`}>
            <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#0f1419]">{t.startHere}</span>
            <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{t.pilotName}</h3>
                <p className="mt-1 text-3xl font-bold text-emerald-300">{t.pilotPrice}</p>
                <p className="mt-1 text-sm text-slate-200">{t.pilotNote}</p>
                <Bullets items={t.pilotBullets} />
              </div>
              <div className="flex shrink-0 flex-col gap-3 md:w-56">
                <Link href="/organizaciones/contratar" className={btnPrimary}>
                  {t.pilotCta}
                </Link>
                <Link href="/organizaciones/contratar?modo=propuesta&plan=pilot" className={btnGhost}>
                  {t.requestProposal}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { id: 'anual', n: t.annualName, p: t.annualPrice, note: t.annualNote, b: t.annualBullets },
              { id: 'continua', n: t.contName, p: t.contPrice, note: t.contNote, b: t.contBullets },
              { id: 'sello', n: t.selloName, p: t.selloPrice, note: t.selloNote, b: t.selloBullets },
            ].map((x) => (
              <div key={x.id} className={`${card} flex flex-col p-6`}>
                <h3 className="text-lg font-bold text-white">{x.n}</h3>
                <p className="mt-1 text-xl font-bold text-white">{x.p}</p>
                <p className="mt-1 text-sm text-slate-200">{x.note}</p>
                <div className="flex-1">
                  <Bullets items={x.b} />
                </div>
                <Link href={proposal(x.id)} className={`${btnGhost} mt-6`}>
                  {t.requestProposal}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-sm text-slate-200">{t.cfdiNote}</p>
        </div>
      </section>

      {/* 7. FAQ + methodology */}
      <section id="metodologia" className="scroll-mt-20 border-t border-white/10 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.faqTitle}</h2>
          <div className="mt-6 divide-y divide-[#2d3748] rounded-2xl border border-[#2d3748] bg-[#1a2029]">
            {t.faq.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer list-none text-base font-semibold text-white marker:hidden">
                  <span className="mr-2 inline-block text-emerald-300 transition-transform group-open:rotate-90">›</span>
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Closing CTA */}
      <section className="border-t border-white/10 px-4 py-14 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.finalTitle}</h2>
        <p className="mt-2 text-sm text-slate-200">{t.finalSub}</p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <a href={call} {...ext} className={btnPrimary}>
            {t.ctaCall}
          </a>
          <a href={`${SAMPLE_PDF_HREF}?lang=${locale}`} className={btnGhost}>
            {t.ctaPdf}
          </a>
        </div>
        <p className="mt-10 text-sm">
          <Link href="/patrocinio" className="text-slate-200 underline-offset-2 hover:text-white hover:underline">
            {t.communityLink}
          </Link>
        </p>
      </section>
    </div>
  )
}
