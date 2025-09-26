import { getCurrentUser } from '../../../lib/auth-server'
import { AnimatedCard } from '@/components/ui/UIComponents'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    return <div>Please log in to view settings.</div>
  }

  return (
    <div className="space-y-8">
      {/* Settings Header */}
      <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white rounded-xl p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Settings</h1>
        <p className="text-slate-300">
          Manage your account preferences and app settings
        </p>
      </div>

      {/* Account Settings */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Account</h2>
        
        <div className="grid gap-6">
          <AnimatedCard hover>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">👤</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Profile Information</h3>
                    <p className="text-slate-600 text-sm">Update your name and personal details</p>
                  </div>
                </div>
                <button className="text-teal-600 hover:text-teal-700 font-medium">
                  Edit →
                </button>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Name:</span>
                  <span className="text-slate-900">{user.full_name || 'Not set'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-900">{user.email}</span>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard hover>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">🔔</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Notifications</h3>
                    <p className="text-slate-600 text-sm">Manage your notification preferences</p>
                  </div>
                </div>
                <button className="text-teal-600 hover:text-teal-700 font-medium">
                  Configure →
                </button>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard hover>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">🔒</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Privacy & Security</h3>
                    <p className="text-slate-600 text-sm">Control your privacy settings and security</p>
                  </div>
                </div>
                <button className="text-teal-600 hover:text-teal-700 font-medium">
                  Manage →
                </button>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </div>

      {/* App Settings */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Preferences</h2>
        
        <div className="grid gap-6">
          <AnimatedCard hover>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">🎨</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Appearance</h3>
                    <p className="text-slate-600 text-sm">Choose between light and dark themes</p>
                  </div>
                </div>
                <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard hover>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">🌍</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Language & Region</h3>
                    <p className="text-slate-600 text-sm">Set your language and regional preferences</p>
                  </div>
                </div>
                <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard hover>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">📱</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Mobile App</h3>
                    <p className="text-slate-600 text-sm">Download our mobile app for better experience</p>
                  </div>
                </div>
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Download
                </button>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </div>

      {/* Support & Help */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Support</h2>
        
        <div className="grid gap-6">
          <AnimatedCard hover>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">❓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Help Center</h3>
                    <p className="text-slate-600 text-sm">Find answers to common questions</p>
                  </div>
                </div>
                <button className="text-teal-600 hover:text-teal-700 font-medium">
                  Visit →
                </button>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard hover>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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
                <button className="text-teal-600 hover:text-teal-700 font-medium">
                  Contact →
                </button>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard hover>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">🔄</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">App Version</h3>
                    <p className="text-slate-600 text-sm">Version 1.0.0 - Up to date</p>
                  </div>
                </div>
                <span className="text-green-600 font-medium text-sm">✓ Latest</span>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </div>

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
              <button 
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
