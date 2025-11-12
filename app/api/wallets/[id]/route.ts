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
 * GET /api/wallets/[id]
 * Fetch wallet details including balance
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return ApiResponse.unauthorized('Please log in to view wallet')
    }

    // Fetch wallet
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

    // Fetch recent transactions (last 10)
    const { data: transactions, error: transError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (transError) {
      console.error('Error fetching transactions:', transError)
    }

    // If this is a community wallet, fetch module revenue stats
    let moduleRevenue = null
    if (wallet.owner_type === 'community' && wallet.owner_id) {
      const { data: moduleSales, error: salesError } = await (supabase as any)
        .from('module_sales')
        .select(`
          id,
          total_amount,
          community_share,
          purchased_at,
          marketplace_modules (
            id,
            title,
            slug
          )
        `)
        .eq('marketplace_modules.creator_community_id', wallet.owner_id)
        .order('purchased_at', { ascending: false })

      if (!salesError && moduleSales) {
        const totalRevenue = moduleSales.reduce((sum: number, sale: any) => 
          sum + parseFloat(sale.community_share || '0'), 0
        )
        
        // Get unique module count - marketplace_modules is an array, take first item
        const uniqueModules = new Set(
          moduleSales
            .map((sale: any) => Array.isArray(sale.marketplace_modules) ? sale.marketplace_modules[0]?.id : sale.marketplace_modules?.id)
            .filter(Boolean)
        )
        
        moduleRevenue = {
          total: totalRevenue,
          moduleCount: uniqueModules.size,
          salesCount: moduleSales.length,
          recentSales: moduleSales.slice(0, 5).map((sale: any) => {
            const module = Array.isArray(sale.marketplace_modules) 
              ? sale.marketplace_modules[0] 
              : sale.marketplace_modules
            return {
              id: sale.id,
              amount: parseFloat(sale.community_share || '0'),
              module: module,
              date: sale.purchased_at
            }
          })
        }
      }
    }

    return ApiResponse.ok({
      ...wallet,
      balance: parseFloat(wallet.balance || '0'),
      recentTransactions: (transactions || []).map(t => ({
        ...t,
        amount: parseFloat(t.amount || '0'),
        balance_before: parseFloat(t.balance_before || '0'),
        balance_after: parseFloat(t.balance_after || '0')
      })),
      moduleRevenue
    })
  } catch (error: any) {
    console.error('Error in GET /api/wallets/[id]:', error)
    return ApiResponse.serverError('Internal server error', 'WALLET_FETCH_SERVER_ERROR', { message: error.message })
  }
}

