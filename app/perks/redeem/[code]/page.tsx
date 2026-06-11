import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { normalizeRedemptionCode } from '@/lib/perks/redemption-code'
import RedemptionDetailClient from '@/components/perks/RedemptionDetailClient'
import { unwrapJoin } from '@/lib/perks/supabase-join'
import type { RedemptionVerifyPayload } from '@/lib/perks/types'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ code: string }> }

export default async function PerkRedeemPage({ params }: Props) {
  const { code: raw } = await params
  const code = normalizeRedemptionCode(raw)
  if (!code) notFound()

  const admin = createAdminClient()
  const { data: redemption } = await admin
    .from('location_redemptions')
    .select(
      `
      redemption_code, xp_spent, status, expires_at, confirmed_at,
      location_offers (
        title, title_en, description, description_en,
        conscious_locations ( name, slug, city, neighborhood )
      )
    `
    )
    .eq('redemption_code', code)
    .maybeSingle()

  if (!redemption) notFound()

  const offerRaw = unwrapJoin(redemption.location_offers)
  const locationRaw = offerRaw ? unwrapJoin(offerRaw.conscious_locations) : null

  if (!offerRaw || !locationRaw) notFound()

  const payload: RedemptionVerifyPayload = {
    redemption: {
      code: redemption.redemption_code,
      status: redemption.status as RedemptionVerifyPayload['redemption']['status'],
      xp_spent: redemption.xp_spent,
      expires_at: redemption.expires_at,
      confirmed_at: redemption.confirmed_at,
    },
    offer: {
      title: offerRaw.title,
      title_en: offerRaw.title_en,
      description: offerRaw.description,
      description_en: offerRaw.description_en,
    },
    location: locationRaw,
    can_confirm: false,
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <RedemptionDetailClient data={payload} />
    </div>
  )
}
