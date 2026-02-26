-- =====================================================
-- 125: FUND CAUSES & VOTING
-- =====================================================
-- Purpose: Add cause voting to Conscious Fund
-- Users vote on which organizations receive grants
-- =====================================================

CREATE TABLE IF NOT EXISTS public.fund_causes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organization TEXT,
  category TEXT CHECK (category IN ('water', 'education', 'environment', 'social_justice', 'health', 'other')),
  website_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fund_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cause_id UUID NOT NULL REFERENCES public.fund_causes(id) ON DELETE CASCADE,
  cycle TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, cause_id, cycle)
);

CREATE INDEX IF NOT EXISTS idx_fund_votes_cycle ON public.fund_votes(cycle);
CREATE INDEX IF NOT EXISTS idx_fund_votes_cause_cycle ON public.fund_votes(cause_id, cycle);

-- RLS
ALTER TABLE public.fund_causes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view causes" ON public.fund_causes;
CREATE POLICY "Anyone authenticated can view causes" ON public.fund_causes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage causes" ON public.fund_causes;
CREATE POLICY "Admins can manage causes" ON public.fund_causes
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

ALTER TABLE public.fund_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all votes" ON public.fund_votes;
CREATE POLICY "Users can view all votes" ON public.fund_votes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own votes" ON public.fund_votes;
CREATE POLICY "Users can insert own votes" ON public.fund_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can delete votes (for moderation)
DROP POLICY IF EXISTS "Admins can delete votes" ON public.fund_votes;
CREATE POLICY "Admins can delete votes" ON public.fund_votes
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

-- Seed 5 initial causes (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.fund_causes LIMIT 1) THEN
    INSERT INTO public.fund_causes (name, description, organization, category) VALUES
    ('Fondo de Agua Monterrey', 'Protección de cuencas y acceso a agua limpia en la zona metropolitana de Monterrey', 'Fondo de Agua Metropolitano', 'water'),
    ('Educación Indígena Oaxaca', 'Programas de alfabetización y educación bilingüe en comunidades indígenas de Oaxaca', 'CONAFE + UNAM', 'education'),
    ('Reforestación Valle de México', 'Plantación de árboles nativos y restauración de áreas verdes en la ZMVM', 'SEDEMA + Greenpeace MX', 'environment'),
    ('Red de Refugios para Mujeres', 'Apoyo a refugios para mujeres víctimas de violencia en 15 estados', 'Red Nacional de Refugios', 'social_justice'),
    ('Monitoreo de Calidad del Aire CDMX', 'Instalación de sensores ciudadanos de PM2.5 en colonias sin cobertura SIMAT', 'Instituto de Ecología UNAM', 'health');
  END IF;
END $$;
