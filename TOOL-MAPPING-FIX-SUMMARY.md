# Tool Mapping Fix Summary

## Issues Fixed

### 1. **Carbon Footprint Calculator Duplication**
- ✅ **Problem**: Database had `tool:carbon-footprint-calculator` (kebab-case) but switch statement only had `CarbonCalculator` (PascalCase)
- ✅ **Solution**: Added mapping `case 'carbon-footprint-calculator':` that uses the existing `CarbonCalculator` component (no duplication)

### 2. **New Tools Not Accessible**
- ✅ **Problem**: Created 5 new priority tools but they weren't exported or mapped in the lesson page
- ✅ **Solution**: 
  - Added exports to `components/module-tools/index.ts`
  - Added imports to lesson page
  - Added switch cases for all new tools

### 3. **Tool Name Mapping**
- ✅ **Database uses**: kebab-case (`tool:carbon-footprint-calculator`, `tool:emission-inventory-template`)
- ✅ **Switch statement now handles**: Both kebab-case (from database) and PascalCase (legacy)

## Tools Added

1. ✅ **SustainabilityROICalculator** → `sustainability-roi-calculator` / `roi-calculator-sustainability`
2. ✅ **WaterAuditTemplate** → `water-audit-template`
3. ✅ **SecurityAuditChecklist** → `security-audit-checklist`
4. ✅ **WasteAuditTemplate** → `waste-audit-template`
5. ✅ **EmissionInventoryTemplate** → `emission-inventory-template` (already existed, now properly mapped)

## Files Modified

1. `components/module-tools/index.ts` - Added exports for new tools
2. `app/employee-portal/modules/[moduleId]/lessons/[lessonId]/page.tsx`:
   - Added imports for new tools
   - Added `carbon-footprint-calculator` mapping (uses existing `CarbonCalculator`)
   - Added switch cases for all 5 new priority tools

## Tool Name Reference

| Database Tool Name | Component | Status |
|-------------------|-----------|--------|
| `tool:carbon-footprint-calculator` | `CarbonCalculator` | ✅ Mapped (existing, no duplication) |
| `tool:emission-inventory-template` | `EmissionInventoryTemplate` | ✅ Mapped |
| `tool:sustainability-roi-calculator` | `SustainabilityROICalculator` | ✅ Mapped |
| `tool:water-audit-template` | `WaterAuditTemplate` | ✅ Mapped |
| `tool:security-audit-checklist` | `SecurityAuditChecklist` | ✅ Mapped |
| `tool:waste-audit-template` | `WasteAuditTemplate` | ✅ Mapped |

## Next Steps

1. ✅ All tools are now properly exported and mapped
2. ✅ No duplication - `CarbonCalculator` is reused for `carbon-footprint-calculator`
3. ✅ Tools should now be accessible in Module 1 when referenced in database resources

## Testing

To verify tools are working:
1. Check Module 1 lessons that reference these tools in `resources` field
2. Ensure tool URLs in database match the switch case names (kebab-case)
3. Test that clicking on tool resources opens the correct component

