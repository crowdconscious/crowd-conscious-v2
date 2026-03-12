-- =====================================================
-- EMERGENCY FIX: "Database error saving new user" on signup
-- =====================================================
-- The on_auth_user_created trigger runs AFTER INSERT on auth.users.
-- If it fails, PostgreSQL rolls back the entire transaction, causing
-- Supabase to return "Database error saving new user" (500).
--
-- OPTION 1: Disable the trigger (recommended for immediate fix)
-- Signup will work. Profiles are created by ensure-profile in:
-- - Auth callback (when user clicks confirmation link)
-- - Login page (when user signs in)
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Verify it's gone
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
-- Should return no rows

-- =====================================================
-- OPTION 2: If you prefer to keep the trigger, recreate it
-- with bulletproof error handling (run this instead of Option 1)
-- =====================================================
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''), '@', 1), ''),
    'user'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN foreign_key_violation THEN
    RAISE WARNING 'handle_new_user: FK violation for %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: % for user %', SQLERRM, NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
*/
