# Automate All Email Triggers

## Current Status

### ✅ Working
1. **Signup Welcome Email** - Sends immediately after signup
2. **Event RSVP Confirmation** - Sends when user registers for event

### ❌ Not Implemented
1. **Monthly Impact Reports** - Not automated
2. **Challenge Reminders** - Not automated  
3. **Sponsorship Approval** - Email exists but not connected
4. **Community Updates** - Not automated

## Solution: Use Vercel Cron Jobs

Vercel allows us to create API routes that run on a schedule using cron syntax.

### 1. Monthly Impact Reports (Every 1st of month at 9 AM)

**Create**: `app/api/cron/monthly-impact/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'
import { sendEmail, emailTemplates } from '@/lib/resend'

export const runtime = 'edge' // or 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerAuth()
  
  // Get all users
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name')
  
  if (!users) {
    return NextResponse.json({ error: 'No users found' }, { status: 404 })
  }

  const results = []

  // Send email to each user with their personalized stats
  for (const user of users) {
    try {
      // Get user stats from last month
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Get user's communities
      const { data: communities } = await supabase
        .from('community_members')
        .select('communities(*)')
        .eq('user_id', user.id)

      // Get user's XP transactions from last month
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      
      const { data: xpTransactions } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', lastMonth.toISOString())

      // Calculate total XP earned last month
      const monthlyXP = xpTransactions?.reduce((sum, t) => sum + t.xp_amount, 0) || 0

      // Get new achievements
      const { data: achievements } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id)
        .gte('earned_at', lastMonth.toISOString())

      const monthlyImpactEmail = emailTemplates.monthlyImpactReport(
        user.full_name || 'Community Member',
        {
          level: userStats?.level || 1,
          current_xp: userStats?.current_xp || 0,
          total_xp: userStats?.total_xp || 0,
          streak: userStats?.current_streak || 0,
          next_level_xp: ((userStats?.level || 1) + 1) * 1000
        },
        {
          communities_joined: communities?.length || 0,
          content_created: xpTransactions?.filter(t => t.action_type === 'content_create').length || 0,
          votes_cast: xpTransactions?.filter(t => t.action_type === 'vote').length || 0,
          events_attended: xpTransactions?.filter(t => t.action_type === 'event_attend').length || 0,
          comments_made: xpTransactions?.filter(t => t.action_type === 'comment').length || 0
        },
        achievements?.length || 0,
        {
          co2_reduced: Math.round((monthlyXP / 10) * 100) / 100,
          waste_diverted: Math.round((monthlyXP / 15) * 100) / 100,
          trees_planted: Math.floor(monthlyXP / 100)
        }
      )

      await sendEmail(user.email, monthlyImpactEmail)
      results.push({ user: user.email, status: 'sent' })
    } catch (error) {
      console.error(`Failed to send to ${user.email}:`, error)
      results.push({ user: user.email, status: 'failed', error: error.message })
    }
  }

  return NextResponse.json({ 
    success: true, 
    sent: results.filter(r => r.status === 'sent').length,
    failed: results.filter(r => r.status === 'failed').length,
    results 
  })
}
```

### 2. Challenge Reminders (Every day at 8 AM)

**Create**: `app/api/cron/challenge-reminders/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'
import { sendEmail } from '@/lib/resend'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerAuth()
  
  // Get active challenges ending in next 7 days
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  
  const { data: challenges } = await supabase
    .from('community_content')
    .select(`
      *,
      communities(name),
      community_members!inner(user_id, profiles(email, full_name))
    `)
    .eq('type', 'challenge')
    .lte('data->>end_date', nextWeek.toISOString())
    .gte('data->>end_date', new Date().toISOString())

  // Group by community and send reminders
  const results = []
  
  for (const challenge of challenges || []) {
    const members = challenge.community_members
    
    for (const member of members) {
      try {
        const email = {
          subject: `⏰ Challenge Ending Soon: ${challenge.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Don't miss out! ${challenge.title} ends soon</h2>
              <p>Hi ${member.profiles.full_name}!</p>
              <p>The challenge "${challenge.title}" in ${challenge.communities.name} is ending soon.</p>
              <p><strong>Time remaining:</strong> ${Math.ceil((new Date(challenge.data.end_date) - new Date()) / (1000 * 60 * 60 * 24))} days</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/communities/${challenge.community_id}/content/${challenge.id}">
                View Challenge
              </a>
            </div>
          `
        }
        await sendEmail(member.profiles.email, email)
        results.push({ user: member.profiles.email, status: 'sent' })
      } catch (error) {
        results.push({ user: member.profiles.email, status: 'failed' })
      }
    }
  }

  return NextResponse.json({ success: true, results })
}
```

### 3. Configure Vercel Cron

**Create**: `vercel.json` in project root

```json
{
  "crons": [
    {
      "path": "/api/cron/monthly-impact",
      "schedule": "0 9 1 * *"
    },
    {
      "path": "/api/cron/challenge-reminders",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Cron schedule explained:**
- `0 9 1 * *` = Every 1st day of month at 9:00 AM
- `0 8 * * *` = Every day at 8:00 AM

### 4. Add Environment Variables

Add to Vercel:
- `CRON_SECRET` = Generate a random string (e.g., `openssl rand -hex 32`)
- `NEXT_PUBLIC_APP_URL` = `https://crowdconscious.app`

### 5. Test Cron Jobs Manually

You can test by calling the endpoint with the secret:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://crowdconscious.app/api/cron/monthly-impact
```

## Implementation Order

1. ✅ **Now**: Add `NEXT_PUBLIC_APP_URL` to Vercel (for current emails to work)
2. **Next**: Create cron job files
3. **Then**: Create/update `vercel.json`
4. **Finally**: Add `CRON_SECRET` to Vercel and deploy

## Benefits

- ✅ Fully automated
- ✅ No external services needed
- ✅ Runs on Vercel infrastructure  
- ✅ Personalized for each user
- ✅ Real data from database
- ✅ Reliable and scalable

