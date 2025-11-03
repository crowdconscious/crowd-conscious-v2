-- Add platform module flag to marketplace_modules
ALTER TABLE marketplace_modules 
ADD COLUMN IF NOT EXISTS is_platform_module BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_marketplace_modules_platform 
ON marketplace_modules(is_platform_module) 
WHERE is_platform_module = TRUE;

-- Add comment
COMMENT ON COLUMN marketplace_modules.is_platform_module IS 
'TRUE for platform-owned modules (100% revenue), FALSE for community modules (30/50/20 split)';

