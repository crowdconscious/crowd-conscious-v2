# Retired: /signals/acerca feature intro

**Date retired:** 2026-09-21  
**Why:** Phase 0 UX Product Spec — demote/kill methodology-first feature intro. Verb-first product: land people on Reportar (/signals or /signals/nueva), not an explainer page.

**SEO / inbound-link risk:** External links and share cards pointing at `/signals/acerca` will 308 to `/signals`. Francisco must OK the redirect before production merge.

## Restore

1. Remove the `/signals/acerca` → `/signals` rule from `next.config.ts` `redirects()`.
2. Copy `page.txt` back to `app/signals/acerca/page.tsx`.
3. Restore teaser/feed links that previously pointed at `/signals/acerca` if desired.
