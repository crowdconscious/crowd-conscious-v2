import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import {
  ArrowRight,
  BadgeCheck,
  ExternalLink,
  Heart,
  Instagram,
  MapPin,
} from 'lucide-react'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type CauseRow = {
  id: string
  slug: string
  name: string
  organization: string | null
  category: string | null
  short_description: string | null
  description: string | null
  website_url: string | null
  logo_url: string | null
  cover_image_url: string | null
  image_url: string | null
  instagram_handle: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  verified: boolean
  verified_at: string | null
  active: boolean
  created_at: string
}

const CATEGORY_LABEL: Record<string, { es: string; en: string }> = {
  water: { es: 'Agua', en: 'Water' },
  education: { es: 'Educación', en: 'Education' },
  environment: { es: 'Medio ambiente', en: 'Environment' },
  social_justice: { es: 'Justicia social', en: 'Social justice' },
  health: { es: 'Salud', en: 'Health' },
  mobility: { es: 'Movilidad', en: 'Mobility' },
  housing: { es: 'Vivienda', en: 'Housing' },
  hunger: { es: 'Hambre', en: 'Hunger' },
  culture: { es: 'Cultura', en: 'Culture' },
  emergency: { es: 'Emergencia', en: 'Emergency' },
  other: { es: 'Otro', en: 'Other' },
}

function currentCycle(): string {
  return new Date().toISOString().slice(0, 7)
}

async function loadCause(slug: string): Promise<{
  cause: CauseRow
  cycleVotes: number
  totalVotes: number
  cyclesSupported: number
  nearbyLocations: Array<{ id: string; slug: string; name: string; city: string; cover_image_url: string | null }>
} | null> {
  const admin = createAdminClient()
  const { data: cause } = await admin
    .from('fund_causes')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!cause) return null
  const c = cause as unknown as CauseRow

  // Only render publicly if the cause is active. `verified` is editorial;
  // a not-yet-verified-but-active cause still has a detail page so the
  // admin can preview it and share it internally.
  if (!c.active) return null

  const cycle = currentCycle()
  const [cycleVotesRes, totalVotesRes, distinctCyclesRes, locRes] = await Promise.all([
    admin
      .from('fund_votes')
      .select('id', { count: 'exact', head: true })
      .eq('cause_id', c.id)
      .eq('cycle', cycle),
    admin
      .from('fund_votes')
      .select('id', { count: 'exact', head: true })
      .eq('cause_id', c.id),
    admin.from('fund_votes').select('cycle').eq('cause_id', c.id),
    c.city
      ? admin
          .from('conscious_locations')
          .select('id, slug, name, city, cover_image_url')
          .eq('status', 'active')
          .eq('city', c.city)
          .limit(3)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string; name: string; city: string; cover_image_url: string | null }> }),
  ])

  const distinct = new Set<string>()
  for (const r of distinctCyclesRes.data ?? []) {
    const cycleVal = (r as { cycle?: string }).cycle
    if (cycleVal) distinct.add(cycleVal)
  }

  return {
    cause: c,
    cycleVotes: cycleVotesRes.count ?? 0,
    totalVotes: totalVotesRes.count ?? 0,
    cyclesSupported: distinct.size,
    nearbyLocations: (locRes.data ?? []) as Array<{
      id: string
      slug: string
      name: string
      city: string
      cover_image_url: string | null
    }>,
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const result = await loadCause(slug)
  if (!result) return { title: 'Causa no encontrada · Crowd Conscious' }
  const { cause } = result
  const title = `${cause.name} · Causas del Fondo Consciente`
  const description =
    cause.short_description || cause.description?.slice(0, 160) || 'Causa verificada en Crowd Conscious.'
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: cause.cover_image_url
        ? [{ url: cause.cover_image_url }]
        : cause.logo_url
          ? [{ url: cause.logo_url }]
          : [],
    },
  }
}

export default async function CauseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  const result = await loadCause(slug)
  if (!result) notFound()

  const { cause, cycleVotes, totalVotes, cyclesSupported, nearbyLocations } = result
  const cover = cause.cover_image_url || cause.image_url
  const L = (es: string, en: string) => (locale === 'es' ? es : en)
  const categoryLabel = cause.category
    ? CATEGORY_LABEL[cause.category]?.[locale as 'es' | 'en'] ?? cause.category
    : null

  return (
    <div className="min-h-screen bg-cc-bg text-cc-text-primary">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <Link
          href="/predictions/fund"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
        >
          ← {L('Volver al Fondo Consciente', 'Back to the Conscious Fund')}
        </Link>

        <header className="space-y-4">
          {cover && (
            <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-white/5">
              <Image
                src={cover}
                alt={cause.name}
                fill
                className="object-cover"
                unoptimized
                sizes="(max-width: 768px) 100vw, 896px"
                priority
              />
            </div>
          )}
          <div className="flex items-start gap-4">
            {cause.logo_url && (
              <Image
                src={cause.logo_url}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 rounded-lg object-cover border border-white/10 shrink-0"
                unoptimized
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{cause.name}</h1>
                {cause.verified && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium"
                    title={L('Verificado por Crowd Conscious', 'Verified by Crowd Conscious')}
                  >
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {L('Verificada', 'Verified')}
                  </span>
                )}
              </div>
              {cause.organization && (
                <p className="text-slate-300 mt-1">{cause.organization}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                {categoryLabel && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700">
                    {categoryLabel}
                  </span>
                )}
                {cause.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {cause.city}
                  </span>
                )}
              </div>
            </div>
          </div>
          {cause.short_description && (
            <p className="text-lg text-slate-200 leading-relaxed">{cause.short_description}</p>
          )}
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label={L('Votos este ciclo', 'Votes this cycle')}
            value={cycleVotes.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US')}
          />
          <StatCard
            label={L('Votos totales', 'Total votes')}
            value={totalVotes.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US')}
          />
          <StatCard
            label={L('Ciclos apoyados', 'Cycles supported')}
            value={cyclesSupported.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US')}
          />
        </section>

        {cause.description && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">
              {L('Sobre la organización', 'About the organization')}
            </h2>
            <p className="text-slate-300 leading-relaxed whitespace-pre-line">
              {cause.description}
            </p>
          </section>
        )}

        <section className="flex flex-wrap gap-3">
          {cause.website_url && (
            <a
              href={cause.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              {L('Sitio web oficial', 'Official website')}
            </a>
          )}
          {cause.instagram_handle && (
            <a
              href={`https://instagram.com/${cause.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium"
            >
              <Instagram className="w-4 h-4" />@{cause.instagram_handle}
            </a>
          )}
        </section>

        {nearbyLocations.length > 0 && cause.city && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">
              {L('Lugares Conscientes cerca', 'Conscious Places nearby')}
            </h2>
            <p className="text-sm text-slate-400">
              {L(
                `En ${cause.city} — los Lugares Conscientes que la comunidad certifica.`,
                `In ${cause.city} — Conscious Places the community has certified.`
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {nearbyLocations.map((loc) => (
                <Link
                  key={loc.id}
                  href={`/locations/${loc.slug}`}
                  className="group rounded-lg border border-white/5 bg-slate-900/60 p-3 hover:border-emerald-500/40 transition"
                >
                  {loc.cover_image_url && (
                    <div className="relative w-full aspect-[4/3] rounded overflow-hidden mb-2">
                      <Image
                        src={loc.cover_image_url}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 300px"
                      />
                    </div>
                  )}
                  <p className="text-sm font-medium text-white group-hover:text-emerald-300">
                    {loc.name}
                  </p>
                  <p className="text-xs text-slate-500">{loc.city}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <h2 className="text-lg font-semibold text-white inline-flex items-center gap-2">
            <Heart className="w-5 h-5 text-emerald-400" />
            {L('Apoya esta causa en el próximo ciclo', 'Support this cause in the next cycle')}
          </h2>
          <p className="text-sm text-slate-300 mt-2">
            {L(
              'Cada mes, quienes participan en el Fondo Consciente eligen qué causa recibe la asignación. Una opinión, un voto.',
              'Each cycle, Conscious Fund participants choose which cause receives that month’s allocation. One opinion, one vote.'
            )}
          </p>
          <Link
            href="/predictions/fund"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
          >
            {L('Votar en el Fondo Consciente', 'Vote in the Conscious Fund')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</p>
    </div>
  )
}
