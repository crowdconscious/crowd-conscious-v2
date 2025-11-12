import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

/**
 * POST /api/wallets/community
 * Get or create wallet for a community
 * Used when community is first created or when accessing wallet page
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { communityId } = await request.json()

    if (!communityId) {
      return ApiResponse.badRequest('Community ID is required', 'MISSING_COMMUNITY_ID')
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return ApiResponse.unauthorized('Please log in to access wallet')
    }

    // Verify user is admin or founder of this community
    const { data: membership, error: membershipError } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership || (membership.role !== 'admin' && membership.role !== 'founder')) {
      return ApiResponse.forbidden('You must be a community admin or founder to access this wallet', 'NOT_COMMUNITY_ADMIN')
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
        return ApiResponse.serverError('Failed to create wallet', 'WALLET_CREATION_ERROR', { message: createError.message })
      }

      wallet = newWallet
    } else if (walletError) {
      console.error('Error fetching wallet:', walletError)
      return ApiResponse.serverError('Failed to fetch wallet', 'WALLET_FETCH_ERROR', { message: walletError.message })
    }

    return ApiResponse.ok({ wallet })
  } catch (error: any) {
    console.error('Error in POST /api/wallets/community:', error)
    return ApiResponse.serverError('Internal server error', 'WALLET_SERVER_ERROR', { message: error.message })
  }
}

