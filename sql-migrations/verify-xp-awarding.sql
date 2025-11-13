-- =====================================================
-- VERIFY XP AWARDING IS WORKING
-- =====================================================
-- Check if XP is being awarded correctly
-- =====================================================

-- 1. Check if action types exist
SELECT action_type, xp_amount, description 
FROM public.xp_rewards 
WHERE action_type IN ('join_community', 'vote_content')
ORDER BY action_type;

-- 2. Check recent XP transactions
SELECT 
  user_id,
  action_type,
  amount,
  action_id,
  description,
  created_at
FROM public.xp_transactions
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check if triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_community_join_xp', 'trigger_poll_vote_xp')
ORDER BY event_object_table;

-- 4. Test the award_xp function (replace with actual user_id)
-- SELECT award_xp(
--   'YOUR_USER_ID_HERE'::UUID,
--   'join_community'::VARCHAR(50),
--   'YOUR_COMMUNITY_ID_HERE'::UUID,
--   'Test XP award'::TEXT
-- );

-- 5. Check user XP totals
SELECT 
  ux.user_id,
  ux.total_xp,
  ux.current_tier,
  COUNT(xt.id) as transaction_count
FROM public.user_xp ux
LEFT JOIN public.xp_transactions xt ON xt.user_id = ux.user_id
GROUP BY ux.user_id, ux.total_xp, ux.current_tier
ORDER BY ux.total_xp DESC
LIMIT 10;

