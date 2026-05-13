import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'

const Footer = dynamic(() => import('@/components/Footer'))

function readLocale(c: {
  get: (k: string) => { value?: string } | undefined
}): CitizenSignalsLocale {
  return c.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}

export default async function SignalsComposeSuccess() {
  if (process.env.SIGNALS_ENABLED !== 'true') notFound()
  const cookieStore = await cookies()
  const locale = readLocale(cookieStore)
  const t = getCitizenSignalsCopy(locale)

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
          {t.nav.brand}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          {t.compose.success.title}
        </h1>
        <p className="mt-3 text-slate-400">{t.compose.success.body}</p>
        <div className="mt-8">
          <Link
            href="/signals"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            {t.compose.success.backToFeed}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
