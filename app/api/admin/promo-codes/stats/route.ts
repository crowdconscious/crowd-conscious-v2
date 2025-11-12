import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'

/**
 * Get promo code usage statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Please log in to view promo code stats')
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.email === 'francisco@crowdconscious.app' || profile?.role === 'admin'

    if (!isAdmin) {
      return ApiResponse.forbidden('Admin access required', 'NOT_ADMIN')
    }

    const adminClient = createAdminClient()

    // Fetch all promo codes with their usage stats
    const { data: promoCodes, error: codesError } = await adminClient
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (codesError) {
      console.error('Error fetching promo codes:', codesError)
      return ApiResponse.serverError('Failed to fetch promo codes', 'PROMO_CODES_FETCH_ERROR', { message: codesError.message })
    }

    // Fetch usage stats grouped by promo code
    const { data: usageStats, error: usageError } = await adminClient
      .from('promo_code_uses')
      .select('promo_code_id, discount_amount, used_at, user_id')

    if (usageError) {
      console.error('Error fetching usage stats:', usageError)
      return ApiResponse.serverError('Failed to fetch usage stats', 'USAGE_STATS_FETCH_ERROR', { message: usageError.message })
    }

    // Calculate aggregated stats
    const statsByCode = (usageStats || []).reduce((acc, use) => {
      if (!acc[use.promo_code_id]) {
        acc[use.promo_code_id] = {
          totalUses: 0,
          totalDiscount: 0,
          uniqueUsers: new Set(),
          recentUses: [] as any[]
        }
      }
      acc[use.promo_code_id].totalUses++
      acc[use.promo_code_id].totalDiscount += Number(use.discount_amount || 0)
      acc[use.promo_code_id].uniqueUsers.add(use.user_id)
      acc[use.promo_code_id].recentUses.push({
        used_at: use.used_at,
        discount_amount: use.discount_amount,
        user_id: use.user_id
      })
      return acc
    }, {} as Record<string, { totalUses: number; totalDiscount: number; uniqueUsers: Set<string>; recentUses: any[] }>)

    // Format stats
    const formattedStats = Object.entries(statsByCode).map(([codeId, stats]) => ({
      promo_code_id: codeId,
      total_uses: stats.totalUses,
      total_discount: stats.totalDiscount,
      unique_users: stats.uniqueUsers.size,
      recent_uses: stats.recentUses
        .sort((a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime())
        .slice(0, 10) // Last 10 uses
    }))

    // Calculate overall stats
    const totalUses = (usageStats || []).length
    const totalDiscount = (usageStats || []).reduce((sum, use) => sum + Number(use.discount_amount || 0), 0)
    const uniqueUsers = new Set((usageStats || []).map(use => use.user_id)).size

    return ApiResponse.ok({
      promoCodes: promoCodes || [],
      usageStats: formattedStats,
      summary: {
        totalCodes: promoCodes?.length || 0,
        activeCodes: promoCodes?.filter(c => c.active).length || 0,
        totalUses,
        totalDiscount,
        uniqueUsers,
        averageDiscount: totalUses > 0 ? totalDiscount / totalUses : 0
      }
    })
  } catch (error: any) {
    console.error('Error in promo codes stats API:', error)
    return ApiResponse.serverError('Internal server error', 'PROMO_CODES_STATS_SERVER_ERROR', { message: error.message })
  }
}

