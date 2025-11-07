# 🎯 Setup Interactive Activities + ESG Tracking

## 📋 Overview

This guide will activate:
- ✅ **Interactive activities** for all modules (text inputs, multiple choice, file uploads)
- ✅ **Response tracking** for ESG reporting
- ✅ **Module 3 tools** (Security Audit, Community Surveys, Cost Calculator)

---

## ⚡ Step 1: Create Database Table

Run this SQL in Supabase SQL Editor:

**File:** `CREATE-ACTIVITY-RESPONSES-TABLE.sql`

1. Open Supabase → SQL Editor
2. Copy entire file contents
3. Paste and click "Run"
4. ✅ Should see: "activity_responses table created successfully!"

**What it creates:**
- `activity_responses` table (stores all student responses)
- RLS policies (users can only see their own responses, admins see all)
- Helper functions for ESG reporting:
  - `get_module_activity_stats()` - Module completion metrics
  - `get_user_activity_completion()` - Individual student progress

---

## ⚡ Step 2: Create Storage Bucket

Go to Supabase → Storage → Create Bucket:

**Bucket Name:** `activity-evidence`

**Settings:**
- ✅ Public bucket (YES)
- ✅ File size limit: 10 MB
- ✅ Allowed MIME types: `image/*`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**RLS Policy:**
```sql
-- Allow users to upload their own files
CREATE POLICY "Users can upload their own evidence"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'activity-evidence' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own files
CREATE POLICY "Users can view their own evidence"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'activity-evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public viewing (for certificate verification)
CREATE POLICY "Public can view uploaded evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'activity-evidence');
```

---

## ⚡ Step 3: Verify API Endpoints

These should already be deployed to Vercel:

1. ✅ `/api/activities/save-response` - Saves activity responses
2. ✅ `/api/activities/upload-evidence` - Uploads files to storage

Test with:
```bash
curl https://crowdconscious.app/api/activities/save-response?lesson_id=test
# Should return 401 (not authenticated) - means API is live
```

---

## ⚡ Step 4: Test Interactive Activities

1. Go to any module lesson (e.g., Module 3, Lesson 1)
2. Scroll to "Actividad Práctica" section
3. Click "Comenzar Actividad"
4. You should see:
   - ✅ Text boxes for reflection questions
   - ✅ Checkboxes for success criteria
   - ✅ File upload button
   - ✅ "Guardar Respuestas" button
5. Fill out responses and click "Guardar"
6. ✅ Should see success notification

---

## ⚡ Step 5: Test Module 3 Tools

Go to **Module 3: Ciudades Seguras**

### Lesson 3.1 - Security Audit Tool
- Tool: `security-audit-tool`
- Features:
  - Zone-based assessment
  - Lighting/visibility/maintenance ratings (1-10)
  - Automatic scoring
  - Color-coded results

### Lesson 3.4 - Cost Calculator
- Tool: `cost-calculator`
- Features:
  - Add improvements with costs
  - Impact ratings (1-10)
  - Automatic ROI calculation
  - Priority sorting

### Lesson 3.2 - Community Survey Tool
- Tool: `community-survey-tool`
- Features:
  - Demographics tracking
  - Safety perception metrics
  - (Full tool coming soon - use external forms for now)

---

## 📊 Step 6: Test ESG Reporting

### Check User Completion
```sql
-- See your own activity completion across all modules
SELECT * FROM get_user_activity_completion(
  (SELECT id FROM auth.users WHERE email = 'your@email.com')
);
```

**Expected Output:**
| module_title | total_lessons | completed_activities | completion_rate | time_spent | evidence_count |
|---|---|---|---|---|---|
| Gestión Sostenible del Agua | 5 | 3 | 60.00 | 125 | 7 |
| Ciudades Seguras | 5 | 5 | 100.00 | 180 | 12 |

### Check Module Stats
```sql
-- See activity stats for Module 3
SELECT * FROM get_module_activity_stats(
  (SELECT id FROM marketplace_modules WHERE core_value = 'safe_cities')
);
```

---

## ✅ Success Criteria

After completing all steps, you should have:

### For ALL Modules:
- ✅ Text boxes for reflection questions
- ✅ Checkboxes for success criteria
- ✅ File uploads for evidence
- ✅ Auto-save with completion tracking
- ✅ Response retrieval (if you navigate away and come back)

### For Module 3:
- ✅ Security Audit Tool (interactive scoring)
- ✅ Cost Calculator (ROI analysis)
- ✅ Community Survey Tool (basic template)

### For Admins:
- ✅ Database table with all responses
- ✅ SQL functions for ESG reporting
- ✅ Evidence files in Supabase Storage
- ✅ Completion metrics (time, percentage, evidence count)

---

## 🚨 Troubleshooting

### "Error al guardar respuesta"
- Check: User is logged in
- Check: `activity_responses` table exists
- Check: RLS policies allow INSERT for authenticated users

### "Error subiendo archivos"
- Check: `activity-evidence` bucket exists in Supabase Storage
- Check: Bucket is public
- Check: RLS policies allow INSERT

### Tools not showing
- Check: Lesson has `tools_used` array populated in database
- Check: Tool component exists in `/components/module-tools/`
- Check: Tool is imported in lesson page

### Responses not persisting
- Check: `enrollment_id` is passed to InteractiveActivity component
- Check: `lesson_id` matches the actual lesson UUID
- Check: Browser console for errors

---

## 🎯 What's Next?

After setup:
1. Test all Module 3 lessons with tools
2. Test file upload with photos
3. Check ESG reporting queries
4. **Roll out same system to Modules 2, 4, 5, 6**

---

## 📈 ESG Reporting Queries

### Total Platform Engagement
```sql
SELECT 
  COUNT(DISTINCT user_id) as total_users,
  COUNT(*) as total_responses,
  AVG((completion_data->>'completion_percentage')::NUMERIC) as avg_completion,
  SUM((completion_data->>'time_spent_minutes')::INT) as total_time_minutes,
  SUM(array_length(evidence_urls, 1)) as total_evidence_files
FROM activity_responses;
```

### Most Engaged Modules
```sql
SELECT 
  mm.title,
  COUNT(DISTINCT ar.user_id) as unique_users,
  COUNT(ar.id) as total_activities,
  AVG((ar.completion_data->>'completion_percentage')::NUMERIC) as avg_completion
FROM marketplace_modules mm
LEFT JOIN activity_responses ar ON mm.id = ar.module_id
GROUP BY mm.id, mm.title
ORDER BY total_activities DESC;
```

### User Leaderboard
```sql
SELECT 
  p.full_name,
  p.email,
  COUNT(ar.id) as activities_completed,
  AVG((ar.completion_data->>'completion_percentage')::NUMERIC) as avg_completion,
  SUM((ar.completion_data->>'time_spent_minutes')::INT) as total_time_minutes
FROM profiles p
LEFT JOIN activity_responses ar ON p.id = ar.user_id
GROUP BY p.id, p.full_name, p.email
ORDER BY activities_completed DESC
LIMIT 10;
```

---

**🎉 Your platform now tracks real learning outcomes for ESG reporting!**

