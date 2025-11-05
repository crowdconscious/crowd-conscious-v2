import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import UserModuleBuilderClient from './UserModuleBuilderClient'
import { createClient } from '@/lib/supabase-server'

export const metadata = {
  title: 'Crear Módulo | Crowd Conscious',
  description: 'Crea y monetiza tu propio módulo educativo'
}

// Get user profile to pass to client
async function getUserProfile(userId: string) {
  const supabase = await createClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', userId)
    .single()
  
  return profile
}

export default async function UserModuleBuilderPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login?redirect=/marketplace/create')
  }
  
  const profile = await getUserProfile((user as any).id)
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <UserModuleBuilderClient 
        userId={(user as any).id}
        userProfile={profile}
      />
    </div>
  )
}

