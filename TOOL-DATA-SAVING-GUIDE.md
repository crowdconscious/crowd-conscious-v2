# Tool Data Saving for ESG Reports

## ✅ WHAT'S BUILT

**Created:**

1. `/api/tools/save-result` - API endpoint to save/load tool results
2. `/lib/hooks/useToolDataSaver.ts` - React hook for easy tool integration

**How It Works:**

- Tool results save to `activity_responses.custom_responses` (JSONB)
- Each tool's data stored with key: `tool_{tool-name}`
- Automatically merges with existing activity responses
- Available for ESG reports and analytics

---

## 📝 HOW TO UPDATE A TOOL (Example)

### Before (current - no saving):

```tsx
export default function AirQualityAssessment({ onComplete }: Props) {
  const [result, setResult] = useState(null)

  const calculateScore = () => {
    const assessmentResult = { score: 75, ... }
    setResult(assessmentResult)
    if (onComplete) onComplete(assessmentResult)
  }

  // Result is calculated but NOT saved to database
}
```

### After (with saving):

```tsx
import { useToolDataSaver } from '@/lib/hooks/useToolDataSaver'

export default function AirQualityAssessment({
  onComplete,
  enrollmentId,  // NEW: Required
  moduleId,      // NEW: Required
  lessonId       // NEW: Required
}: Props) {
  const [result, setResult] = useState(null)
  const { saveToolData, loading, saved } = useToolDataSaver()  // NEW

  const calculateScore = async () => {  // Make async
    const assessmentResult = { score: 75, ... }
    setResult(assessmentResult)

    // NEW: Save to database for ESG reports
    await saveToolData({
      enrollment_id: enrollmentId,
      module_id: moduleId,
      lesson_id: lessonId,
      tool_name: 'air-quality-assessment',
      tool_data: assessmentResult,
      tool_type: 'assessment'
    })

    if (onComplete) onComplete(assessmentResult)
  }

  // Now result is saved AND available for ESG reports!
}
```

---

## 🛠️ TOOL TYPES

Use appropriate `tool_type` for better categorization:

- `'assessment'` - Evaluations, audits, surveys
- `'calculator'` - ROI calculators, footprint calculators
- `'planner'` - Timelines, roadmaps, action plans
- `'tracker'` - Monitors, progress trackers
- `'analyzer'` - Waste analyzers, supply chain mappers
- `'mapper'` - Geographic tools, process mappers
- `'other'` - Anything else

---

## 📊 WHAT GETS SAVED

**Example data structure in database:**

```json
{
  "custom_responses": {
    "tool_air-quality-assessment": {
      "score": 75,
      "rating": "good",
      "issues": ["Pocas ventanas", "Sin filtros"],
      "recommendations": ["Agregar plantas", "Instalar HEPA"],
      "estimatedPM25": 52,
      "answers": {
        "windows": 2,
        "ventilationFrequency": "sometimes",
        "plants": 1,
        "hasFilter": false,
        "proximityToRoad": "moderate",
        "occupants": 10
      },
      "tool_type": "assessment",
      "saved_at": "2025-11-09T18:30:00Z"
    },
    "tool_water-footprint-calculator": {
      "totalLitersPerDay": 1250,
      "costPerMonth": 4500,
      "breakdownByArea": { ... },
      "tool_type": "calculator",
      "saved_at": "2025-11-09T18:45:00Z"
    }
  }
}
```

---

## 🔄 LOADING SAVED DATA

Tools can load previously saved data:

```tsx
const { loadToolData } = useToolDataSaver();

useEffect(() => {
  const loadPreviousData = async () => {
    const savedData = await loadToolData({
      lesson_id: lessonId,
      module_id: moduleId,
      tool_name: "air-quality-assessment",
    });

    if (savedData) {
      setResult(savedData);
      console.log("Loaded previous assessment:", savedData.score);
    }
  };

  loadPreviousData();
}, [lessonId, moduleId]);
```

---

## ✅ BENEFITS FOR ESG REPORTING

**With tool data saved, you can:**

1. **Generate comprehensive reports** showing:
   - Baseline assessments (before)
   - Actions taken (from plans/trackers)
   - Improvements measured (after)

2. **Track progress over time:**
   - Month 1: Air quality score 45
   - Month 3: Air quality score 65
   - Month 6: Air quality score 82

3. **Aggregate data across users:**
   - Company-wide average air quality
   - Total waste reduction
   - Water savings per department

4. **Export to Excel/PDF:**
   - All tool results in one report
   - Visual charts and graphs
   - Compliance documentation

---

## 🎯 NEXT STEPS

1. ✅ API endpoint created
2. ✅ React hook created
3. 🔨 Update all 29 tools to use `useToolDataSaver`
4. 🔨 Build ESG report generator (`/api/esg/generate-report`)
5. 🔨 Build analytics dashboard (`/employee-portal/mi-impacto`)

---

## 📋 TOOLS TO UPDATE (29 total)

**Module 1 - Aire Limpio (5):**

- [ ] AirQualityAssessment
- [ ] EmissionSourceIdentifier
- [ ] AirQualityROI
- [ ] ImplementationTimelinePlanner
- [ ] AirQualityMonitorTracker

**Module 2 - Agua Limpia (5):**

- [ ] WaterFootprintCalculator
- [ ] WaterAuditTool
- [ ] WaterConservationTracker
- [ ] WaterQualityTestLog
- [ ] RecyclingSystemDesigner

**Module 3 - Ciudades Seguras (5):**

- [ ] SecurityAuditTool
- [ ] CPTEDAssessmentTool
- [ ] CommunitySurveyTool
- [ ] DesignPlannerTool
- [ ] CostCalculatorTool

**Module 4 - Cero Residuos (4):**

- [ ] WasteStreamAnalyzer
- [ ] FiveRsChecklist
- [ ] CompostingCalculator
- [ ] ZeroWasteCertificationRoadmap

**Module 5 - Comercio Justo (5):**

- [ ] SupplyChainMapper
- [ ] FairWageCalculator
- [ ] LocalSupplierFinder
- [ ] ResponsibleProcurementScorecard
- [ ] ImpactReportGenerator

**Module 6 - Integración de Impacto (5):**

- [ ] ImpactDashboardBuilder
- [ ] ESGReportGenerator
- [ ] StakeholderCommunicationPlanner
- [ ] CertificationHub
- [ ] ContinuousImprovementTracker

---

## 🚀 QUICK START

**1. Test the API manually:**

```bash
# Save tool result
curl -X POST https://crowdconscious.app/api/tools/save-result \
  -H "Content-Type: application/json" \
  -d '{
    "enrollment_id": "YOUR_ENROLLMENT_ID",
    "module_id": "YOUR_MODULE_ID",
    "lesson_id": "YOUR_LESSON_ID",
    "tool_name": "air-quality-assessment",
    "tool_data": {"score": 75, "rating": "good"},
    "tool_type": "assessment"
  }'
```

**2. Check database:**

```sql
SELECT
  id,
  custom_responses->'tool_air-quality-assessment' as tool_data,
  created_at
FROM activity_responses
WHERE enrollment_id = 'YOUR_ENROLLMENT_ID'
ORDER BY created_at DESC
LIMIT 1;
```

**3. Update one tool as a test:**

- Pick AirQualityAssessment (simplest)
- Add the 3 props (enrollmentId, moduleId, lessonId)
- Add useToolDataSaver hook
- Call saveToolData after calculateScore
- Test it!

---

Status: Infrastructure ready! Now updating tools... 🚀
