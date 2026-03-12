'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatedButton } from '@/components/ui/UIComponents'
import { ChevronRight } from 'lucide-react'
import { getTierByXP } from '@/lib/tier-config'

interface ProfileClientProps {
  user: any
  profile: any
  predictionStats: {
    predictions: number
    accuracy: number
    totalXp: number
    rank: number | null
  }
  recentPredictions: Array<{
    id: string
    market_id: string
    market_title: string
    market_status: string
    outcome_label: string
    confidence: number
    xp_earned: number
    is_correct: boolean | null
    created_at: string
  }>
  topAchievements?: Array<{
    id: string
    achievement_type: string
    achievement_name: string
    achievement_description: string | null
    icon_url: string | null
    unlocked_at: string
  }>
  impactVotes?: Array<{ cause_id: string; cause_name: string }>
}

export default function ProfileClient({
  user,
  profile,
  predictionStats,
  recentPredictions,
  topAchievements = [],
  impactVotes = [],
}: ProfileClientProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editData, setEditData] = useState({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    website: profile?.website || '',
    twitter: profile?.twitter || '',
    linkedin: profile?.linkedin || '',
    instagram: profile?.instagram || '',
    is_public: profile?.is_public ?? true,
  })

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      console.log('Updating profile for user:', (user as any).id, editData)
      setIsEditing(false)
      window.location.reload()
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const tier = getTierByXP(predictionStats.totalXp)

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || 'Profile'}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {profile?.full_name || 'Predictor'}
                </h1>
                <p className="text-slate-400 mb-2">{user.email}</p>
                <div className="mt-3">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r ${tier.colors.gradient} text-white text-sm font-medium shadow-sm`}
                    style={{ animation: 'none' }}
                  >
                    <span className="text-lg">{tier.icon}</span>
                    <div>
                      <div className="font-bold text-xs leading-tight">{tier.name}</div>
                      <div className="text-xs opacity-90 leading-tight">
                        {predictionStats.totalXp.toLocaleString()} XP
                      </div>
                    </div>
                  </div>
                </div>
                {profile?.bio && (
                  <p className="text-slate-400 mt-3 max-w-2xl">{profile.bio}</p>
                )}
                {profile?.location && (
                  <p className="text-slate-500 text-sm mt-2">📍 {profile.location}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
                <Link
                  href="/settings"
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 inline-flex items-center gap-1.5"
                >
                  ⚙️ Settings
                </Link>
              </div>
            </div>

            {/* Social Links */}
            {(profile?.website ||
              profile?.twitter ||
              profile?.linkedin ||
              profile?.instagram) && (
              <div className="flex items-center gap-4 mb-4">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    🌐 Website
                  </a>
                )}
                {profile.twitter && (
                  <a
                    href={`https://twitter.com/${profile.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    🐦 Twitter
                  </a>
                )}
                {profile.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    💼 LinkedIn
                  </a>
                )}
                {profile.instagram && (
                  <a
                    href={`https://instagram.com/${profile.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    📸 Instagram
                  </a>
                )}
              </div>
            )}

            {/* Prediction Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mt-6 w-full max-w-full min-w-0">
              <div className="bg-slate-800/80 rounded-lg p-3 sm:p-4 text-center border border-slate-700 min-w-0 overflow-hidden">
                <div className="text-2xl font-bold text-white">
                  {predictionStats.predictions}
                </div>
                <div className="text-sm text-slate-400">Predictions</div>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-3 sm:p-4 text-center border border-slate-700 min-w-0">
                <div className="text-2xl font-bold text-white">
                  {predictionStats.accuracy}%
                </div>
                <div className="text-sm text-slate-400">Accuracy</div>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-3 sm:p-4 text-center border border-slate-700 min-w-0">
                <div className="text-2xl font-bold text-emerald-400">
                  {predictionStats.totalXp}
                </div>
                <div className="text-sm text-slate-400">Total XP</div>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-3 sm:p-4 text-center border border-slate-700 min-w-0">
                <div className="text-2xl font-bold text-white">
                  {predictionStats.rank ?? '—'}
                </div>
                <div className="text-sm text-slate-400">Rank</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      {isEditing && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Edit Profile</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={editData.full_name}
                onChange={(e) =>
                  setEditData({ ...editData, full_name: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Location
              </label>
              <input
                type="text"
                value={editData.location}
                onChange={(e) =>
                  setEditData({ ...editData, location: e.target.value })
                }
                placeholder="City, Country"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Bio
              </label>
              <textarea
                value={editData.bio}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                placeholder="Tell people about yourself..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Website
              </label>
              <input
                type="url"
                value={editData.website}
                onChange={(e) =>
                  setEditData({ ...editData, website: e.target.value })
                }
                placeholder="https://your-website.com"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Twitter Username
              </label>
              <input
                type="text"
                value={editData.twitter}
                onChange={(e) =>
                  setEditData({ ...editData, twitter: e.target.value })
                }
                placeholder="username"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={editData.linkedin}
                onChange={(e) =>
                  setEditData({ ...editData, linkedin: e.target.value })
                }
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Instagram Username
              </label>
              <input
                type="text"
                value={editData.instagram}
                onChange={(e) =>
                  setEditData({ ...editData, instagram: e.target.value })
                }
                placeholder="username"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editData.is_public}
                  onChange={(e) =>
                    setEditData({ ...editData, is_public: e.target.checked })
                  }
                  className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-400">
                  Make my profile public
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <AnimatedButton
              onClick={() => setIsEditing(false)}
              variant="ghost"
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton onClick={handleSaveProfile} loading={isLoading}>
              Save Changes
            </AnimatedButton>
          </div>
        </div>
      )}

      {/* Achievements */}
      {topAchievements.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Impact Achievements</h2>
          <p className="text-slate-400 text-sm mb-6">Milestones from predictions, fund votes, and contributions</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {topAchievements.map((a) => (
              <div
                key={a.id}
                className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3 hover:border-slate-600 transition-colors"
              >
                <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-emerald-500/20">
                  {a.icon_url && typeof a.icon_url === 'string' && !a.icon_url.startsWith('http') ? (
                    <span>{a.icon_url}</span>
                  ) : a.icon_url ? (
                    <img src={a.icon_url} alt="" className="w-8 h-8 object-contain" />
                  ) : (
                    '🏆'
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white truncate">{a.achievement_name}</p>
                  {a.achievement_description && (
                    <p className="text-slate-400 text-xs truncate">{a.achievement_description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/achievements"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium"
          >
            View all achievements
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Impact */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Your Impact</h2>
        <p className="text-slate-400 text-sm mb-6">Contributions to collective intelligence and the Conscious Fund</p>
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
          <p className="text-slate-300">
            Your predictions have contributed{' '}
            <span className="font-bold text-emerald-400">{predictionStats.totalXp} XP</span> to
            collective intelligence.
          </p>
          {impactVotes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Your Conscious Fund votes this month:</p>
              <ul className="space-y-1">
                {impactVotes.map((v) => (
                  <li key={v.cause_id} className="text-emerald-400 text-sm flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    {v.cause_name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Recent Predictions */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">My Predictions</h2>

        {recentPredictions.length > 0 ? (
          <div className="space-y-3">
            {recentPredictions.map((pred) => (
              <Link
                key={pred.id}
                href={`/predictions/markets/${pred.market_id}`}
                className="block bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">
                      {pred.market_title}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {pred.outcome_label} • Confidence {pred.confidence}/10
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-emerald-400 font-medium">
                      +{pred.xp_earned} XP
                    </span>
                    {pred.market_status === 'resolved' && pred.is_correct !== null && (
                      <span
                        className={
                          pred.is_correct
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }
                      >
                        {pred.is_correct ? '✓' : '✗'}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
              </Link>
            ))}
            <div className="pt-4">
              <Link
                href="/predictions/trades"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium"
              >
                See all predictions
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <p className="text-slate-400 mb-4">
              You haven&apos;t made any predictions yet.
            </p>
            <Link
              href="/predictions/markets"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors"
            >
              Browse Markets
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
