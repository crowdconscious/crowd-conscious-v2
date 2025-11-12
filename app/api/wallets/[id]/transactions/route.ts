import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

/**
 * Helper function to check if user has access to a community wallet
 */
async function checkCommunityAccess(supabase: any, userId: string, communityId: string): Promise<boolean> {
  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single()
  
  return membership && (membership.role === 'admin' || membership.role === 'founder')
}

/**
 * GET /api/wallets/[id]/transactions
 * Fetch paginated transaction history for a wallet
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return ApiResponse.unauthorized('Please log in to view transactions')
    }

    // Verify wallet access
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', id)
      .single()

    if (walletError || !wallet) {
      return ApiResponse.notFound('Wallet', 'WALLET_NOT_FOUND')
    }

    // Verify user owns this wallet
    const ownsWallet = 
      (wallet.owner_type === 'user' && wallet.owner_id === user.id) ||
      (wallet.owner_type === 'community' && await checkCommunityAccess(supabase, user.id, wallet.owner_id))

    if (!ownsWallet) {
      return ApiResponse.forbidden('You do not have access to this wallet', 'WALLET_ACCESS_DENIED')
    }

    // Fetch transactions with pagination
    const { data: transactions, error: transError, count } = await supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (transError) {
      console.error('Error fetching transactions:', transError)
      return ApiResponse.serverError('Failed to fetch transactions', 'TRANSACTIONS_FETCH_ERROR', { message: transError.message })
    }

    return ApiResponse.ok({
      transactions,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/wallets/[id]/transactions:', error)
    return ApiResponse.serverError('Internal server error', 'TRANSACTIONS_FETCH_SERVER_ERROR', { message: error.message })
  }
}

