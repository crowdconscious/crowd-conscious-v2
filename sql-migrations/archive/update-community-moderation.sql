-- Update community moderation status enum to include all statuses
-- First, add the new status if it doesn't exist
ALTER TABLE communities 
DROP CONSTRAINT IF EXISTS communities_moderation_status_check;

ALTER TABLE communities 
ADD CONSTRAINT communities_moderation_status_check 
CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'suspended', 'deleted'));

-- Update any null moderation_status to 'approved' (existing communities)
UPDATE communities 
SET moderation_status = 'approved' 
WHERE moderation_status IS NULL;

-- Add index for faster moderation queries
CREATE INDEX IF NOT EXISTS idx_communities_moderation_status ON communities(moderation_status);

-- Add index for moderated_by queries
CREATE INDEX IF NOT EXISTS idx_communities_moderated_by ON communities(moderated_by);

-- Update admin_actions to include new community action types
-- The enum might not exist yet, so we'll handle it gracefully
DO $$ 
BEGIN
    -- Try to add new action types to existing enum
    BEGIN
        ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'suspend_community';
        ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'delete_community';
    EXCEPTION
        WHEN others THEN
            -- If the enum doesn't exist, that's fine - it will be created when running the admin setup
            NULL;
    END;
END $$;
