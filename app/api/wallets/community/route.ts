import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * POST /api/wallets/community
 * Get or create wallet for a community
 * Used when community is first created or when accessing wallet page
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { communityId } = await request.json()

    if (!communityId) {
      return NextResponse.json(
        { error: 'Community ID is required' },
        { status: 400 }
      )
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin of this community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('admin_id')
      .eq('id', communityId)
      .single()

    if (communityError || !community || community.admin_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to access this community' },
        { status: 403 }
      )
    }

    // Check if wallet exists
    let { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_type', 'community')
      .eq('owner_id', communityId)
      .single()

    // If not exists, create it
    if (walletError && walletError.code === 'PGRST116') {
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          owner_type: 'community',
          owner_id: communityId,
          balance: 0.00,
          currency: 'MXN',
          status: 'active'
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating wallet:', createError)
        return NextResponse.json(
          { error: 'Failed to create wallet' },
          { status: 500 }
        )
      }

      wallet = newWallet
    } else if (walletError) {
      console.error('Error fetching wallet:', walletError)
      return NextResponse.json(
        { error: 'Failed to fetch wallet' },
        { status: 500 }
      )
    }

    return NextResponse.json({ wallet })
  } catch (error) {
    console.error('Error in POST /api/wallets/community:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

