import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import type { CreatorLocale } from '@/lib/i18n/creator'
import BlogReviewList, { type ReviewRow } from './BlogReviewList'

export const dynamic = 'force-dynamic'

export default async function AdminBlogReviewPage() {
  const cookieStore = await cookies()
  const locale: CreatorLocale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  const admin = createAdminClient()
  const { data: posts } = await admin
    .from('blog_posts')
    .select('id, title, slug, status, author_id, updated_at')
    .eq('status', 'pending_review')
    .order('updated_at', { ascending: true })
    .limit(200)

  const list = (posts ?? []) as Array<{
    id: string
    title: string
    slug: string | null
    status: string
    author_id: string | null
    updated_at: string | null
  }>

  const authorIds = Array.from(new Set(list.map((p) => p.author_id).filter(Boolean))) as string[]
  const authorsById = new Map<string, { full_name: string | null; creator_trust_level: number | null }>()
  if (authorIds.length > 0) {
    const { data: authors } = await admin
      .from('profiles')
      .select('id, full_name, creator_trust_level')
      .in('id', authorIds)
    for (const a of authors ?? []) {
      authorsById.set(a.id, {
        full_name: a.full_name ?? null,
        creator_trust_level: a.creator_trust_level ?? 0,
      })
    }
  }

  const rows: ReviewRow[] = list.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    authorName: (p.author_id ? authorsById.get(p.author_id)?.full_name : null) || null,
    authorTrust: p.author_id ? authorsById.get(p.author_id)?.creator_trust_level ?? 0 : 0,
    submittedAt: p.updated_at,
  }))

  return <BlogReviewList rows={rows} locale={locale} />
}
