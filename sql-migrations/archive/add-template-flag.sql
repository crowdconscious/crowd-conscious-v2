-- Add is_template flag to marketplace_modules table
-- This allows modules to be marked as templates for community creators

ALTER TABLE marketplace_modules 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;

-- Add index for template modules
CREATE INDEX IF NOT EXISTS idx_marketplace_modules_template 
ON marketplace_modules(is_template) 
WHERE is_template = TRUE;

-- Add comment
COMMENT ON COLUMN marketplace_modules.is_template IS 
'TRUE for template modules (educational guides), FALSE for regular modules';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'marketplace_modules' 
AND column_name = 'is_template';

