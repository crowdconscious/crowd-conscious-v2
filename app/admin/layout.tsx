import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { isAdminUser } from '@/lib/auth/is-admin'

/**
 * Minimal admin shell.
 *
 * The canonical admin surface is the predictions sidebar
 * (app/(predictions)/predictions/PredictionsShell.tsx). This layout exists only
 * to keep the few admin URLs that still live under /admin/* working —
 * primarily /admin/signals — without the old red-banner tile dashboard.
 *
 * Server-side auth gate matches the rest of the app: profiles.user_type === 'admin'
 * via isAdminUser.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!isAdminUser(user)) {
    redirect('/dashboard?error=unauthorized')
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <div className="border-b border-slate-800 bg-[#0f1419]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0f1419]/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link
            href="/predictions"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to dashboard</span>
          </Link>
          <span className="text-xs uppercase tracking-wider text-slate-500">Admin</span>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
