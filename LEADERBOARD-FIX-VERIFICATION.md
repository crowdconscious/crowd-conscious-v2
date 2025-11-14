# Leaderboard Fix Verification Guide

## Problem
- Leaderboard shows "#1" rank but "0 XP"
- Leaderboard shows "No rankings yet" even though there are users
- Users not appearing in leaderboard

## Root Causes Fixed

1. **Conflicting RLS Policies** - Old restrictive policies blocking public read access
2. **Missing Public Read Access** - Leaderboard needs public read access to user_xp and user_stats
3. **View Errors** - leaderboard_view might not exist or have errors
4. **No XP Data** - Users might not have XP in user_xp or user_stats tables

## SQL Migration to Run

**File**: `sql-migrations/FIX-leaderboard-rls-and-view.sql`

This migration:
1. ✅ Drops conflicting RLS policies
2. ✅ Creates public read policies for leaderboard access
3. ✅ Recreates leaderboard_view with better error handling
4. ✅ Creates get_user_rank helper function
5. ✅ Adds indexes for performance

## Verification Steps

### Step 1: Run the SQL Migration
Run `sql-migrations/FIX-leaderboard-rls-and-view.sql` in Supabase SQL Editor.

### Step 2: Check if Users Have XP Data

```sql
-- Check user_xp table
SELECT COUNT(*) as users_with_xp FROM user_xp WHERE total_xp > 0;
SELECT * FROM user_xp WHERE total_xp > 0 ORDER BY total_xp DESC LIMIT 10;

-- Check user_stats table
SELECT COUNT(*) as users_with_stats_xp FROM user_stats WHERE total_xp > 0;
SELECT * FROM user_stats WHERE total_xp > 0 ORDER BY total_xp DESC LIMIT 10;

-- Check if your user has XP
SELECT 
  ux.user_id,
  ux.total_xp as xp_from_user_xp,
  us.total_xp as xp_from_user_stats,
  ux.current_tier
FROM user_xp ux
FULL OUTER JOIN user_stats us ON ux.user_id = us.user_id
WHERE ux.user_id = 'YOUR_USER_ID' OR us.user_id = 'YOUR_USER_ID';
```

### Step 3: Test Leaderboard View

```sql
-- Test the leaderboard_view
SELECT * FROM leaderboard_view LIMIT 10;

-- Check if view has data
SELECT COUNT(*) FROM leaderboard_view;
```

### Step 4: Check RLS Policies

```sql
-- Check RLS policies on user_xp
SELECT * FROM pg_policies WHERE tablename = 'user_xp';

-- Check RLS policies on user_stats
SELECT * FROM pg_policies WHERE tablename = 'user_stats';

-- Check RLS policies on profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Step 5: Test API Endpoint

Visit: `https://your-app.com/api/gamification/leaderboard`

Or test with curl:
```bash
curl https://your-app.com/api/gamification/leaderboard
```

Check the response - it should return:
```json
{
  "success": true,
  "data": {
    "leaderboard": [...],
    "user_rank": {...},
    "pagination": {...}
  }
}
```

## If Users Don't Have XP

If users don't have XP data, you need to:

1. **Run Retroactive XP Migration** (if not already done):
   ```sql
   -- Run this in Supabase SQL Editor
   \i sql-migrations/STAGING-ONLY-retroactive-xp-migration.sql
   ```

2. **Ensure XP is Being Awarded** - Check that triggers are working:
   ```sql
   -- Check if triggers exist
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name LIKE '%xp%';
   
   -- Test creating content (should award XP)
   -- Create a poll, vote, etc. and check if XP is awarded
   ```

3. **Manually Add XP for Testing**:
   ```sql
   -- Add test XP to a user
   INSERT INTO user_xp (user_id, total_xp, current_tier)
   VALUES ('YOUR_USER_ID', 100, 1)
   ON CONFLICT (user_id) 
   DO UPDATE SET total_xp = user_xp.total_xp + 100;
   ```

## Common Issues

### Issue: "No rankings yet" still showing

**Possible Causes:**
1. Users don't have XP > 0
2. RLS policies still blocking access
3. View not created properly

**Fix:**
1. Check if users have XP: `SELECT COUNT(*) FROM user_xp WHERE total_xp > 0;`
2. Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'user_xp';`
3. Test view: `SELECT * FROM leaderboard_view LIMIT 5;`

### Issue: User rank shows "#1" but XP shows "0"

**Possible Causes:**
1. User has no XP in user_xp or user_stats
2. Rank calculation is defaulting to 1

**Fix:**
1. Check user's XP: `SELECT * FROM user_xp WHERE user_id = 'YOUR_USER_ID';`
2. Check user_stats: `SELECT * FROM user_stats WHERE user_id = 'YOUR_USER_ID';`
3. If no XP, user needs to earn XP or run retroactive migration

### Issue: Leaderboard view error

**Possible Causes:**
1. View doesn't exist
2. View has syntax errors
3. Missing tables (user_xp, user_stats, profiles)

**Fix:**
1. Drop and recreate view: Run the SQL migration again
2. Check if tables exist: `SELECT * FROM information_schema.tables WHERE table_name IN ('user_xp', 'user_stats', 'profiles');`

## Testing Checklist

- [ ] SQL migration run successfully
- [ ] Users have XP data (check user_xp or user_stats)
- [ ] leaderboard_view returns data
- [ ] RLS policies allow public read access
- [ ] API endpoint returns leaderboard data
- [ ] User rank shows correct XP (not 0)
- [ ] Leaderboard shows users (not "No rankings yet")

## Next Steps

1. ✅ Run `sql-migrations/FIX-leaderboard-rls-and-view.sql`
2. ✅ Verify users have XP data
3. ✅ Test leaderboard view
4. ✅ Test API endpoint
5. ✅ Check browser console for errors
6. ✅ Refresh leaderboard page

---

**Status**: ✅ Fix Ready
**Last Updated**: December 2025

