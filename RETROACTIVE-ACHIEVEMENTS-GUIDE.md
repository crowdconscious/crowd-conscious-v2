# Retroactive Achievements Unlock Guide

## Overview

This guide explains how to retroactively unlock achievements for users based on their past actions. Many users have completed modules, voted, and made sponsorships before the achievement system was implemented, so their achievements appear as "Locked" even though they've met the requirements.

## Problem

Users who completed actions before the achievement system was implemented see achievements as "Locked" even though they've:
- Completed 6+ modules
- Cast multiple votes
- Made sponsorships
- Created content
- Reached higher tiers

## Solution

Two approaches have been implemented:

### 1. Automatic Check (User-Facing)

When a user visits the `/achievements` page, the system automatically:
1. Checks their past actions (modules, lessons, votes, sponsorships, content, tier)
2. Compares against achievement requirements
3. Unlocks any achievements they've earned
4. Shows a success message if achievements were unlocked
5. Refreshes the page to show updated achievements

**Implementation**: `app/(app)/achievements/AchievementsClient.tsx`
- Automatically runs on page load
- Only checks once per session
- Shows loading indicator while checking
- Displays success message when achievements are unlocked

### 2. SQL Migration (Admin/Bulk)

For bulk processing all users at once, use the SQL migration script:

**File**: `sql-migrations/STAGING-ONLY-retroactive-achievements-unlock.sql`

**What it does**:
- Loops through all users
- Counts their actual actions from database tables:
  - Completed modules (`course_enrollments` with `completed_at`)
  - Completed lessons (`course_enrollments.lesson_responses`)
  - Votes cast (`votes` table)
  - Sponsorships made (`sponsorships` table)
  - Content created (`community_content` table)
  - Current tier (`user_xp` or `user_stats`)
- Unlocks achievements based on these counts
- Prevents duplicate unlocks (checks if achievement already exists)
- Logs progress for users with unlocked achievements

**How to run**:
```sql
-- In Supabase SQL Editor or psql
\i sql-migrations/STAGING-ONLY-retroactive-achievements-unlock.sql
```

**⚠️ WARNING**: Run in STAGING first to verify results before production!

## API Endpoint

**Endpoint**: `POST /api/gamification/retroactive-achievements`

**What it does**:
- Checks current user's past actions
- Unlocks achievements they've earned
- Returns count of unlocked achievements and user stats

**Response**:
```json
{
  "success": true,
  "data": {
    "achievements_unlocked": 5,
    "achievements": ["FIRST_MODULE_COMPLETED", "MODULE_5", "FIRST_VOTE", ...],
    "stats": {
      "modules_completed": 6,
      "lessons_completed": 24,
      "votes_cast": 12,
      "sponsorships_made": 3,
      "content_created": 2,
      "current_tier": 2,
      "total_xp": 1470
    }
  }
}
```

## Achievements Checked

The system checks and unlocks these achievements:

### Learning Achievements
- **FIRST_LESSON_COMPLETED** - Complete 1 lesson
- **FIRST_MODULE_COMPLETED** - Complete 1 module
- **MODULE_5** - Complete 5 modules
- **MODULE_10** - Complete 10 modules

### Community Achievements
- **FIRST_VOTE** - Cast 1 vote
- **VOTE_50** - Cast 50 votes
- **FIRST_SPONSORSHIP** - Make 1 sponsorship
- **SPONSOR_10** - Make 10 sponsorships
- **FIRST_CONTENT** - Create 1 piece of content

### Progression Achievements
- **TIER_2** - Reach Contributor tier (501+ XP)
- **TIER_3** - Reach Changemaker tier (1,501+ XP)
- **TIER_4** - Reach Impact Leader tier (3,501+ XP)
- **TIER_5** - Reach Legend tier (7,501+ XP)

## Data Sources

The system checks these database tables:

1. **`course_enrollments`**
   - `completed_at IS NOT NULL` → Completed modules
   - `lesson_responses` JSONB array → Completed lessons

2. **`votes`**
   - Count of all votes by user

3. **`sponsorships`**
   - Count of all sponsorships by user

4. **`community_content`**
   - Count of all content created by user

5. **`user_xp`** or **`user_stats`**
   - `total_xp` → Calculate tier
   - `current_tier` → Direct tier value

## How It Works

### Automatic Check Flow

1. User visits `/achievements` page
2. Page loads achievements (via `useUserAchievements` hook)
3. `useEffect` triggers when achievements are loaded
4. Calls `/api/gamification/retroactive-achievements` API
5. API checks user's past actions:
   - Queries database for counts
   - Compares against achievement requirements
   - Inserts missing achievements into `user_achievements` table
6. Returns count of unlocked achievements
7. Page shows success message
8. Page refreshes to show updated achievements

### SQL Migration Flow

1. Loop through all users in `auth.users`
2. For each user:
   - Count their actions from various tables
   - Get their current tier
   - Check each achievement requirement
   - If requirement met AND achievement not already unlocked:
     - Insert into `user_achievements` table
   - Log progress
3. Display summary report

## Testing

### Test Individual User

1. Visit `/achievements` page while logged in
2. Check console for API call
3. Verify achievements unlock automatically
4. Check success message appears
5. Verify achievements show as unlocked

### Test Bulk Migration

1. Run SQL migration in staging
2. Check logs for users with unlocked achievements
3. Verify summary report shows correct counts
4. Spot-check a few users manually
5. If successful, run in production

## Verification

After running, verify achievements are unlocked:

```sql
-- Check achievements unlocked for a specific user
SELECT 
  achievement_type,
  achievement_name,
  unlocked_at
FROM user_achievements
WHERE user_id = 'USER_ID_HERE'
ORDER BY unlocked_at DESC;

-- Check total achievements unlocked
SELECT 
  achievement_type,
  COUNT(*) as users_with_achievement
FROM user_achievements
GROUP BY achievement_type
ORDER BY users_with_achievement DESC;
```

## Troubleshooting

### Achievements Still Showing as Locked

1. **Check API response**: Look at browser console for API errors
2. **Verify data**: Check if user actually has the required actions
3. **Check achievement type**: Ensure achievement type matches exactly
4. **Check database**: Verify `user_achievements` table has the record

### API Returns 0 Achievements Unlocked

1. User may have already unlocked all eligible achievements
2. User may not meet any achievement requirements yet
3. Check API response `stats` to see actual counts

### SQL Migration Errors

1. Check table names match your schema
2. Verify column names are correct
3. Check for NULL handling issues
4. Review logs for specific error messages

## Future Enhancements

- [ ] Add streak-based achievements (7-day, 30-day)
- [ ] Add event attendance achievements
- [ ] Add achievement unlock notifications
- [ ] Add achievement progress tracking
- [ ] Add achievement history/analytics

---

**Status**: ✅ Complete and Ready for Use
**Last Updated**: December 2025

