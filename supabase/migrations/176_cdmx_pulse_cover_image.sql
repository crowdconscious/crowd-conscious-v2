-- CDMX Pulse market hero: static asset deployed at /images/pulse-cdmx-world-cup-2026.png
-- Canonical origin matches lib/seo/site.ts default (NEXT_PUBLIC_APP_URL overrides in app, not in SQL).

UPDATE public.prediction_markets
SET
  cover_image_url = 'https://crowdconscious.app/images/pulse-cdmx-world-cup-2026.png',
  updated_at = now()
WHERE id = '365628d5-58bd-4792-8157-d45f18d63344';
