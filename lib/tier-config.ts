// Tier Configuration System
export interface TierConfig {
  id: number
  name: string
  xpRequired: number
  icon: string
  colors: {
    primary: string
    secondary: string
    gradient: string
  }
  perks: string[]
  animated: boolean
}

export const tierConfigs: Record<number, TierConfig> = {
  1: {
    id: 1,
    name: 'Explorer',
    xpRequired: 0,
    icon: '🌱',
    colors: {
      primary: '#6B7280',
      secondary: '#9CA3AF',
      gradient: 'from-gray-500 to-gray-400'
    },
    perks: [
      'Basic dashboard access',
      'Standard features',
      'Community access'
    ],
    animated: false
  },
  2: {
    id: 2,
    name: 'Contributor',
    xpRequired: 501,
    icon: '🌊',
    colors: {
      primary: '#0EA5E9',
      secondary: '#06B6D4',
      gradient: 'from-cyan-500 to-blue-500'
    },
    perks: [
      'Enhanced dashboard',
      'Priority support',
      'Early access to new modules',
      'Blue theme unlock'
    ],
    animated: false
  },
  3: {
    id: 3,
    name: 'Changemaker',
    xpRequired: 1501,
    icon: '💜',
    colors: {
      primary: '#A855F7',
      secondary: '#EC4899',
      gradient: 'from-purple-500 to-pink-500'
    },
    perks: [
      'Custom purple/pink theme',
      'Badge display',
      'Exclusive content access',
      'Community recognition'
    ],
    animated: false
  },
  4: {
    id: 4,
    name: 'Impact Leader',
    xpRequired: 3501,
    icon: '⭐',
    colors: {
      primary: '#F59E0B',
      secondary: '#EF4444',
      gradient: 'from-amber-500 to-orange-500'
    },
    perks: [
      'Gold/orange theme',
      'Leaderboard access',
      'Exclusive events',
      'Special recognition'
    ],
    animated: false
  },
  5: {
    id: 5,
    name: 'Legend',
    xpRequired: 7501,
    icon: '👑',
    colors: {
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      gradient: 'from-red-400 via-purple-500 to-cyan-400'
    },
    perks: [
      'Animated rainbow theme',
      'All premium features',
      'Legendary status',
      'Special profile badge',
      'Exclusive community access'
    ],
    animated: true
  }
}

export function getTierByXP(xp: number): TierConfig {
  if (xp >= 7501) return tierConfigs[5]
  if (xp >= 3501) return tierConfigs[4]
  if (xp >= 1501) return tierConfigs[3]
  if (xp >= 501) return tierConfigs[2]
  return tierConfigs[1]
}

export function getNextTier(xp: number): TierConfig | null {
  const currentTier = getTierByXP(xp)
  if (currentTier.id === 5) return null
  return tierConfigs[currentTier.id + 1]
}

export function calculateProgressToNextTier(xp: number): {
  progress: number
  xpNeeded: number
  xpInCurrentTier: number
} {
  const currentTier = getTierByXP(xp)
  const nextTier = getNextTier(xp)
  
  if (!nextTier) {
    return { progress: 100, xpNeeded: 0, xpInCurrentTier: 0 }
  }

  const xpInCurrentTier = xp - currentTier.xpRequired
  const xpNeededForNext = nextTier.xpRequired - currentTier.xpRequired
  const progress = (xpInCurrentTier / xpNeededForNext) * 100

  return {
    progress: Math.min(100, Math.max(0, progress)),
    xpNeeded: nextTier.xpRequired - xp,
    xpInCurrentTier
  }
}

