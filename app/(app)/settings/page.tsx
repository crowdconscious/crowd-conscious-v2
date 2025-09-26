import { getCurrentUser } from '../../../lib/auth-server'
import { supabase } from '../../../lib/supabase'
import DashboardNavigation from '@/components/DashboardNavigation'
import SettingsClient from './SettingsClient'

async function getUserSettings(userId: string) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user settings:', error)
  }

  // Return default settings if none exist
  return data || {
    theme: 'light',
    language: 'en',
    currency: 'USD',
    email_notifications: true,
    push_notifications: true,
    marketing_emails: false,
    privacy_level: 'public'
  }
}

async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

export default async function SettingsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    return <div>Please log in to view settings.</div>
  }

  const [userSettings, profile] = await Promise.all([
    getUserSettings(user.id),
    getProfile(user.id)
  ])

  return (
    <div className="space-y-8">
      <DashboardNavigation />
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
      </div>

      <SettingsClient 
        user={user}
        userSettings={userSettings}
        profile={profile}
      />
    </div>
  )
}