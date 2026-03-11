# Signup & Profile Creation Fix

## Problem

Users reported:
- **"Profile creation failed: insert or update on table 'profiles' violates foreign key constraint 'profiles_id_fkey'"** when creating new accounts
- Issues changing passwords (may be separate; see Password Reset section)

## Root Cause

The `profiles` table has `id` referencing `auth.users(id)`. When the client tries to insert a profile immediately after signup:

1. **Race condition**: The auth.users row may not be fully committed/visible when the client insert runs
2. **RLS**: The anon client may lack permission to insert into profiles
3. **Trigger missing**: The `on_auth_user_created` trigger may not exist or may have failed

## Fix Applied

1. **`/api/auth/ensure-profile`** — Server-side API that:
   - Verifies the user exists in auth.users (via admin API)
   - Creates the profile using the **service role** (bypasses RLS)
   - Retries up to 3 times with 400ms delay to handle FK propagation delay

2. **Signup page** — Now calls `ensure-profile` instead of inserting directly from the client

3. **Auth callback** — When users confirm email (or complete password reset), we ensure the profile exists before redirecting to dashboard

## Verify Database Trigger (Optional)

If you want the trigger as a first line of defense, run in Supabase SQL Editor:

```sql
-- Check if trigger exists
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- If missing, create it (see docs/archives/FIX-SIGNUP-TRIGGER.sql)
```

## Password Reset

Password change uses `supabase.auth.updateUser()` and does not touch the profiles table. If users report password change failures, common causes:

- **Session lost on mobile**: "Please click the reset link again and try immediately"
- **PKCE**: Link opened on different device/browser than the one that requested reset
- **Expired link**: Reset links expire; user must request a new one
