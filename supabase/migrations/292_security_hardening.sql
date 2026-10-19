-- 292_security_hardening.sql
-- Prepared 2026-10-19 from the Supabase security advisor (project ottixfzdytnzxquzrrcf).
-- PREREQUISITE: deploy the web code from the same PR FIRST (award_xp / check_achievements /
-- resolve_market_free callers moved to the service-role client), then apply this migration.
-- Idempotent: safe to re-run. Rollback: supabase/sql-manual/292_security_hardening_rollback.sql
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Views: leaderboard_view -> security_invoker.
--    Base tables (user_xp, user_stats, profiles) already have public SELECT
--    policies, so anon/authenticated see exactly the same rows. The other 6
--    SECURITY DEFINER views are intentionally definer: their base tables have NO
--    anon SELECT policy and the views are the column/row-limited public surface.
-- ---------------------------------------------------------------------------
ALTER VIEW public.leaderboard_view SET (security_invoker = true);

COMMENT ON VIEW public.citizen_signals_public IS 'Intentionally SECURITY DEFINER (reviewed 2026-10-19, mig 292): published signals only, ops/author columns stripped. Base table has no anon SELECT policy.';
COMMENT ON VIEW public.citizen_targets_public IS 'Intentionally SECURITY DEFINER (reviewed 2026-10-19, mig 292): public target columns only. Base table has no anon SELECT policy.';
COMMENT ON VIEW public.recognitions_public IS 'Intentionally SECURITY DEFINER (reviewed 2026-10-19, mig 292): approved recognitions only, no submitter PII. Base table has no anon SELECT policy.';
COMMENT ON VIEW public.conscious_fund_contributions_totals IS 'Intentionally SECURITY DEFINER (reviewed 2026-10-19, mig 292): aggregates only. Base table has no anon SELECT policy.';
COMMENT ON VIEW public.conscious_fund_distributions_totals IS 'Intentionally SECURITY DEFINER (reviewed 2026-10-19, mig 292): aggregates only. Base table has no anon SELECT policy.';
COMMENT ON VIEW public.revealed_simulation_runs IS 'Intentionally SECURITY DEFINER (reviewed 2026-10-19, mig 292): revealed runs only. Base table has no anon SELECT policy.';

-- ---------------------------------------------------------------------------
-- 2. (c) Server / service-role / trigger-only SECURITY DEFINER functions:
--    revoke from PUBLIC, anon, authenticated. Trigger functions keep firing
--    (EXECUTE is not checked when a trigger fires).
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.auto_repend_on_threshold_reports() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_repend_on_threshold_reports() TO service_role;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid,character varying,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid,character varying,uuid,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.calculate_module_price(uuid,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_module_price(uuid,integer,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.check_achievements(uuid,character varying,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_achievements(uuid,character varying,uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.citizen_signal_anonymous_support_count_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.citizen_signal_anonymous_support_count_trigger() TO service_role;
REVOKE EXECUTE ON FUNCTION public.citizen_signal_cosign_count_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.citizen_signal_cosign_count_trigger() TO service_role;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid,text,text,text,jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.create_treasury_for_community() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_treasury_for_community() TO service_role;
REVOKE EXECUTE ON FUNCTION public.create_user_settings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_settings() TO service_role;
REVOKE EXECUTE ON FUNCTION public.create_user_stats_on_signup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_stats_on_signup() TO service_role;
REVOKE EXECUTE ON FUNCTION public.enforce_signal_sponsorable_admin_only() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_signal_sponsorable_admin_only() TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_cart_owner_type(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cart_owner_type(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_content_share_stats(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_share_stats(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_enrollment_type(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_enrollment_type(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer,integer,integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_treasury_stats(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_treasury_stats(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_user_rank(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rank(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_user_referral_stats(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_referral_stats(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
REVOKE EXECUTE ON FUNCTION public.refresh_trusted_brands() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_trusted_brands() TO service_role;
REVOKE EXECUTE ON FUNCTION public.resolve_market_free(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_market_free(uuid,uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.spend_from_treasury(uuid,numeric,uuid,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_from_treasury(uuid,numeric,uuid,uuid,text,uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.trigger_comment_xp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_comment_xp() TO service_role;
REVOKE EXECUTE ON FUNCTION public.trigger_community_join_xp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_community_join_xp() TO service_role;
REVOKE EXECUTE ON FUNCTION public.trigger_content_approval() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_content_approval() TO service_role;
REVOKE EXECUTE ON FUNCTION public.trigger_content_xp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_content_xp() TO service_role;
REVOKE EXECUTE ON FUNCTION public.trigger_event_rsvp_xp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_event_rsvp_xp() TO service_role;
REVOKE EXECUTE ON FUNCTION public.trigger_poll_vote_xp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_poll_vote_xp() TO service_role;
REVOKE EXECUTE ON FUNCTION public.trigger_prediction_trade_history() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_prediction_trade_history() TO service_role;
REVOKE EXECUTE ON FUNCTION public.trigger_sponsorship_xp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_sponsorship_xp() TO service_role;
REVOKE EXECUTE ON FUNCTION public.trigger_vote_xp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_vote_xp() TO service_role;
REVOKE EXECUTE ON FUNCTION public.update_brand_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_brand_stats() TO service_role;
REVOKE EXECUTE ON FUNCTION public.update_leaderboard_ranks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_leaderboard_ranks() TO service_role;

-- trigger_update_leaderboard_ranks (on public.leaderboards) is SECURITY INVOKER and calls
-- update_leaderboard_ranks(); make it definer so it keeps working after the revoke above.
ALTER FUNCTION public.trigger_update_leaderboard_ranks() SECURITY DEFINER SET search_path = public, extensions, pg_temp;
REVOKE EXECUTE ON FUNCTION public.trigger_update_leaderboard_ranks() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. (b) Called only by signed-in users: revoke anon (and PUBLIC), keep authenticated.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.calculate_tier_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_tier_progress(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.cancel_prediction_market(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_prediction_market(uuid,text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.execute_prediction_trade(uuid,uuid,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_prediction_trade(uuid,uuid,text,numeric) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_my_civic_reputation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_civic_reputation() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_my_civic_reputation_totals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_civic_reputation_totals() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_or_create_prediction_wallet(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_prediction_wallet(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_location_owner(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_location_owner(uuid,uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.resolve_prediction_market(uuid,boolean,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_prediction_market(uuid,boolean,text,text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.resolve_prediction_market(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_prediction_market(uuid,boolean) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.set_vote_reasoning(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_vote_reasoning(uuid,text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.spend_xp_for_perk_redemption(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_xp_for_perk_redemption(uuid,uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.update_user_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_streak(uuid) TO authenticated, service_role;

-- Ownership guards: these took an arbitrary p_user_id with no check.
-- auth.role() is 'anon'/'authenticated' for PostgREST callers, 'service_role' for the
-- admin client and NULL for direct postgres/cron/trigger callers (those are allowed).
CREATE OR REPLACE FUNCTION public.get_or_create_prediction_wallet(p_user_id uuid)
 RETURNS prediction_wallets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet public.prediction_wallets;
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated')
     AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized' USING errcode = '42501';
  END IF;

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
 SET search_path TO 'public'
AS $function$
DECLARE
  v_streak RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_new_streak INTEGER;
  v_streak_bonus INTEGER := 0;
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated')
     AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized' USING errcode = '42501';
  END IF;

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

-- ---------------------------------------------------------------------------
-- 4. (a) Public (anon) RPCs kept: get_market_trades_anon, get_profiles_public,
--    get_pulse_outcome_aggregates, increment_blog_post_view, increment_blog_view
--    (web + mobile), is_admin / is_signal_published (used inside RLS policies
--    that apply to anon). All are read-only or a +1 counter and already pin search_path.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 5. Pin search_path on the remaining SECURITY DEFINER functions that lacked it.
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.award_xp(uuid,character varying,uuid,text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.calculate_module_price(uuid,integer,text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.calculate_tier_progress(uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.create_notification(uuid,text,text,text,jsonb) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.create_treasury_for_community() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.create_user_settings() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.create_user_stats_on_signup() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.get_cart_owner_type(uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.get_content_share_stats(uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.get_enrollment_type(uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.get_leaderboard(integer,integer,integer) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.get_treasury_stats(uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.get_user_referral_stats(uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.refresh_trusted_brands() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.spend_from_treasury(uuid,numeric,uuid,uuid,text,uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.trigger_comment_xp() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.trigger_community_join_xp() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.trigger_content_approval() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.trigger_content_xp() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.trigger_event_rsvp_xp() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.trigger_poll_vote_xp() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.trigger_sponsorship_xp() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.trigger_vote_xp() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.update_brand_stats() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.update_leaderboard_ranks() SET search_path = public, extensions, pg_temp;

COMMIT;
