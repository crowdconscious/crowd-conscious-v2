# Storage Buckets Status Check

## Current Storage Infrastructure

### ✅ Existing Bucket
We already have the `employee-evidence` bucket which is being used for:
- Activity evidence uploads
- User-submitted files
- Lesson response evidence

**Path**: `/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/activities/upload-evidence/route.ts`

---

## Do We Need New Buckets?

### Short Answer: **NOT YET**

The existing `employee-evidence` bucket is sufficient for now because:

1. ✅ **Activity Evidence**: Already handled by `employee-evidence`
2. ⏸️ **ESG Reports**: Not generating PDF reports yet
3. ⏸️ **Impact Measurements**: Not tracking separate measurement files yet

---

## When To Create New Buckets

Create the new buckets when we start implementing:

### 1. **`esg-reports` bucket**
**When:** Building ESG report PDF/Excel generation
**Purpose:** Store compiled reports
**Features:**
- Public access with token
- Shareable links
- PDF and Excel formats

### 2. **`impact-measurements` bucket**
**When:** Adding impact measurement evidence uploads
**Purpose:** Store measurement evidence files (separate from activity evidence)
**Features:**
- Private access
- Linked to impact_measurements table
- Support before/after photos

### 3. **`activity-evidence` bucket**
**When:** Separating activity evidence from general employee evidence
**Purpose:** Dedicated storage for lesson activities
**Features:**
- Private access
- Better organization by module/lesson
- Easier querying for ESG reports

---

## Current Setup Works Because

✅ **API Updated**: `/api/activities/save-response` now saves to:
- `activity_responses` table (new structured data)
- `lesson_responses` table (backward compatibility)

✅ **File Uploads Work**: Continue using `employee-evidence` bucket

✅ **Data Ready for ESG**: Structured data in `activity_responses` can be queried for reports

---

## Recommendation

**For Now**: ✅ Keep using `employee-evidence` bucket  
**Next Phase**: Create new buckets when building:
1. ESG report PDF generator
2. Impact measurement tracking UI
3. Advanced evidence management

---

## How To Check Existing Buckets

**Via Supabase Dashboard:**
1. Go to: Storage → Buckets
2. Look for: `employee-evidence`
3. Verify: Private access, RLS enabled

**Via SQL:**
```sql
-- Check existing buckets
SELECT * FROM storage.buckets;
```

---

## Status

- ✅ Database tables created
- ✅ API updated to use new tables
- ✅ Backward compatibility maintained
- ✅ Storage working with existing bucket
- ⏸️ New buckets: Create when needed

