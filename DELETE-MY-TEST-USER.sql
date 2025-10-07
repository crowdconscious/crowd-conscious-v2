-- =====================================================
-- DELETE TEST USER: francisco.blockstrand@gmail.com
-- =====================================================
-- Copy and paste this entire block into Supabase SQL Editor

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'francisco.blockstrand@gmail.com';
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM profiles 
  WHERE email = v_email;
  
  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user: % (ID: %)', v_email, v_user_id;
    
    -- Delete all related data
    RAISE NOTICE 'Deleting user_stats...';
    DELETE FROM user_stats WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Deleting xp_transactions...';
    DELETE FROM xp_transactions WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Deleting community_members...';
    DELETE FROM community_members WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Deleting comments...';
    DELETE FROM comments WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Deleting votes...';
    DELETE FROM votes WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Deleting event_registrations...';
    DELETE FROM event_registrations WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Deleting sponsorships...';
    DELETE FROM sponsorships WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Deleting community_content...';
    DELETE FROM community_content WHERE created_by = v_user_id;
    
    RAISE NOTICE 'Deleting profile...';
    DELETE FROM profiles WHERE id = v_user_id;
    
    RAISE NOTICE '✅ User completely deleted from database!';
    RAISE NOTICE '⚠️  NEXT STEP: Go to Supabase Dashboard → Authentication → Users';
    RAISE NOTICE '⚠️  Find % and click DELETE', v_email;
  ELSE
    RAISE NOTICE '❌ No user found with email: %', v_email;
  END IF;
END $$;

-- Verify deletion
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ User successfully deleted from profiles table'
    ELSE '❌ User still exists in profiles table'
  END as status
FROM profiles 
WHERE email = 'francisco.blockstrand@gmail.com';

