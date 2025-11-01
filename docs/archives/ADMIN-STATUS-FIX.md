# 🚨 Admin Status Lost - Recovery Guide

## Problem

Your admin account is no longer showing admin privileges.

**Symptoms**:
- ⚠️ Admin button visible but features not working
- ⚠️ Can't delete communities/content
- ⚠️ Permission denied errors

---

## Root Cause Analysis

### Possible Causes:

**1. SQL Migration Reset user_type**

The `simplify-remove-brand-type.sql` migration has this code:

```sql
UPDATE profiles
SET user_type = 'user' 
WHERE user_type = 'brand';
```

This **should only** affect `brand` users, **NOT** admin users.

**However**, if the migration was run incorrectly or if there was a database issue, it might have affected your account.

**2. Database Reset/Rollback**

If you:
- Restored from a backup
- Reset the database
- Ran conflicting migrations

Your admin status might have been lost.

**3. Profile Not Synced**

If your profile record doesn't exist or isn't properly linked to your auth user.

---

## Quick Fix - Restore Admin Status

### Step 1: Check Your Current Status

Run this in **Supabase SQL Editor**:

```sql
-- Find your account (replace with your email)
SELECT 
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE';
```

**Replace `YOUR_EMAIL_HERE`** with your actual email (e.g., `francisco@crowdconscious.app`)

### Step 2: Check What You'll See

**Scenario A**: Record found, `user_type` is `'user'`
```
| user_type |
|-----------|
| user      |  ← Should be 'admin'
```
**Solution**: Run Step 3 to restore admin status ✅

**Scenario B**: Record found, `user_type` is already `'admin'`
```
| user_type |
|-----------|
| admin     |  ← Correct!
```
**Solution**: Issue is elsewhere (see Section 2) 🔍

**Scenario C**: No record found
```
(empty result)
```
**Solution**: Profile not created (see Section 3) 🔧

---

### Step 3: Restore Admin Status

If your `user_type` is `'user'` instead of `'admin'`, run this:

```sql
-- Restore admin status
UPDATE profiles
SET user_type = 'admin'
WHERE email = 'YOUR_EMAIL_HERE';
```

**Replace `YOUR_EMAIL_HERE`** with your actual email.

### Step 4: Verify It Worked

```sql
-- Check again
SELECT 
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE';
```

Should now show:
```
| user_type |
|-----------|
| admin     |  ✅
```

### Step 5: Refresh Your Browser

1. **Hard refresh**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. **Or**: Clear cookies and log in again
3. **Test**: Try deleting a test community

---

## Alternative: Set Admin by User ID

If you know your user ID (from Supabase Auth dashboard):

```sql
-- Set admin by ID
UPDATE profiles
SET user_type = 'admin'
WHERE id = 'your-user-id-here';
```

---

## Section 2: If Already Admin But Features Don't Work

If your `user_type` is already `'admin'` but features still don't work:

### Check 1: Browser Cache

```bash
# Clear browser cache completely
# Or open in incognito/private window
```

### Check 2: Session Token

Your session might have stale data:

1. Sign out completely
2. Clear browser cookies
3. Sign in again
4. Check if admin features work

### Check 3: RLS Policies

Check if RLS policies are blocking admin actions:

```sql
-- Check deletion policies exist
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE cmd = 'DELETE'
AND policyname LIKE '%admin%';
```

Should show policies like:
- `Admins can delete communities`
- `Admins can delete content`
- `Admins can delete sponsorships`

If missing, run:
```sql
sql-migrations/fix-deletion-policies.sql
```

### Check 4: Server Logs

Check Vercel logs for errors when you try admin actions:

```
⚠️ user_type check failed
❌ Permission denied
```

This helps identify where the check is failing.

---

## Section 3: If Profile Doesn't Exist

If your profile record doesn't exist at all:

### Create Profile with Admin Status

```sql
-- Create admin profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  user_type,
  created_at,
  updated_at
)
VALUES (
  'YOUR_AUTH_USER_ID_HERE',  -- From Supabase Auth dashboard
  'YOUR_EMAIL_HERE',
  'YOUR_NAME_HERE',
  'admin',
  NOW(),
  NOW()
);
```

**To find your Auth User ID**:

1. Go to Supabase Dashboard
2. Authentication → Users
3. Find your email
4. Copy the UUID

---

## How Admin Check Works

### Code Flow:

**1. User visits dashboard or tries admin action**

**2. `getCurrentUser()` is called** (`lib/auth-server.ts`):
```typescript
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get full profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')  // ← Includes user_type
    .eq('id', user.id)
    .single()
  
  return profile
}
```

**3. Admin check performed** (`app/api/admin/route.ts`):
```typescript
async function checkAdminPermission(user: any): Promise<boolean> {
  return user.user_type === 'admin'  // ← Simple check
}
```

**4. Action allowed or denied based on result**

### What This Means:

- ✅ If `profiles.user_type = 'admin'` → Access granted
- ❌ If `profiles.user_type = 'user'` → Access denied
- ❌ If profile doesn't exist → Access denied

---

## Prevention: How to Safely Run Migrations

### Always Check First:

```sql
-- Before running ANY migration:

-- 1. Backup admin users
CREATE TEMPORARY TABLE admin_backup AS
SELECT * FROM profiles WHERE user_type = 'admin';

-- 2. Run your migration
-- ... migration code here ...

-- 3. Restore admin status if needed
UPDATE profiles p
SET user_type = 'admin'
FROM admin_backup ab
WHERE p.id = ab.id;
```

### Safe Migration Pattern:

```sql
-- Example: Updating user_type constraints

-- 1. Store admins
DO $$
DECLARE
  admin_ids UUID[];
BEGIN
  -- Get all admin IDs
  SELECT ARRAY_AGG(id) INTO admin_ids
  FROM profiles
  WHERE user_type = 'admin';
  
  -- Your migration here
  UPDATE profiles SET user_type = 'user' WHERE user_type = 'brand';
  
  -- Restore admins
  UPDATE profiles SET user_type = 'admin'
  WHERE id = ANY(admin_ids);
END $$;
```

---

## Quick Checklist

**To restore admin access**:

- [ ] Run `check-admin-status.sql` to check current status
- [ ] If `user_type = 'user'`, run `restore-admin-status.sql`
- [ ] If profile doesn't exist, create it with admin status
- [ ] Clear browser cache / hard refresh
- [ ] Sign out and sign in again
- [ ] Test admin features (delete test community)
- [ ] Check Vercel logs if still not working
- [ ] Verify RLS policies exist (`fix-deletion-policies.sql`)

---

## Files Created for You

**1. `sql-migrations/check-admin-status.sql`**
- Check your current user_type
- See all admins
- View profiles table structure

**2. `sql-migrations/restore-admin-status.sql`**
- Restore admin status for your account
- Verify the change worked
- Template for future admin creation

---

## Expected Results After Fix

### Before Fix:
```
User Type: user
Admin Button: Visible but doesn't work
Delete Action: ❌ "Permission denied"
```

### After Fix:
```
User Type: admin ✅
Admin Button: Visible and working ✅
Delete Action: ✅ Successfully deletes
Console: "🗑️ Attempting to delete..." ✅
```

---

## Testing Admin Access

After restoring admin status, test these actions:

**Test 1: View Admin Button**
```
1. Go to dashboard
2. Look for "Admin" button in header
3. Should be visible (red button)
```

**Test 2: Delete Community**
```
1. Go to Communities page
2. Find a test community
3. Click "Delete" (admin-only action)
4. Should show success message
5. Community should be removed
```

**Test 3: Delete Content**
```
1. Go to community content
2. Click "Delete" on content
3. Should work without errors
```

**Test 4: Check Console Logs**
```
1. Open browser DevTools (F12)
2. Perform admin action
3. Look for logs:
   ✅ "🔍 Delete community - Admin check: { isAdmin: true }"
   ✅ "🗑️ Attempting to delete community..."
   ✅ "✅ Community deleted successfully"
```

---

## Summary

**Most Likely Issue**: 
Your `user_type` was changed from `'admin'` to `'user'` (either by migration or database reset).

**Quick Fix**:
```sql
UPDATE profiles SET user_type = 'admin' WHERE email = 'your@email.com';
```

**Then**: Hard refresh browser and test admin features.

**If Still Not Working**: 
- Check RLS policies
- Check Vercel logs
- Verify profile exists
- Clear browser cache completely

---

## Need Help?

If admin access still doesn't work after following this guide:

1. Run `check-admin-status.sql` and share the output
2. Check Vercel logs when you try an admin action
3. Check browser console for errors
4. Verify you're signed in with the correct email

The code is correct, so it's likely a database state issue that can be fixed with the SQL queries above! 🔧✅

