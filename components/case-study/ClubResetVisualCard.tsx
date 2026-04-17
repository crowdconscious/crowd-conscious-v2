type Outcome = {
  id: string
  label: string
  votes: number
  pct: number
}

type Props = {
  locale?: 'es' | 'en'
  votes: number
  avgConfidence: number
  outcomes?: Outcome[]
}

/**
 * Standalone results card for the Club Reset case study. Designed to be:
 *   - embedded inside the blog post,
 *   - rendered into an OG image (the layout works at 1200×630),
 *   - reused on /pulse if we want a richer hero treatment later.
 *
 * Pure server-friendly markup — no client hooks — so it can be used inside
 * route handlers that generate static OG images via @vercel/og.
 */
export function ClubResetVisualCard({
  locale = 'es',
  votes,
  avgConfidence,
  outcomes = [],
}: Props) {
  const es = locale === 'es'
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0f1419] to-emerald-950/30 p-8">
      <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            {es ? 'Caso de estudio · Conscious Pulse' : 'Case study · Conscious Pulse'}
          </p>
          <h3 className="mt-1 text-2xl font-bold text-white">Club Reset</h3>
          <p className="text-sm text-slate-400">
            {es ? 'Lugar Consciente · Juárez' : 'Conscious Location · Juárez'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-white">{votes}</p>
          <p className="text-xs text-slate-400">{es ? 'votos' : 'votes'}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {es ? 'Confianza promedio' : 'Average confidence'}
          </p>
          <p className="mt-1 text-3xl font-bold text-emerald-400">
            {avgConfidence.toFixed(1)} / 10
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {es ? 'Posición de la comunidad' : 'Community position'}
          </p>
          <p className="mt-1 text-base text-slate-300">
            {avgConfidence >= 8
              ? es
                ? 'Convicción fuerte'
                : 'Strong conviction'
              : avgConfidence >= 6
                ? es
                  ? 'Mayoría con dudas'
                  : 'Majority with doubts'
                : es
                  ? 'Comunidad dividida'
                  : 'Community divided'}
          </p>
        </div>
      </div>

      {outcomes.length > 0 && (
        <div className="mt-6 space-y-2">
          {outcomes.map((o) => (
            <div key={o.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-200">{o.label}</span>
                <span className="text-slate-400">
                  {o.votes} · {o.pct}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.max(2, o.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 border-t border-white/10 pt-4 text-center text-xs uppercase tracking-wider text-slate-500">
        Powered by Conscious Pulse
      </p>
    </div>
  )
}
