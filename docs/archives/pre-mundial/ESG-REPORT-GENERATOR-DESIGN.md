# ESG Report Generator Design

## 📊 OVERVIEW

Generate comprehensive ESG reports from activity responses and tool data.

**Endpoint**: `/api/esg/generate-report`  
**Formats**: PDF, Excel, JSON  
**Scope**: Individual, Team, Corporate

---

## 🎯 REPORT TYPES

### 1. **Individual Learning Report**
**For**: Individual learners  
**Contains**:
- Modules completed
- Lessons completed per module
- Activity responses (pre-assessment, reflections, confidence)
- Tool results (assessments, calculators, plans)
- Time spent learning
- XP earned
- Certificates achieved

**Example**: "Francisco's ESG Learning Journey - Q4 2025"

---

### 2. **Module Impact Report**
**For**: Progress in a specific module  
**Contains**:
- Baseline assessment (Lesson 1 tool results)
- Actions taken (from activity responses)
- Measurements tracked (from tracker tools)
- Final assessment (Lesson 5 tool results)
- Before/After comparison
- Improvement percentage

**Example**: "Clean Air Module - Impact Report"

**Metrics**:
- Air Quality Score: 45 → 78 (73% improvement)
- PM2.5 Estimated: 95 → 42 (56% reduction)
- Actions completed: 12/15 (80%)
- Investment: $15,000 MXN
- ROI: 18 months payback

---

### 3. **Corporate ESG Compliance Report**
**For**: Companies (ESG disclosure, compliance)  
**Contains**:
- Employee participation rate
- Completion rates by department
- Aggregated impact metrics
- Total CO2 reduced
- Total water saved
- Total waste diverted
- Investment in sustainability
- Cost savings achieved
- Certifications earned
- Timeline of activities

**Example**: "Empresa Verde ESG Report 2025"

**Sections**:
- Executive Summary
- Environmental Impact
- Social Impact
- Governance & Training
- Financial Performance
- Continuous Improvement Plan

---

## 📈 DATA SOURCES

### From `activity_responses` table:

```sql
SELECT 
  ar.pre_assessment_level,
  ar.key_learning,
  ar.application_plan,
  ar.confidence_level,
  ar.steps_completed,
  ar.custom_responses,  -- Contains all tool data!
  ar.completion_percentage,
  ar.time_spent_minutes,
  ar.created_at,
  ar.updated_at
FROM activity_responses ar
WHERE ar.user_id = 'USER_ID'
  AND ar.module_id = 'MODULE_ID'
ORDER BY ar.created_at;
```

### From `impact_measurements` table (future):

```sql
SELECT 
  im.measurement_type,
  im.metrics,
  im.measurement_date,
  im.improvement_percentage
FROM impact_measurements im
WHERE im.user_id = 'USER_ID'
  AND im.module_id = 'MODULE_ID'
ORDER BY im.measurement_date;
```

### From `course_enrollments` table:

```sql
SELECT 
  ce.completion_percentage,
  ce.xp_earned,
  ce.completed,
  ce.completed_at,
  ce.total_time_spent,
  mm.title as module_title
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id = 'USER_ID';
```

---

## 🛠️ API DESIGN

### POST `/api/esg/generate-report`

**Request Body:**

```typescript
{
  report_type: 'individual' | 'module' | 'corporate',
  format: 'pdf' | 'excel' | 'json',
  
  // Filters
  user_id?: string,           // For individual reports
  corporate_account_id?: string, // For corporate reports
  module_id?: string,         // For module-specific reports
  date_range?: {
    start: string,            // ISO date
    end: string               // ISO date
  },
  
  // Options
  include_tool_details?: boolean,
  include_activity_responses?: boolean,
  include_evidence?: boolean,
  language?: 'es' | 'en'
}
```

**Response:**

```typescript
{
  success: true,
  report_url: 'https://..../esg-reports/report-uuid.pdf',
  report_id: 'uuid',
  generated_at: '2025-11-09T18:00:00Z',
  expires_at: '2025-12-09T18:00:00Z', // 30 days
  metadata: {
    pages: 15,
    file_size_kb: 2340,
    modules_included: 3,
    users_included: 1
  }
}
```

---

## 📄 PDF REPORT STRUCTURE

### Cover Page
- Report title
- Company logo
- Date range
- Generated date
- Report ID (for verification)

### Executive Summary (1 page)
- Key metrics at a glance
- Participation statistics
- Top achievements
- Notable improvements

### Module Sections (2-3 pages each)

**Per Module:**

1. **Overview**
   - Module title & description
   - Completion status
   - Time spent
   - XP earned

2. **Baseline Assessment**
   - Pre-assessment results
   - Initial scores/measurements
   - Identified issues

3. **Actions Taken**
   - Activity responses summary
   - Key learnings
   - Application plans
   - Steps completed

4. **Tool Results**
   - Assessment scores
   - Calculator outputs
   - Planner timelines
   - Tracker data

5. **Impact Achieved**
   - Before/After comparison
   - Improvement percentages
   - Cost savings
   - Environmental impact

6. **Evidence**
   - Photos uploaded
   - Documents submitted
   - Timestamps

### Aggregated Impact (1-2 pages)
- Total CO2 reduced (kg)
- Total water saved (liters)
- Total waste diverted (kg)
- Total cost savings (MXN)
- Total investment (MXN)
- ROI analysis

### Continuous Improvement Plan (1 page)
- Next steps from activity responses
- Recommended modules
- Timeline for next assessments

### Appendix
- Raw data tables
- Detailed tool results
- Activity response transcripts

---

## 📊 EXCEL REPORT STRUCTURE

### Sheet 1: Summary
- Overview metrics
- Quick stats

### Sheet 2: Modules
- One row per module
- Columns: Title, Status, Progress%, XP, Time, Completed Date

### Sheet 3: Activities
- One row per activity response
- Columns: Module, Lesson, Type, Pre-assessment, Confidence, Completion%, Date

### Sheet 4: Tool Results
- One row per tool usage
- Columns: Tool Name, Tool Type, Key Metrics (JSON), Date

### Sheet 5: Impact Metrics
- Aggregated calculations
- Before/After comparisons
- Financial analysis

### Sheet 6: Timeline
- Chronological activity log
- Date, Event, Module, Details

---

## 🎨 REPORT GENERATION LIBRARIES

**For PDF:**
- `@react-pdf/renderer` or `puppeteer`
- Generate HTML → Convert to PDF
- Custom styling with Tailwind-like classes

**For Excel:**
- `exceljs` or `xlsx`
- Programmatic Excel generation
- Charts and formatting

**For Storage:**
- Save to `esg-reports` Supabase storage bucket
- Generate shareable link with expiry
- Optionally public with token

---

## 🔒 SECURITY & PRIVACY

**Access Control:**
- Users can only generate reports for their own data
- Corporate admins can generate for their company
- Super admins can generate for any account

**Data Retention:**
- Reports stored for 30 days
- Auto-delete after expiry
- Can be re-generated anytime

**Sharing:**
- Public link with unguessable token
- Password protection option
- Watermark with "Generated for [Company]"

---

## 🚀 IMPLEMENTATION PHASES

### Phase 1: JSON Reports (Quick Start) ✅
- Return structured JSON data
- Frontend can display/download
- No PDF generation yet

### Phase 2: Excel Reports
- Generate `.xlsx` files
- Store in Supabase storage
- Return download URL

### Phase 3: PDF Reports
- Full-featured PDF with charts
- Professional styling
- Company branding

### Phase 4: Analytics Dashboard
- Live dashboard (no download needed)
- Real-time metrics
- Interactive charts

---

## 📋 SAMPLE API CALL

```typescript
// Generate individual PDF report for current user
const response = await fetch('/api/esg/generate-report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    report_type: 'individual',
    format: 'pdf',
    date_range: {
      start: '2025-01-01',
      end: '2025-11-09'
    },
    include_tool_details: true,
    include_activity_responses: true,
    language: 'es'
  })
})

const data = await response.json()
// { report_url: 'https://...', report_id: '...', ... }

// Download or display
window.open(data.report_url, '_blank')
```

---

## 🎯 NEXT STEPS

1. **Quick Win**: Build JSON report generator (Phase 1)
2. **Database**: Ensure all tool data is saving
3. **Excel**: Implement Excel generation (Phase 2)
4. **Dashboard**: Build `/mi-impacto` page (Phase 4)
5. **PDF**: Full PDF reports (Phase 3)

---

Status: Design complete! Ready to implement 🚀

