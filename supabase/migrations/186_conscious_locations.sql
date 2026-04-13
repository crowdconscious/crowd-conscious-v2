-- Conscious Locations — community-certified venues and brands

CREATE TABLE IF NOT EXISTS public.conscious_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'restaurant'
    CHECK (category IN ('restaurant', 'bar', 'cafe', 'hotel',
      'coworking', 'store', 'brand', 'influencer', 'other')),

  city text NOT NULL DEFAULT 'CDMX',
  neighborhood text,
  address text,
  latitude numeric,
  longitude numeric,

  description text,
  description_en text,
  why_conscious text,
  why_conscious_en text,
  user_benefits text,
  user_benefits_en text,

  instagram_handle text,
  website_url text,
  contact_email text,
  phone text,

  logo_url text,
  cover_image_url text,

  conscious_score numeric,
  approval_rate numeric,
  avg_confidence numeric,
  total_votes integer DEFAULT 0 NOT NULL,

  current_market_id uuid REFERENCES public.prediction_markets(id),

  sponsor_account_id uuid REFERENCES public.sponsor_accounts(id),

  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'under_review',
      'suspended', 'revoked')),
  certified_at timestamptz,
  certified_by uuid REFERENCES public.profiles(id),
  next_review_date timestamptz,

  is_featured boolean DEFAULT false NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,

  nomination_count integer DEFAULT 0 NOT NULL,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_locations_city ON public.conscious_locations(city);
CREATE INDEX IF NOT EXISTS idx_locations_status ON public.conscious_locations(status);
CREATE INDEX IF NOT EXISTS idx_locations_category ON public.conscious_locations(category);
CREATE INDEX IF NOT EXISTS idx_locations_slug ON public.conscious_locations(slug);

ALTER TABLE public.conscious_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active locations" ON public.conscious_locations;
CREATE POLICY "Anyone can view active locations"
  ON public.conscious_locations FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Admins manage locations" ON public.conscious_locations;
CREATE POLICY "Admins manage locations"
  ON public.conscious_locations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin'
  ));
