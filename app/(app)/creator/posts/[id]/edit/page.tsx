import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { canManageBlogPost } from '@/lib/auth/blog-post-access'
import type { CreatorLocale } from '@/lib/i18n/creator'
import { parseBlogSources } from '@/components/blog/BlogSources'
import CreatorPostEditor, { type CreatorEditablePost } from '../../CreatorPostEditor'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function EditCreatorPostPage(props: Props) {
  const { id } = await props.params
  const cookieStore = await cookies()
  const locale: CreatorLocale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  const user = await getCurrentUser()
  if (!user) notFound()

  const supabase = await createClient()
  const { data: post } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle()
  if (!post || !canManageBlogPost(user, user.id, post)) notFound()

  const trust = Number((user as { creator_trust_level?: number }).creator_trust_level ?? 0)

  const editable: CreatorEditablePost = {
    id: post.id,
    title: post.title,
    title_en: post.title_en ?? null,
    excerpt: post.excerpt ?? null,
    excerpt_en: post.excerpt_en ?? null,
    content: post.content ?? null,
    content_en: post.content_en ?? null,
    category: post.category ?? 'insight',
    cover_image_url: post.cover_image_url ?? null,
    sources: parseBlogSources((post as { sources?: unknown }).sources),
    status: post.status,
    slug: post.slug ?? null,
  }

  return <CreatorPostEditor locale={locale} post={editable} canPublish={trust >= 2} />
}
