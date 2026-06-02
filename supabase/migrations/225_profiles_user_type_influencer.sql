-- Migration 223 (influencer blog editor) assumes profiles.user_type = 'influencer'
-- but did not widen profiles_user_type_check; UPDATEs to 'influencer' fail until this runs.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('user', 'brand', 'admin', 'influencer'));
