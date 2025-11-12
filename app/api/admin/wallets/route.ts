import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/wallets
 * 
 * Returns comprehensive wallet data for super admin dashboard:
 * - Platform treasury balance
 * - All community wallets
 * - All creator wallets
 * - Recent transactions
 * - Revenue analytics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return ApiResponse.unauthorized('Please log in to view wallet data')
    }
    
    // Get user profile to verify admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.user_type !== 'admin') {
      return ApiResponse.forbidden('Admin access required', 'NOT_ADMIN')
    }
    
    // Fetch platform treasury wallet
    const { data: platformWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_type', 'platform')
      .is('owner_id', null)
      .single()
    
    // Fetch all community wallets with community names
    const { data: communityWallets } = await supabase
      .from('wallets')
      .select(`
        *,
        communities:owner_id (
          id,
          name,
          slug,
          member_count
        )
      `)
      .eq('owner_type', 'community')
      .order('balance', { ascending: false })
    
    // Fetch all creator wallets with user names
    const { data: creatorWallets } = await supabase
      .from('wallets')
      .select(`
        *,
        profiles:owner_id (
          id,
          full_name,
          email
        )
      `)
      .eq('owner_type', 'user')
      .order('balance', { ascending: false })
    
    // Fetch recent transactions (last 50)
    const { data: recentTransactions } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        wallets (
          owner_type,
          communities:owner_id (name),
          profiles:owner_id (full_name, email)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)
    
    // Fetch module sales for revenue analytics
    const { data: moduleSales } = await supabase
      .from('module_sales')
      .select(`
        *,
        marketplace_modules (title, slug)
      `)
      .order('purchased_at', { ascending: false })
      .limit(20)
    
    // Calculate totals
    const totalPlatformBalance = platformWallet?.balance || 0
    const totalCommunityBalance = communityWallets?.reduce((sum, w) => sum + parseFloat(w.balance || '0'), 0) || 0
    const totalCreatorBalance = creatorWallets?.reduce((sum, w) => sum + parseFloat(w.balance || '0'), 0) || 0
    const totalRevenue = totalPlatformBalance + totalCommunityBalance + totalCreatorBalance
    
    // Get transaction stats
    const totalTransactions = await supabase
      .from('wallet_transactions')
      .select('id', { count: 'exact', head: true })
    
    // Get sales stats
    const totalSales = await supabase
      .from('module_sales')
      .select('id', { count: 'exact', head: true })
    
    const totalSalesAmount = moduleSales?.reduce((sum, sale) => 
      sum + parseFloat(sale.total_amount || '0'), 0
    ) || 0
    
    return ApiResponse.ok({
      platformWallet: {
        ...platformWallet,
        balance: parseFloat(platformWallet?.balance || '0')
      },
      communityWallets: communityWallets?.map(w => ({
        ...w,
        balance: parseFloat(w.balance || '0'),
        community: Array.isArray(w.communities) ? w.communities[0] : w.communities
      })) || [],
      creatorWallets: creatorWallets?.map(w => ({
        ...w,
        balance: parseFloat(w.balance || '0'),
        user: Array.isArray(w.profiles) ? w.profiles[0] : w.profiles
      })) || [],
      recentTransactions: recentTransactions?.map(t => ({
        ...t,
        amount: parseFloat(t.amount || '0'),
        balance_before: parseFloat(t.balance_before || '0'),
        balance_after: parseFloat(t.balance_after || '0')
      })) || [],
      moduleSales: moduleSales?.map(s => ({
        ...s,
        total_amount: parseFloat(s.total_amount || '0'),
        platform_fee: parseFloat(s.platform_fee || '0'),
        community_share: parseFloat(s.community_share || '0'),
        creator_share: parseFloat(s.creator_share || '0')
      })) || [],
      stats: {
        totalRevenue,
        totalPlatformBalance,
        totalCommunityBalance,
        totalCreatorBalance,
        totalTransactions: totalTransactions.count || 0,
        totalSales: totalSales.count || 0,
        totalSalesAmount,
        averageSaleAmount: totalSales.count ? totalSalesAmount / totalSales.count : 0
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching wallet data:', error)
    return ApiResponse.serverError('Failed to fetch wallet data', 'WALLETS_FETCH_ERROR', { message: error.message })
  }
}

