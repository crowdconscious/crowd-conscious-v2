import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth-server'
import { isBlogEditorUser } from '@/lib/auth/is-blog-editor'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'
import BecomeCreatorCard from '@/components/creators/BecomeCreatorCard'
import CreatorSignupForm from './CreatorSignupForm'

export const dynamic = 'force-dynamic'

/**
 * Creator signup. Logged-out visitors get the normal create-account form.
 * Already-signed-up visitors are routed to a self-serve path instead of the
 * form (which would error with "this email already has an account"):
 *   - creators / admins → straight to the creator dashboard
 *   - existing non-creators → the in-place upgrade card (flips role + handle)
 */
export default async function CreatorSignupPage() {
  const cookieStore = await cookies()
  const locale: CreatorLocale =
    cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const t = getCreatorCopy(locale)

  const user = await getCurrentUser().catch(() => null)

  if (!user) {
    return <CreatorSignupForm />
  }

  const hasCreatorAccess = isBlogEditorUser(user)
  const isCorporate = (user as { is_corporate_user?: boolean | null }).is_corporate_user === true
  const canUpgrade = !hasCreatorAccess && !isCorporate

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
            {t.heroEyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">{t.upgradeTitle}</h1>
        </div>

        {hasCreatorAccess ? (
          <Link
            href="/creator"
            className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10"
          >
            <div className="min-w-0">
              <p className="font-semibold text-white">{t.dashTitle}</p>
              <p className="text-sm text-slate-400">{t.upgradeGoToDashboard}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-emerald-400" />
          </Link>
        ) : canUpgrade ? (
          <BecomeCreatorCard locale={locale} showLearnMore={false} />
        ) : (
          <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6 text-center">
            <p className="text-sm text-slate-300">{t.upgradeForbidden}</p>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link href="/creators" className="text-sm text-gray-500 transition-colors hover:text-gray-300">
            ← {t.metaTitle.split('—')[0].trim()}
          </Link>
        </div>
      </div>
    </div>
  )
}
