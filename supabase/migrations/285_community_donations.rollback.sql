-- Rollback 285_community_donations.
-- WARNING: drops donation records. Fund credits already applied stay in conscious_fund /
-- conscious_fund_transactions (source_type='donation', description LIKE 'Patrocinio comunitario%');
-- reverse them manually only if needed.
DROP FUNCTION IF EXISTS public.credit_community_donation(text);
DROP TABLE IF EXISTS public.community_donations;
