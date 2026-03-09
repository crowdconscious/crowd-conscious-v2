-- Add translations column to prediction_markets
-- Structure: { "en": { "title": "...", "description": "...", "resolution_criteria": "..." } }
-- Spanish stays in original columns (default)

ALTER TABLE prediction_markets 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';

COMMENT ON COLUMN prediction_markets.translations IS 'Translations by locale. e.g. {"en": {"title": "...", "description": "...", "resolution_criteria": "..."}}';

-- Add translations column to market_outcomes
-- Structure: { "en": { "label": "Yes" } }

ALTER TABLE market_outcomes 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';

COMMENT ON COLUMN market_outcomes.translations IS 'Translations by locale. e.g. {"en": {"label": "Yes"}}';
