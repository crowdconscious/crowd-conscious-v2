# Retired: web-only `261_civic_reputation.sql`

**Date retired:** 2026-09-22  
**Why:** Shared Supabase cannot apply both this web migration and the mobile-canonical migration already on `crowdconscious/crowd-conscious-mobile` main (`supabase/migrations/20260922_civic_reputation.sql`). The web schema invented a second design (`civic_reputation_totals`, different reason enums, different `award_civic_reputation` / `get_my_civic_reputation` shapes) that conflicts with mobile.

**Canonical schema = mobile.** Francisco applies **only**  
`crowd-conscious-mobile/supabase/migrations/20260922_civic_reputation.sql`  
once in the shared Supabase project. **Never** apply web `261`.

See `docs/PHASE-3-CIVIC-REPUTATION.md`.

## Restore (do not — for forensic reference only)

1. Copy `261_civic_reputation.sql.txt` back to `supabase/migrations/261_civic_reputation.sql`.
2. That would reintroduce the conflicting schema — only useful to inspect historical web-side intent.
