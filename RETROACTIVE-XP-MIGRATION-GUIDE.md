# Retroactive XP Migration Guide

## Overview

This guide explains how to run the retroactive XP migration to award XP to existing users based on their historical actions.

## What This Migration Does

The migration script (`sql-migrations/STAGING-ONLY-retroactive-xp-migration.sql`) awards XP retroactively for:

1. **Completed Lessons** (50 XP each)
   - Extracts from `course_enrollments.lesson_responses` JSONB array
   - Only awards XP if lesson is marked as `completed: true`

2. **Completed Modules** (200 XP each)
   - Based on `course_enrollments.completed = true`
   - Requires `completion_date` to be set

3. **Sponsorships** (100 XP each)
   - For sponsorships with status `'paid'` or `'completed'`

4. **Votes** (25 XP each)
   - Only for `'approve'` votes (not `'reject'`)

5. **Content Creation** (75 XP each)
   - For content with status `'approved'`, `'active'`, `'completed'`, or `'published'`

## Important Notes

⚠️ **STAGING ONLY**: This migration is designed for staging environments. Test thoroughly before running in production!

- The migration uses `BEGIN`/`COMMIT` transaction blocks for safety
- Each action checks for existing XP transactions to prevent duplicates
- Errors are logged but don't stop the migration
- All retroactive transactions are marked with `'Retroactive:'` prefix in the description

## Prerequisites

Before running this migration, ensure:

1. ✅ The gamification schema is set up (`phase-7-gamification-schema.sql`)
2. ✅ The `award_xp` function exists and works correctly
3. ✅ The `xp_rewards` table has the correct action types configured
4. ✅ You have a database backup (especially for production)

## How to Run

### Option 1: Via Supabase SQL Editor

1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the entire contents of `sql-migrations/STAGING-ONLY-retroactive-xp-migration.sql`
4. Paste into the SQL Editor
5. Review the script carefully
6. Click "Run" to execute

### Option 2: Via psql Command Line

```bash
psql -h your-db-host -U your-user -d your-database -f sql-migrations/STAGING-ONLY-retroactive-xp-migration.sql
```

### Option 3: Via API Route (Per User)

The API route at `/api/gamification/retroactive-xp` can calculate retroactive XP for a single user:

```bash
POST /api/gamification/retroactive-xp
{
  "targetUserId": "user-uuid-here" // Optional, defaults to current user
}
```

## Verification Queries

After running the migration, use these queries to verify the results:

### Check XP Distribution by Tier

```sql
SELECT
  current_tier,
  COUNT(*) as user_count,
  AVG(total_xp) as avg_xp,
  MIN(total_xp) as min_xp,
  MAX(total_xp) as max_xp
FROM public.user_xp
GROUP BY current_tier
ORDER BY current_tier;
```

### Check Retroactive Transactions

```sql
SELECT
  action_type,
  COUNT(*) as retroactive_count,
  SUM(amount) as retroactive_xp
FROM public.xp_transactions
WHERE description LIKE 'Retroactive:%'
GROUP BY action_type
ORDER BY retroactive_xp DESC;
```

### Check Top Users Who Received Retroactive XP

```sql
SELECT
  ux.user_id,
  ux.total_xp,
  ux.current_tier,
  COUNT(xt.id) as retroactive_transactions,
  SUM(xt.amount) as retroactive_xp_total
FROM public.user_xp ux
JOIN public.xp_transactions xt ON xt.user_id = ux.user_id
WHERE xt.description LIKE 'Retroactive:%'
GROUP BY ux.user_id, ux.total_xp, ux.current_tier
ORDER BY retroactive_xp_total DESC
LIMIT 20;
```

## Expected XP Amounts

Based on the `xp_rewards` table configuration:

| Action Type        | XP Amount |
| ------------------ | --------- |
| `lesson_completed` | 50 XP     |
| `module_completed` | 200 XP    |
| `sponsor_need`     | 100 XP    |
| `vote_content`     | 25 XP     |
| `create_content`   | 75 XP     |

## Troubleshooting

### Issue: Migration fails with "Unknown action type"

**Solution**: Ensure the `xp_rewards` table has all required action types:

```sql


```

If any are missing, insert them:

```sql
INSERT INTO public.xp_rewards (action_type, xp_amount, description) VALUES
  ('lesson_completed', 50, 'Complete a lesson'),
  ('module_completed', 200, 'Complete an entire module'),
  ('sponsor_need', 100, 'Sponsor a community need'),
  ('vote_content', 25, 'Vote on community content'),
  ('create_content', 75, 'Create community content')
ON CONFLICT (action_type) DO NOTHING;
```

### Issue: No lessons found

**Solution**: Check if `course_enrollments` has `lesson_responses` data:

```sql
SELECT
  COUNT(*) as total_enrollments,
  COUNT(lesson_responses) as enrollments_with_responses,
  COUNT(*) FILTER (WHERE lesson_responses::text != '[]') as non_empty_responses
FROM course_enrollments;
```

### Issue: Duplicate XP transactions

**Solution**: The migration checks for existing transactions, but if duplicates occur:

```sql
-- Find duplicate transactions
SELECT user_id, action_type, action_id, COUNT(*)
FROM public.xp_transactions
GROUP BY user_id, action_type, action_id
HAVING COUNT(*) > 1;

-- Remove duplicates (keep the oldest)
DELETE FROM public.xp_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY user_id, action_type, action_id
      ORDER BY created_at ASC
    ) as rn
    FROM public.xp_transactions
  ) t WHERE rn > 1
);
```

## Rollback Plan

If you need to rollback the migration:

```sql
BEGIN;

-- Remove all retroactive XP transactions
DELETE FROM public.xp_transactions
WHERE description LIKE 'Retroactive:%';

-- Recalculate user XP totals
UPDATE public.user_xp ux
SET
  total_xp = COALESCE((
    SELECT SUM(amount)
    FROM public.xp_transactions xt
    WHERE xt.user_id = ux.user_id
  ), 0),
  current_tier = calculate_tier(COALESCE((
    SELECT SUM(amount)
    FROM public.xp_transactions xt
    WHERE xt.user_id = ux.user_id
  ), 0)),
  updated_at = NOW();

-- Update leaderboard
PERFORM update_leaderboard_ranks();

COMMIT;
```

## Performance Considerations

- The migration processes records sequentially to avoid database locks
- For large datasets, consider running during off-peak hours
- Monitor database performance during execution
- The migration includes error handling to continue even if individual records fail

## Next Steps

After running the migration:

1. ✅ Verify XP totals look reasonable
2. ✅ Check that users have appropriate tier levels
3. ✅ Update leaderboard ranks (done automatically)
4. ✅ Notify users about their retroactive XP (optional)
5. ✅ Monitor for any issues in the first few days

## Support

If you encounter issues:

1. Check the migration logs (NOTICE and WARNING messages)
2. Review the verification queries above
3. Check that all prerequisites are met
4. Review the `award_xp` function logs for errors

---

**Last Updated**: December 2025  
**Migration File**: `sql-migrations/STAGING-ONLY-retroactive-xp-migration.sql`
