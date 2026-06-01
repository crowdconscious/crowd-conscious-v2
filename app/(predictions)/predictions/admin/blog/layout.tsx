import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { isBlogEditorUser } from '@/lib/auth/is-blog-editor'

export const dynamic = 'force-dynamic'

/**
 * Blog admin subtree: admins + influencers only. Keeps create/edit/list
 * under one gate so client pages don't need their own server checks.
 */
export default async function BlogAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/predictions')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, email')
    .eq('id', user.id)
    .maybeSingle()

  if (!isBlogEditorUser(profile)) {
    redirect('/predictions')
  }

  return children
}
