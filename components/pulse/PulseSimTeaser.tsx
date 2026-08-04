import Link from 'next/link'

/**
 * Pre-vote simulation teaser (§5.7).
 *
 * The ONLY sim-related thing a user may see before they vote on an open Pulse:
 * content-free copy inviting them to vote. NO numbers, option names, shares,
 * confidence, or anything directional — the no-anchoring guardrail (§1) is
 * enforced in the data layer (the loader sends at most a `simTeaser` boolean),
 * and this component has nothing else to render. Amber palette + persistent
 * `SIMULACIÓN IA` badge (total separation, §1).
 */

const SIM_BADGE_CLASS =
  'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30'

export default function PulseSimTeaser({
  marketId,
  locale,
}: {
  marketId: string
  locale: 'es' | 'en'
}) {
  return (
    <div className="pulse-section mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-5 text-center">
      <div className="mb-2 flex items-center justify-center">
        <span className={SIM_BADGE_CLASS}>SIMULACIÓN IA</span>
      </div>
      <p className="text-sm font-medium text-amber-200">
        {locale === 'es'
          ? 'La IA ya votó este Pulse. Vota para ver si nos conoce.'
          : 'The AI already voted on this Pulse. Vote to see if it knows us.'}
      </p>
      <Link
        href={`/predictions/markets/${marketId}#vote`}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 px-5 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/25"
      >
        {locale === 'es' ? 'Votar →' : 'Vote →'}
      </Link>
    </div>
  )
}
