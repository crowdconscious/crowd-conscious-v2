-- 293 rollback: original policy expressions + recreate dropped indexes
BEGIN;
ALTER POLICY "Users create own activity responses" ON public."activity_responses"
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "Users update own activity responses" ON public."activity_responses"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users view own activity responses" ON public."activity_responses"
  USING ((auth.uid() = user_id));

ALTER POLICY "Admins can create admin actions" ON public."admin_actions"
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))) AND (admin_id = auth.uid())));

ALTER POLICY "Admins can view admin actions" ON public."admin_actions"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Admin full access agent_content" ON public."agent_content"
  USING ((auth.uid() IN ( SELECT users.id
   FROM auth.users
  WHERE ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text))));

ALTER POLICY "Authenticated can view published agent content" ON public."agent_content"
  USING (((auth.uid() IS NOT NULL) AND (published = true)));

ALTER POLICY "Authenticated read agent_content" ON public."agent_content"
  USING ((auth.role() = 'authenticated'::text));

ALTER POLICY "Admin read agent_runs" ON public."agent_runs"
  USING ((auth.uid() IN ( SELECT users.id
   FROM auth.users
  WHERE ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text))));

ALTER POLICY "app_referral_clicks_owner_select" ON public."app_referral_clicks"
  USING (((ref_handle IS NOT NULL) AND (ref_handle = (auth.uid())::text)));

ALTER POLICY "Authenticated users insert own comment" ON public."blog_comments"
  WITH CHECK (((user_id = auth.uid()) AND (anonymous_participant_id IS NULL)));

ALTER POLICY "Admins manage all blog posts" ON public."blog_posts"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "Influencers manage own blog posts" ON public."blog_posts"
  USING (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'influencer'::text)))) AND (author_id = auth.uid())))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'influencer'::text)))) AND (author_id = auth.uid())));

ALTER POLICY "Users can add to own cart" ON public."cart_items"
  WITH CHECK (((user_id = auth.uid()) OR (corporate_account_id IN ( SELECT profiles.corporate_account_id
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_role = 'admin'::text))))));

ALTER POLICY "Users can delete from own cart" ON public."cart_items"
  USING (((user_id = auth.uid()) OR (corporate_account_id IN ( SELECT profiles.corporate_account_id
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_role = 'admin'::text))))));

ALTER POLICY "Users can update own cart" ON public."cart_items"
  USING (((user_id = auth.uid()) OR (corporate_account_id IN ( SELECT profiles.corporate_account_id
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_role = 'admin'::text))))));

ALTER POLICY "Users can view own cart" ON public."cart_items"
  USING (((user_id = auth.uid()) OR (corporate_account_id IN ( SELECT profiles.corporate_account_id
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_role = 'admin'::text))))));

ALTER POLICY "View own certifications" ON public."certifications"
  USING (((auth.uid() = employee_id) OR (corporate_account_id IN ( SELECT corporate_accounts.id
   FROM corporate_accounts
  WHERE (corporate_accounts.admin_user_id = auth.uid())))));

ALTER POLICY "cities_admin_all" ON public."cities"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "citizen_signal_anonymous_supports_admin_all" ON public."citizen_signal_anonymous_supports"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "citizen_signal_comments_admin_all" ON public."citizen_signal_comments"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "citizen_signal_comments_insert_published" ON public."citizen_signal_comments"
  WITH CHECK (((author_user_id = auth.uid()) AND is_signal_published(signal_id)));

ALTER POLICY "citizen_signal_cosigns_admin_all" ON public."citizen_signal_cosigns"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "citizen_signal_cosigns_self_select" ON public."citizen_signal_cosigns"
  USING ((user_id = auth.uid()));

ALTER POLICY "citizen_signal_evidence_admin_all" ON public."citizen_signal_evidence"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "citizen_signal_evidence_author_select" ON public."citizen_signal_evidence"
  USING ((EXISTS ( SELECT 1
   FROM citizen_signals s
  WHERE ((s.id = citizen_signal_evidence.signal_id) AND (s.author_user_id = auth.uid())))));

ALTER POLICY "citizen_signal_evidence_public_or_author_select" ON public."citizen_signal_evidence"
  USING (((visibility = 'public'::text) OR (EXISTS ( SELECT 1
   FROM citizen_signals s
  WHERE ((s.id = citizen_signal_evidence.signal_id) AND (s.author_user_id = auth.uid()))))));

ALTER POLICY "citizen_signal_moderation_events_admin_all" ON public."citizen_signal_moderation_events"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "citizen_signal_responses_admin_all" ON public."citizen_signal_responses"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "citizen_signal_subscriptions_admin_all" ON public."citizen_signal_subscriptions"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "citizen_signal_subscriptions_self" ON public."citizen_signal_subscriptions"
  USING ((user_id = auth.uid()));

ALTER POLICY "citizen_signals_admin_all" ON public."citizen_signals"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "citizen_signals_author_select" ON public."citizen_signals"
  USING ((author_user_id = auth.uid()));

ALTER POLICY "citizen_signals_insert_observation" ON public."citizen_signals"
  WITH CHECK (((author_user_id = auth.uid()) AND (routing_mode = 'observation'::signal_routing_mode) AND (citizen_target_id IS NULL) AND (conscious_location_id IS NULL) AND (target_kind IS NULL) AND (country_code IS NOT NULL) AND (city_slug IS NOT NULL) AND (char_length(city_slug) >= 2)));

ALTER POLICY "citizen_signals_insert_routed" ON public."citizen_signals"
  WITH CHECK (((author_user_id = auth.uid()) AND (routing_mode = 'routed'::signal_routing_mode) AND (country_code IS NOT NULL) AND (city_slug IS NOT NULL) AND (((target_kind = ANY (ARRAY['municipality'::text, 'institution'::text])) AND (citizen_target_id IS NOT NULL) AND (conscious_location_id IS NOT NULL)) OR ((target_kind = ANY (ARRAY['company'::text, 'neighborhood'::text])) AND (citizen_target_id IS NULL) AND (target_name IS NOT NULL)) OR ((target_kind = 'conscious_location'::text) AND (citizen_target_id IS NULL) AND (target_location_id IS NOT NULL)))));

ALTER POLICY "citizen_target_access_tokens_admin_all" ON public."citizen_target_access_tokens"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "citizen_targets_admin_all" ON public."citizen_targets"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "civic_rep_events_select_own" ON public."civic_reputation_events"
  USING ((user_id = auth.uid()));

ALTER POLICY "civic_rep_scores_select_own" ON public."civic_reputation_scores"
  USING ((user_id = auth.uid()));

ALTER POLICY "Authenticated users can create comments" ON public."comments"
  WITH CHECK (((auth.uid() IS NOT NULL) AND (auth.uid() = user_id)));

ALTER POLICY "Users can create comments" ON public."comments"
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "Users can delete own comments" ON public."comments"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can delete their own comments" ON public."comments"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can update own comments" ON public."comments"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can update their own comments" ON public."comments"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "Authenticated can view conscious fund transactions" ON public."conscious_fund_transactions"
  USING ((auth.uid() IS NOT NULL));

ALTER POLICY "Users can submit" ON public."conscious_inbox"
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "Admins manage locations" ON public."conscious_locations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "owners_claim_conscious_location_by_email" ON public."conscious_locations"
  USING (((owner_profile_id IS NULL) AND (contact_email IS NOT NULL) AND (lower(contact_email) = ( SELECT lower(p.email) AS lower
   FROM profiles p
  WHERE (p.id = auth.uid())))))
  WITH CHECK ((owner_profile_id = auth.uid()));

ALTER POLICY "owners_read_own_conscious_location" ON public."conscious_locations"
  USING (is_location_owner(id, auth.uid()));

ALTER POLICY "content_reports_insert_own" ON public."content_reports"
  WITH CHECK ((reporter_id = auth.uid()));

ALTER POLICY "content_reports_select_own_or_admin" ON public."content_reports"
  USING (((reporter_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text))))));

ALTER POLICY "content_reports_update_admin" ON public."content_reports"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Corporate admins can update own account" ON public."corporate_accounts"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_account_id = corporate_accounts.id) AND (profiles.corporate_role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_account_id = corporate_accounts.id) AND (profiles.corporate_role = 'admin'::text)))));

ALTER POLICY "Corporate admins can view own account" ON public."corporate_accounts"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_account_id = corporate_accounts.id) AND (profiles.corporate_role = 'admin'::text)))));

ALTER POLICY "Admins manage coupon_codes" ON public."coupon_codes"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "Admins read coupon_redemptions" ON public."coupon_redemptions"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "Corporate admins view company enrollments" ON public."course_enrollments"
  USING ((corporate_account_id IN ( SELECT corporate_accounts.id
   FROM corporate_accounts
  WHERE (corporate_accounts.admin_user_id = auth.uid()))));

ALTER POLICY "Employees and admins can update their own enrollment progress" ON public."course_enrollments"
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER POLICY "Employees and admins can view own enrollments" ON public."course_enrollments"
  USING ((user_id = auth.uid()));

ALTER POLICY "Employees view own enrollments" ON public."course_enrollments"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can create enrollments" ON public."course_enrollments"
  WITH CHECK ((((user_id = auth.uid()) AND (corporate_account_id IS NULL)) OR (corporate_account_id IN ( SELECT profiles.corporate_account_id
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_role = 'admin'::text))))));

ALTER POLICY "Users can update own enrollments" ON public."course_enrollments"
  USING (((user_id = auth.uid()) OR (corporate_account_id IN ( SELECT profiles.corporate_account_id
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_role = 'admin'::text))))));

ALTER POLICY "Users can view own enrollments" ON public."course_enrollments"
  USING (((user_id = auth.uid()) OR (corporate_account_id IN ( SELECT profiles.corporate_account_id
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_role = 'admin'::text))))));

ALTER POLICY "authenticated_users_can_insert_own_enrollments" ON public."course_enrollments"
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "authenticated_users_can_update_own_enrollments" ON public."course_enrollments"
  USING ((auth.uid() = user_id));

ALTER POLICY "authenticated_users_can_view_own_enrollments" ON public."course_enrollments"
  USING ((auth.uid() = user_id));

ALTER POLICY "Corporate users view assigned courses" ON public."courses"
  USING ((id IN ( SELECT ce.course_id
   FROM course_enrollments ce
  WHERE (ce.user_id = auth.uid()))));

ALTER POLICY "Platform admins view all courses" ON public."courses"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Admins manage creator certifications" ON public."creator_certifications"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "creator_sponsorships_creator_select_own" ON public."creator_sponsorships"
  USING ((creator_id = auth.uid()));

ALTER POLICY "Admins can create any deletion request" ON public."deletion_requests"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Admins can update deletion requests" ON public."deletion_requests"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Admins can view all deletion requests" ON public."deletion_requests"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Users can view their own deletion requests" ON public."deletion_requests"
  USING ((requested_by = auth.uid()));

ALTER POLICY "deletion_requests_insert_own" ON public."deletion_requests"
  WITH CHECK ((requested_by = auth.uid()));

ALTER POLICY "Corporate admins can manage invitations" ON public."employee_invitations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_account_id = employee_invitations.corporate_account_id) AND (profiles.corporate_role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_account_id = employee_invitations.corporate_account_id) AND (profiles.corporate_role = 'admin'::text)))));

ALTER POLICY "Users can view own invitations" ON public."employee_invitations"
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (lower(profiles.email) = lower(employee_invitations.email))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_account_id = employee_invitations.corporate_account_id) AND (profiles.corporate_role = 'admin'::text))))));

ALTER POLICY "Users create own ESG reports" ON public."esg_reports"
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "Users update own ESG reports" ON public."esg_reports"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users view own ESG reports" ON public."esg_reports"
  USING (((auth.uid() = user_id) OR (is_public = true) OR (corporate_account_id IN ( SELECT profiles.corporate_account_id
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.corporate_role = 'admin'::text))))));

ALTER POLICY "Users can insert own votes" ON public."fund_votes"
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "Users can unvote" ON public."inbox_votes"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can vote" ON public."inbox_votes"
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "influencer_payouts_creator_select_own" ON public."influencer_payouts"
  USING ((creator_id = auth.uid()));

ALTER POLICY "authenticated_users_delete_own_responses" ON public."lesson_responses"
  USING ((enrollment_id IN ( SELECT course_enrollments.id
   FROM course_enrollments
  WHERE (course_enrollments.user_id = auth.uid()))));

ALTER POLICY "authenticated_users_insert_own_responses" ON public."lesson_responses"
  WITH CHECK ((enrollment_id IN ( SELECT course_enrollments.id
   FROM course_enrollments
  WHERE (course_enrollments.user_id = auth.uid()))));

ALTER POLICY "authenticated_users_select_own_responses" ON public."lesson_responses"
  USING ((enrollment_id IN ( SELECT course_enrollments.id
   FROM course_enrollments
  WHERE (course_enrollments.user_id = auth.uid()))));

ALTER POLICY "authenticated_users_update_own_responses" ON public."lesson_responses"
  USING ((enrollment_id IN ( SELECT course_enrollments.id
   FROM course_enrollments
  WHERE (course_enrollments.user_id = auth.uid()))))
  WITH CHECK ((enrollment_id IN ( SELECT course_enrollments.id
   FROM course_enrollments
  WHERE (course_enrollments.user_id = auth.uid()))));

ALTER POLICY "Users insert own auction vote" ON public."live_auction_votes"
  WITH CHECK (((user_id = auth.uid()) AND (anonymous_participant_id IS NULL)));

ALTER POLICY "Users update own auction vote" ON public."live_auction_votes"
  USING ((user_id = auth.uid()))
  WITH CHECK (((user_id = auth.uid()) AND (anonymous_participant_id IS NULL)));

ALTER POLICY "location_comments_admin_all" ON public."location_comments"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "location_comments_author_delete" ON public."location_comments"
  USING ((user_id = auth.uid()));

ALTER POLICY "location_comments_insert_own" ON public."location_comments"
  WITH CHECK ((user_id = auth.uid()));

ALTER POLICY "admins_manage_location_offers" ON public."location_offers"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "owners_manage_own_location_offers" ON public."location_offers"
  USING (is_location_owner(location_id, auth.uid()))
  WITH CHECK (is_location_owner(location_id, auth.uid()));

ALTER POLICY "owners_read_own_location_offers" ON public."location_offers"
  USING (is_location_owner(location_id, auth.uid()));

ALTER POLICY "admins_manage_location_redemptions" ON public."location_redemptions"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "owners_confirm_location_redemptions" ON public."location_redemptions"
  USING ((EXISTS ( SELECT 1
   FROM location_offers lo
  WHERE ((lo.id = location_redemptions.offer_id) AND is_location_owner(lo.location_id, auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM location_offers lo
  WHERE ((lo.id = location_redemptions.offer_id) AND is_location_owner(lo.location_id, auth.uid())))));

ALTER POLICY "owners_read_location_redemptions" ON public."location_redemptions"
  USING ((EXISTS ( SELECT 1
   FROM location_offers lo
  WHERE ((lo.id = location_redemptions.offer_id) AND is_location_owner(lo.location_id, auth.uid())))));

ALTER POLICY "users_read_own_redemptions" ON public."location_redemptions"
  USING ((user_id = auth.uid()));

ALTER POLICY "Authenticated users can comment" ON public."market_comments"
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "market_vote_selections_select_own" ON public."market_vote_selections"
  USING ((EXISTS ( SELECT 1
   FROM market_votes mv
  WHERE ((mv.id = market_vote_selections.vote_id) AND (mv.user_id = auth.uid())))));

ALTER POLICY "Authenticated users can vote" ON public."market_votes"
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "Admins can manage all modules" ON public."marketplace_modules"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Anyone can view published modules" ON public."marketplace_modules"
  USING (((status = 'published'::text) OR (auth.uid() IS NOT NULL)));

ALTER POLICY "Creators can insert their own modules" ON public."marketplace_modules"
  WITH CHECK ((creator_user_id = auth.uid()));

ALTER POLICY "Creators can update their own modules" ON public."marketplace_modules"
  USING ((creator_user_id = auth.uid()));

ALTER POLICY "Anyone can view lessons of published modules" ON public."module_lessons"
  USING ((EXISTS ( SELECT 1
   FROM marketplace_modules
  WHERE ((marketplace_modules.id = module_lessons.module_id) AND ((marketplace_modules.status = 'published'::text) OR (marketplace_modules.creator_user_id = auth.uid()))))));

ALTER POLICY "Creators can manage their module lessons" ON public."module_lessons"
  USING ((EXISTS ( SELECT 1
   FROM marketplace_modules
  WHERE ((marketplace_modules.id = module_lessons.module_id) AND (marketplace_modules.creator_user_id = auth.uid())))));

ALTER POLICY "Employees update own progress" ON public."module_progress"
  USING ((enrollment_id IN ( SELECT course_enrollments.id
   FROM course_enrollments
  WHERE (course_enrollments.user_id = auth.uid()))));

ALTER POLICY "Users can create module reviews" ON public."module_reviews"
  WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM course_enrollments
  WHERE ((course_enrollments.user_id = auth.uid()) AND (course_enrollments.module_id = module_reviews.module_id))))));

ALTER POLICY "Users can delete own module reviews" ON public."module_reviews"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can update own module reviews" ON public."module_reviews"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "Admins read newsletter subscribers" ON public."newsletter_subscribers"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "Users can read own notifications" ON public."notifications"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can update own notifications" ON public."notifications"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can update their own notifications" ON public."notifications"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can view their own notifications" ON public."notifications"
  USING ((auth.uid() = user_id));

ALTER POLICY "Admins can view payment transactions" ON public."payment_transactions"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Only admins can modify platform settings" ON public."platform_settings"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Users can view own prediction deposits" ON public."prediction_deposits"
  USING ((user_id = auth.uid()));

ALTER POLICY "Authenticated can view prediction market history" ON public."prediction_market_history"
  USING ((auth.uid() IS NOT NULL));

ALTER POLICY "creator_read_own_markets" ON public."prediction_markets"
  USING ((created_by = auth.uid()));

ALTER POLICY "System can manage prediction positions" ON public."prediction_positions"
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER POLICY "Users can view own prediction positions" ON public."prediction_positions"
  USING ((user_id = auth.uid()));

ALTER POLICY "Authenticated can insert prediction trades" ON public."prediction_trades"
  WITH CHECK ((user_id = auth.uid()));

ALTER POLICY "Users can view own prediction trades" ON public."prediction_trades"
  USING ((user_id = auth.uid()));

ALTER POLICY "Users can insert own prediction wallet" ON public."prediction_wallets"
  WITH CHECK ((user_id = auth.uid()));

ALTER POLICY "Users can update own prediction wallet" ON public."prediction_wallets"
  USING ((user_id = auth.uid()));

ALTER POLICY "Users can view own prediction wallet" ON public."prediction_wallets"
  USING ((user_id = auth.uid()));

ALTER POLICY "Users can delete own profile" ON public."profiles"
  USING ((auth.uid() = id));

ALTER POLICY "Users can update own profile" ON public."profiles"
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));

ALTER POLICY "Admins can view all promo code uses" ON public."promo_code_uses"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Users can insert own promo code uses" ON public."promo_code_uses"
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "Users can view own promo code uses" ON public."promo_code_uses"
  USING ((auth.uid() = user_id));

ALTER POLICY "Admins can delete promo codes" ON public."promo_codes"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Admins can insert promo codes" ON public."promo_codes"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Admins can update promo codes" ON public."promo_codes"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Admins can view all promo codes" ON public."promo_codes"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "push_tokens_delete_own" ON public."push_tokens"
  USING ((user_id = auth.uid()));

ALTER POLICY "push_tokens_insert_own" ON public."push_tokens"
  WITH CHECK ((user_id = auth.uid()));

ALTER POLICY "push_tokens_select_own" ON public."push_tokens"
  USING ((user_id = auth.uid()));

ALTER POLICY "push_tokens_update_own" ON public."push_tokens"
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER POLICY "recognition_events_admin_select" ON public."recognition_events"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "recognitions_admin_select" ON public."recognitions"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "Authenticated can view sentiment scores" ON public."sentiment_scores"
  USING ((auth.uid() IS NOT NULL));

ALTER POLICY "users_read_own_sponsor_accounts" ON public."sponsor_accounts"
  USING (((user_id = auth.uid()) OR ((contact_email IS NOT NULL) AND (lower(contact_email) = ( SELECT lower(p.email) AS lower
   FROM profiles p
  WHERE (p.id = auth.uid()))))));

ALTER POLICY "sponsor_pulse_reports_admin_all" ON public."sponsor_pulse_reports"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.user_type = 'admin'::text)))));

ALTER POLICY "Users can view own achievements" ON public."user_achievements"
  USING ((auth.uid() = user_id));

ALTER POLICY "user_blocks_delete_own" ON public."user_blocks"
  USING ((blocker_id = auth.uid()));

ALTER POLICY "user_blocks_insert_own" ON public."user_blocks"
  WITH CHECK ((blocker_id = auth.uid()));

ALTER POLICY "user_blocks_select_own" ON public."user_blocks"
  USING ((blocker_id = auth.uid()));

ALTER POLICY "Users can follow others" ON public."user_follows"
  WITH CHECK ((auth.uid() = follower_id));

ALTER POLICY "Users can unfollow others" ON public."user_follows"
  USING ((auth.uid() = follower_id));

ALTER POLICY "Users can update own preferences" ON public."user_preferences"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can delete own settings" ON public."user_settings"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can insert own settings" ON public."user_settings"
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "Users can update own settings" ON public."user_settings"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

ALTER POLICY "Users can view own settings" ON public."user_settings"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can update own stats" ON public."user_stats"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can view own streaks" ON public."user_streaks"
  USING ((auth.uid() = user_id));

ALTER POLICY "Users can view own XP details" ON public."user_xp"
  USING ((auth.uid() = user_id));

ALTER POLICY "Super admins can view all transactions" ON public."wallet_transactions"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Users can view their wallet transactions" ON public."wallet_transactions"
  USING ((wallet_id IN ( SELECT wallets.id
   FROM wallets
  WHERE (wallets.owner_id = auth.uid()))));

ALTER POLICY "Creators can view their wallet" ON public."wallets"
  USING (((owner_type = 'user'::text) AND (owner_id = auth.uid())));

ALTER POLICY "Super admins can view all wallets" ON public."wallets"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Admins can manage XP rewards" ON public."xp_rewards"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));

ALTER POLICY "Users can view own transactions" ON public."xp_transactions"
  USING ((auth.uid() = user_id));

CREATE INDEX IF NOT EXISTS idx_activity_responses_enrollment_id ON public.activity_responses USING btree (enrollment_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_lesson_id ON public.activity_responses USING btree (lesson_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_module_id ON public.activity_responses USING btree (module_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_user_id ON public.activity_responses USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_name ON public.agent_runs USING btree (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON public.agent_runs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts USING btree (author_id);
CREATE INDEX IF NOT EXISTS idx_certifications_verification ON public.certifications USING btree (verification_code);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_pred_markets_category ON public.prediction_markets USING btree (category);
COMMIT;
