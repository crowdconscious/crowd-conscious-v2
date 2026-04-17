-- ============================================================================
-- Seed latitude/longitude for the founding Conscious Locations so the map view
-- on /locations actually has pins to render. The columns have existed since
-- migration 186 but the initial seeds left them NULL, which made the "Mapa"
-- toggle visually empty even though the listing worked fine.
--
-- Coordinates are approximate neighborhood centers pulled from public records
-- (OSM / Google Maps). Admin can refine via the /locations/admin UI later.
-- ============================================================================

UPDATE public.conscious_locations
SET latitude = 19.4285, longitude = -99.1480
WHERE latitude IS NULL
  AND (slug ILIKE 'club-reset%' OR name ILIKE '%Club Reset%');

UPDATE public.conscious_locations
SET latitude = 19.4093, longitude = -99.1712
WHERE latitude IS NULL
  AND (slug ILIKE 'magenta%' OR name ILIKE '%Magenta%');

UPDATE public.conscious_locations
SET latitude = 20.9146, longitude = -100.7452
WHERE latitude IS NULL
  AND (slug ILIKE 'cabra-de-monte%' OR name ILIKE '%Cabra%');
