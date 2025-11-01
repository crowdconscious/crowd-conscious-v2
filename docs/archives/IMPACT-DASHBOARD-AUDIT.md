# 📊 IMPACT DASHBOARD - Complete Audit & Auto-Update System

## 🎯 System Overview

Your impact dashboard system exists but needs **automatic tracking triggers** to update in real-time.

### ✅ What Exists:

- Database table: `impact_metrics`
- Impact dashboard page: `/communities/[id]/impact`
- UI components for displaying impact
- Manual impact metric creation

### ❌ What's Missing:

- **Automatic impact tracking triggers**
- Real-time updates when actions complete
- Automatic metric calculation
- Impact metric creation on content completion

---

## 🗄️ Current Database Schema

### `impact_metrics` Table

```sql
CREATE TABLE public.impact_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) NOT NULL,
  content_id UUID REFERENCES community_content(id),
  metric_type TEXT CHECK (metric_type IN (
    'clean_air',
    'clean_water',
    'safe_cities',
    'zero_waste',
    'fair_trade'
  )) NOT NULL,
  value DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Metric Types:

- 🌬️ **Clean Air** - Air quality improvements, pollution reduction
- 💧 **Clean Water** - Water conservation, purification projects
- 🏙️ **Safe Cities** - Infrastructure improvements, safety initiatives
- ♻️ **Zero Waste** - Recycling programs, waste reduction
- 🤝 **Fair Trade** - Local businesses supported, fair wages

---

## 📊 Impact Dashboard Features (Existing)

### Overview Tab:

- Total funding raised
- Completed content count
- Impact metrics by type
- Member participation stats

### Distribution Tab:

- Member voting power distribution
- Impact share per member
- Funding share calculation

### Sponsors Tab:

- List of sponsors
- Sponsorship amounts
- Sponsor recognition tiers

---

## ⚠️ PROBLEMS IDENTIFIED

### 1. **No Automatic Impact Tracking**

Currently, impact metrics must be manually created. There's no automatic logging when:

- ❌ Content completes
- ❌ Funding goals are reached
- ❌ Events finish
- ❌ Sponsorships are paid

### 2. **No Impact Calculation Logic**

Missing formulas to calculate impact based on:

- ❌ Funding amount → Environmental impact
- ❌ Event attendance → Community engagement
- ❌ Challenge completion → Behavior change

### 3. **No Real-Time Updates**

Dashboard doesn't auto-refresh when new impact is created.

---

## 🔧 SOLUTION: Automatic Impact Triggers

### Trigger 1: Track Sponsorship Impact

When a sponsorship is paid, calculate environmental impact based on amount:

```sql
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

    -- Determine metric type based on content type or community focus
    -- This is simplified - you can make it more sophisticated
    CASE content_record.type
      WHEN 'need' THEN
        -- For needs, assign based on keywords in title/description
        IF content_record.title ILIKE '%water%' OR content_record.title ILIKE '%agua%' THEN
          metric_type_selected := 'clean_water';
        ELSIF content_record.title ILIKE '%recicl%' OR content_record.title ILIKE '%waste%' THEN
          metric_type_selected := 'zero_waste';
        ELSIF content_record.title ILIKE '%air%' OR content_record.title ILIKE '%pollution%' THEN
          metric_type_selected := 'clean_air';
        ELSIF content_record.title ILIKE '%segur%' OR content_record.title ILIKE '%safe%' THEN
          metric_type_selected := 'safe_cities';
        ELSE
          metric_type_selected := 'fair_trade'; -- Default
        END IF;
      WHEN 'event' THEN
        metric_type_selected := 'safe_cities';
      WHEN 'challenge' THEN
        metric_type_selected := 'zero_waste';
      ELSE
        metric_type_selected := 'fair_trade';
    END CASE;

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

    RAISE NOTICE '🌱 Impact metric created for sponsorship %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sponsorship_impact ON sponsorships;
CREATE TRIGGER trigger_sponsorship_impact
  AFTER UPDATE ON sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sponsorship_impact();
```

### Trigger 2: Track Event Completion Impact

When an event completes, calculate community engagement impact:

```sql
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

      RAISE NOTICE '🏙️ Event impact metric created: % attendees', attendee_count;
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
```

### Trigger 3: Track Challenge Completion Impact

When challenges complete, track behavioral change:

```sql
CREATE OR REPLACE FUNCTION trigger_challenge_completion_impact()
RETURNS TRIGGER AS $$
DECLARE
  completion_count INTEGER;
  impact_value DECIMAL;
BEGIN
  -- Only when challenge completes
  IF NEW.status = 'completed' AND NEW.type = 'challenge' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Count participants who completed the challenge
    -- This assumes you have a way to track challenge completion
    -- For now, use votes as a proxy for participation
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

      RAISE NOTICE '♻️ Challenge impact metric created: % participants', completion_count;
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
```

### Trigger 4: Track Need Fulfillment Impact

When a need's funding goal is reached:

```sql
CREATE OR REPLACE FUNCTION trigger_need_fulfillment_impact()
RETURNS TRIGGER AS $$
DECLARE
  impact_value DECIMAL;
  metric_type_selected TEXT;
BEGIN
  -- When funding goal is reached or need completes
  IF NEW.type = 'need' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Use funding amount as impact value
    impact_value := COALESCE(NEW.current_funding, NEW.funding_goal, 0) / 100;

    -- Determine metric type from title/description (simplified)
    IF NEW.title ILIKE '%water%' OR NEW.title ILIKE '%agua%' THEN
      metric_type_selected := 'clean_water';
    ELSIF NEW.title ILIKE '%recicl%' OR NEW.title ILIKE '%basura%' OR NEW.title ILIKE '%waste%' THEN
      metric_type_selected := 'zero_waste';
    ELSIF NEW.title ILIKE '%air%' OR NEW.title ILIKE '%contaminacion%' THEN
      metric_type_selected := 'clean_air';
    ELSIF NEW.title ILIKE '%segur%' OR NEW.title ILIKE '%safe%' OR NEW.title ILIKE '%infra%' THEN
      metric_type_selected := 'safe_cities';
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

      RAISE NOTICE '🌱 Need fulfillment impact created: $ % MXN', NEW.current_funding;
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
```

---

## 🎯 Real-Time Dashboard Updates

### Add Real-Time Subscription to Impact Dashboard

Update `ImpactDistributionClient.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";
import { createClientAuth } from "@/lib/auth";

export default function ImpactDistributionClient({ ...props }) {
  const [impactData, setImpactData] = useState(props.impactData);
  const supabase = createClientAuth();

  useEffect(() => {
    // Subscribe to real-time updates for impact_metrics
    const channel = supabase
      .channel("impact_metrics_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "impact_metrics",
          filter: `community_id=eq.${props.communityId}`,
        },
        (payload) => {
          console.log("🌱 Impact metric updated:", payload);
          // Refresh impact data
          fetchImpactData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [props.communityId]);

  const fetchImpactData = async () => {
    // Fetch updated impact metrics
    const { data } = await supabase
      .from("impact_metrics")
      .select("*")
      .eq("community_id", props.communityId);

    if (data) {
      setImpactData((prev) => ({
        ...prev,
        impactMetrics: data,
      }));
    }
  };

  // Rest of component...
}
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Step 1: Run Impact Triggers SQL

```bash
# In Supabase SQL Editor:
# Run sql-migrations/impact-tracking-triggers.sql
```

### Step 2: Enable Realtime for Impact Metrics

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE impact_metrics;
```

### Step 3: Test Triggers

```sql
-- Test sponsorship impact
UPDATE sponsorships
SET status = 'paid'
WHERE id = 'some-sponsorship-id';

-- Check if impact metric was created
SELECT * FROM impact_metrics
WHERE content_id IN (
  SELECT content_id FROM sponsorships WHERE id = 'some-sponsorship-id'
)
ORDER BY created_at DESC
LIMIT 1;
```

### Step 4: Add Real-Time Updates to UI

- Add subscription to impact dashboard component
- Auto-refresh when new metrics are created

---

## 🧪 Testing Flow

### Test 1: Sponsorship → Impact

1. Complete a sponsorship payment
2. Check: `SELECT * FROM impact_metrics ORDER BY created_at DESC LIMIT 1`
3. Verify: New metric created with correct type and value

### Test 2: Event Completion → Impact

1. Mark an event as completed
2. Check impact_metrics for new 'safe_cities' metric
3. Verify: Value = attendee_count × 10

### Test 3: Challenge Completion → Impact

1. Complete a challenge
2. Check for 'zero_waste' metric
3. Verify: Value = participant_count × 5

### Test 4: Need Fulfillment → Impact

1. Mark a need as completed
2. Check for metric based on need type
3. Verify: Value calculated from funding amount

### Test 5: Dashboard Auto-Update

1. Open impact dashboard
2. Complete a content item in another tab
3. Verify: Dashboard updates automatically (no refresh needed)

---

## 📊 Impact Calculation Formulas

### Current Implementation:

| Action             | Formula          | Metric Type               |
| ------------------ | ---------------- | ------------------------- |
| Sponsorship        | Amount ÷ 100     | Based on content keywords |
| Event Complete     | Attendees × 10   | Safe Cities               |
| Challenge Complete | Participants × 5 | Zero Waste                |
| Need Fulfilled     | Funding ÷ 100    | Based on need keywords    |

### Suggested Improvements:

- Add more sophisticated keyword matching
- Allow admins to manually categorize content
- Add verification workflow for large impacts
- Include CO2 reduction calculations
- Track water saved in liters
- Measure waste diverted from landfills

---

## 🔍 Current vs. After Implementation

### Before:

```
Content completes → ❌ No impact recorded
Dashboard shows → 📊 Empty or outdated metrics
Admin must → ✍️ Manually create metrics
```

### After:

```
Content completes → ✅ Auto-creates impact metric
Dashboard shows → 📊 Real-time updated metrics
Admin can → ✓ Verify and adjust metrics
```

---

## 🚀 Expected Behavior After Fixes

### User completes content:

1. Trigger fires automatically
2. Impact metric created in database
3. Dashboard subscribers receive update
4. UI refreshes showing new impact
5. User sees their contribution immediately

### Impact metrics show:

- 🌬️ Air quality improvements
- 💧 Water conservation
- 🏙️ Community engagement
- ♻️ Waste reduction
- 🤝 Local businesses supported

---

## 📝 Files to Create

I'll create:

1. `sql-migrations/impact-tracking-triggers.sql` - All trigger functions
2. Updates to `ImpactDistributionClient.tsx` - Real-time subscriptions

---

**Bottom Line**: Impact dashboard exists but needs automatic triggers to track metrics in real-time. Once implemented, every completed action will automatically calculate and display environmental/social impact! 🌱📊

---

## 🎯 Next Steps

1. Review the trigger logic above
2. Adjust impact calculation formulas if needed
3. Run the SQL migration
4. Test each trigger type
5. Add real-time subscriptions to UI
6. Watch impact grow automatically! 🌱
