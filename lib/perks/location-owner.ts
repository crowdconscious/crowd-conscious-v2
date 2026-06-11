import type { SupabaseClient } from '@supabase/supabase-js'

type LocationOwnerRow = {
  id: string
  slug: string
  name: string
  status: string
  contact_email: string | null
  owner_profile_id: string | null
}

/** Load a location by slug for owner/claim flows. */
export async function getLocationBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<LocationOwnerRow | null> {
  const { data, error } = await supabase
    .from('conscious_locations')
    .select('id, slug, name, status, contact_email, owner_profile_id')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data as LocationOwnerRow | null
}

/** Email match claim eligibility (mirrors sponsor_accounts migration 209). */
export function canClaimByEmail(
  location: Pick<LocationOwnerRow, 'contact_email' | 'owner_profile_id'>,
  userEmail: string | null | undefined
): boolean {
  if (location.owner_profile_id) return false
  const locEmail = location.contact_email?.trim().toLowerCase()
  const profileEmail = userEmail?.trim().toLowerCase()
  return Boolean(locEmail && profileEmail && locEmail === profileEmail)
}

/** True if user already owns or can manage via owner_profile_id or email match. */
export async function userOwnsLocation(
  supabase: SupabaseClient,
  locationId: string,
  userId: string,
  userEmail: string | null | undefined
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_location_owner', {
    p_location_id: locationId,
    p_user_id: userId,
  })
  if (error) {
    // RPC may not exist before migration — fall back to column check
    const { data: loc } = await supabase
      .from('conscious_locations')
      .select('owner_profile_id, contact_email')
      .eq('id', locationId)
      .maybeSingle()
    if (!loc) return false
    if (loc.owner_profile_id === userId) return true
    const locEmail = loc.contact_email?.trim().toLowerCase()
    const profileEmail = userEmail?.trim().toLowerCase()
    return Boolean(locEmail && profileEmail && locEmail === profileEmail)
  }
  return Boolean(data)
}
