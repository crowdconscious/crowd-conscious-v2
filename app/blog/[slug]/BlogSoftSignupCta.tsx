'use client'

import GoogleLoginButton from '@/components/auth/GoogleLoginButton'
import { useLocale } from '@/lib/i18n/useLocale'

export function BlogSoftSignupCta({ slug }: { slug: string }) {
  const locale = useLocale()
  const es = locale === 'es' || locale.startsWith('es')
  const redirectTo = `/blog/${slug}`

  return (
    <div className="mt-8 rounded-xl border border-[#2d3748] bg-[#1a2029] p-6 text-center">
      <p className="font-medium text-white">
        {es ? '¿Te gustó este análisis?' : 'Enjoyed this analysis?'}
      </p>
      <p className="mt-1 mb-4 text-sm text-gray-400">
        {es
          ? 'Recibe análisis semanales y vota en mercados activos.'
          : 'Get weekly analysis and vote on active markets.'}
      </p>
      <div className="mx-auto flex max-w-sm flex-col justify-center gap-3 sm:flex-row">
        <GoogleLoginButton redirectTo={redirectTo} />
      </div>
      <p className="mt-3 text-xs text-gray-600">
        {es
          ? 'O simplemente sigue leyendo el blog — es gratis.'
          : "Or just keep reading the blog — it's free."}
      </p>
    </div>
  )
}
