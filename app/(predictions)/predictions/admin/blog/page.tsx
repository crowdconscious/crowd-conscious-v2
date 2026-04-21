import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import BlogAdminList, { type BlogAdminRow } from './BlogAdminList'

export const dynamic = 'force-dynamic'

export default async function AdminBlogIndexPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/predictions')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.user_type !== 'admin') {
    redirect('/predictions')
  }

  const { data: posts } = await supabase
    .from('blog_posts')
    .select(
      'id, slug, title, title_en, category, status, published_at, updated_at, view_count, cover_image_url, generated_by, pulse_market_id, tags'
    )
    .order('updated_at', { ascending: false })
    .limit(500)

  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  return <BlogAdminList posts={(posts ?? []) as BlogAdminRow[]} locale={locale} />
}
