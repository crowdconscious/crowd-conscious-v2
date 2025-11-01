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

    return NextResponse.json({
      wallet,
      recentTransactions: transactions || []
    })
  } catch (error) {
    console.error('Error in GET /api/wallets/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

