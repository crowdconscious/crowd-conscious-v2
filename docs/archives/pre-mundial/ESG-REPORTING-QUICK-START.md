# 🚀 ESG Reporting System - Quick Start Guide

**Created**: November 10, 2025  
**Status**: Ready for Testing  
**Core Features**: PDF & Excel Report Downloads ✅

---

## ✅ What's Been Built

### 1. Database Infrastructure
- ✅ `activity_responses` table - Structured ESG data storage
- ✅ `impact_measurements` table - Environmental metrics
- ✅ `esg_reports` table - Report metadata
- ✅ RLS policies for data security

### 2. APIs
- ✅ `/api/activities/save-response` - Dual-write (new + legacy tables)
- ✅ `/api/tools/save-result` - Tool results saving
- ✅ `/api/esg/generate-report` - PDF/Excel/JSON report generation

### 3. Frontend
- ✅ Analytics Dashboard: `/employee-portal/mi-impacto`
- ✅ ESG Report Downloader component
- ✅ Impact metrics visualization
- ✅ Tool usage tracking

### 4. Tools Updated (2/29)
- ✅ AirQualityAssessment - Saves data to DB
- ✅ AirQualityROI - Saves data to DB
- 📋 Guide created for remaining 27 tools

---

## 🎯 Testing Steps (In Order)

### Step 1: Run Database Setup

```sql
-- In Supabase SQL Editor
-- Run: CREATE-PROPER-ESG-INFRASTRUCTURE.sql
-- This creates activity_responses, impact_measurements, esg_reports tables
```

**Expected Result**: Tables created with RLS policies

---

### Step 2: Test Tool Data Saving

1. Navigate to Module 1, Lesson 1 (Air Quality Assessment)
2. Complete the Air Quality Assessment tool
3. Check browser console for: `✅ Tool data saved`
4. Green notification should appear: "Datos guardados para reporte ESG"

**Verify in Supabase**:
```sql
SELECT 
  id,
  custom_responses->'tool_air-quality-assessment' as tool_data,
  created_at
FROM activity_responses
WHERE user_id = '[your-user-id]'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result**: Tool data saved in `custom_responses` JSONB field

---

### Step 3: Complete a Module Lesson

1. Complete Lesson 1 with all activities
2. Check that responses save to both tables:
   - `activity_responses` (new ESG table)
   - `lesson_responses` (legacy table)
3. Console should show: `esg_ready: true`

---

### Step 4: Visit Analytics Dashboard

1. Navigate to: `/employee-portal/mi-impacto`
2. Should see:
   - ✅ Impact stats cards (CO₂, Water, Waste, Cost)
   - ✅ Learning stats (Modules, XP, Activities, Tools)
   - ✅ Impact by Module section
   - ✅ Download Reports section (if you have completed enrollments)

**Expected Result**: Dashboard loads with your data

---

### Step 5: Download ESG Reports

**Test PDF Download**:
1. Click "Descargar PDF" button
2. Should see: "Generando..." loading state
3. PDF file downloads automatically
4. Open PDF - should show:
   - Crowd Conscious header
   - Your name and module
   - Progress metrics
   - Environmental impact
   - Generated timestamp

**Test Excel Download**:
1. Click "Descargar Excel" button
2. Excel file (.xlsx) downloads
3. Open in Excel/Google Sheets - should show:
   - Summary sheet with metrics
   - Tools Used sheet with details
   - Styled headers (colored)

**Expected Result**: Both files download and open correctly

---

## 📊 API Endpoints to Test

### Individual Report (JSON)
```bash
GET /api/esg/generate-report?format=json&type=individual&enrollment_id=[your-enrollment-id]
```

### Individual Report (PDF)
```bash
GET /api/esg/generate-report?format=pdf&type=individual&enrollment_id=[your-enrollment-id]
```

### Individual Report (Excel)
```bash
GET /api/esg/generate-report?format=excel&type=individual&enrollment_id=[your-enrollment-id]
```

### Module Report
```bash
GET /api/esg/generate-report?format=json&type=module&module_id=[module-id]
```

### Corporate Report (If admin)
```bash
GET /api/esg/generate-report?format=pdf&type=corporate&corporate_account_id=[corporate-id]
```

---

## 🔍 Verification Checklist

- [ ] Database tables created successfully
- [ ] Tools save data to `activity_responses.custom_responses`
- [ ] Activity responses save to both new and legacy tables
- [ ] Console shows "ESG ready" flag
- [ ] Dashboard `/mi-impacto` displays impact metrics
- [ ] PDF reports download successfully
- [ ] Excel reports download successfully
- [ ] PDF report shows correct data
- [ ] Excel report opens with formatted data
- [ ] Impact metrics calculate correctly (CO₂, water, waste, cost)
- [ ] Trees equivalent displays correctly

---

## 🐛 Troubleshooting

### Problem: Tools not saving data
**Solution**: Check that lesson page passes `enrollmentId`, `moduleId`, `lessonId` to tool component

### Problem: Dashboard shows 0 impact
**Solution**: 
1. Ensure you've completed tools (not just activities)
2. Check `activity_responses` table for `custom_responses` data
3. Tool results must have calculable metrics (annualSavings, totalWater, etc.)

### Problem: Report download fails
**Solution**:
1. Check browser console for errors
2. Verify `enrollment_id` is correct
3. Ensure enrollment has `completed = true`
4. Check API logs in Vercel/terminal

### Problem: PDF/Excel is blank
**Solution**:
1. Verify tool data exists in database
2. Check `custom_responses` has `tool_*` keys
3. Ensure impact calculation logic is triggered

---

## 📈 What Each Report Shows

### Individual Report
- **Progress**: Completion %, XP, time spent
- **Activities**: All responses submitted
- **Tools**: Every tool used with results
- **Impact**: CO₂, water, waste, cost savings
- **Metadata**: Dates, module info

### Module Report
- **Participation**: Total enrollments, completion rate
- **Aggregate Impact**: Sum of all users' impact
- **Tool Usage**: Unique tools, total uses
- **Trends**: Progress over time

### Corporate Report
- **Company Overview**: Employees, participation rate
- **Learning Metrics**: Modules completed, total XP
- **Company Impact**: Aggregate environmental metrics
- **By Core Value**: Impact breakdown (clean_air, clean_water, etc.)

---

## 🎨 Customization Options

### Change Impact Calculation Multipliers
Edit: `/app/api/esg/generate-report/route.ts`

```typescript
// Current multipliers:
// Air Quality: +500kg CO₂ per ROI calculation
// Water: 20% reduction assumption
// Waste: 30% reduction assumption
```

### Add New Metrics
Edit: `calculateImpactMetrics()` function

```typescript
// Example: Add energy savings
metrics.energy_saved_kwh = 0
if (tool.tool_name === 'energy-audit') {
  metrics.energy_saved_kwh += tool.data.kwhSaved || 0
}
```

### Customize Report Styling
Edit: `generatePDFReport()` or `generateExcelReport()` functions

---

## 🚀 Next Steps

### Phase 1: Tool Updates (27 remaining)
Follow guide: `BATCH-UPDATE-TOOLS-FOR-ESG.md`
- Priority: Calculators (high ROI value)
- Then: Assessments (risk analysis)
- Finally: Planners & trackers

### Phase 2: Enhanced Reports
- [ ] Add charts/graphs to PDF
- [ ] Multi-period comparison (Month 1 vs Month 6)
- [ ] Automatic scheduling (monthly reports)
- [ ] Email delivery
- [ ] Integration with external ESG platforms (GRI, CDP)

### Phase 3: Corporate Dashboard
- [ ] Admin view: company-wide impact
- [ ] Department breakdowns
- [ ] Employee leaderboards
- [ ] Historical trends
- [ ] Benchmark against industry

---

## 📞 Support

**Documentation**:
- `PLATFORM-MASTER-DOCUMENTATION.md` - Full platform overview
- `ESG-INFRASTRUCTURE-GUIDE.md` - Technical architecture
- `TOOL-DATA-SAVING-GUIDE.md` - How to update tools
- `BATCH-UPDATE-TOOLS-FOR-ESG.md` - Systematic tool updates

**Database**:
- Check `activity_responses` for tool data
- Check `lesson_responses` for activity responses
- Check `course_enrollments` for progress

**Key Files**:
- API: `/app/api/esg/generate-report/route.ts`
- Dashboard: `/app/(app)/employee-portal/mi-impacto/page.tsx`
- Downloader: `/components/esg/ESGReportDownloader.tsx`
- Hook: `/lib/hooks/useToolDataSaver.ts`

---

## ✅ Success Criteria

**You'll know it's working when**:
1. ✅ Tools show "Datos guardados para reporte ESG" notification
2. ✅ Dashboard shows non-zero impact numbers
3. ✅ PDF downloads and displays your data
4. ✅ Excel opens with formatted sheets
5. ✅ Data in Supabase matches dashboard display
6. ✅ No console errors during tool usage
7. ✅ Reports generate in < 3 seconds

---

**Ready to Test!** 🎉

Start with Step 1 (Database Setup) and work through each step in order.

If you encounter issues, check the Troubleshooting section or review the detailed documentation files.

**Last Updated**: November 10, 2025  
**Version**: 1.0  
**Status**: Production Ready (Pending Tool Updates)

