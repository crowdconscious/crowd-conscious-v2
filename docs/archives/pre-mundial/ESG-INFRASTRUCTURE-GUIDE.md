# 📊 ESG REPORTING INFRASTRUCTURE GUIDE

**Date**: November 9, 2025  
**Purpose**: Proper data structure for activity tracking, impact measurement, and ESG reporting  
**Status**: Ready to implement

---

## 🎯 **WHY WE NEED THIS**

### Current Situation (❌ NOT IDEAL):
- Using `lesson_responses` table with JSONB
- Hard to query specific answers
- Can't easily generate reports
- No historical tracking
- No re-take/re-measure capability

### New Infrastructure (✅ PROPER):
- **`activity_responses`** - Structured, queryable data
- **`impact_measurements`** - Track progress over time
- **`esg_reports`** - Store generated reports
- Dedicated storage buckets
- Easy analytics and reporting

---

## 📋 **TABLE STRUCTURE**

### 1. `activity_responses` (Detailed Activity Tracking)

**Purpose**: Store all user responses in a queryable format

**Key Fields**:
```sql
- user_id, enrollment_id, module_id, lesson_id
- pre_assessment_level (TEXT) - 'Ninguno', 'Básico', etc.
- key_learning (TEXT) - Long answer
- application_plan (TEXT) - Long answer
- challenges_identified (TEXT) - Long answer
- steps_completed (TEXT[]) - Array of completed steps
- confidence_level (INTEGER) - 1-5 rating
- custom_responses (JSONB) - Module-specific questions
- evidence_urls (TEXT[]) - Uploaded files
- completion_percentage (INTEGER)
- attempt_number (INTEGER) - For re-takes
- previous_response_id (UUID) - Link to previous attempt
```

**Benefits**:
- ✅ Easy to query: `SELECT AVG(confidence_level) FROM activity_responses WHERE module_id = X`
- ✅ Filter by date, user, module
- ✅ Track improvements over time
- ✅ Generate analytics dashboards

---

### 2. `impact_measurements` (Progress Over Time)

**Purpose**: Allow users to re-measure impact and track improvements

**Key Fields**:
```sql
- user_id, module_id
- measurement_date (TIMESTAMPTZ)
- measurement_period (TEXT) - 'baseline', 'month_1', 'month_3', etc.
- metrics (JSONB) - {"co2_reduced_kg": 150, "water_saved_liters": 5000}
- confidence_score (INTEGER) - 1-5
- implementation_level (TEXT) - 'planning', 'piloting', 'scaling'
- previous_measurement_id (UUID) - For comparison
- improvement_percentage (NUMERIC) - Calculated
```

**Use Cases**:
- User completes Module 1 → Baseline measurement
- 3 months later → Re-measure → See 30% improvement
- 6 months later → Re-measure → See 50% improvement
- Generate trend charts for ESG reports

**Example Query**:
```sql
-- Get all measurements for a user's Module 1
SELECT 
  measurement_period,
  metrics->>'co2_reduced_kg' as co2_reduced,
  improvement_percentage
FROM impact_measurements
WHERE user_id = 'xxx' AND module_id = 'module-1-id'
ORDER BY measurement_date;
```

---

### 3. `esg_reports` (Generated Reports)

**Purpose**: Store compiled ESG reports for download and sharing

**Key Fields**:
```sql
- user_id, corporate_account_id
- report_type (TEXT) - 'individual', 'team', 'corporate'
- report_period_start, report_period_end (DATE)
- modules_included (UUID[])
- executive_summary (TEXT)
- key_metrics (JSONB)
- activity_responses_included (UUID[])
- impact_measurements_included (UUID[])
- pdf_url, excel_url (TEXT) - Generated files
- is_public (BOOLEAN)
- share_token (TEXT) - For public sharing
```

**Report Types**:
1. **Individual**: Single user's progress
2. **Team**: Corporate team summary
3. **Corporate**: Full company ESG report
4. **Module-specific**: Deep dive on one module

---

## 🗂️ **STORAGE BUCKETS**

### 1. `activity-evidence`
- **Purpose**: User-uploaded evidence files
- **Access**: Private, user-specific
- **Path**: `{user_id}/{module_id}/{lesson_id}/{filename}`
- **Example**: `abc123/module-1/lesson-1/photo-evidence.jpg`

### 2. `esg-reports`
- **Purpose**: Generated PDF and Excel reports
- **Access**: Private, shareable with token
- **Path**: `{user_id}/reports/{report_id}/{filename}`
- **Example**: `abc123/reports/report-xyz/esg-report-2025-Q4.pdf`

### 3. `impact-measurements`
- **Purpose**: Evidence for impact measurements
- **Access**: Private, user-specific
- **Path**: `{user_id}/measurements/{measurement_id}/{filename}`
- **Example**: `abc123/measurements/meas-123/before-after.jpg`

---

## 🔧 **HELPER FUNCTIONS**

### 1. Calculate Improvement
```sql
SELECT calculate_improvement_percentage(
  'current-measurement-id',
  'co2_reduced_kg'
); -- Returns: 35.50 (35.5% improvement)
```

### 2. Get Latest Responses Per Module
```sql
SELECT * FROM get_latest_responses_per_module('user-id');
-- Returns: module summaries with avg confidence, last response date
```

---

## 📊 **ESG REPORT GENERATION FLOW**

### Step 1: User Completes Activities
```
User answers questions → Saved to activity_responses
User uploads evidence → Saved to activity-evidence bucket
```

### Step 2: User Measures Impact
```
User fills impact form → Saved to impact_measurements
System calculates improvement → Updates improvement_percentage
```

### Step 3: Generate Report
```sql
-- Collect all data for period
SELECT * FROM activity_responses 
WHERE user_id = X AND created_at BETWEEN start AND end;

SELECT * FROM impact_measurements 
WHERE user_id = X AND measurement_date BETWEEN start AND end;

-- Generate PDF/Excel with charts, tables, evidence
-- Upload to esg-reports bucket
-- Create record in esg_reports table
```

### Step 4: User Downloads/Shares
```
User clicks "Download ESG Report"
→ Fetch from esg_reports table
→ Return PDF URL
→ User downloads or shares with token
```

---

## 🎯 **BENEFITS FOR USERS**

### Individual Users:
- ✅ Track their learning journey
- ✅ See confidence improvements over time
- ✅ Generate personal impact reports
- ✅ Share achievements with employers

### Corporate Users:
- ✅ Team progress dashboards
- ✅ Aggregate impact metrics
- ✅ ESG compliance reports
- ✅ ROI calculations
- ✅ Audit trail for certifications

### Platform (Crowd Conscious):
- ✅ Rich analytics for module improvement
- ✅ Identify high-impact activities
- ✅ Generate platform-wide impact reports
- ✅ Marketing materials (anonymized success stories)

---

## 🚀 **IMPLEMENTATION STEPS**

### Phase 1: Database Setup (30 minutes)
1. Run `CREATE-PROPER-ESG-INFRASTRUCTURE.sql` in Supabase
2. Verify tables created
3. Create storage buckets in Supabase Dashboard

### Phase 2: API Updates (2 hours)
1. Update `/api/activities/save-response` to use `activity_responses`
2. Create `/api/impact-measurements` endpoints
3. Create `/api/esg-reports` endpoints
4. Update evidence upload to use proper buckets

### Phase 3: Frontend Updates (2 hours)
1. Update InteractiveActivity to match new schema
2. Create ImpactMeasurement form component
3. Create ESG Report generator interface
4. Add download/share buttons

### Phase 4: Testing (1 hour)
1. Complete activity → Verify data in activity_responses
2. Create impact measurement → Verify calculation
3. Generate report → Verify PDF/Excel output
4. Test sharing functionality

---

## 📈 **EXAMPLE QUERIES FOR ESG REPORTS**

### Average Confidence by Module
```sql
SELECT 
  mm.title,
  AVG(ar.confidence_level) as avg_confidence,
  COUNT(ar.id) as response_count
FROM activity_responses ar
JOIN marketplace_modules mm ON ar.module_id = mm.id
WHERE ar.user_id = 'xxx'
GROUP BY mm.title
ORDER BY avg_confidence DESC;
```

### Implementation Progress Over Time
```sql
SELECT 
  im.measurement_period,
  im.implementation_level,
  im.confidence_score,
  im.improvement_percentage
FROM impact_measurements im
WHERE im.user_id = 'xxx' AND im.module_id = 'module-1'
ORDER BY im.measurement_date;
```

### Total Impact Across All Users
```sql
SELECT 
  SUM((metrics->>'co2_reduced_kg')::NUMERIC) as total_co2_reduced,
  SUM((metrics->>'water_saved_liters')::NUMERIC) as total_water_saved,
  COUNT(DISTINCT user_id) as users_contributing
FROM impact_measurements
WHERE measurement_date >= '2025-01-01';
```

---

## 🔐 **SECURITY & PRIVACY**

### Row Level Security (RLS):
- ✅ Users can only see their own data
- ✅ Corporate admins see their team's data
- ✅ Platform admins see anonymized aggregates
- ✅ Public sharing requires explicit token

### Data Retention:
- Activity responses: Kept indefinitely (user can delete)
- Impact measurements: Kept for trend analysis
- ESG reports: Kept for 7 years (compliance requirement)

---

## 💡 **FUTURE ENHANCEMENTS**

1. **AI-Powered Insights**: Analyze responses to provide personalized recommendations
2. **Benchmarking**: Compare user's progress to industry averages
3. **Gamification**: Award badges for consistent improvement
4. **API Access**: Allow third-party ESG platforms to pull data
5. **Real-time Dashboards**: Live charts updating as users complete activities

---

## ✅ **CHECKLIST**

### Database:
- [ ] Run CREATE-PROPER-ESG-INFRASTRUCTURE.sql
- [ ] Verify 3 tables created (activity_responses, impact_measurements, esg_reports)
- [ ] Verify RLS policies applied
- [ ] Verify helper functions created

### Storage:
- [ ] Create activity-evidence bucket
- [ ] Create esg-reports bucket
- [ ] Create impact-measurements bucket
- [ ] Configure RLS for buckets

### API:
- [ ] Update save-response to use activity_responses
- [ ] Create impact-measurements endpoints
- [ ] Create esg-reports generator
- [ ] Test all endpoints

### Frontend:
- [ ] Update InteractiveActivity component
- [ ] Create ImpactMeasurement component
- [ ] Create ESG Report generator UI
- [ ] Add download buttons

---

**Status**: Infrastructure designed and ready to implement  
**Estimated Time**: 1 day for full implementation  
**Priority**: HIGH - Critical for ESG value proposition

