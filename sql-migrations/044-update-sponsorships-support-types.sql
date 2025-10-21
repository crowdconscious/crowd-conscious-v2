-- Add new columns to sponsorships table for volunteer and resource support

-- Add support_type column to track the type of support (financial, volunteer, resources)
ALTER TABLE public.sponsorships 
ADD COLUMN IF NOT EXISTS support_type text CHECK (support_type IN ('financial', 'volunteer', 'resources')) DEFAULT 'financial';

-- Add columns for volunteer support
ALTER TABLE public.sponsorships
ADD COLUMN IF NOT EXISTS volunteer_skills text;

-- Add columns for resource support
ALTER TABLE public.sponsorships
ADD COLUMN IF NOT EXISTS resource_description text;

-- Add comment
COMMENT ON COLUMN public.sponsorships.support_type IS 'Type of support: financial (monetary), volunteer (time/skills), or resources (materials/equipment)';
COMMENT ON COLUMN public.sponsorships.volunteer_skills IS 'Description of skills and availability for volunteer support';
COMMENT ON COLUMN public.sponsorships.resource_description IS 'Description of materials or resources being offered';

-- Update existing records to have support_type = 'financial'
UPDATE public.sponsorships 
SET support_type = 'financial' 
WHERE support_type IS NULL;

