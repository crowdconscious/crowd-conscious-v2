import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth-server'
import type { CreatorLocale } from '@/lib/i18n/creator'
import CreatorPostEditor from '../CreatorPostEditor'

export const dynamic = 'force-dynamic'

export default async function NewCreatorPostPage() {
  const cookieStore = await cookies()
  const locale: CreatorLocale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const user = await getCurrentUser()
  const trust = Number((user as { creator_trust_level?: number } | null)?.creator_trust_level ?? 0)

  return <CreatorPostEditor locale={locale} canPublish={trust >= 2} />
}
