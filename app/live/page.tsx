import Link from 'next/link'
import { headers } from 'next/headers'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import type { Database } from '@/types/database'
import { LiveEventCard } from '@/components/live/LiveEventCard'
import { CreateLiveEventPanel } from '@/components/live/CreateLiveEventPanel'

/** Per-session admin create form; list still fetched each request. */
export const dynamic = 'force-dynamic'

type LiveEventRow = Database['public']['Tables']['live_events']['Row']

function partitionEvents(rows: LiveEventRow[]) {
  const now = Date.now()
  const liveNow: LiveEventRow[] = []
  const upcoming: LiveEventRow[] = []
  const past: LiveEventRow[] = []

  for (const e of rows) {
    const t = new Date(e.match_date).getTime()
    if (e.status === 'live') {
      liveNow.push(e)
    } else if (e.status === 'scheduled') {
      if (t >= now) upcoming.push(e)
      else past.push(e)
    } else {
      past.push(e)
    }
  }

  liveNow.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
  upcoming.sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
  past.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())

  return { liveNow, upcoming, past }
}

export default async function LiveEventsPage() {
  const supabase = await createClient()
  const sessionProfile = await getCurrentUser()

  let isAdmin = false
  if (sessionProfile) {
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
    const profileEmail = sessionProfile.email?.toLowerCase().trim()
    isAdmin =
      sessionProfile.user_type === 'admin' ||
      (!!adminEmail && !!profileEmail && profileEmail === adminEmail)
  }

  const { data, error } = await supabase.from('live_events').select('*').order('match_date', { ascending: false })

  const h = await headers()
  const accept = h.get('accept-language') || ''
  const locale = accept.toLowerCase().includes('en') ? 'en' : 'es'

  const rows = (data ?? []) as LiveEventRow[]
  const { liveNow, upcoming, past } = partitionEvents(rows)

  const t = {
    title: locale === 'es' ? 'Conscious Live' : 'Conscious Live',
    back: locale === 'es' ? 'Volver al inicio' : 'Back to home',
    live: locale === 'es' ? 'En vivo ahora' : 'Live now',
    upcoming: locale === 'es' ? 'Próximos' : 'Upcoming',
    past: locale === 'es' ? 'Pasados' : 'Past',
    empty: locale === 'es' ? 'No hay eventos por ahora.' : 'No events yet.',
    emptyAdminHint:
      locale === 'es'
        ? 'Como administrador, usa el formulario de arriba para crear el primer evento.'
        : 'As an admin, use the form above to create your first event.',
    error: locale === 'es' ? 'No se pudieron cargar los eventos.' : 'Could not load events.',
  }

  return (
    <div className="min-h-screen bg-[#070b10]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-teal-400"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t.title}</h1>
        </div>

        {isAdmin && (
          <CreateLiveEventPanel locale={locale === 'es' ? 'es' : 'en'} />
        )}

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {t.error}
          </p>
        )}

        {!error && rows.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-8 text-center">
            <p className="text-slate-400">{t.empty}</p>
            {isAdmin && (
              <p className="mt-3 text-sm text-slate-500">{t.emptyAdminHint}</p>
            )}
          </div>
        )}

        {!error && liveNow.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              {t.live}
            </h2>
            <div className="flex flex-col gap-4">
              {liveNow.map((e) => (
                <LiveEventCard key={e.id} event={e} group="live" />
              ))}
            </div>
          </section>
        )}

        {!error && upcoming.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-teal-300">{t.upcoming}</h2>
            <div className="flex flex-col gap-4">
              {upcoming.map((e) => (
                <LiveEventCard key={e.id} event={e} group="upcoming" />
              ))}
            </div>
          </section>
        )}

        {!error && past.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-400">{t.past}</h2>
            <div className="flex flex-col gap-4">
              {past.map((e) => (
                <LiveEventCard key={e.id} event={e} group="past" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
