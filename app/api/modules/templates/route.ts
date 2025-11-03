import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Fetch template modules
    // For now, we'll return the template from our JSON file
    // In the future, we can store templates in the database with a special flag
    
    const { data: templates, error } = await supabase
      .from('marketplace_modules')
      .select(`
        id,
        title,
        description,
        core_value,
        difficulty_level,
        estimated_duration_hours,
        lesson_count,
        xp_reward,
        thumbnail_url,
        industry_tags
      `)
      .eq('base_price_mxn', 0) // Templates are free
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error('Error in GET /api/modules/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

