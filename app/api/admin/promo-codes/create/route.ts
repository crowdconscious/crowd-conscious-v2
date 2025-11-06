import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (you can enhance this check)
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.email === 'francisco@crowdconscious.app'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const adminClient = createAdminClient()

    // Insert promo code
    const { data: promoCode, error } = await adminClient
      .from('promo_codes')
      .insert({
        code: body.code.toUpperCase().trim(),
        description: body.description || null,
        discount_type: body.discount_type,
        discount_value: body.discount_type === 'free' ? 100 : body.discount_value,
        max_uses: body.max_uses || null,
        max_uses_per_user: body.max_uses_per_user || 1,
        valid_until: body.valid_until || null,
        partner_name: body.partner_name || null,
        campaign_name: body.campaign_name || null,
        minimum_purchase_amount: body.minimum_purchase_amount || 0,
        notes: body.notes || null,
        created_by: user.id,
        active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating promo code:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create promo code' },
        { status: 400 }
      )
    }

    return NextResponse.json({ promoCode }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

