import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { canManageBlogPost } from '@/lib/auth/blog-post-access'
import EditBlogPostClient from './EditBlogPostClient'

type Props = { params: Promise<{ id: string }> }

export default async function AdminEditBlogPostPage(props: Props) {
  const { id } = await props.params
  const user = await getCurrentUser()
  if (!user) notFound()

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, email')
    .eq('id', user.id)
    .maybeSingle()

  const { data: post } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle()
  if (!post || !canManageBlogPost(profile, user.id, post)) notFound()

  return <EditBlogPostClient post={post} />
}
