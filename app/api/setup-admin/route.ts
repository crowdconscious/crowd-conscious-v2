import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'
import { supabase } from '@/lib/supabase'

// This is a one-time setup endpoint to make the first admin
// Remove this after setting up your admin account
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('You must be logged in', 'AUTHENTICATION_REQUIRED')
    }

    const { secretKey } = await request.json()

    // Simple secret key protection (change this to something secure)
    if (secretKey !== 'setup-admin-2024') {
      return ApiResponse.forbidden('Invalid secret key', 'INVALID_SECRET_KEY')
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
        return ApiResponse.serverError('Failed to update profile', 'PROFILE_UPDATE_ERROR', { message: error.message })
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
        return ApiResponse.serverError('Failed to create admin profile', 'PROFILE_CREATION_ERROR', { message: error.message })
      }
    }

    return ApiResponse.ok({ 
      message: 'Admin account created successfully! Refresh the page to see admin controls.' 
    })

  } catch (error: any) {
    console.error('Setup admin error:', error)
    return ApiResponse.serverError('Internal server error', 'SETUP_ADMIN_SERVER_ERROR', { message: error.message })
  }
}
