# Retired: 301_ciceron_seed (auth.users inserts)

**Date retired:** 2026-11-10  
**Why:** Inserting into `auth.users` fires `on_auth_user_created` → `public.profiles` / `user_settings`, leaking Cicéron demo personas into Crowd Conscious. Violates isolation.

**Replace with:** `supabase/migrations/302_ciceron_seed_prod_safe.sql` (demo personas, no auth.users).

**Restore (not recommended on this product DB):** rename the `.txt` back into `supabase/migrations/` only on an isolated throwaway project with no profile trigger.
