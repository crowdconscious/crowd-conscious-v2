# 🔍 Employee Login Debug Guide

## The Problem
Employee account was created (invitation shows "Aceptado") but user gets stuck in login loop.

## Root Cause
The profile either:
1. Doesn't exist in the `profiles` table, OR
2. Exists but is missing the required corporate flags

## 🔧 Quick Fix (Run in Supabase SQL Editor)

### Step 1: Diagnose the Issue
Run this to see what's wrong:

```sql
-- Check what exists for this user
SELECT 
  'AUTH USER' as type,
  au.id,
  au.email,
  au.email_confirmed_at,
  NULL as corporate_account_id,
  NULL as corporate_role,
  NULL as is_corporate_user
FROM auth.users au
WHERE au.email = 'tjockis88@hotmail.com'

UNION ALL

SELECT 
  'PROFILE' as type,
  p.id,
  p.email,
  NULL as email_confirmed_at,
  p.corporate_account_id,
  p.corporate_role,
  p.is_corporate_user
FROM profiles p
WHERE p.email = 'tjockis88@hotmail.com';
```

### Step 2: Fix the Profile
If the profile is missing flags, run this:

```sql
-- Fix employee profile with correct flags
UPDATE profiles
SET 
  corporate_account_id = (
    SELECT corporate_account_id 
    FROM employee_invitations 
    WHERE email = 'tjockis88@hotmail.com' 
    ORDER BY invited_at DESC 
    LIMIT 1
  ),
  corporate_role = 'employee',
  is_corporate_user = true
WHERE email = 'tjockis88@hotmail.com';

-- Verify the fix
SELECT 
  email,
  corporate_account_id,
  corporate_role,
  is_corporate_user
FROM profiles
WHERE email = 'tjockis88@hotmail.com';
```

### Step 3: If Profile Doesn't Exist
If no profile exists at all, create it:

```sql
-- Create missing profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  corporate_account_id,
  corporate_role,
  is_corporate_user
)
SELECT 
  au.id,
  au.email,
  COALESCE(ei.full_name, split_part(au.email, '@', 1)),
  ei.corporate_account_id,
  'employee',
  true
FROM auth.users au
JOIN employee_invitations ei ON ei.email = au.email
WHERE au.email = 'tjockis88@hotmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = au.id
  );

-- Verify
SELECT * FROM profiles WHERE email = 'tjockis88@hotmail.com';
```

## ✅ After Running the Fix

1. Close all browser tabs for crowdconscious.app
2. Clear browser cookies for the site (optional but recommended)
3. Go to https://crowdconscious.app/login
4. Log in with: tjockis88@hotmail.com + password
5. Should redirect to: `/employee-portal/dashboard`

## 🎯 Expected Result

After login, the auth callback should:
1. Check profile for `is_corporate_user = true`
2. Check `corporate_role = 'employee'`
3. Redirect to `/employee-portal/dashboard`

## 🐛 If Still Not Working

Check browser console for errors:
1. Open DevTools (F12)
2. Go to Console tab
3. Try to log in
4. Look for any red errors
5. Share the errors with me

Also check the Network tab:
1. DevTools → Network tab
2. Try to log in
3. Look for `/auth/callback` request
4. Check what URL it redirects to
5. Share the redirect URL with me

## 📋 Profile Requirements Checklist

For employee login to work, the profile MUST have:
- ✅ `id` matches auth.users.id
- ✅ `email` matches auth.users.email
- ✅ `corporate_account_id` is set (UUID)
- ✅ `corporate_role = 'employee'`
- ✅ `is_corporate_user = true`

Missing ANY of these = login loop!

