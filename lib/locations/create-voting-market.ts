import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Creates a community multi-outcome market (two Spanish labels) for Conscious Location voting.
 */
export async function createConsciousLocationVotingMarket(
  admin: ReturnType<typeof createAdminClient>,
  createdBy: string,
  locationName: string
): Promise<string> {
  const title = `¿Es ${locationName} un lugar Consciente?`
  const description = `La comunidad decide si ${locationName} merece mantener el sello Consciente de Crowd Conscious. Vota y califica tu nivel de certeza (1-10).`
  const resolution_criteria =
    'Votación comunitaria. El Conscious Score se calcula con aprobación ponderada por certeza.'
  const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: marketId, error } = await admin.rpc(
    'create_multi_market',
    {
      p_title: title,
      p_description: description,
      p_category: 'community',
      p_created_by: createdBy,
      p_end_date: endDate,
      p_outcomes: ['Sí, es Consciente', 'No estoy convencido'],
      p_sponsor_name: null,
      p_sponsor_logo_url: null,
      p_image_url: null,
      p_resolution_criteria: resolution_criteria,
    } as never
  )

  if (error || !marketId) {
    throw new Error(error?.message ?? 'create_multi_market failed')
  }

  const id = marketId as string

  const { error: upErr } = await admin
    .from('prediction_markets')
    .update({
      is_pulse: false,
      metadata: {
        title_en: `Is ${locationName} a Conscious Location?`,
        description_en: `The community decides whether ${locationName} deserves to keep the Crowd Conscious seal. Vote and rate your confidence (1-10).`,
      },
    })
    .eq('id', id)

  if (upErr) {
    console.error('[createConsciousLocationVotingMarket] metadata update', upErr)
  }

  return id
}
