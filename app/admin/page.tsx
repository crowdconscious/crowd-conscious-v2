import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminDashboardPage() {
  const user = await getCurrentUser()
  
  // Check if user is admin
  if (!user || user.user_type !== 'admin') {
    redirect('/dashboard')
  }

  return <AdminDashboardClient />
}