import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import EditBlogPostClient from './EditBlogPostClient'

type Props = { params: Promise<{ id: string }> }

export default async function AdminEditBlogPostPage(props: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/predictions')

  const { id } = await props.params
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).maybeSingle()
  if (profile?.user_type !== 'admin') {
    redirect('/predictions')
  }

  const { data: post } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle()
  if (!post) notFound()

  return <EditBlogPostClient post={post} />
}
