import { redirect } from 'next/navigation'

// Dashboard redirects to predictions (main dashboard)
export default function DashboardPage() {
  redirect('/predictions')
}
