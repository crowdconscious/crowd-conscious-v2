'use client'

import { useState, useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'

interface SettingsClientProps {
  user: any
  userSettings: any
  profile: any
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' }
]

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' }
]

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'MXN', label: 'Mexican Peso ($)', symbol: '$' }
]

export default function SettingsClient({ user, userSettings, profile }: SettingsClientProps) {
  const [settings, setSettings] = useState(userSettings)
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    location: profile?.location || ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Apply theme immediately when changed
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    // Store theme preference
    localStorage.setItem('theme', settings.theme)
  }, [settings.theme])

  const handleSettingsChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value })
    setHasChanges(true)
  }

  const handleProfileChange = (key: string, value: string) => {
    setProfileData({ ...profileData, [key]: value })
    setHasChanges(true)
  }

  const saveSettings = async () => {
    setIsLoading(true)
    try {
      // Update user settings
      const { error: settingsError } = await supabaseClient
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        })

      if (settingsError) throw settingsError

      // Update profile
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)

      if (profileError) throw profileError

      setHasChanges(false)
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Settings Header */}
      <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white rounded-xl p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Settings</h1>
        <p className="text-slate-300">
          Manage your account preferences and app settings
        </p>
        
        {hasChanges && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-amber-300 text-sm">You have unsaved changes</span>
            <AnimatedButton
              onClick={saveSettings}
              loading={isLoading}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              Save Changes
            </AnimatedButton>
          </div>
        )}
      </div>

      {/* Profile Settings */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Profile Information</h2>
        
        <AnimatedCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => handleProfileChange('full_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={profileData.location}
                onChange={(e) => handleProfileChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="City, Country"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bio
              </label>
              <textarea
                value={profileData.bio}
                onChange={(e) => handleProfileChange('bio', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Tell people about yourself..."
              />
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* App Preferences */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">App Preferences</h2>
        
        <div className="grid gap-6">
          {/* Theme */}
          <AnimatedCard className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">🎨</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Theme</h3>
                  <p className="text-slate-600 text-sm">Choose your preferred appearance</p>
                </div>
              </div>
              <select
                value={settings.theme}
                onChange={(e) => handleSettingsChange('theme', e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                {THEME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </AnimatedCard>

          {/* Language */}
          <AnimatedCard className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">🌍</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Language</h3>
                  <p className="text-slate-600 text-sm">Choose your preferred language</p>
                </div>
              </div>
              <select
                value={settings.language}
                onChange={(e) => handleSettingsChange('language', e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.flag} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </AnimatedCard>

          {/* Currency */}
          <AnimatedCard className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">💰</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Currency</h3>
                  <p className="text-slate-600 text-sm">Choose your preferred currency</p>
                </div>
              </div>
              <select
                value={settings.currency}
                onChange={(e) => handleSettingsChange('currency', e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.symbol} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </AnimatedCard>
        </div>
      </div>

      {/* Notifications */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Notifications</h2>
        
        <div className="grid gap-4">
          <AnimatedCard className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">📧</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Email Notifications</h3>
                  <p className="text-slate-600 text-sm">Receive updates about your communities</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email_notifications}
                  onChange={(e) => handleSettingsChange('email_notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">🔔</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Push Notifications</h3>
                  <p className="text-slate-600 text-sm">Get notified about important updates</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.push_notifications}
                  onChange={(e) => handleSettingsChange('push_notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">📬</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Marketing Emails</h3>
                  <p className="text-slate-600 text-sm">Receive updates about new features and tips</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.marketing_emails}
                  onChange={(e) => handleSettingsChange('marketing_emails', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          </AnimatedCard>
        </div>
      </div>

      {/* Privacy */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Privacy</h2>
        
        <AnimatedCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-xl">🔒</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Profile Visibility</h3>
                <p className="text-slate-600 text-sm">Control who can see your profile</p>
              </div>
            </div>
            <select
              value={settings.privacy_level}
              onChange={(e) => handleSettingsChange('privacy_level', e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="public">🌍 Public</option>
              <option value="private">🔐 Private</option>
            </select>
          </div>
        </AnimatedCard>
      </div>

      {/* Support */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Support</h2>
        
        <div className="grid gap-4">
          <AnimatedCard className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">❓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Help Center</h3>
                  <p className="text-slate-600 text-sm">Find answers to common questions</p>
                </div>
              </div>
              <AnimatedButton variant="ghost" size="sm">
                Visit →
              </AnimatedButton>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">💬</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Contact Support</h3>
                  <p className="text-slate-600 text-sm">Get help from our support team</p>
                </div>
              </div>
              <AnimatedButton variant="ghost" size="sm">
                Contact →
              </AnimatedButton>
            </div>
          </AnimatedCard>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-teal-900">Unsaved Changes</h3>
              <p className="text-teal-700 text-sm">You have unsaved changes to your settings</p>
            </div>
            <AnimatedButton
              onClick={saveSettings}
              loading={isLoading}
            >
              Save All Changes
            </AnimatedButton>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div>
        <h2 className="text-2xl font-bold text-red-600 mb-6">Account Actions</h2>
        
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-red-900">Sign Out</h3>
              <p className="text-red-700 text-sm">Sign out of your account on this device</p>
            </div>
            <form action="/auth/signout" method="post">
              <AnimatedButton
                type="submit"
                variant="secondary"
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
              >
                Sign Out
              </AnimatedButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
