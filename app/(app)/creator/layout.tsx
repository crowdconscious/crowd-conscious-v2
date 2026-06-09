import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isBlogEditorUser } from '@/lib/auth/is-blog-editor'

/**
 * Creator workspace guard. The parent (app) layout already requires login;
 * here we additionally require the creator role (user_type='influencer') or
 * admin. Non-creators are sent to the public /creators landing so they can
 * sign up as a creator.
 */
export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/creator')
  if (!isBlogEditorUser(user)) redirect('/creators')
  return <>{children}</>
}
