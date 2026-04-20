import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { ResharePacket } from '@/components/fund/ResharePacket'

// Reshare kit: a single public URL we DM to cause organizations so they
// can copy-paste everything they need to promote themselves on Crowd
// Conscious. No auth, because the cause org doesn't have a Crowd Conscious
// account and we don't want to gate this.
//
// The `token` param is a free-form attribution tag. It's NOT a secret.
// We forward it to outbound share URLs as `?ref=<token>` so votes that
// arrive via this kit carry a breadcrumb we can analyze later.

export const dynamic = 'force-dynamic'
export const revalidate = 0

type CauseRow = {
  id: string
  slug: string
  name: string
  organization: string | null
  category: string | null
  short_description: string | null
  description: string | null
  logo_url: string | null
  cover_image_url: string | null
  image_url: string | null
  instagram_handle: string | null
  website_url: string | null
  verified: boolean
  active: boolean
}

async function loadCause(slug: string): Promise<CauseRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('fund_causes')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) return null
  const c = data as unknown as CauseRow
  if (!c.active) return null
  return c
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const cause = await loadCause(slug)
  const title = cause
    ? `Kit para compartir · ${cause.name}`
    : 'Kit para compartir · Crowd Conscious'
  // Noindex: the kit page is an internal tool for the partner, not a
  // public marketing surface. Keep it out of Google.
  return {
    title,
    robots: { index: false, follow: false },
  }
}

export default async function CauseKitPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const sp = searchParams ? await searchParams : undefined
  const rawToken = sp?.token
  const token =
    typeof rawToken === 'string' && rawToken.trim().length > 0
      ? rawToken.trim().slice(0, 64)
      : null

  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  const cause = await loadCause(slug)
  if (!cause) notFound()

  return (
    <div className="min-h-screen bg-cc-bg text-cc-text-primary">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <Link
          href={`/fund/causes/${cause.slug}`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
        >
          ← {locale === 'es' ? 'Ver página pública' : 'View public page'}
        </Link>

        <ResharePacket
          causeId={cause.id}
          slug={cause.slug}
          name={cause.name}
          organization={cause.organization}
          shortDescription={cause.short_description}
          instagramHandle={cause.instagram_handle}
          locale={locale}
          token={token}
        />
      </div>
    </div>
  )
}
