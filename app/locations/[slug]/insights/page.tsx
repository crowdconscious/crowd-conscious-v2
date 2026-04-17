import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { LocationCoverImage } from '@/components/locations/LocationRemoteImage'
import { LocationInsightsCta } from '@/components/locations/LocationInsightsCta'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `Insights — ${slug} | Crowd Conscious`,
    description: 'Location insights: confidence distribution, anonymous vs registered voters, conscious score trend.',
    robots: { index: false, follow: false },
  }
}

type Outcome = {
  label: string
  probability: number
  vote_count: number
  total_confidence: number
  sort_order: number | null
}

type VoteRow = {
  user_id: string | null
  anonymous_participant_id: string | null
  confidence: number | null
}

export default async function LocationInsightsPage({ params }: Props) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: location } = await admin
    .from('conscious_locations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!location) notFound()

  const cookieStore = await cookies()
  const locale =
    (cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es') as 'es' | 'en'

  const marketId = location.current_market_id as string | null
  const totalVotes = (location.total_votes as number | null) ?? 0
  const consciousScore = location.conscious_score as number | null

  const [outcomesRes, votesRes] = await Promise.all([
    marketId
      ? admin
          .from('market_outcomes')
          .select('label, probability, vote_count, total_confidence, sort_order')
          .eq('market_id', marketId)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] as Outcome[] }),
    marketId
      ? admin
          .from('market_votes')
          .select('user_id, anonymous_participant_id, confidence')
          .eq('market_id', marketId)
      : Promise.resolve({ data: [] as VoteRow[] }),
  ])

  const outcomes = (outcomesRes.data ?? []) as Outcome[]
  const votes = (votesRes.data ?? []) as VoteRow[]

  const registeredCount = votes.filter((v) => v.user_id != null).length
  const anonymousCount = votes.length - registeredCount
  const confidences = votes.map((v) => v.confidence).filter((c): c is number => typeof c === 'number')
  const avgConfidence =
    confidences.length > 0
      ? Math.round((confidences.reduce((s, n) => s + n, 0) / confidences.length) * 10) / 10
      : null

  const confidenceBuckets = [
    { label: '1-3', lo: 1, hi: 3, count: 0 },
    { label: '4-6', lo: 4, hi: 6, count: 0 },
    { label: '7-8', lo: 7, hi: 8, count: 0 },
    { label: '9-10', lo: 9, hi: 10, count: 0 },
  ]
  for (const c of confidences) {
    const bucket = confidenceBuckets.find((b) => c >= b.lo && c <= b.hi)
    if (bucket) bucket.count += 1
  }

  const hasScore = consciousScore != null && totalVotes >= 10

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-10">
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <span>{locale === 'es' ? 'Insights del lugar' : 'Location insights'}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500">{locale === 'es' ? 'Vista para dueños' : "Owner's view"}</span>
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-[#2d3748] bg-[#1a2029]">
          <div className="relative aspect-[16/7] w-full bg-[#0f1419]">
            <LocationCoverImage
              url={location.cover_image_url as string | null}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="p-5">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{location.name as string}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {(location.neighborhood as string | null) ? `${location.neighborhood} · ` : ''}
              {location.city as string}
            </p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={locale === 'es' ? 'Votos totales' : 'Total votes'}
            value={String(totalVotes)}
          />
          <StatCard
            label={locale === 'es' ? 'Confianza promedio' : 'Avg. confidence'}
            value={avgConfidence != null ? `${avgConfidence}/10` : '—'}
          />
          <StatCard
            label="Conscious Score"
            value={hasScore ? `${consciousScore!.toFixed(1)}/10` : '—'}
            hint={
              hasScore
                ? null
                : locale === 'es'
                  ? `Se revela a los 10 votos (${Math.max(0, 10 - totalVotes)} restantes)`
                  : `Unlocks at 10 votes (${Math.max(0, 10 - totalVotes)} to go)`
            }
          />
          <StatCard
            label={locale === 'es' ? 'Registrados / anónimos' : 'Registered / anonymous'}
            value={`${registeredCount} / ${anonymousCount}`}
          />
        </div>

        {outcomes.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              {locale === 'es' ? 'Distribución de votos' : 'Vote distribution'}
            </h2>
            <div className="space-y-2 rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5">
              {outcomes.map((o) => {
                const pct = Math.round(o.probability * 100)
                return (
                  <div key={o.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-white">{o.label}</span>
                      <span className="text-slate-400">
                        {o.vote_count} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#0f1419]">
                      <div
                        className="h-full rounded-full bg-emerald-500/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {confidences.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              {locale === 'es' ? 'Certeza de los votantes' : 'Voter confidence'}
            </h2>
            <div className="space-y-2 rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5">
              {confidenceBuckets.map((b) => {
                const pct =
                  confidences.length > 0 ? Math.round((b.count / confidences.length) * 100) : 0
                return (
                  <div key={b.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-300">
                        {locale === 'es' ? 'Rango' : 'Range'} {b.label}
                      </span>
                      <span className="text-slate-500">
                        {b.count} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#0f1419]">
                      <div
                        className="h-full rounded-full bg-amber-400/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        <LocationInsightsCta
          locationName={location.name as string}
          locale={locale}
        />

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href={`/locations/${slug}`} className="underline underline-offset-2 hover:text-emerald-400">
            {locale === 'es' ? 'Volver al lugar público' : 'Back to the public location'}
          </Link>
        </p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string | null
}) {
  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  )
}
