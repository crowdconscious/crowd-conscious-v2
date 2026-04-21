import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight, Briefcase, ChevronLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'

// Server component — relies on the authed layout to have already redirected
// unauthenticated users to /login. Dynamic because it reads cookies + the
// Supabase session.
export const dynamic = 'force-dynamic'

type SponsorRow = {
  id: string
  company_name: string | null
  contact_email: string | null
  access_token: string | null
  tier: string | null
  status: string | null
  is_pulse_client: boolean | null
  pulse_subscription_active: boolean | null
  max_pulse_markets: number | null
  used_pulse_markets: number | null
  created_at: string | null
  logo_url: string | null
}

const TIER_LABELS: Record<string, { es: string; en: string; color: string }> = {
  starter: { es: 'Patrocinador de Mercado', en: 'Market Sponsor', color: 'text-slate-300' },
  growth: { es: 'Patrocinador de Categoría', en: 'Category Sponsor', color: 'text-emerald-400' },
  champion: { es: 'Socio de Impacto', en: 'Impact Partner', color: 'text-amber-400' },
  anchor: { es: 'Patrocinador Fundador', en: 'Founding Sponsor', color: 'text-purple-400' },
  pilot: { es: 'Pilot Pulse', en: 'Pulse Pilot', color: 'text-cyan-400' },
  pulse_unico: { es: 'Pulse Único', en: 'Pulse Single', color: 'text-emerald-400' },
  pulse_pack: { es: 'Pulse Pack', en: 'Pulse Pack', color: 'text-emerald-400' },
  suscripcion: { es: 'Suscripción Pulse', en: 'Pulse Subscription', color: 'text-amber-400' },
  enterprise: { es: 'Enterprise', en: 'Enterprise', color: 'text-purple-400' },
}

const COPY = {
  es: {
    title: 'Mis cuentas de patrocinador',
    lede: 'Cada cuenta de patrocinador a la que tienes acceso. Desde aquí puedes abrir tu dashboard con un clic, sin necesidad de guardar la URL con token.',
    backHome: 'Volver al panel',
    empty_title: '¿Eres una marca, medio o municipio interesado?',
    empty_body:
      'Todavía no tenemos una cuenta de patrocinador ligada a tu sesión. Si ya canjeaste un cupón, revisa que estés iniciando sesión con el mismo correo que usaste al canjear.',
    empty_cta: 'Ver planes de Conscious Pulse',
    active_since: 'Activa desde',
    plan_label: 'Plan',
    pulse_usage: 'Mercados Pulse',
    pulse_of: 'de',
    pulse_used: 'utilizados',
    unlimited: 'Ilimitado',
    open_dashboard: 'Ir al dashboard',
    status_paused: 'Pausada',
    status_cancelled: 'Cancelada',
    token_missing_note: 'Contáctanos para reactivar el acceso a esta cuenta.',
  },
  en: {
    title: 'My sponsor accounts',
    lede:
      'Every sponsor account linked to this session. You can open your dashboard in one click — no need to remember the token URL.',
    backHome: 'Back to dashboard',
    empty_title: 'Are you a brand, media outlet, or municipality?',
    empty_body:
      "We don't have a sponsor account linked to your session yet. If you already redeemed a coupon, make sure you're signed in with the same email you used when redeeming.",
    empty_cta: 'See Conscious Pulse plans',
    active_since: 'Active since',
    plan_label: 'Plan',
    pulse_usage: 'Pulse markets',
    pulse_of: 'of',
    pulse_used: 'used',
    unlimited: 'Unlimited',
    open_dashboard: 'Open dashboard',
    status_paused: 'Paused',
    status_cancelled: 'Cancelled',
    token_missing_note: 'Contact us to restore access to this account.',
  },
} as const

function formatDate(iso: string | null, locale: 'es' | 'en') {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

export default async function SponsorAccountsPage() {
  // AppLayout already gate-keeps unauthenticated users, but re-check here so
  // the page can be rendered directly (e.g. during tests).
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirectTo=/sponsor-accounts')

  const cookieStore = await cookies()
  const locale: 'es' | 'en' =
    cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const c = COPY[locale]

  // Use the admin client + the same dual-predicate that the RLS policy uses
  // (user_id match OR lowercase email match). One query, no round trip
  // through JWT-email claims which aren't wired up in this project.
  const admin = createAdminClient()
  const userEmail = (user.email ?? '').toLowerCase()
  const orClause = userEmail
    ? `user_id.eq.${user.id},contact_email.ilike.${userEmail}`
    : `user_id.eq.${user.id}`

  const { data: accounts, error } = await admin
    .from('sponsor_accounts')
    .select(
      'id, company_name, contact_email, access_token, tier, status, is_pulse_client, pulse_subscription_active, max_pulse_markets, used_pulse_markets, created_at, logo_url'
    )
    .or(orClause)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[sponsor-accounts] list query failed:', error)
  }

  const rows = (accounts ?? []) as SponsorRow[]

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/predictions"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400"
      >
        <ChevronLeft className="h-4 w-4" />
        {c.backHome}
      </Link>

      <header className="mb-8 flex items-start gap-4">
        <div className="hidden rounded-2xl bg-emerald-500/10 p-3 text-emerald-400 sm:block">
          <Briefcase className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{c.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">{c.lede}</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyState locale={locale} c={c} />
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <SponsorAccountCard key={row.id} row={row} locale={locale} c={c} />
          ))}
        </ul>
      )}
    </div>
  )
}

function EmptyState({
  locale,
  c,
}: {
  locale: 'es' | 'en'
  c: (typeof COPY)[keyof typeof COPY]
}) {
  return (
    <div className="rounded-2xl border border-[#2d3748] bg-[#11161c] p-8 text-center">
      <h2 className="text-xl font-semibold text-white">{c.empty_title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">{c.empty_body}</p>
      <Link
        href="/pulse"
        className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
      >
        {c.empty_cta}
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

function SponsorAccountCard({
  row,
  locale,
  c,
}: {
  row: SponsorRow
  locale: 'es' | 'en'
  c: (typeof COPY)[keyof typeof COPY]
}) {
  const tierEntry = TIER_LABELS[row.tier ?? 'starter'] ?? TIER_LABELS.starter
  const tierLabel = tierEntry[locale]
  const tierColor = tierEntry.color
  const maxPulse = row.max_pulse_markets ?? 1
  const usedPulse = row.used_pulse_markets ?? 0
  const unlimited = maxPulse >= 999
  const pulseText = unlimited
    ? `${usedPulse} / ${c.unlimited}`
    : `${usedPulse} ${c.pulse_of} ${maxPulse}`
  const canOpen = !!row.access_token && row.status !== 'cancelled'
  const dashboardHref = row.access_token ? `/dashboard/sponsor/${row.access_token}` : null

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-[#2d3748] bg-[#11161c] p-5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        {row.logo_url ? (
          // Small logo preview when the sponsor uploaded one.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.logo_url}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg border border-[#2d3748] object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#2d3748] bg-[#0f1419] text-slate-500">
            <Briefcase className="h-5 w-5" />
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-white">
            {row.company_name || row.contact_email || 'Sponsor'}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            <span className={tierColor}>{tierLabel}</span>
            {row.created_at ? (
              <>
                {' · '}
                {c.active_since} {formatDate(row.created_at, locale)}
              </>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {c.pulse_usage}: {pulseText} {!unlimited ? c.pulse_used : ''}
          </p>
          {row.status === 'paused' ? (
            <p className="mt-1 text-xs text-amber-400">{c.status_paused}</p>
          ) : row.status === 'cancelled' ? (
            <p className="mt-1 text-xs text-red-400">{c.status_cancelled}</p>
          ) : null}
        </div>
      </div>

      {canOpen && dashboardHref ? (
        <Link
          href={dashboardHref}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          {c.open_dashboard}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      ) : (
        <p className="shrink-0 text-xs text-slate-500 md:max-w-xs md:text-right">
          {c.token_missing_note}
        </p>
      )}
    </li>
  )
}
