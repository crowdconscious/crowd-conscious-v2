# Achievements & Leaderboard Fix Guide

## Problems Fixed

1. ✅ **Achievements not unlocking** - Fixed `check_achievements` function to unlock content creation achievements
2. ✅ **Leaderboard showing no users** - Fixed leaderboard API to properly query and display users
3. ✅ **User ID undefined error** - Fixed `useUserAchievements` hook variable scope bug
4. ✅ **Achievements not unlocking on content creation** - Updated triggers to pass `action_type` to `check_achievements`

## SQL Migrations to Run

Run these SQL migrations **in order** in Supabase SQL Editor:

### 1. Fix Achievements Function
**File**: `sql-migrations/FIX-check-achievements-for-content.sql`

This updates the `check_achievements` function to:
- Check for content creation and unlock `FIRST_CONTENT` achievement
- Check for voting and unlock `FIRST_VOTE` and `VOTE_50` achievements
- Check for sponsorships and unlock `FIRST_SPONSORSHIP` and `SPONSOR_10` achievements
- Check for tier achievements (`TIER_2`, `TIER_3`, `TIER_4`, `TIER_5`)
- Insert achievements into `user_achievements` table (not just `user_stats` array)
- Update triggers to pass `action_type` parameter

### 2. Fix Leaderboard Display
**File**: `sql-migrations/FIX-leaderboard-populate.sql`

This creates:
- Public RLS policies for leaderboard data access
- `leaderboard_view` that combines `user_xp` and `user_stats` tables
- Indexes for better performance
- Ensures leaderboard can query users properly

### 3. Fix XP Rewards and Triggers (if not already run)
**File**: `sql-migrations/FIX-ensure-xp-rewards-and-triggers.sql`

This ensures:
- All action types exist in `xp_rewards` table
- All triggers use correct `award_xp` signature
- Triggers pass `action_type` to `check_achievements`

## How It Works

### Achievement Unlocking Flow

1. **User creates content** (poll, need, event, challenge)
2. **Trigger fires**: `trigger_content_xp()`
3. **XP awarded**: Calls `award_xp('create_content', content_id)`
4. **Stats updated**: Updates `user_stats.content_created` count
5. **Achievements checked**: Calls `check_achievements(user_id, 'create_content', content_id)`
6. **Achievement unlocked**: If `content_created >= 1`, inserts `FIRST_CONTENT` into `user_achievements` table

### Leaderboard Display Flow

1. **API called**: `/api/gamification/leaderboard`
2. **Query leaderboard_view**: Combines `user_xp` and `user_stats`
3. **Fallback logic**: If view fails, tries `user_xp`, then `user_stats`
4. **Filter users**: Only shows users with `total_xp > 0`
5. **Calculate ranks**: Adds rank numbers based on XP order
6. **Return data**: Returns leaderboard with user names, XP, and tiers

## Testing

### Test Achievement Unlocking

1. **Create a poll** in a community
2. **Check achievements page** - Should see "Creator" achievement unlocked
3. **Check database**:
   ```sql
   SELECT * FROM user_achievements 
   WHERE user_id = 'YOUR_USER_ID' 
   AND achievement_type = 'FIRST_CONTENT';
   ```

### Test Leaderboard

1. **Visit `/leaderboard` page**
2. **Should see users** ranked by XP (if any users have XP)
3. **Check your rank** - Should show your actual rank and XP
4. **Test filters** - Try filtering by tier or timeframe

### Test Voting Achievement

1. **Vote on content** in a community
2. **Check achievements** - Should unlock "Voice Heard" achievement
3. **Check database**:
   ```sql
   SELECT * FROM user_achievements 
   WHERE user_id = 'YOUR_USER_ID' 
   AND achievement_type = 'FIRST_VOTE';
   ```

## Verification Queries

```sql
-- Check achievements unlocked for a user
SELECT 
  achievement_type,
  achievement_name,
  unlocked_at
FROM user_achievements
WHERE user_id = 'YOUR_USER_ID'
ORDER BY unlocked_at DESC;

-- Check leaderboard view works
SELECT * FROM leaderboard_view
ORDER BY total_xp DESC
LIMIT 10;

-- Check user XP and stats
SELECT 
  ux.user_id,
  ux.total_xp as xp_from_user_xp,
  us.total_xp as xp_from_user_stats,
  ux.current_tier,
  us.content_created,
  us.votes_cast
FROM user_xp ux
FULL OUTER JOIN user_stats us ON ux.user_id = us.user_id
WHERE ux.user_id = 'YOUR_USER_ID' OR us.user_id = 'YOUR_USER_ID';

-- Check if triggers exist
SELECT 
  trigger_name, 
  event_object_table, 
  action_timing, 
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%xp%' 
   OR trigger_name LIKE '%achievement%'
ORDER BY event_object_table, trigger_name;
```

## Common Issues

### Achievements Still Not Unlocking

1. **Check trigger exists**:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_content_xp';
   ```

2. **Check function exists**:
   ```sql
   SELECT * FROM information_schema.routines 
   WHERE routine_name = 'check_achievements';
   ```

3. **Manually trigger achievement check**:
   ```sql
   SELECT check_achievements('YOUR_USER_ID'::UUID, 'create_content', NULL::UUID);
   ```

### Leaderboard Still Empty

1. **Check if users have XP**:
   ```sql
   SELECT COUNT(*) FROM user_xp WHERE total_xp > 0;
   SELECT COUNT(*) FROM user_stats WHERE total_xp > 0;
   ```

2. **Check RLS policies**:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('user_xp', 'user_stats', 'profiles');
   ```

3. **Test leaderboard_view**:
   ```sql
   SELECT * FROM leaderboard_view LIMIT 5;
   ```

## Next Steps

1. ✅ Run SQL migrations in Supabase
2. ✅ Test content creation (should unlock "Creator" achievement)
3. ✅ Test voting (should unlock "Voice Heard" achievement)
4. ✅ Check leaderboard shows users
5. ✅ Run retroactive achievement unlock for existing users:
   ```sql
   -- Run this to unlock achievements for all existing users
   \i sql-migrations/STAGING-ONLY-retroactive-achievements-unlock.sql
   ```

---

**Status**: ✅ Fixes Ready
**Last Updated**: December 2025




