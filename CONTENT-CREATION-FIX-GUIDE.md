# Content Creation Fix Guide

## Problem

When users try to create content (polls, needs, events, challenges) in communities, they get this error:

```
function award_xp(uuid, unknown, integer, uuid, text) does not exist
```

## Root Cause

The database trigger `trigger_content_xp()` is calling `award_xp` with the **wrong signature**:

**Current (WRONG):**
```sql
PERFORM award_xp(NEW.created_by, 'content_created', 25, NEW.id, 'Created ' || NEW.type);
-- This calls: award_xp(UUID, TEXT, INTEGER, UUID, TEXT) - 5 parameters
```

**Expected (CORRECT):**
```sql
PERFORM award_xp(NEW.created_by, 'create_content', NEW.id, 'Created ' || NEW.type);
-- This calls: award_xp(UUID, VARCHAR(50), UUID, TEXT) - 4 parameters
```

The actual `award_xp` function signature (from `phase-7-gamification-functions.sql`) is:
```sql
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_action_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
```

**Key differences:**
1. ❌ **NO `p_xp_amount` parameter** - XP amount is looked up from `xp_rewards` table
2. ✅ Action type must match entries in `xp_rewards` table
3. ✅ Function returns JSONB (not VOID)

## Solution

Run this SQL migration in Supabase SQL Editor:

**File**: `sql-migrations/FIX-ensure-xp-rewards-and-triggers.sql`

This script:
1. ✅ Ensures all required action types exist in `xp_rewards` table
2. ✅ Fixes all triggers to use correct `award_xp` signature
3. ✅ Adds error handling to prevent trigger failures
4. ✅ Fixes triggers for:
   - Content creation (`trigger_content_xp`)
   - Voting (`trigger_vote_xp`)
   - Commenting (`trigger_comment_xp`)
   - Content approval (`trigger_content_approval`)
   - Poll voting (`trigger_poll_vote_xp`)
   - Community joining (`trigger_community_join_xp`)
   - Event RSVP (`trigger_event_rsvp_xp`)
   - Sponsorships (`trigger_sponsorship_xp`)

## Action Types in xp_rewards

The following action types must exist in `xp_rewards` table:

- `create_content` - 75 XP (for creating content)
- `vote_content` - 25 XP (for voting)
- `sponsor_need` - 100 XP (for sponsorships)
- `review_module` - 30 XP (for comments)
- `daily_login` - 10 XP (for daily login/community join)
- `lesson_completed` - 50 XP
- `module_completed` - 200 XP
- `week_streak` - 50 XP
- `month_streak` - 200 XP
- `first_module` - 100 XP
- `first_sponsor` - 150 XP
- `share_achievement` - 20 XP
- `certificate_earned` - 150 XP

## Testing

After running the migration:

1. **Test Content Creation:**
   - Create a poll → Should work without errors
   - Create a need → Should work without errors
   - Create an event → Should work without errors
   - Create a challenge → Should work without errors

2. **Verify XP Awarded:**
   - Check `xp_transactions` table for new entries
   - Check `user_xp` table for updated `total_xp`
   - Check `user_stats` table for updated `content_created` count

3. **Test Other Actions:**
   - Vote on content → Should award XP
   - Comment on content → Should award XP
   - Join community → Should award XP
   - Sponsor a need → Should award XP

## Verification Queries

```sql
-- Check triggers exist
SELECT 
  trigger_name, 
  event_object_table, 
  action_timing, 
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%xp%'
ORDER BY event_object_table, trigger_name;

-- Check xp_rewards has all action types
SELECT action_type, xp_amount, description 
FROM public.xp_rewards 
ORDER BY action_type;

-- Check award_xp function signature
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'award_xp'
  AND routine_schema = 'public';

-- Test award_xp function (replace with actual user_id)
SELECT public.award_xp(
  'USER_ID_HERE'::UUID,
  'create_content',
  NULL::UUID,
  'Test XP award'
);
```

## Additional Issues to Check

1. **RLS Policies**: Ensure users can insert into `community_content` table
2. **Foreign Keys**: Ensure `community_id` and `created_by` are valid
3. **Required Fields**: Ensure all required fields are provided
4. **Poll Options**: Ensure poll options are created after content (if poll type)

## Next Steps

1. ✅ Run `FIX-ensure-xp-rewards-and-triggers.sql` in Supabase SQL Editor
2. ✅ Test content creation for all content types
3. ✅ Verify XP is being awarded correctly
4. ✅ Check for any other trigger errors in logs

---

**Status**: ✅ Fix Ready
**Last Updated**: December 2025



