import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * GET /api/wallets/[id]
 * Fetch wallet details including balance
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
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

    return NextResponse.json({
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
  } catch (error) {
    console.error('Error in GET /api/wallets/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

