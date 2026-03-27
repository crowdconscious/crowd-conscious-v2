-- ============================================================
-- 153: Safe profile display for client-side leaderboards
-- ============================================================
-- Exposes only id, full_name, avatar_url (no email) to anon/authenticated
-- callers without opening full SELECT on profiles.

CREATE OR REPLACE FUNCTION public.get_profiles_public(p_ids uuid[])
RETURNS TABLE (id uuid, full_name text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(p_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_profiles_public(uuid[]) TO anon, authenticated;

COMMENT ON FUNCTION public.get_profiles_public IS
  'Leaderboard / live UI: display names and avatars without exposing email.';
