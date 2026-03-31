'use client'

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton'

type Locale = 'es' | 'en'

export function BlogPostBody({
  slug,
  locale,
  previewMarkdown,
  fullMarkdown,
  needsGate,
}: {
  slug: string
  locale: Locale
  previewMarkdown: string
  fullMarkdown: string
  needsGate: boolean
}) {
  const es = locale === 'es'
  const redirectTo = `/blog/${slug}`

  return (
    <>
      <article className="prose prose-invert prose-headings:font-bold prose-a:text-emerald-400 max-w-none">
        <ReactMarkdown>{needsGate ? previewMarkdown : fullMarkdown}</ReactMarkdown>
      </article>

      {needsGate && (
        <div
          className="relative -mt-16 pt-20"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, #0f1419 45%)',
          }}
        >
          <div className="relative rounded-xl border border-[#2d3748] bg-[#0f1419]/95 px-6 py-10 text-center shadow-2xl backdrop-blur-md">
            <h3 className="text-xl font-bold text-white">
              {es
                ? 'Regístrate gratis para leer el análisis completo'
                : 'Sign up free to read the full analysis'}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {es
                ? 'Accede a todos nuestros análisis de inteligencia colectiva.'
                : 'Access all our collective intelligence analysis.'}
            </p>
            <div className="mx-auto mt-6 max-w-sm">
              <GoogleLoginButton redirectTo={redirectTo} />
            </div>
            <Link
              href={`/signup?redirect=${encodeURIComponent(redirectTo)}`}
              className="mt-4 block text-sm text-emerald-400 hover:text-emerald-300"
            >
              {es ? 'O regístrate con email →' : 'Or sign up with email →'}
            </Link>
            <p className="mt-6 text-sm text-slate-500">
              {es ? '¿Ya tienes cuenta? ' : 'Already have an account? '}
              <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="text-emerald-400">
                {es ? 'Iniciar sesión' : 'Sign in'}
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
