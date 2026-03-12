# Signup & Profile Creation

## Troubleshooting: "Database error saving new user" (500)

If signup fails with this error, the `on_auth_user_created` trigger is likely failing and rolling back the auth insert. **Immediate fix:** Run `sql-migrations/EMERGENCY-FIX-signup-trigger-causing-500.sql` in Supabase SQL Editor to drop the trigger. Profiles will be created by ensure-profile (auth callback + login) instead.

## Current Flow

1. **Database trigger** (`on_auth_user_created`) — Automatically creates a profile when a user signs up in `auth.users`. This is the primary mechanism.

2. **Signup page** — Calls `supabase.auth.signUp()` only. No ensure-profile call. Shows success/error message.

3. **Auth callback** — When user clicks email confirmation link:
   - Exchanges code for session
   - Calls `/api/auth/ensure-profile` as a **safety net** (trigger should have already created profile)
   - Redirects to `/predictions`

4. **Login page** — After successful sign-in, checks if profile exists. If missing, calls ensure-profile. Catches users who got stuck (e.g. Enrique).

5. **`/api/auth/ensure-profile`** — Backup only. Checks if profile exists; if not, creates it from auth user data.

## Fix Existing Broken Users

Run in Supabase SQL Editor to create profiles for auth users who are missing one:

```sql
-- See sql-migrations/FIX-missing-profiles-from-auth-users.sql
INSERT INTO public.profiles (id, full_name, email, user_type)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1), ''),
  au.email,
  'user'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;
```

## Verify Trigger Exists

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

If missing, see `docs/archives/FIX-SIGNUP-TRIGGER.sql`.
