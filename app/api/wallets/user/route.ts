import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * POST /api/wallets/user
 * Get or create wallet for a user (creator)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if wallet exists
    let { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_type', 'user')
      .eq('owner_id', user.id)
      .single()

    // If not exists, create it
    if (walletError && walletError.code === 'PGRST116') {
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          owner_type: 'user',
          owner_id: user.id,
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
    console.error('Error in POST /api/wallets/user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

