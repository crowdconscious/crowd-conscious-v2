import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import EmailTemplatesClient from './EmailTemplatesClient'
import { isAdminUser } from '@/lib/auth/is-admin'

export const dynamic = 'force-dynamic'

async function checkAdminAccess(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, email')
    .eq('id', userId)
    .single()

  return isAdminUser(profile as { user_type?: string | null; email?: string | null } | null)
}

export default async function EmailTemplatesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const isAdmin = await checkAdminAccess((user as any).id)
  if (!isAdmin) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-xl p-6">
        <h1 className="text-3xl font-bold mb-2">📧 Email Templates</h1>
        <p className="text-teal-100">
          Preview and test professional email templates with React Email
        </p>
      </div>

      <EmailTemplatesClient />
    </div>
  )
}
