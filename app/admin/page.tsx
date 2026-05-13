import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AdminDashboardClient from './AdminDashboardClient'
import { isAdminUser } from '@/lib/auth/is-admin'

export default async function AdminDashboardPage() {
  const user = await getCurrentUser()

  if (!user || !isAdminUser(user)) {
    redirect('/dashboard')
  }

  return <AdminDashboardClient />
}