# 🎉 Celebration Integration Points

This document shows exactly where to add celebration triggers in the codebase.

---

## 1. Lesson Completion Flow

### File: `app/api/lessons/[lessonId]/complete/route.ts`

```typescript
import { awardXP } from '@/lib/xp-system'
import { checkAndUnlockAchievements } from '@/lib/achievement-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Authentication required')
    }

    // ... existing lesson completion logic ...

    // ✅ ADD XP AWARD HERE
    const xpResult = await awardXP(
      user.id,
      'lesson_completed',
      params.lessonId,
      `Completed lesson: ${lesson.title}`
    )

    // ✅ CHECK FOR ACHIEVEMENTS
    const achievements = await checkAndUnlockAchievements(
      user.id,
      'lesson_completed',
      params.lessonId
    )

    // ✅ RETURN XP AND ACHIEVEMENTS IN RESPONSE
    return ApiResponse.ok({
      ...existingResponse,
      xp: {
        gained: xpResult.xp_amount,
        total: xpResult.total_xp,
        tier_changed: xpResult.tier_changed,
        new_tier: xpResult.new_tier
      },
      achievements: achievements.map(a => ({
        type: a.type,
        name: a.name,
        description: a.description,
        icon: a.icon
      }))
    })
  } catch (error) {
    // ... error handling ...
  }
}
```

### File: `app/employee-portal/modules/[moduleId]/lessons/[lessonId]/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { CelebrationModal } from '@/components/gamification/CelebrationModal'
import { useUserTier } from '@/hooks/useUserTier'

export default function LessonPage() {
  const [celebration, setCelebration] = useState(null)
  const { refetch: refetchTier } = useUserTier()

  const handleCompleteLesson = async () => {
    const response = await fetch(`/api/lessons/${lessonId}/complete`, {
      method: 'POST'
    })

    const result = await response.json()
    
    if (result.success) {
      // ✅ TRIGGER CELEBRATION
      setCelebration({
        isOpen: true,
        type: 'lesson_completed',
        title: 'Lesson Completed! 🎉',
        message: 'Great job completing this lesson!',
        xpGained: result.data.xp.gained,
        achievements: result.data.achievements || []
      })

      // ✅ REFETCH TIER DATA
      await refetchTier()

      // ✅ CHECK FOR TIER UP
      if (result.data.xp.tier_changed) {
        setTimeout(() => {
          setCelebration({
            isOpen: true,
            type: 'tier_up',
            title: `Tier Up! ${getTierName(result.data.xp.new_tier)} 🚀`,
            message: 'You\'ve reached a new tier!',
            xpGained: 0,
            achievements: []
          })
        }, 3000)
      }
    }
  }

  return (
    <>
      {/* ... existing lesson content ... */}
      
      {/* ✅ ADD CELEBRATION MODAL */}
      {celebration && (
        <CelebrationModal
          isOpen={celebration.isOpen}
          type={celebration.type}
          title={celebration.title}
          message={celebration.message}
          xpGained={celebration.xpGained}
          achievements={celebration.achievements}
          onClose={() => setCelebration(null)}
        />
      )}
    </>
  )
}
```

---

## 2. Module Completion Flow

### File: `app/api/modules/[moduleId]/complete/route.ts`

```typescript
import { awardXP } from '@/lib/xp-system'
import { checkAndUnlockAchievements, checkCountBasedAchievements } from '@/lib/achievement-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Authentication required')
    }

    // ... existing module completion logic ...

    // ✅ AWARD XP FOR MODULE COMPLETION
    const xpResult = await awardXP(
      user.id,
      'module_completed',
      params.moduleId,
      `Completed module: ${module.title}`
    )

    // ✅ CHECK FOR ACHIEVEMENTS
    const achievements = await checkAndUnlockAchievements(
      user.id,
      'module_completed',
      params.moduleId
    )

    // ✅ CHECK COUNT-BASED ACHIEVEMENTS
    const countAchievements = await checkCountBasedAchievements(user.id)

    const allAchievements = [...achievements, ...countAchievements]

    return ApiResponse.ok({
      ...existingResponse,
      xp: {
        gained: xpResult.xp_amount,
        total: xpResult.total_xp,
        tier_changed: xpResult.tier_changed,
        new_tier: xpResult.new_tier
      },
      achievements: allAchievements
    })
  } catch (error) {
    // ... error handling ...
  }
}
```

### File: `app/employee-portal/modules/[moduleId]/page.tsx`

```typescript
'use client'

import { CelebrationModal } from '@/components/gamification/CelebrationModal'
import confetti from 'canvas-confetti'

export default function ModulePage() {
  const [celebration, setCelebration] = useState(null)

  const handleCompleteModule = async () => {
    const response = await fetch(`/api/modules/${moduleId}/complete`, {
      method: 'POST'
    })

    const result = await response.json()

    if (result.success) {
      // ✅ TRIGGER MAJOR CELEBRATION FOR MODULE COMPLETION
      setCelebration({
        isOpen: true,
        type: 'module_completed',
        title: 'Module Completed! 🎓',
        message: 'Congratulations on completing this module!',
        xpGained: result.data.xp.gained,
        achievements: result.data.achievements || []
      })

      // ✅ EXTRA CONFETTI FOR MODULE COMPLETION
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 }
      })
    }
  }

  return (
    <>
      {/* ... existing module content ... */}
      {celebration && (
        <CelebrationModal
          {...celebration}
          onClose={() => setCelebration(null)}
        />
      )}
    </>
  )
}
```

---

## 3. Sponsorship Flow

### File: `app/api/sponsorships/create/route.ts`

```typescript
import { awardXP } from '@/lib/xp-system'
import { checkAndUnlockAchievements, checkCountBasedAchievements } from '@/lib/achievement-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const body = await request.json()
    // ... existing sponsorship creation logic ...

    // After successful sponsorship creation:
    const sponsorshipId = result.data.sponsorship.id

    // ✅ AWARD XP FOR SPONSORSHIP
    const xpResult = await awardXP(
      user.id,
      'sponsor_need',
      sponsorshipId,
      `Sponsored: ${need.title}`
    )

    // ✅ CHECK FOR ACHIEVEMENTS
    const achievements = await checkAndUnlockAchievements(
      user.id,
      'sponsor_need',
      sponsorshipId
    )

    // ✅ CHECK COUNT-BASED ACHIEVEMENTS
    const countAchievements = await checkCountBasedAchievements(user.id)

    return ApiResponse.created({
      ...existingResponse,
      xp: {
        gained: xpResult.xp_amount,
        total: xpResult.total_xp,
        tier_changed: xpResult.tier_changed
      },
      achievements: [...achievements, ...countAchievements]
    })
  } catch (error) {
    // ... error handling ...
  }
}
```

### File: `app/(app)/communities/[id]/needs/[needId]/sponsor/page.tsx`

```typescript
'use client'

import { CelebrationModal } from '@/components/gamification/CelebrationModal'
import { useRouter } from 'next/navigation'

export default function SponsorPage() {
  const [celebration, setCelebration] = useState(null)
  const router = useRouter()

  const handleSponsor = async (sponsorshipData) => {
    const response = await fetch('/api/sponsorships/create', {
      method: 'POST',
      body: JSON.stringify(sponsorshipData)
    })

    const result = await response.json()

    if (result.success) {
      // ✅ TRIGGER CELEBRATION
      setCelebration({
        isOpen: true,
        type: 'sponsor',
        title: 'Thank You for Sponsoring! 💝',
        message: 'Your contribution makes a real difference!',
        xpGained: result.data.xp.gained,
        achievements: result.data.achievements || []
      })

      // Redirect after celebration closes
      setTimeout(() => {
        router.push(`/communities/${communityId}`)
      }, 4000)
    }
  }

  return (
    <>
      {/* ... sponsorship form ... */}
      {celebration && (
        <CelebrationModal
          {...celebration}
          onClose={() => {
            setCelebration(null)
            router.push(`/communities/${communityId}`)
          }}
        />
      )}
    </>
  )
}
```

---

## 4. Vote Flow

### File: `app/api/content/[contentId]/vote/route.ts`

```typescript
import { awardXP } from '@/lib/xp-system'

export async function POST(
  request: NextRequest,
  { params }: { params: { contentId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const body = await request.json()
    const { vote_type } = body // 'up' or 'down'

    // ... existing vote logic ...

    // Only award XP for upvotes
    if (vote_type === 'up') {
      // ✅ AWARD XP FOR VOTING
      const xpResult = await awardXP(
        user.id,
        'vote_content',
        params.contentId,
        'Voted on community content'
      )

      return ApiResponse.ok({
        ...existingResponse,
        xp: {
          gained: xpResult.xp_amount,
          total: xpResult.total_xp
        }
      })
    }

    return ApiResponse.ok(existingResponse)
  } catch (error) {
    // ... error handling ...
  }
}
```

### File: `components/content/VoteButton.tsx`

```typescript
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useUserTier } from '@/hooks/useUserTier'

export function VoteButton({ contentId, currentVote }) {
  const [voting, setVoting] = useState(false)
  const { refetch: refetchTier } = useUserTier()

  const handleVote = async (voteType: 'up' | 'down') => {
    setVoting(true)
    try {
      const response = await fetch(`/api/content/${contentId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ vote_type: voteType })
      })

      const result = await response.json()

      if (result.success) {
        // ✅ SHOW TOAST WITH XP GAINED (for upvotes)
        if (voteType === 'up' && result.data.xp) {
          toast.success(`+${result.data.xp.gained} XP`, {
            description: 'Thanks for voting!',
            duration: 3000
          })
          await refetchTier()
        } else {
          toast.success('Vote recorded')
        }
      }
    } finally {
      setVoting(false)
    }
  }

  return (
    <button
      onClick={() => handleVote('up')}
      disabled={voting}
      className="..."
    >
      {/* Vote button UI */}
    </button>
  )
}
```

---

## 5. Module Purchase Flow

### File: `app/api/marketplace/purchase/route.ts`

```typescript
import { awardXP } from '@/lib/xp-system'
import { checkAndUnlockAchievements } from '@/lib/achievement-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const body = await request.json()
    const { moduleId } = body

    // ... existing purchase logic ...

    // After successful purchase:
    // ✅ AWARD XP FOR PURCHASE (if this is a reward)
    // Note: Purchase itself might not award XP, but first purchase might
    const isFirstPurchase = await checkIfFirstPurchase(user.id)
    
    if (isFirstPurchase) {
      const xpResult = await awardXP(
        user.id,
        'first_purchase', // Add this to xp_rewards table
        moduleId,
        'First module purchase'
      )

      const achievements = await checkAndUnlockAchievements(
        user.id,
        'first_purchase',
        moduleId
      )

      return ApiResponse.ok({
        ...existingResponse,
        xp: {
          gained: xpResult.xp_amount,
          total: xpResult.total_xp
        },
        achievements
      })
    }

    return ApiResponse.ok(existingResponse)
  } catch (error) {
    // ... error handling ...
  }
}
```

### File: `app/(app)/marketplace/[moduleId]/page.tsx`

```typescript
'use client'

import { CelebrationModal } from '@/components/gamification/CelebrationModal'
import { toast } from 'sonner'

export default function ModulePurchasePage() {
  const [celebration, setCelebration] = useState(null)

  const handlePurchase = async () => {
    const response = await fetch('/api/marketplace/purchase', {
      method: 'POST',
      body: JSON.stringify({ moduleId })
    })

    const result = await response.json()

    if (result.success) {
      // ✅ SHOW SUCCESS TOAST
      toast.success('Module purchased!', {
        description: 'You can now access all lessons',
        action: {
          label: 'Start Learning',
          onClick: () => router.push(`/employee-portal/modules/${moduleId}`)
        }
      })

      // ✅ CELEBRATION IF FIRST PURCHASE
      if (result.data.xp) {
        setCelebration({
          isOpen: true,
          type: 'purchase',
          title: 'Welcome! 🎉',
          message: 'You\'ve purchased your first module!',
          xpGained: result.data.xp.gained,
          achievements: result.data.achievements || []
        })
      }
    }
  }

  return (
    <>
      {/* ... purchase UI ... */}
      {celebration && (
        <CelebrationModal
          {...celebration}
          onClose={() => setCelebration(null)}
        />
      )}
    </>
  )
}
```

---

## Summary

**Key Integration Points:**
1. ✅ Award XP in API routes after successful actions
2. ✅ Check achievements after XP awards
3. ✅ Return XP/achievements in API responses
4. ✅ Trigger celebrations in frontend components
5. ✅ Show toasts for smaller actions (votes)
6. ✅ Show modals for major actions (lessons, modules, sponsorships)
7. ✅ Refetch tier data after XP awards
8. ✅ Handle tier-up celebrations separately

**Files to Modify:**
- `app/api/lessons/[lessonId]/complete/route.ts`
- `app/api/modules/[moduleId]/complete/route.ts`
- `app/api/sponsorships/create/route.ts`
- `app/api/content/[contentId]/vote/route.ts`
- `app/api/marketplace/purchase/route.ts`
- Frontend pages/components for each action

