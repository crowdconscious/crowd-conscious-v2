-- Reset demo/seed balances so production reflects real sponsor + fee inflows only.
-- conscious_fund is updated by Stripe webhooks and trade RPCs; old seed scripts inserted ~15.4k MXN.
--
-- If you already have real rows in conscious_fund_transactions from production payments,
-- remove the DELETE below and reconcile balances manually instead of wiping history.

UPDATE public.conscious_fund
SET
  current_balance = 0,
  total_collected = 0,
  total_disbursed = 0,
  updated_at = now()
WHERE true;

DELETE FROM public.conscious_fund_transactions;
