-- =====================================================
-- IMPACT TRACKING TRIGGERS - Automatic Impact Metrics
-- =====================================================
-- This file adds automatic impact tracking for all completed actions
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- Trigger 1: Track Sponsorship Impact
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_sponsorship_impact()
RETURNS TRIGGER AS $$
DECLARE
  content_record RECORD;
  impact_value DECIMAL;
  metric_type_selected TEXT;
BEGIN
  -- Only process when sponsorship becomes 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    
    -- Get the content this sponsorship is for
    SELECT * INTO content_record
    FROM community_content
    WHERE id = NEW.content_id;
    
    IF content_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate impact based on amount (example: $100 MXN = 1 unit of impact)
    impact_value := NEW.amount / 100;
    
    -- Determine metric type based on content keywords
    -- Water-related
    IF content_record.title ILIKE '%water%' OR content_record.title ILIKE '%agua%' THEN
      metric_type_selected := 'clean_water';
    -- Waste/Recycling-related
    ELSIF content_record.title ILIKE '%recicl%' OR content_record.title ILIKE '%basura%' OR 
          content_record.title ILIKE '%waste%' OR content_record.title ILIKE '%compost%' THEN
      metric_type_selected := 'zero_waste';
    -- Air-related
    ELSIF content_record.title ILIKE '%air%' OR content_record.title ILIKE '%contaminacion%' OR
          content_record.title ILIKE '%pollution%' OR content_record.title ILIKE '%bike%' OR
          content_record.title ILIKE '%bici%' THEN
      metric_type_selected := 'clean_air';
    -- Safety/Infrastructure-related
    ELSIF content_record.title ILIKE '%segur%' OR content_record.title ILIKE '%safe%' OR 
          content_record.title ILIKE '%infra%' OR content_record.title ILIKE '%luz%' OR
          content_record.title ILIKE '%light%' THEN
      metric_type_selected := 'safe_cities';
    -- Default to fair trade (local business support)
    ELSE
      metric_type_selected := 'fair_trade';
    END IF;
    
    -- Create impact metric
    INSERT INTO impact_metrics (
      community_id,
      content_id,
      metric_type,
      value,
      unit,
      verified
    ) VALUES (
      content_record.community_id,
      NEW.content_id,
      metric_type_selected,
      impact_value,
      'units',
      false -- Starts as unverified, admin can verify later
    );
    
    RAISE NOTICE '🌱 Impact metric created for sponsorship % (type: %, value: %)', 
      NEW.id, metric_type_selected, impact_value;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sponsorship_impact ON sponsorships;
CREATE TRIGGER trigger_sponsorship_impact
  AFTER UPDATE ON sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sponsorship_impact();

-- =====================================================
-- Trigger 2: Track Event Completion Impact
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_event_completion_impact()
RETURNS TRIGGER AS $$
DECLARE
  attendee_count INTEGER;
  impact_value DECIMAL;
BEGIN
  -- Only when event completes
  IF NEW.status = 'completed' AND NEW.type = 'event' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Count attendees
    SELECT COUNT(*) INTO attendee_count
    FROM event_registrations
    WHERE content_id = NEW.id
    AND status = 'attending';
    
    -- Calculate impact: 1 attendee = 10 units of community engagement
    impact_value := attendee_count * 10;
    
    IF impact_value > 0 THEN
      -- Create impact metric for safe cities (community engagement)
      INSERT INTO impact_metrics (
        community_id,
        content_id,
        metric_type,
        value,
        unit,
        verified
      ) VALUES (
        NEW.community_id,
        NEW.id,
        'safe_cities',
        impact_value,
        'people engaged',
        true -- Auto-verified for event attendance
      );
      
      RAISE NOTICE '🏙️ Event impact metric created: % attendees = % impact units', 
        attendee_count, impact_value;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_event_completion_impact ON community_content;
CREATE TRIGGER trigger_event_completion_impact
  AFTER UPDATE ON community_content
  FOR EACH ROW
  WHEN (NEW.type = 'event')
  EXECUTE FUNCTION trigger_event_completion_impact();

-- =====================================================
-- Trigger 3: Track Challenge Completion Impact
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_challenge_completion_impact()
RETURNS TRIGGER AS $$
DECLARE
  completion_count INTEGER;
  impact_value DECIMAL;
BEGIN
  -- Only when challenge completes
  IF NEW.status = 'completed' AND NEW.type = 'challenge' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Count participants (using votes as participation proxy)
    SELECT COUNT(*) INTO completion_count
    FROM votes
    WHERE content_id = NEW.id
    AND vote = 'approve';
    
    -- Calculate impact: 1 participant = 5 units of behavior change
    impact_value := completion_count * 5;
    
    IF impact_value > 0 THEN
      -- Create impact metric for zero waste (behavior change)
      INSERT INTO impact_metrics (
        community_id,
        content_id,
        metric_type,
        value,
        unit,
        verified
      ) VALUES (
        NEW.community_id,
        NEW.id,
        'zero_waste',
        impact_value,
        'actions taken',
        true
      );
      
      RAISE NOTICE '♻️ Challenge impact metric created: % participants = % impact units', 
        completion_count, impact_value;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_challenge_completion_impact ON community_content;
CREATE TRIGGER trigger_challenge_completion_impact
  AFTER UPDATE ON community_content
  FOR EACH ROW
  WHEN (NEW.type = 'challenge')
  EXECUTE FUNCTION trigger_challenge_completion_impact();

-- =====================================================
-- Trigger 4: Track Need Fulfillment Impact
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_need_fulfillment_impact()
RETURNS TRIGGER AS $$
DECLARE
  impact_value DECIMAL;
  metric_type_selected TEXT;
BEGIN
  -- When need completes
  IF NEW.type = 'need' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Use funding amount as impact value
    impact_value := COALESCE(NEW.current_funding, NEW.funding_goal, 0) / 100;
    
    -- Determine metric type from title/description
    -- Water-related
    IF NEW.title ILIKE '%water%' OR NEW.title ILIKE '%agua%' THEN
      metric_type_selected := 'clean_water';
    -- Waste/Recycling-related
    ELSIF NEW.title ILIKE '%recicl%' OR NEW.title ILIKE '%basura%' OR 
          NEW.title ILIKE '%waste%' OR NEW.title ILIKE '%compost%' THEN
      metric_type_selected := 'zero_waste';
    -- Air-related
    ELSIF NEW.title ILIKE '%air%' OR NEW.title ILIKE '%contaminacion%' OR
          NEW.title ILIKE '%pollution%' OR NEW.title ILIKE '%bike%' OR
          NEW.title ILIKE '%bici%' THEN
      metric_type_selected := 'clean_air';
    -- Safety/Infrastructure-related
    ELSIF NEW.title ILIKE '%segur%' OR NEW.title ILIKE '%safe%' OR 
          NEW.title ILIKE '%infra%' OR NEW.title ILIKE '%luz%' OR
          NEW.title ILIKE '%light%' THEN
      metric_type_selected := 'safe_cities';
    -- Default to fair trade
    ELSE
      metric_type_selected := 'fair_trade';
    END IF;
    
    IF impact_value > 0 THEN
      INSERT INTO impact_metrics (
        community_id,
        content_id,
        metric_type,
        value,
        unit,
        verified
      ) VALUES (
        NEW.community_id,
        NEW.id,
        metric_type_selected,
        impact_value,
        'MXN invested',
        false -- Requires verification
      );
      
      RAISE NOTICE '🌱 Need fulfillment impact created: $ % MXN (type: %)', 
        NEW.current_funding, metric_type_selected;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_need_fulfillment_impact ON community_content;
CREATE TRIGGER trigger_need_fulfillment_impact
  AFTER UPDATE ON community_content
  FOR EACH ROW
  WHEN (NEW.type = 'need')
  EXECUTE FUNCTION trigger_need_fulfillment_impact();

-- =====================================================
-- Enable Realtime for Impact Metrics
-- =====================================================

-- Add impact_metrics table to realtime publication
DO $$
BEGIN
  -- Check if publication exists and add table
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE impact_metrics;
    RAISE NOTICE '✅ Added impact_metrics to realtime publication';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '✅ impact_metrics already in realtime publication';
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check all impact triggers are created
SELECT 
  trigger_name, 
  event_object_table, 
  action_timing, 
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%impact%'
ORDER BY event_object_table, trigger_name;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION trigger_sponsorship_impact TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_event_completion_impact TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_challenge_completion_impact TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_need_fulfillment_impact TO authenticated;

-- Test query: View recent impact metrics
-- SELECT 
--   im.*,
--   cc.title as content_title,
--   cc.type as content_type,
--   c.name as community_name
-- FROM impact_metrics im
-- JOIN community_content cc ON cc.id = im.content_id
-- JOIN communities c ON c.id = im.community_id
-- ORDER BY im.created_at DESC
-- LIMIT 10;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Impact tracking triggers installed successfully!';
  RAISE NOTICE '🌱 All completed actions now automatically create impact metrics';
  RAISE NOTICE '📊 Dashboard will show real-time impact updates';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test by: completing a sponsorship, event, challenge, or need';
  RAISE NOTICE '📈 Check metrics: SELECT * FROM impact_metrics ORDER BY created_at DESC';
END $$;
