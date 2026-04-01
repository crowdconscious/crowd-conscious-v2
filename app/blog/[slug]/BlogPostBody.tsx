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
      <div
        className="prose prose-invert mx-auto max-w-none
        prose-headings:font-bold prose-headings:text-white
        prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl
        prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-xl
        prose-p:mb-5 prose-p:text-gray-300 prose-p:leading-relaxed
        prose-strong:text-white
        prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-emerald-500/30 prose-blockquote:text-gray-400
        prose-code:rounded prose-code:bg-[#1a2029] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-emerald-300
        prose-pre:bg-[#1a2029] prose-pre:text-gray-300
        prose-li:text-gray-300
        prose-hr:border-gray-700
        prose-ul:marker:text-emerald-500/80"
      >
        <ReactMarkdown>{needsGate ? previewMarkdown : fullMarkdown}</ReactMarkdown>
      </div>

      {needsGate && (
        <div
          className="relative -mt-32 pt-32"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, #0f1419 60%)',
          }}
        >
          <div className="relative mx-auto max-w-md rounded-xl border border-[#2d3748] bg-[#0f1419]/95 px-6 py-12 text-center shadow-2xl backdrop-blur-md">
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
