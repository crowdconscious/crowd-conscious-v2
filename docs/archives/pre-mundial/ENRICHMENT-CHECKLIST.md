# 🎓 Module Enrichment Checklist

## 📋 Instructions

Run these SQL files **in order** in your Supabase SQL Editor:

---

### ✅ Step 1: Module 2 - Agua Limpia (Clean Water)

**File:** `ENRICH-MODULE-2-ALL-LESSONS.sql`

1. Open Supabase → SQL Editor
2. Open `ENRICH-MODULE-2-ALL-LESSONS.sql`
3. Copy entire file
4. Paste into SQL Editor
5. Click "Run"
6. ✅ Should see: "Module 2 (Gestión Sostenible del Agua) enrichment complete!"

**Enriches:** 5 lessons with water management content

---

### ✅ Step 2: Module 3 - Ciudades Seguras (Safe Cities)

**File:** `ENRICH-MODULE-3-ALL-LESSONS.sql`

1. Open `ENRICH-MODULE-3-ALL-LESSONS.sql`
2. Copy entire file
3. Paste into SQL Editor
4. Click "Run"
5. ✅ Should see: "Module 3 (Ciudades Seguras) enrichment complete!"

**Enriches:** 5 lessons with urban safety content

---

### ✅ Step 3: Module 4 - Cero Residuos (Zero Waste)

**File:** `ENRICH-MODULE-4-ALL-LESSONS.sql`

1. Open `ENRICH-MODULE-4-ALL-LESSONS.sql`
2. Copy entire file
3. Paste into SQL Editor
4. Click "Run"
5. ✅ Should see: "Module 4 (Economía Circular) enrichment complete!"

**Enriches:** 5 lessons with circular economy content

---

### ✅ Step 4: Module 5 - Comercio Justo (Fair Trade)

**File:** `ENRICH-MODULE-5-ALL-LESSONS.sql`

1. Open `ENRICH-MODULE-5-ALL-LESSONS.sql`
2. Copy entire file
3. Paste into SQL Editor
4. Click "Run"
5. ✅ Should see: "Module 5 (Comercio Justo) enrichment complete!"

**Enriches:** 5 lessons with fair trade content

---

### ✅ Step 5: Module 6 - Integración de Impacto

**File:** `ENRICH-MODULE-6-ALL-LESSONS.sql`

1. Open `ENRICH-MODULE-6-ALL-LESSONS.sql`
2. Copy entire file
3. Paste into SQL Editor
4. Click "Run"
5. ✅ Should see: "Module 6 (Integración de Impacto) enrichment complete!"

**Enriches:** 5 lessons with impact measurement content

---

## ✅ Final Verification

After running all 5 files, run this query to verify:

```sql
-- Verify all enrichments
SELECT 
    mm.core_value,
    mm.title,
    COUNT(ml.id) as total_lessons,
    COUNT(*) FILTER (WHERE ml.story_content IS NOT NULL) as enriched_lessons,
    CASE 
        WHEN COUNT(*) FILTER (WHERE ml.story_content IS NOT NULL) = COUNT(ml.id) THEN '✅ Complete'
        ELSE '⚠️ Incomplete'
    END as status
FROM marketplace_modules mm
LEFT JOIN module_lessons ml ON mm.id = ml.module_id
WHERE mm.status = 'published'
GROUP BY mm.id, mm.core_value, mm.title
ORDER BY mm.core_value;
```

**Expected Result:**
- 6 modules total
- All showing "✅ Complete"
- 30 total lessons enriched

---

## 🎉 Success Criteria

After completing all steps, you should have:

- ✅ 30 lessons with story content
- ✅ 30 lessons with learning objectives
- ✅ 30 lessons with activities
- ✅ 30 lessons with key points
- ✅ 30 lessons with real-world examples
- ✅ 30 lessons with tools and resources

---

## 🚨 Troubleshooting

### Error: "module not found"
- Make sure you ran `STANDARDIZE-MODULE-NAMES.sql` first
- Check that module with correct `core_value` exists and is `published`

### Error: "column does not exist"
- Verify you're using `lesson_order` not `lesson_number`
- Check that all columns exist in `module_lessons` table

### No rows updated
- Check that lessons exist for that module
- Verify `module_id` matches between `marketplace_modules` and `module_lessons`

---

## 📊 Time Estimate

- Each SQL file: ~5-10 seconds
- Total time: **~1 minute** to run all 5 files
- Verification: ~5 seconds

**Total: ~2 minutes to enrich 30 lessons! 🚀**

---

## ✨ What's Next?

After enrichment:

1. Test Module 2 in browser
2. Verify lessons load with full content
3. Test certificate generation
4. Test all 6 modules end-to-end

**The platform is ready for students!** 🌟

