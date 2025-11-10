# 🔄 Batch Update: All 29 Tools for ESG Data Saving

## ✅ Completed Tools (2/29)

1. ✅ AirQualityAssessment
2. ✅ AirQualityROI

## 📋 Remaining Tools to Update (27/29)

### Module 1 - Aire Limpio (3 remaining)

- [ ] EmissionSourceIdentifier
- [ ] ImplementationTimelinePlanner
- [ ] AirQualityMonitorTracker

### Module 2 - Agua Limpia (5 tools)

- [ ] WaterFootprintCalculator
- [ ] WaterAuditTool
- [ ] ConservationTracker
- [ ] WaterQualityTesterLog
- [ ] RecyclingSystemDesigner

### Module 3 - Ciudades Seguras (5 tools)

- [ ] SecurityAuditTool
- [ ] CPTEDAssessmentTool
- [ ] SafeMobilityPlanner
- [ ] CommunitySafetyMap
- [ ] CostCalculator

### Module 4 - Cero Residuos (4 tools)

- [ ] WasteStreamAnalyzer
- [ ] FiveRsChecklist
- [ ] MaterialExchangeMarketplace
- [ ] CompostingCalculator

### Module 5 - Comercio Justo (5 tools)

- [ ] SupplyChainMapper
- [ ] FairWageCalculator
- [ ] LocalSupplierFinder
- [ ] ResponsibleProcurementScorecard
- [ ] ImpactReportGenerator

### Module 6 - Integración de Impacto (5 tools)

- [ ] ImpactDashboardBuilder
- [ ] ESGReportGenerator
- [ ] StakeholderCommunicationPlanner
- [ ] CertificationHub
- [ ] ContinuousImprovementTracker

---

## 🔧 Update Pattern (Copy-Paste Template)

For EVERY tool, apply these 4 changes:

### 1. Update Imports

```typescript
// BEFORE
import { useState } from "react";

// AFTER
import { useState, useEffect } from "react";
import { useToolDataSaver } from "@/lib/hooks/useToolDataSaver";
```

### 2. Update Props Interface

```typescript
// Add these 3 props to the tool's Props interface:
interface [ToolName]Props {
  // ... existing props
  // ESG Reporting Props
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}
```

### 3. Add Data Saving Logic in Component

```typescript
export default function [ToolName]({
  // ... existing props
  enrollmentId,
  moduleId,
  lessonId
}: [ToolName]Props) {
  // ... existing state

  // ✨ ADD THIS: ESG Data Saving
  const { saveToolData, loadToolData, loading: saving } = useToolDataSaver()

  // ✨ ADD THIS: Load previous data on mount
  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      const loadPrevious = async () => {
        const savedData = await loadToolData({
          lesson_id: lessonId,
          module_id: moduleId,
          tool_name: '[tool-name-kebab-case]' // e.g., 'water-footprint-calculator'
        })

        if (savedData && savedData.[resultField]) {
          // Restore state from saved data
          // Example: setResult(savedData) or setInputs(savedData.inputs)
        }
      }
      loadPrevious()
    }
  }, [enrollmentId, moduleId, lessonId])

  // ... rest of component
}
```

### 4. Update Calculate/Submit Function

```typescript
// BEFORE
const calculate = () => {
  // ... calculation logic
  const result = { ... }
  setResult(result)
  if (onComplete) onComplete(result)
}

// AFTER
const calculate = async () => {  // ← Make async
  // ... calculation logic
  const result = { ... }
  setResult(result)

  // ✨ ADD THIS: Save to database
  if (enrollmentId && moduleId && lessonId) {
    await saveToolData({
      enrollment_id: enrollmentId,
      module_id: moduleId,
      lesson_id: lessonId,
      tool_name: '[tool-name-kebab-case]',
      tool_data: result, // or { ...result, inputs } to save inputs too
      tool_type: 'calculator' // or 'assessment' | 'planner' | 'tracker' | 'analyzer'
    })
  }

  if (onComplete) onComplete(result)
}
```

---

## 📝 Tool Name Mapping (for tool_name parameter)

| Component Name                  | tool_name (kebab-case)     | tool_type   |
| ------------------------------- | -------------------------- | ----------- |
| AirQualityAssessment            | air-quality-assessment     | assessment  |
| AirQualityROI                   | air-quality-roi            | calculator  |
| EmissionSourceIdentifier        | emission-source-identifier | analyzer    |
| ImplementationTimelinePlanner   | implementation-timeline    | planner     |
| AirQualityMonitorTracker        | air-quality-monitor        | tracker     |
| WaterFootprintCalculator        | water-footprint-calculator | calculator  |
| WaterAuditTool                  | water-audit                | assessment  |
| ConservationTracker             | conservation-tracker       | tracker     |
| WaterQualityTesterLog           | water-quality-tester       | tracker     |
| RecyclingSystemDesigner         | recycling-system-designer  | planner     |
| SecurityAuditTool               | security-audit             | assessment  |
| CPTEDAssessmentTool             | cpted-assessment           | assessment  |
| SafeMobilityPlanner             | safe-mobility-planner      | planner     |
| CommunitySafetyMap              | community-safety-map       | mapper      |
| CostCalculator                  | cost-calculator            | calculator  |
| WasteStreamAnalyzer             | waste-stream-analyzer      | analyzer    |
| FiveRsChecklist                 | five-rs-checklist          | assessment  |
| MaterialExchangeMarketplace     | material-exchange          | marketplace |
| CompostingCalculator            | composting-calculator      | calculator  |
| SupplyChainMapper               | supply-chain-mapper        | mapper      |
| FairWageCalculator              | fair-wage-calculator       | calculator  |
| LocalSupplierFinder             | local-supplier-finder      | finder      |
| ResponsibleProcurementScorecard | responsible-procurement    | assessment  |
| ImpactReportGenerator           | impact-report-generator    | generator   |
| ImpactDashboardBuilder          | impact-dashboard-builder   | builder     |
| ESGReportGenerator              | esg-report-generator       | generator   |
| StakeholderCommunicationPlanner | stakeholder-communication  | planner     |
| CertificationHub                | certification-hub          | tracker     |
| ContinuousImprovementTracker    | continuous-improvement     | tracker     |

---

## ⚡ Quick Update Checklist (Per Tool)

For each tool file:

1. [ ] Add `useEffect` to imports
2. [ ] Add `useToolDataSaver` import
3. [ ] Add 3 ESG props to interface (enrollmentId, moduleId, lessonId)
4. [ ] Destructure new props in component signature
5. [ ] Call `useToolDataSaver()` hook
6. [ ] Add `useEffect` to load previous data
7. [ ] Make calculate/submit function `async`
8. [ ] Add `saveToolData()` call after calculation
9. [ ] Test tool still works without props (backward compatible)
10. [ ] Test tool saves data when props provided

---

## 🧪 Testing After Updates

### Test Individual Tool:

```typescript
// In lesson page where tool is used:
<AirQualityAssessment
  enrollmentId={enrollmentId}
  moduleId={moduleId}
  lessonId={lessonId}
  onComplete={(result) => console.log('Tool completed', result)}
/>
```

### Verify Data Saved:

```sql
-- In Supabase SQL Editor
SELECT
  id,
  tool_name,
  custom_responses->'tool_air-quality-assessment' as tool_data,
  updated_at
FROM activity_responses
WHERE lesson_id = '[your-lesson-id]'
ORDER BY updated_at DESC
LIMIT 5;
```

### Check Console:

- Should see: `💾 Saving tool data: [tool-name]`
- Should see: `✅ Tool data saved`
- Should see green notification: "Datos guardados para reporte ESG"

---

## 🎯 Priority Order (Recommended)

### Week 1: Calculators (High ROI)

1. WaterFootprintCalculator
2. CostCalculator
3. CompostingCalculator
4. FairWageCalculator

### Week 2: Assessments (Risk Analysis)

5. SecurityAuditTool
6. CPTEDAssessmentTool
7. WaterAuditTool
8. FiveRsChecklist
9. ResponsibleProcurementScorecard

### Week 3: Planners & Trackers

10. ImplementationTimelinePlanner
11. SafeMobilityPlanner
12. RecyclingSystemDesigner
13. AirQualityMonitorTracker
14. ConservationTracker
15. WaterQualityTesterLog

### Week 4: Advanced Tools

16. EmissionSourceIdentifier
17. WasteStreamAnalyzer
18. SupplyChainMapper
19. CommunitySafetyMap
20. LocalSupplierFinder

### Week 5: Meta Tools (Integration)

21. ImpactDashboardBuilder
22. ESGReportGenerator
23. StakeholderCommunicationPlanner
24. CertificationHub
25. ContinuousImprovementTracker
26. ImpactReportGenerator
27. MaterialExchangeMarketplace

---

## 🚨 Common Pitfalls to Avoid

### ❌ DON'T:

- Forget to make calculate function `async`
- Use inconsistent tool_name (must match database)
- Skip backward compatibility (props are optional)
- Save password/sensitive data
- Block UI while saving (saveToolData is async)

### ✅ DO:

- Always check if props exist before saving
- Use descriptive tool_type
- Include all relevant calculation results
- Save inputs for user to reload/edit later
- Test load functionality (useEffect)

---

## 📊 Progress Tracking

Update this checklist as you complete tools:

- [x] AirQualityAssessment (Module 1)
- [x] AirQualityROI (Module 1)
- [ ] EmissionSourceIdentifier (Module 1)
- [ ] ImplementationTimelinePlanner (Module 1)
- [ ] AirQualityMonitorTracker (Module 1)
- [ ] WaterFootprintCalculator (Module 2)
- [ ] WaterAuditTool (Module 2)
- [ ] ConservationTracker (Module 2)
- [ ] WaterQualityTesterLog (Module 2)
- [ ] RecyclingSystemDesigner (Module 2)
- [ ] SecurityAuditTool (Module 3)
- [ ] CPTEDAssessmentTool (Module 3)
- [ ] SafeMobilityPlanner (Module 3)
- [ ] CommunitySafetyMap (Module 3)
- [ ] CostCalculator (Module 3)
- [ ] WasteStreamAnalyzer (Module 4)
- [ ] FiveRsChecklist (Module 4)
- [ ] MaterialExchangeMarketplace (Module 4)
- [ ] CompostingCalculator (Module 4)
- [ ] SupplyChainMapper (Module 5)
- [ ] FairWageCalculator (Module 5)
- [ ] LocalSupplierFinder (Module 5)
- [ ] ResponsibleProcurementScorecard (Module 5)
- [ ] ImpactReportGenerator (Module 5)
- [ ] ImpactDashboardBuilder (Module 6)
- [ ] ESGReportGenerator (Module 6)
- [ ] StakeholderCommunicationPlanner (Module 6)
- [ ] CertificationHub (Module 6)
- [ ] ContinuousImprovementTracker (Module 6)

**Progress: 2/29 Complete (7%)**

---

## 🎓 Example: Before & After

### BEFORE (Without ESG):

```typescript
export default function WaterFootprintCalculator({ onCalculate }: Props) {
  const [inputs, setInputs] = useState({...})
  const [result, setResult] = useState(null)

  const calculate = () => {
    const calculatedResult = { totalWater: 5000, ... }
    setResult(calculatedResult)
    if (onCalculate) onCalculate(calculatedResult)
  }

  return <div>...</div>
}
```

### AFTER (With ESG):

```typescript
import { useToolDataSaver } from '@/lib/hooks/useToolDataSaver'

export default function WaterFootprintCalculator({
  onCalculate,
  enrollmentId,
  moduleId,
  lessonId
}: Props) {
  const [inputs, setInputs] = useState({...})
  const [result, setResult] = useState(null)
  const { saveToolData, loadToolData } = useToolDataSaver()

  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      const loadPrevious = async () => {
        const saved = await loadToolData({
          lesson_id: lessonId,
          module_id: moduleId,
          tool_name: 'water-footprint-calculator'
        })
        if (saved?.inputs) setInputs(saved.inputs)
        if (saved?.totalWater) setResult(saved)
      }
      loadPrevious()
    }
  }, [enrollmentId, moduleId, lessonId])

  const calculate = async () => {
    const calculatedResult = { totalWater: 5000, ... }
    setResult(calculatedResult)

    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'water-footprint-calculator',
        tool_data: { ...calculatedResult, inputs },
        tool_type: 'calculator'
      })
    }

    if (onCalculate) onCalculate(calculatedResult)
  }

  return <div>...</div>
}
```

---

## 🔗 Next Steps After Tool Updates

1. ✅ All 29 tools save data to `activity_responses.custom_responses`
2. 🏗️ Build `/api/esg/generate-report` (PDF & Excel exports)
3. 📊 Build `/employee-portal/mi-impacto` dashboard
4. 🧪 Test end-to-end ESG flow
5. 📈 Build impact tracking UI
6. 🎉 Launch ESG reporting feature!

---

**Last Updated:** November 10, 2025  
**Status:** 2/29 tools updated (7% complete)  
**Next:** Continue updating remaining tools following this pattern
