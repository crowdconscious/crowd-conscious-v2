import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { getMarketText } from '@/lib/i18n/market-translations'

export const metadata: Metadata = {
  title: 'Conscious Pulse — Medición de sentimiento público',
  description:
    'Consultas ciudadanas y medición de opinión pública en tiempo real. Powered by Crowd Conscious.',
  openGraph: {
    title: 'Conscious Pulse',
    description: 'Medición de sentimiento público en tiempo real.',
  },
}

export default async function PulseListingPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('prediction_markets')
    .select('id, title, translations, pulse_client_name, pulse_client_logo, status')
    .eq('is_pulse', true)
    .in('status', ['active', 'trading'])
    .order('created_at', { ascending: false })

  const markets = rows ?? []
  const byClient = new Map<string, typeof markets>()
  for (const m of markets) {
    const key = m.pulse_client_name?.trim() || 'General'
    const list = byClient.get(key) ?? []
    list.push(m)
    byClient.set(key, list)
  }
  const groups = Array.from(byClient.entries()).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <header className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            Conscious Pulse
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Medición de sentimiento público
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            Consultas activas impulsadas por Crowd Conscious. Resultados en vivo con analíticas de
            confianza.
          </p>
        </header>

        {markets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-[#1a2029] px-6 py-16 text-center">
            <p className="text-lg text-slate-400">Aún no hay consultas Pulse activas.</p>
            <p className="mt-2 text-sm text-slate-500">Vuelve pronto o explora los mercados de predicción.</p>
            <Link
              href="/markets"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Ver mercados
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
                      'es'
                    )
                    const logo = m.pulse_client_logo?.trim()
                    return (
                      <li key={m.id}>
                        <Link
                          href={`/pulse/${m.id}`}
                          className="group flex h-full flex-col rounded-2xl border border-white/10 bg-[#1a2029] p-5 transition hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-900/20"
                        >
                          <div className="mb-3 flex items-start gap-3">
                            {logo ? (
                              <img
                                src={logo}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-lg object-contain"
                              />
                            ) : (
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                                ◆
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold leading-snug text-white group-hover:text-emerald-200">
                                {title}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">Ver resultados →</p>
                            </div>
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

        <p className="mt-12 text-center text-sm text-slate-500">
          <Link href="/" className="text-emerald-400 hover:underline">
            Inicio
          </Link>
          {' · '}
          <Link href="/fund" className="text-emerald-400 hover:underline">
            Fondo Consciente
          </Link>
        </p>
      </div>
    </div>
  )
}
