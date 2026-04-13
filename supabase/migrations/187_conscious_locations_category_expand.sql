-- Expand conscious_locations.category allowed values

ALTER TABLE public.conscious_locations
  DROP CONSTRAINT IF EXISTS conscious_locations_category_check;

ALTER TABLE public.conscious_locations
  ADD CONSTRAINT conscious_locations_category_check
  CHECK (category IN (
    'restaurant', 'bar', 'cafe', 'hotel', 'coworking', 'store',
    'brand', 'influencer',
    'festival', 'artist', 'gallery', 'club', 'market',
    'food_truck', 'mezcaleria', 'rooftop', 'gym', 'spa',
    'nonprofit', 'venue', 'other'
  ));
