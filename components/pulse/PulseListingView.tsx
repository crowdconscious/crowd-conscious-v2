import Link from 'next/link'
import { CouponRedeemSection } from '@/components/coupon/CouponRedeemSection'
import { getMarketText } from '@/lib/i18n/market-translations'
import { getPulseListingCopy, statusLabelPulse } from '@/lib/i18n/pulse-listing'
import type { PulseListingLocale } from '@/lib/i18n/pulse-listing'
import type { PulseListingMarketRow } from '@/lib/pulse/pulse-listing-data'

type Props = {
  locale: PulseListingLocale
  markets: PulseListingMarketRow[]
  isAdmin: boolean
  sponsorCompanyName: string | null
  variant: 'public' | 'shell'
  /** When true, only renders market grid + footer (no top hero — used on product page). */
  listOnly?: boolean
}

export default function PulseListingView({
  locale,
  markets,
  isAdmin,
  sponsorCompanyName,
  variant,
  listOnly = false,
}: Props) {
  const t = getPulseListingCopy(locale)
  const dateLocale = locale === 'es' ? 'es-MX' : 'en-US'

  const byClient = new Map<string, PulseListingMarketRow[]>()
  for (const m of markets) {
    const key = m.pulse_client_name?.trim() || 'General'
    const list = byClient.get(key) ?? []
    list.push(m)
    byClient.set(key, list)
  }
  const groups = Array.from(byClient.entries()).sort(([a], [b]) => a.localeCompare(b))

  const inner = (
    <>
      {!listOnly && (
        <header className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400/90">{t.badge}</p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{t.title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">{t.subtitle}</p>
          {isAdmin && (
            <p className="mt-2 text-xs text-amber-400/90">{t.adminView}</p>
          )}
          {!isAdmin && sponsorCompanyName && (
            <p className="mt-2 text-xs text-emerald-400/90">{t.sponsorView(sponsorCompanyName)}</p>
          )}
        </header>
      )}

      {isAdmin && listOnly && (
        <p className="mb-6 text-center text-xs text-amber-400/90">{t.adminView}</p>
      )}
      {!isAdmin && sponsorCompanyName && listOnly && (
        <p className="mb-6 text-center text-xs text-emerald-400/90">{t.sponsorView(sponsorCompanyName)}</p>
      )}

      {markets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-[#1a2029] px-6 py-16 text-center">
          <p className="text-lg text-slate-400">{t.emptyTitle}</p>
          <p className="mt-2 text-sm text-slate-500">{t.emptySubtitle}</p>
          <Link
            href="/markets"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {t.browseMarkets}
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(([client, items]) => (
            <section key={client}>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {client}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {items.map((m) => {
                  const title = getMarketText(
                    {
                      title: m.title,
                      translations: m.translations as Parameters<typeof getMarketText>[0]['translations'],
                    },
                    'title',
                    locale
                  )
                  const votes = m.total_votes ?? 0
                  const closeDate = m.resolution_date
                    ? new Date(m.resolution_date).toLocaleDateString(dateLocale, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'
                  const cover =
                    m.cover_image_url?.trim() ||
                    m.sponsor_logo_url?.trim() ||
                    m.pulse_client_logo?.trim() ||
                    null
                  const byLine =
                    m.pulse_client_name?.trim() &&
                    `${locale === 'es' ? 'Por' : 'By'} ${m.pulse_client_name.trim()} · `
                  return (
                    <li key={m.id} className="relative">
                      {isAdmin && (
                        <Link
                          href={`/predictions/admin/edit-market/${m.id}`}
                          className="absolute right-2 top-2 z-10 rounded bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-emerald-500/50"
                        >
                          Edit
                        </Link>
                      )}
                      <Link
                        href={`/pulse/${m.id}`}
                        className="group block overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029] transition-colors hover:border-emerald-500/30"
                      >
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt=""
                            className="h-36 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-amber-900/20 to-[#1a2029]">
                            <span className="text-4xl" aria-hidden>
                              📊
                            </span>
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="text-sm font-bold leading-snug text-white group-hover:text-emerald-200">
                            {title}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {byLine}
                            {votes} {locale === 'es' ? 'votos' : 'votes'}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            {statusLabelPulse(m.status, locale)} · {t.closes} {closeDate}
                          </p>
                          <span className="mt-2 inline-block text-xs font-medium text-emerald-400">
                            {t.viewResults}
                          </span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="mt-12 rounded-2xl border border-white/10 bg-[#1a2029] px-6 py-8 text-center">
        <p className="text-slate-300">{t.ctaQuestion}</p>
        {listOnly && (
          <p className="mt-2 text-sm text-slate-500">{t.ctaFirstFree}</p>
        )}
        <Link
          href={listOnly ? '/sponsor' : '/pulse'}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          {listOnly ? t.ctaViewPlans : t.ctaLearnMore}
        </Link>
        <CouponRedeemSection locale={locale} />
      </div>

      <p className="mt-12 text-center text-sm text-slate-500">
        <Link href="/" className="text-emerald-400 hover:underline">
          {t.home}
        </Link>
        {' · '}
        <Link href="/fund" className="text-emerald-400 hover:underline">
          {t.consciousFund}
        </Link>
      </p>
    </>
  )

  if (variant === 'shell') {
    return <div className="mx-auto w-full max-w-4xl">{inner}</div>
  }

  if (listOnly) {
    return <div className="text-slate-100">{inner}</div>
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">{inner}</div>
    </div>
  )
}
