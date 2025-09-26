import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, suspended')
      .eq('id', user.id)
      .single()

    if (!profile || profile.user_type !== 'admin' || profile.suspended) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { settingKey, value } = await request.json()

    if (!settingKey || value === undefined) {
      return NextResponse.json({ error: 'Setting key and value are required' }, { status: 400 })
    }

    // Validate setting key
    const validSettings = [
      'platform_fee_percentage',
      'auto_approve_communities', 
      'min_sponsorship_amount',
      'max_sponsorship_amount'
    ]

    if (!validSettings.includes(settingKey)) {
      return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 })
    }

    // Validate values based on setting type
    if (settingKey === 'platform_fee_percentage') {
      const feePercent = parseFloat(value)
      if (isNaN(feePercent) || feePercent < 0 || feePercent > 100) {
        return NextResponse.json({ error: 'Platform fee must be between 0 and 100' }, { status: 400 })
      }
    }

    if (settingKey.includes('amount')) {
      const amount = parseFloat(value)
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
      }
    }

    if (settingKey === 'auto_approve_communities') {
      if (!['true', 'false'].includes(value.toLowerCase())) {
        return NextResponse.json({ error: 'Auto approve must be true or false' }, { status: 400 })
      }
    }

    // Try to update existing setting
    const { data: existingSetting } = await supabase
      .from('platform_settings')
      .select('id')
      .eq('setting_key', settingKey)
      .single()

    if (existingSetting) {
      // Update existing setting
      const { error: updateError } = await supabase
        .from('platform_settings')
        .update({
          setting_value: value,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', settingKey)

      if (updateError) {
        console.error('Error updating setting:', updateError)
        return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
      }
    } else {
      // Create new setting if it doesn't exist
      const { error: insertError } = await supabase
        .from('platform_settings')
        .insert({
          setting_key: settingKey,
          setting_value: value,
          description: getSettingDescription(settingKey),
          updated_by: user.id
        })

      if (insertError) {
        console.error('Error creating setting:', insertError)
        return NextResponse.json({ error: 'Failed to create setting' }, { status: 500 })
      }
    }

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: user.id,
        action_type: 'update_platform_settings',
        target_type: 'setting',
        target_id: settingKey,
        details: { setting_key: settingKey, old_value: existingSetting?.setting_value, new_value: value }
      })
      .catch(err => console.log('Admin action logging failed:', err)) // Don't fail if logging fails

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Setting update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getSettingDescription(settingKey: string): string {
  const descriptions: { [key: string]: string } = {
    'platform_fee_percentage': 'Platform fee percentage for sponsorships',
    'auto_approve_communities': 'Whether to auto-approve new communities',
    'min_sponsorship_amount': 'Minimum sponsorship amount in USD',
    'max_sponsorship_amount': 'Maximum sponsorship amount in USD'
  }
  return descriptions[settingKey] || 'Platform setting'
}
