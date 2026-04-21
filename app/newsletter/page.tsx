import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { ArrowLeft, BarChart3, Globe2, Mail } from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'
import { SITE_URL } from '@/lib/seo/site'

const COPY = {
  es: {
    metaTitle: 'Newsletter — Crowd Conscious',
    metaDescription:
      'Recibe el análisis semanal de Crowd Conscious: datos de opinión, contexto internacional y el pulso de las causas que la comunidad está votando. Sin formularios largos.',
    eyebrow: 'Newsletter',
    title: 'Análisis semanal, sin formularios largos.',
    lede:
      'Cada semana publicamos lecturas cortas sobre la opinión que mueve a México y al mundo, con datos de la plataforma y contexto internacional. Suscríbete y recíbelas en tu correo — sin necesidad de crear una cuenta.',
    formHelper:
      'Solo tu correo. Puedes darte de baja con un clic en cualquier momento.',
    valueTitle: '¿Qué vas a recibir?',
    value1Title: 'Análisis con datos reales',
    value1Body:
      'Lecturas basadas en lo que la comunidad está votando en Conscious Pulse, mercados de predicción y lugares conscientes.',
    value2Title: 'Contexto internacional',
    value2Body:
      'Conexiones entre lo que pasa en México y los movimientos de opinión globales — sin ruido, sin clickbait.',
    value3Title: 'Cero spam',
    value3Body:
      'Una entrega por semana. Si no te aporta, te das de baja en un clic. Sin secuencias agresivas.',
    backToBlog: 'Ver el blog',
    alreadyMember: '¿Ya tienes cuenta?',
    signIn: 'Inicia sesión',
  },
  en: {
    metaTitle: 'Newsletter — Crowd Conscious',
    metaDescription:
      'Get the Crowd Conscious weekly analysis: opinion data, international context, and the pulse of the causes the community is voting on. No long signup forms.',
    eyebrow: 'Newsletter',
    title: 'Weekly analysis, no long signup forms.',
    lede:
      'Every week we publish short reads on the opinions moving Mexico and the world, with platform data and international context. Subscribe and get them in your inbox — no account required.',
    formHelper:
      'Just your email. Unsubscribe with one click any time.',
    valueTitle: "What you'll get",
    value1Title: 'Analysis grounded in real data',
    value1Body:
      "Reads built on what the community is voting on in Conscious Pulse, prediction markets, and conscious places.",
    value2Title: 'International context',
    value2Body:
      'Connections between what happens in Mexico and global opinion movements — no noise, no clickbait.',
    value3Title: 'Zero spam',
    value3Body:
      "One weekly send. If it stops being useful, unsubscribe in one click. No aggressive sequences.",
    backToBlog: 'See the blog',
    alreadyMember: 'Already have an account?',
    signIn: 'Sign in',
  },
} as const

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const c = COPY[locale]
  const url = `${SITE_URL}/newsletter`
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: c.metaTitle,
      description: c.metaDescription,
      url,
      siteName: 'Crowd Conscious',
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'es_MX',
    },
    twitter: {
      card: 'summary_large_image',
      title: c.metaTitle,
      description: c.metaDescription,
    },
  }
}

export default async function NewsletterPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const c = COPY[locale]

  const valueProps = [
    { icon: BarChart3, title: c.value1Title, body: c.value1Body },
    { icon: Globe2, title: c.value2Title, body: c.value2Body },
    { icon: Mail, title: c.value3Title, body: c.value3Body },
  ]

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-emerald-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {c.backToBlog}
      </Link>

      <header className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
          {c.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {c.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">{c.lede}</p>
      </header>

      <section className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 sm:p-8">
        <NewsletterForm source="newsletter_page" locale={locale} />
        <p className="mt-3 text-center text-xs text-slate-500">{c.formHelper}</p>
      </section>

      <section className="mt-14">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          {c.valueTitle}
        </h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-3">
          {valueProps.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-5"
            >
              <Icon className="h-5 w-5 text-emerald-400" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-14 border-t border-[#2d3748] pt-6 text-center text-sm text-slate-500">
        {c.alreadyMember}{' '}
        <Link href="/login" className="text-emerald-400 hover:underline">
          {c.signIn}
        </Link>
      </footer>
    </main>
  )
}
