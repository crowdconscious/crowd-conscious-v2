import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'

// This is a one-time setup endpoint to make the first admin
// Remove this after setting up your admin account
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const { secretKey } = await request.json()

    // Simple secret key protection (change this to something secure)
    if (secretKey !== 'setup-admin-2024') {
      return NextResponse.json({ error: 'Invalid secret key' }, { status: 403 })
    }

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', (user as any).id)
      .single()

    if (existingProfile) {
      // Update existing profile to admin
      const { error } = await supabase
        .from('profiles')
        .update({ 
          user_type: 'admin'
        })
        .eq('id', (user as any).id)

      if (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }
    } else {
      // Create new admin profile
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: (user as any).id,
          email: (user as any).email,
          full_name: (user as any).user_metadata?.full_name || (user as any).email?.split('@')[0] || 'Admin',
          user_type: 'admin'
        })

      if (error) {
        console.error('Error creating profile:', error)
        return NextResponse.json({ error: 'Failed to create admin profile' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Admin account created successfully! Refresh the page to see admin controls.' 
    })

  } catch (error) {
    console.error('Setup admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
