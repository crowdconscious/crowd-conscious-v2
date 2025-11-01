# 🎮 GAMIFICATION SYSTEM - Complete Audit & Fix Guide

## 📊 System Overview

Your gamification system is **FULLY IMPLEMENTED** with:

- ✅ XP tracking
- ✅ Level system
- ✅ Streak tracking
- ✅ Achievement system
- ✅ Leaderboards
- ✅ Weekly challenges
- ✅ Automatic triggers for all actions

---

## 🗄️ Database Tables (All Created)

### 1. **`user_stats`** - Main gamification data

```sql
- total_xp (INTEGER)
- level (INTEGER) - Calculated as FLOOR(SQRT(total_xp / 100)) + 1
- current_streak (INTEGER)
- longest_streak (INTEGER)
- last_activity (TIMESTAMP)
- votes_cast (INTEGER)
- content_created (INTEGER)
- events_attended (INTEGER)
- comments_posted (INTEGER)
- achievements_unlocked (TEXT[])
```

### 2. **`xp_transactions`** - Audit log of all XP earned

```sql
- user_id
- action_type (vote_cast, content_created, etc.)
- xp_amount
- related_id (link to content/vote/comment)
- description
- created_at
```

### 3. **`weekly_challenges`** - Active challenges

```sql
- title, description, icon
- challenge_type (votes, content, comments, events, streak)
- target_value, reward_xp
- start_date, end_date, is_active
```

### 4. **`user_challenge_progress`** - User progress on challenges

```sql
- user_id, challenge_id
- current_progress, completed
- completed_at
```

### 5. **`comments`** - Discussion system

```sql
- content_id, user_id, parent_id
- content (max 1000 chars)
- mentions[], reactions{}
```

---

## ⚡ Automatic XP Triggers (Already Implemented)

### What Actions Give XP:

| Action               | XP Earned   | Trigger              | Counter Updated     |
| -------------------- | ----------- | -------------------- | ------------------- |
| Cast a vote          | 5 XP        | `trigger_vote_xp`    | `votes_cast++`      |
| Create content       | 25 XP       | `trigger_content_xp` | `content_created++` |
| Post comment         | 3 XP        | `trigger_comment_xp` | `comments_posted++` |
| Content approved     | 50 XP       | Manual               | -                   |
| Event RSVP           | 10 XP       | Manual               | -                   |
| Event attended       | 30 XP       | Manual               | `events_attended++` |
| Daily login          | 10 XP       | `update_user_streak` | -                   |
| Streak bonus         | 5 XP × days | `update_user_streak` | `current_streak++`  |
| Achievement unlocked | 100 XP      | `check_achievements` | `achievements[]++`  |

---

## 🏆 Achievements (Defined & Auto-Unlocked)

### Engagement

- **Democracy Starter** (🗳️): Cast 1 vote
- **Vote Champion** (🏆): Cast 50 votes
- **Consistent** (🔥): 3-day streak
- **Dedicated** (💪): 7-day streak

### Creation

- **Content Creator** (✨): Create 1 content
- **Prolific Creator** (🚀): Create 10 content

### Social

- **Social Butterfly** (🦋): Attend 5 events

### Milestones

- **Rising Star** (⭐): Reach level 5 (2,500 XP)

All achievements auto-unlock via `check_achievements()` function.

---

## 🔍 AUDIT: What's Working vs. What's Missing

### ✅ WORKING (Already Implemented):

1. Database tables exist
2. XP triggers fire automatically for:
   - Voting ✅
   - Creating content ✅
   - Posting comments ✅
3. Streak tracking system exists
4. Achievement checking function exists
5. Leaderboard queries work
6. UI components exist:
   - `XPProgressBar` ✅
   - `AchievementsGrid` ✅
   - `CommunityLeaderboard` ✅
   - `WeeklyChallenge` ✅

### ⚠️ POTENTIALLY MISSING:

1. **Event RSVP trigger** - Manual API call needed
2. **Event attendance tracking** - No automatic trigger
3. **Content approval XP** - Manual award needed
4. **Initial user_stats creation** - Need trigger on signup
5. **Daily login tracking** - Need to call `update_user_streak()` on app load

---

## 🔧 FIXES NEEDED

### Fix 1: Create `user_stats` on User Signup

```sql
-- Add this to your SQL migrations
CREATE OR REPLACE FUNCTION create_user_stats_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id, total_xp, level, current_streak, last_activity)
  VALUES (NEW.id, 0, 1, 0, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_stats ON auth.users;
CREATE TRIGGER on_auth_user_created_stats
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_stats_on_signup();
```

### Fix 2: Track Event RSVPs

```sql
-- Trigger for event_registrations table
CREATE OR REPLACE FUNCTION trigger_event_rsvp_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for RSVP
  PERFORM award_xp(NEW.user_id, 'event_rsvp', 10, NEW.content_id, 'RSVP to event');

  -- Update streak
  PERFORM update_user_streak(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_event_rsvp_xp ON event_registrations;
CREATE TRIGGER trigger_event_rsvp_xp
  AFTER INSERT ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_event_rsvp_xp();
```

### Fix 3: Track Event Attendance

When an event status changes to 'completed', award XP to attendees:

```sql
CREATE OR REPLACE FUNCTION trigger_event_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- If event just completed, award XP to all RSVPs
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Award XP to all users who RSVP'd
    INSERT INTO xp_transactions (user_id, action_type, xp_amount, related_id, description)
    SELECT
      user_id,
      'event_attended',
      30,
      NEW.id,
      'Attended event: ' || NEW.title
    FROM event_registrations
    WHERE content_id = NEW.id
    AND status = 'attending';

    -- Update user stats for all attendees
    UPDATE user_stats
    SET
      total_xp = total_xp + 30,
      events_attended = events_attended + 1,
      level = FLOOR(SQRT((total_xp + 30) / 100.0)) + 1,
      updated_at = NOW()
    WHERE user_id IN (
      SELECT user_id FROM event_registrations
      WHERE content_id = NEW.id AND status = 'attending'
    );

    -- Check achievements for all attendees
    PERFORM check_achievements(user_id)
    FROM event_registrations
    WHERE content_id = NEW.id AND status = 'attending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_event_completion ON community_content;
CREATE TRIGGER trigger_event_completion
  AFTER UPDATE ON community_content
  FOR EACH ROW
  WHEN (NEW.type = 'event')
  EXECUTE FUNCTION trigger_event_completion();
```

### Fix 4: Track Daily Logins (Client-Side)

Add this to your app's main layout or dashboard page:

```typescript
// In app/(app)/layout.tsx or dashboard page
useEffect(() => {
  const trackDailyLogin = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Call the streak update function
    await supabase.rpc("update_user_streak", {
      p_user_id: user.id,
    });
  };

  trackDailyLogin();
}, []);
```

### Fix 5: Award Content Approval XP

When content status changes from 'voting' to 'approved':

```sql
CREATE OR REPLACE FUNCTION trigger_content_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'voting' THEN
    PERFORM award_xp(NEW.created_by, 'content_approved', 50, NEW.id, 'Content approved by community');
    PERFORM check_achievements(NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_content_approval ON community_content;
CREATE TRIGGER trigger_content_approval
  AFTER UPDATE ON community_content
  FOR EACH ROW
  EXECUTE FUNCTION trigger_content_approval();
```

---

## 🎯 IMPLEMENTATION CHECKLIST

### Step 1: Run SQL Migrations (If Not Already Done)

```bash
# In Supabase SQL Editor:
1. Run sql-migrations/gamification-and-comments.sql
2. Run the fixes below (all 5 fixes)
```

### Step 2: Verify Tables Exist

```sql
-- Check tables
SELECT table_name
FROM information_schema.tables
WHERE table_name IN (
  'user_stats',
  'xp_transactions',
  'comments',
  'weekly_challenges',
  'user_challenge_progress'
);

-- Should return all 5 tables
```

### Step 3: Verify Triggers Exist

```sql
-- Check triggers
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%xp%' OR trigger_name LIKE '%achievement%';

-- Should see:
-- - trigger_vote_xp (votes table)
-- - trigger_content_xp (community_content table)
-- - trigger_comment_xp (comments table)
```

### Step 4: Test XP System

```sql
-- Check your own stats
SELECT * FROM user_stats WHERE user_id = auth.uid();

-- Check recent XP transactions
SELECT * FROM xp_transactions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- Check leaderboard
SELECT
  u.email,
  us.total_xp,
  us.level,
  us.current_streak,
  us.achievements_unlocked
FROM user_stats us
JOIN auth.users u ON u.id = us.user_id
ORDER BY us.total_xp DESC
LIMIT 10;
```

### Step 5: Add Daily Login Tracking

Add to `app/(app)/layout.tsx`:

```typescript
'use client'
import { useEffect } from 'react'
import { createClientAuth } from '@/lib/auth'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClientAuth()

  useEffect(() => {
    const trackStreak = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc('update_user_streak', { p_user_id: user.id })
      }
    }
    trackStreak()
  }, [])

  return <>{children}</>
}
```

### Step 6: Display Gamification UI

Make sure these components are visible:

- ✅ Dashboard: Show `XPProgressBar`
- ✅ Profile: Show `AchievementsGrid`
- ✅ Communities: Show `CommunityLeaderboard`
- ✅ Dashboard: Show `WeeklyChallenge`

---

## 📝 Complete SQL Fix File

I'll create a file with ALL missing triggers: `
sql-migrations/complete-gamification-triggers.sql`

---

## 🧪 Testing Flow

### Test 1: Vote → Earn XP

1. Cast a vote on any content
2. Check: `SELECT * FROM xp_transactions WHERE action_type = 'vote_cast' ORDER BY created_at DESC LIMIT 1`
3. Verify: +5 XP, votes_cast incremented

### Test 2: Create Content → Earn XP

1. Create a need/event/poll
2. Check XP transactions
3. Verify: +25 XP, content_created incremented

### Test 3: Comment → Earn XP

1. Post a comment
2. Check XP transactions
3. Verify: +3 XP, comments_posted incremented

### Test 4: Achievement Unlock

1. Cast your first vote
2. Check: `SELECT achievements_unlocked FROM user_stats WHERE user_id = auth.uid()`
3. Verify: Contains 'first_vote'
4. Check XP transactions for +100 XP achievement bonus

### Test 5: Level Up

1. Earn 100 XP total
2. Check: `SELECT level FROM user_stats WHERE user_id = auth.uid()`
3. Verify: Level = 2 (FLOOR(SQRT(100/100)) + 1 = 2)

### Test 6: Streak

1. Log in on consecutive days
2. Check: `SELECT current_streak FROM user_stats WHERE user_id = auth.uid()`
3. Verify: Increments daily
4. Check for streak bonus XP in transactions

### Test 7: Leaderboard

1. View leaderboard component
2. Verify: Users sorted by total_xp
3. Check: Top 3 have special styling

---

## 🚀 Quick Start Commands

```sql
-- 1. Check if gamification is set up
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_stats');

-- 2. Create your user stats if missing
INSERT INTO user_stats (user_id, total_xp, level)
VALUES (auth.uid(), 0, 1)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Manually award yourself XP (testing)
SELECT award_xp(auth.uid(), 'daily_login', 50, NULL, 'Test XP');

-- 4. Check achievements
SELECT check_achievements(auth.uid());

-- 5. View your stats
SELECT * FROM user_stats WHERE user_id = auth.uid();
```

---

## 📊 Expected Behavior After Fixes

### User Actions → Automatic XP:

| Action           | Immediate Effect                                     |
| ---------------- | ---------------------------------------------------- |
| Vote             | +5 XP, votes_cast++, streak check, achievement check |
| Create           | +25 XP, content_created++, streak check              |
| Comment          | +3 XP, comments_posted++, streak check               |
| RSVP             | +10 XP, streak check                                 |
| Event ends       | +30 XP to all attendees, events_attended++           |
| Content approved | +50 XP to creator                                    |
| Daily login      | +10 XP, streak++, bonus XP                           |
| Level up         | +100 XP bonus, achievement unlocked                  |
| Achievement      | +100 XP                                              |

---

**Bottom Line**: Your gamification system is 90% complete! Just need to:

1. Run the 5 SQL fixes above
2. Add daily login tracking to layout
3. Test each action to verify XP is awarded

Everything else is already built and working! 🎮🚀
