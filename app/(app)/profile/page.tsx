import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/seo/site'
import ProfileClient from './ProfileClient'

export const metadata: Metadata = {
  title: { absolute: 'Tu Perfil | Crowd Conscious' },
  alternates: {
    canonical: `${SITE_URL}/profile`,
  },
}

async function getProfile(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

async function getPredictionStats(userId: string) {
  const supabase = await createClient()

  const { data: votes, error: votesError } = await supabase
    .from('market_votes')
    .select('id, is_correct, xp_earned, bonus_xp')
    .eq('user_id', userId)
    .eq('is_anonymous', false)

  if (votesError) {
    return { predictions: 0, accuracy: 0, totalXp: 0, rank: null }
  }

  const predictions = votes?.length ?? 0
  const resolved = votes?.filter((v) => v.is_correct !== null) ?? []
  const correct = resolved.filter((v) => v.is_correct === true).length
  const accuracy = resolved.length > 0 ? Math.round((correct / resolved.length) * 100) : 0
  const totalXp =
    votes?.reduce((sum, v) => sum + (v.xp_earned ?? 0) + (v.bonus_xp ?? 0), 0) ?? 0

  const { data: xpRow } = await supabase
    .from('user_xp')
    .select('total_xp')
    .eq('user_id', userId)
    .single()

  const userTotalXp = xpRow?.total_xp ?? totalXp

  const { count: rankCount } = await supabase
    .from('user_xp')
    .select('*', { count: 'exact', head: true })
    .gt('total_xp', userTotalXp)

  const rank = rankCount !== null ? rankCount + 1 : null

  return {
    predictions,
    accuracy,
    totalXp: xpRow?.total_xp ?? totalXp,
    rank,
  }
}

async function getTopAchievements(userId: string, limit = 3) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_achievements')
    .select('id, achievement_type, achievement_name, achievement_description, icon_url, unlocked_at')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

async function getFundVotes(userId: string) {
  const supabase = await createClient()
  const cycle = new Date().toISOString().slice(0, 7)
  const { data } = await supabase
    .from('fund_votes')
    .select('cause_id')
    .eq('user_id', userId)
    .eq('cycle', cycle)
  return data ?? []
}

async function getCauseName(causeId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('fund_causes')
    .select('name')
    .eq('id', causeId)
    .single()
  return data?.name ?? 'Cause'
}

async function getRecentPredictions(userId: string, limit = 10) {
  const supabase = await createClient()

  const { data: votes, error } = await supabase
    .from('market_votes')
    .select('id, market_id, outcome_id, confidence, xp_earned, bonus_xp, is_correct, created_at')
    .eq('user_id', userId)
    .eq('is_anonymous', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !votes?.length) return []

  const outcomeIds = [...new Set(votes.map((v) => v.outcome_id))]
  const marketIds = [...new Set(votes.map((v) => v.market_id))]

  const [outcomesRes, marketsRes] = await Promise.all([
    supabase.from('market_outcomes').select('id, label').in('id', outcomeIds),
    supabase.from('prediction_markets').select('id, title, status').in('id', marketIds),
  ])

  const outcomesMap = new Map((outcomesRes.data || []).map((o) => [o.id, o.label]))
  const marketsMap = new Map(
    (marketsRes.data || []).map((m) => [m.id, { title: m.title, status: m.status }])
  )

  return votes.map((v) => ({
    id: v.id,
    market_id: v.market_id,
    market_title: marketsMap.get(v.market_id)?.title ?? 'Market',
    market_status: marketsMap.get(v.market_id)?.status ?? 'active',
    outcome_label: outcomesMap.get(v.outcome_id) ?? 'Unknown',
    confidence: v.confidence,
    xp_earned: (v.xp_earned ?? 0) + (v.bonus_xp ?? 0),
    is_correct: v.is_correct,
    created_at: v.created_at,
  }))
}

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const userId = (user as { id: string }).id

  const [profile, predictionStats, recentPredictions, topAchievements, fundVotes] =
    await Promise.all([
      getProfile(userId),
      getPredictionStats(userId),
      getRecentPredictions(userId),
      getTopAchievements(userId),
      getFundVotes(userId),
    ])

  const causeNames = await Promise.all(
    fundVotes.map((v) => getCauseName(v.cause_id))
  )
  const impactVotes = fundVotes.map((v, i) => ({
    cause_id: v.cause_id,
    cause_name: causeNames[i],
  }))

  return (
    <ProfileClient
      user={user}
      profile={profile}
      predictionStats={predictionStats}
      recentPredictions={recentPredictions}
      topAchievements={topAchievements}
      impactVotes={impactVotes}
    />
  )
}
