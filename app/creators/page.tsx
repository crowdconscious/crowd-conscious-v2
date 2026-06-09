import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import nextDynamic from 'next/dynamic'
import { ArrowRight, CheckCircle2, PenSquare, FileText, ShieldCheck, Coins } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { isBlogEditorUser } from '@/lib/auth/is-blog-editor'
import LandingNav from '@/app/components/landing/LandingNav'
import { ClubResetCaseStudyCard } from '@/components/pulse/ClubResetCaseStudyCard'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'

const Footer = nextDynamic(() => import('@/components/Footer'))

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale: CreatorLocale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const t = getCreatorCopy(locale)
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    openGraph: { title: t.metaTitle, description: t.metaDescription },
  }
}

const HOW_ICONS = [PenSquare, FileText, ShieldCheck, Coins]

async function getBlogReadStats(): Promise<number | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('blog_posts')
      .select('view_count')
      .eq('status', 'published')
      .limit(1000)
    if (!data) return null
    const total = data.reduce((sum, p) => sum + Number(p.view_count ?? 0), 0)
    return total > 0 ? total : null
  } catch {
    return null
  }
}

export default async function CreatorsLandingPage() {
  const cookieStore = await cookies()
  const locale: CreatorLocale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const t = getCreatorCopy(locale)
  const totalReads = await getBlogReadStats()

  // Adaptive CTA for logged-in visitors: creators (and admins) go straight to
  // their dashboard; existing non-creators see the upgrade label but still land
  // on /creators/signup, which itself swaps the create-account form for the
  // self-serve upgrade card when a session is present.
  const user = await getCurrentUser().catch(() => null)
  const hasCreatorAccess = user ? isBlogEditorUser(user) : false
  const ctaHref = hasCreatorAccess ? '/creator' : '/creators/signup'
  const heroCtaLabel = hasCreatorAccess
    ? t.upgradeGoToDashboard
    : user
      ? t.upgradeCta
      : t.heroCta
  const finalCtaLabel = hasCreatorAccess
    ? t.upgradeGoToDashboard
    : user
      ? t.upgradeCta
      : t.finalCta

  const splitCards = [t.splitCreatorSourced, t.splitPlatformSourced]

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <LandingNav />

      {/* 1) Hero */}
      <section className="px-4 pb-12 pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
            {t.heroEyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">{t.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              {heroCtaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              {t.heroSecondaryCta}
            </a>
          </div>
          <p className="mx-auto mt-5 max-w-xl text-sm text-slate-500">{t.heroExpectations}</p>
        </div>
      </section>

      {/* 2) Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-24 border-t border-white/10 px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.howTitle}</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {t.howSteps.map((step, i) => {
              const Icon = HOW_ICONS[i] ?? PenSquare
              return (
                <div key={i} className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{step.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3) El reparto */}
      <section className="border-t border-white/10 px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.splitTitle}</h2>
          <p className="mt-2 text-slate-400">{t.splitSubtitle}</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {splitCards.map((card, i) => (
              <div key={i} className="rounded-2xl border border-[#2d3748] bg-[#1a2029] p-6">
                <h3 className="font-semibold text-white">{card.label}</h3>
                <p className="mt-1 text-sm text-slate-400">{card.tagline}</p>
                <div className="mt-5 space-y-3">
                  {card.rows.map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{row.label}</span>
                        <span className="font-semibold text-white">{row.pct}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#0f1419]">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4) Por qué Crowd Conscious */}
      <section className="border-t border-white/10 px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.whyTitle}</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {t.whyPoints.map((point) => (
              <div key={point.title} className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-5">
                <h3 className="font-semibold text-white">{point.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{point.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5) Qué buscamos */}
      <section className="border-t border-white/10 px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.lookingTitle}</h2>
          <ul className="mt-6 space-y-3">
            {t.lookingPoints.map((point) => (
              <li key={point} className="flex items-start gap-3 text-slate-300">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6) Proof strip — reuse Club Reset case study (18 personas · 9.2/10) */}
      <div>
        <div className="px-4 pt-8 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.proofTitle}</h2>
          <p className="mt-2 text-slate-400">{t.proofSubtitle}</p>
          {totalReads != null && (
            <p className="mt-3 text-sm font-semibold text-emerald-300">
              {totalReads.toLocaleString()} {t.proofReadsLabel}
            </p>
          )}
        </div>
        <ClubResetCaseStudyCard locale={locale} />
      </div>

      {/* 7) Signup CTA */}
      <section className="border-t border-white/10 px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-white">{t.finalCtaTitle}</h2>
          <p className="mt-3 text-slate-300">{t.finalCtaSubtitle}</p>
          <Link
            href={ctaHref}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {finalCtaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
