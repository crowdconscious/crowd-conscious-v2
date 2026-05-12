-- =====================================================
-- FIX: Create profiles for auth users who are missing one
-- =====================================================
-- Run this in Supabase SQL Editor to fix Enrique and any other
-- users who signed up before the trigger existed or when it failed.
--
-- Safe to run multiple times — only inserts for users without a profile.
-- =====================================================

INSERT INTO public.profiles (id, full_name, email, user_type)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1),
    ''
  ),
  au.email,
  'user'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;