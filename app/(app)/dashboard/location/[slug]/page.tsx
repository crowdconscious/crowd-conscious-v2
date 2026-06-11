import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { userOwnsLocation } from '@/lib/perks/location-owner'
import { createClient } from '@/lib/supabase-server'
import LocationOwnerDashboardClient from '@/components/perks/LocationOwnerDashboardClient'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export default async function LocationOwnerDashboardPage({ params }: Props) {
  const user = await getCurrentUser()
  const { slug } = await params

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/dashboard/location/${slug}`)}`)
  }

  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: location } = await admin
    .from('conscious_locations')
    .select('id, slug, name, status, contact_email, owner_profile_id')
    .eq('slug', slug)
    .maybeSingle()

  if (!location) {
    redirect('/locations')
  }

  const owns = await userOwnsLocation(supabase, location.id, user.id, user.email)
  if (!owns) {
    redirect(`/locations/${encodeURIComponent(slug)}/claim`)
  }

  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  return (
    <div className="min-h-screen bg-[#0f1419] px-4 py-8 text-slate-100">
      <Link
        href="/predictions"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400"
      >
        <ChevronLeft className="h-4 w-4" />
        {locale === 'es' ? 'Volver al panel' : 'Back to dashboard'}
      </Link>
      <LocationOwnerDashboardClient
        slug={slug}
        initialLocation={{ slug: location.slug, name: location.name, status: location.status }}
      />
    </div>
  )
}
