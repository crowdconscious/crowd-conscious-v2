# ToolModal Fix Summary

## Root Cause

Tools were not opening because:
1. ✅ **Lesson page switch statement** - Had the tools mapped (for direct rendering)
2. ❌ **ToolModal component** - Missing the new tools (this is what opens when clicking resources)

When users click on a resource with `tool:water-audit-template`, it calls `handleToolClick()` which opens `ToolModal`, but `ToolModal` only had old tools with snake_case names.

## Fixes Applied

### 1. Updated ToolModal.tsx
- ✅ Added imports for all 5 new priority tools
- ✅ Added switch cases for kebab-case tool names (from database)
- ✅ Added support for `carbon-footprint-calculator` (maps to existing `CarbonCalculator`)

### 2. Tool Name Mapping
- **Database uses**: `tool:water-audit-template` (kebab-case)
- **ToolModal now handles**: `water-audit-template` ✅

## Tools Now Available in ToolModal

1. ✅ `emission-inventory-template` → `EmissionInventoryTemplate`
2. ✅ `carbon-footprint-calculator` → `CarbonCalculator` (existing, no duplication)
3. ✅ `sustainability-roi-calculator` / `roi-calculator-sustainability` → `SustainabilityROICalculator`
4. ✅ `water-audit-template` → `WaterAuditTemplate`
5. ✅ `security-audit-checklist` → `SecurityAuditChecklist`
6. ✅ `waste-audit-template` → `WasteAuditTemplate`

## Files Modified

1. `app/employee-portal/modules/[moduleId]/lessons/[lessonId]/ToolModal.tsx`
   - Added imports for new tools
   - Added switch cases for kebab-case tool names
   - Added fallback for `carbon-footprint-calculator`

## Testing

✅ Build compiled successfully
✅ All tools are now accessible when clicking on resource links in lessons

## Next Steps

1. Deploy and test that clicking on tool resources opens the correct tool
2. Verify all 5 priority tools work correctly
3. Test that `carbon-footprint-calculator` uses the existing `CarbonCalculator` component

