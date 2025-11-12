import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

/**
 * POST /api/wallets/user
 * Get or create wallet for a user (creator)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return ApiResponse.unauthorized('Please log in to access wallet')
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
        return ApiResponse.serverError('Failed to create wallet', 'WALLET_CREATION_ERROR', { message: createError.message })
      }

      wallet = newWallet
    } else if (walletError) {
      console.error('Error fetching wallet:', walletError)
      return ApiResponse.serverError('Failed to fetch wallet', 'WALLET_FETCH_ERROR', { message: walletError.message })
    }

    return ApiResponse.ok({ wallet })
  } catch (error: any) {
    console.error('Error in POST /api/wallets/user:', error)
    return ApiResponse.serverError('Internal server error', 'WALLET_SERVER_ERROR', { message: error.message })
  }
}

