-- 292 rollback: restores pre-292 grants, view mode, function bodies and search_path.
BEGIN;
ALTER VIEW public.leaderboard_view SET (security_invoker = false);
GRANT EXECUTE ON FUNCTION public.auto_repend_on_threshold_reports() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid,character varying,uuid,text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_module_price(uuid,integer,text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_achievements(uuid,character varying,uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.citizen_signal_anonymous_support_count_trigger() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.citizen_signal_cosign_count_trigger() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid,text,text,text,jsonb) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_treasury_for_community() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_settings() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_stats_on_signup() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_signal_sponsorable_admin_only() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cart_owner_type(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_share_stats(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_enrollment_type(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer,integer,integer) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_treasury_stats(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rank(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_referral_stats(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_trusted_brands() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_market_free(uuid,uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_from_treasury(uuid,numeric,uuid,uuid,text,uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_comment_xp() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_community_join_xp() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_content_approval() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_content_xp() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_event_rsvp_xp() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_poll_vote_xp() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_prediction_trade_history() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_sponsorship_xp() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_vote_xp() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_brand_stats() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_leaderboard_ranks() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_tier_progress(uuid) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_prediction_market(uuid,text) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_prediction_trade(uuid,uuid,text,numeric) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_civic_reputation() TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_civic_reputation_totals() TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_prediction_wallet(uuid) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_location_owner(uuid,uuid) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_prediction_market(uuid,boolean,text,text) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_prediction_market(uuid,boolean) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_vote_reasoning(uuid,text) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_xp_for_perk_redemption(uuid,uuid) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_streak(uuid) TO PUBLIC, anon;
ALTER FUNCTION public.trigger_update_leaderboard_ranks() SECURITY INVOKER RESET search_path;
GRANT EXECUTE ON FUNCTION public.trigger_update_leaderboard_ranks() TO PUBLIC, anon, authenticated;
ALTER FUNCTION public.award_xp(uuid,character varying,uuid,text) RESET search_path;
ALTER FUNCTION public.calculate_module_price(uuid,integer,text) RESET search_path;
ALTER FUNCTION public.calculate_tier_progress(uuid) RESET search_path;
ALTER FUNCTION public.create_notification(uuid,text,text,text,jsonb) RESET search_path;
ALTER FUNCTION public.create_treasury_for_community() RESET search_path;
ALTER FUNCTION public.create_user_settings() RESET search_path;
ALTER FUNCTION public.create_user_stats_on_signup() RESET search_path;
ALTER FUNCTION public.get_cart_owner_type(uuid) RESET search_path;
ALTER FUNCTION public.get_content_share_stats(uuid) RESET search_path;
ALTER FUNCTION public.get_enrollment_type(uuid) RESET search_path;
ALTER FUNCTION public.get_leaderboard(integer,integer,integer) RESET search_path;
ALTER FUNCTION public.get_treasury_stats(uuid) RESET search_path;
ALTER FUNCTION public.get_user_referral_stats(uuid) RESET search_path;
ALTER FUNCTION public.refresh_trusted_brands() RESET search_path;
ALTER FUNCTION public.spend_from_treasury(uuid,numeric,uuid,uuid,text,uuid) RESET search_path;
ALTER FUNCTION public.trigger_comment_xp() RESET search_path;
ALTER FUNCTION public.trigger_community_join_xp() RESET search_path;
ALTER FUNCTION public.trigger_content_approval() RESET search_path;
ALTER FUNCTION public.trigger_content_xp() RESET search_path;
ALTER FUNCTION public.trigger_event_rsvp_xp() RESET search_path;
ALTER FUNCTION public.trigger_poll_vote_xp() RESET search_path;
ALTER FUNCTION public.trigger_sponsorship_xp() RESET search_path;
ALTER FUNCTION public.trigger_vote_xp() RESET search_path;
ALTER FUNCTION public.update_brand_stats() RESET search_path;
ALTER FUNCTION public.update_leaderboard_ranks() RESET search_path;
CREATE OR REPLACE FUNCTION public.get_or_create_prediction_wallet(p_user_id uuid)
 RETURNS prediction_wallets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet public.prediction_wallets;
BEGIN
  SELECT * INTO v_wallet
  FROM public.prediction_wallets
  WHERE user_id = p_user_id;

  IF v_wallet.id IS NULL THEN
    INSERT INTO public.prediction_wallets (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_wallet;
  END IF;

  RETURN v_wallet;
END;
$function$;
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_streak RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_new_streak INTEGER;
  v_streak_bonus INTEGER := 0;
BEGIN
  -- Get or create streak record
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date)
  VALUES (p_user_id, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id;

  -- Check if streak should continue or reset
  IF v_streak.last_activity_date IS NULL THEN
    -- First activity
    v_new_streak := 1;
  ELSIF v_streak.last_activity_date = v_yesterday THEN
    -- Continuing streak
    v_new_streak := v_streak.current_streak + 1;
  ELSIF v_streak.last_activity_date = v_today THEN
    -- Already logged in today
    v_new_streak := v_streak.current_streak;
  ELSE
    -- Streak broken, reset to 1
    v_new_streak := 1;
  END IF;

  -- Update longest streak if needed
  IF v_new_streak > v_streak.longest_streak THEN
    UPDATE public.user_streaks
    SET
      current_streak = v_new_streak,
      longest_streak = v_new_streak,
      last_activity_date = v_today,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.user_streaks
    SET
      current_streak = v_new_streak,
      last_activity_date = v_today,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Award streak bonus XP
  IF v_streak.last_activity_date != v_today THEN
    IF v_new_streak = 7 THEN
      -- 7-day streak bonus
      PERFORM public.award_xp(p_user_id, 'week_streak', NULL, '7-day login streak!');
      v_streak_bonus := 50;
    ELSIF v_new_streak = 30 THEN
      -- 30-day streak bonus
      PERFORM public.award_xp(p_user_id, 'month_streak', NULL, '30-day login streak!');
      v_streak_bonus := 200;
    ELSE
      -- Daily login XP
      PERFORM public.award_xp(p_user_id, 'daily_login', NULL, 'Daily login');
      v_streak_bonus := 10;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'current_streak', v_new_streak,
    'longest_streak', GREATEST(v_new_streak, v_streak.longest_streak),
    'streak_bonus', v_streak_bonus
  );
END;
$function$;
COMMIT;
