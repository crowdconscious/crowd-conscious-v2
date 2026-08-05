import Link from 'next/link'
import { getQuejaCopy, type QuejaLocale } from '@/lib/senal-express/i18n'

/**
 * Rendered when SENAL_EXPRESS_ENABLED is off. The kill switch makes the feature
 * INVISIBLE, not broken (§1): a friendly coming-soon screen, never an error.
 */
export default function QuejaComingSoon({ locale }: { locale: QuejaLocale }) {
  const t = getQuejaCopy(locale)
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 pt-24">
      <div className="mx-auto max-w-lg text-center">
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
          {t.comingSoon.badge}
        </span>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
          {t.comingSoon.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          {t.comingSoon.body}
        </p>
        <Link
          href="/pulse"
          className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-600 px-6 font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          {t.comingSoon.cta}
        </Link>
      </div>
    </main>
  )
}
