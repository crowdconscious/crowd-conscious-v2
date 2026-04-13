-- Allow anonymous submissions via service-role API (e.g. location nominations)
ALTER TABLE public.conscious_inbox
  ALTER COLUMN user_id DROP NOT NULL;
