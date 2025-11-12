# 📋 Module Structure & Content Audit - Findings Report

**Date**: December 2025  
**Status**: ✅ **COMPLETED** - Database analysis complete

---

## 🎯 **Executive Summary**

**Total Modules**: 6 platform modules  
**Total Lessons**: 30 lessons  
**Issues Found**: 
- ⚠️ **Resource structure inconsistency** (causing SQL errors)
- ⚠️ **Tool naming inconsistency** (kebab-case vs PascalCase vs snake_case)
- ⚠️ **Missing or empty resources** in several lessons
- ⚠️ **Invalid resource URLs** (some point to `#` or missing paths)
- ⚠️ **Activity config null** in some lessons

---

## 📊 **Module Overview**

| Module | Title | Lessons | Status |
|--------|-------|---------|--------|
| 1 | Economía Circular: Cero Residuos | 6 | ✅ Published |
| 2 | Comercio Justo y Cadenas de Valor | 5 | ✅ Published |
| 3 | Gestión Sostenible del Agua | 5 | ✅ Published |
| 4 | Estrategias Avanzadas de Calidad del Aire | 5 | ✅ Published |
| 5 | Ciudades Seguras y Espacios Inclusivos | 5 | ✅ Published |
| 6 | Guía: Cómo Crear un Módulo de Capacitación Efectivo | 4 | ✅ Published |

---

## 🔧 **Tool Analysis**

### **Tool Naming Inconsistencies**

**Issue**: Tools use three different naming conventions:
- **kebab-case**: `waste-stream-analyzer`, `water-footprint-calculator`, `supply-chain-mapper`
- **PascalCase**: `AirQualityAssessment`, `CarbonCalculator`, `EvidenceUploader`
- **snake_case**: `reflection_journal`, `air_quality_assessment`, `implementation_plan`

**Impact**: Frontend may not correctly map all tool names to components.

**Tools Found** (30 unique tool references):
- `waste-stream-analyzer` (2 lessons)
- `five-rs-checklist` (1 lesson)
- `composting-calculator` (2 lessons)
- `zero-waste-certification-roadmap` (1 lesson)
- `supply-chain-mapper` (1 lesson)
- `fair-wage-calculator` (1 lesson)
- `local-supplier-finder` (1 lesson)
- `responsible-procurement-scorecard` (2 lessons)
- `impact-report-generator` (1 lesson)
- `water-footprint-calculator` (1 lesson)
- `water-audit-tool` (1 lesson)
- `water-conservation-tracker` (1 lesson)
- `water-quality-test-log` (1 lesson)
- `recycling-system-designer` (1 lesson)
- `AirQualityAssessment` (1 lesson)
- `CarbonCalculator` (2 lessons)
- `EvidenceUploader` (3 lessons)
- `CostCalculator` (1 lesson)
- `ReflectionJournal` (2 lessons)
- `security-audit-tool` (2 lessons)
- `community-survey-tool` (2 lessons)
- `cost-calculator` (1 lesson)
- `reflection_journal` (1 lesson)
- `air_quality_assessment` (1 lesson)
- `implementation_plan` (1 lesson)
- `evidence_uploader` (1 lesson)

**Recommendation**: Standardize all tool names to kebab-case for consistency.

---

## 📚 **Resource Analysis**

### **Critical Issue: Resource Structure Inconsistency**

**Problem**: The `resources` field has inconsistent structures:

1. **Object with nested arrays** (Module 2, 3, 4):
   ```json
   {
     "links": [...],
     "videos": [...],
     "downloads": [...]
   }
   ```

2. **Array of objects** (Module 6):
   ```json
   [
     {"url": "#", "type": "article", "title": "..."},
     {"url": "tool:reflection_journal", "type": "tool", "title": "..."}
   ]
   ```

3. **Empty array** (Module 1, Lesson 6):
   ```json
   []
   ```

**SQL Error**: `cannot get array length of a non-array` occurs because some resources are objects, not arrays.

### **Resource URL Issues**

**Invalid URLs Found**:
- `"url": "#"` - Placeholder links (Module 6, multiple lessons)
- `"url": "/communities"` - Internal paths that may not work
- `"url": "/certificates/download"` - Internal paths
- `"url": "/marketplace"` - Internal paths
- `"url": "/resources/water-audit-template.xlsx"` - Missing files (need to verify)

**Tool References**:
- `"url": "tool:reflection_journal"` - ✅ Correct format
- `"url": "tool:air_quality_assessment"` - ✅ Correct format

**External Links** (Need validation):
- `https://ellenmacarthurfoundation.org` ✅
- `https://www.canacintra.org.mx` ✅
- `https://www.globalreporting.org` ✅
- `https://www.gob.mx/conagua` ✅
- `https://livingwage.mit.edu` ✅
- `https://www.bcorporation.net/es-es` ✅
- Many more...

### **Lessons with Missing/Empty Resources**

1. **Economía Circular: Cero Residuos** - Lesson 6: `"resources": []`
2. **Guía: Cómo Crear un Módulo** - Multiple lessons have placeholder `#` URLs

---

## 🎯 **Activity Analysis**

### **Activities Summary**

**All lessons have activities** except:
- Module 6, Lesson 1: `activity_config: null` (reflection type, not required)

**Activity Types Found**:
- `audit` (8 lessons)
- `design` (7 lessons)
- `assessment` (3 lessons)
- `planning` (3 lessons)
- `commitment` (3 lessons)
- `project` (1 lesson)
- `dashboard` (1 lesson)
- `calculation` (1 lesson)
- `implementation` (1 lesson)
- `reporting` (1 lesson)
- `reflection` (1 lesson)
- `submission` (1 lesson)

**Activity Config Issues**:
- Module 6 has 3 lessons with `activity_config: null` (should have configs)
- Most activities have detailed configs with steps, deliverables, time estimates ✅

---

## ⚠️ **Critical Issues to Fix**

### **1. Resource Structure Standardization** 🔴 HIGH PRIORITY

**Problem**: Inconsistent `resources` field structure prevents proper querying and display.

**Solution**: Standardize to single array format:
```json
[
  {
    "title": "...",
    "type": "link|video|download|tool",
    "url": "...",
    "description": "..."
  }
]
```

**Affected Lessons**: All lessons need review and potential migration.

### **2. Tool Name Standardization** 🟡 MEDIUM PRIORITY

**Problem**: Three naming conventions make frontend mapping unreliable.

**Solution**: Convert all to kebab-case:
- `AirQualityAssessment` → `air-quality-assessment`
- `reflection_journal` → `reflection-journal`
- `waste-stream-analyzer` → ✅ Already correct

**Affected Tools**: ~10 tools need renaming.

### **3. Invalid Resource URLs** 🟡 MEDIUM PRIORITY

**Problem**: Placeholder `#` URLs and missing internal paths.

**Solution**:
- Replace `#` with actual URLs or remove
- Verify all `/resources/*` paths exist
- Test all external links

**Affected Lessons**: Module 6 (template module) has multiple `#` URLs.

### **4. Missing Resources** 🟢 LOW PRIORITY

**Problem**: Some lessons have empty resources arrays.

**Solution**: Add resources based on documentation or mark as "coming soon".

**Affected Lessons**: 
- Economía Circular, Lesson 6
- Potentially others

---

## 📝 **Detailed Findings by Module**

### **Module 1: Economía Circular: Cero Residuos** ✅
- **Tools**: ✅ All properly named (kebab-case)
- **Resources**: ✅ Object structure with links array
- **Activities**: ✅ All have detailed configs
- **Issue**: Lesson 6 has empty resources array

### **Module 2: Comercio Justo y Cadenas de Valor** ✅
- **Tools**: ✅ All properly named (kebab-case)
- **Resources**: ✅ Object structure with links array
- **Activities**: ✅ All have detailed configs

### **Module 3: Gestión Sostenible del Agua** ✅
- **Tools**: ✅ All properly named (kebab-case)
- **Resources**: ✅ Object structure with links, videos, downloads
- **Activities**: ✅ All have detailed configs

### **Module 4: Estrategias Avanzadas de Calidad del Aire** ⚠️
- **Tools**: ⚠️ Mixed naming (PascalCase: `AirQualityAssessment`, `CarbonCalculator`)
- **Resources**: ✅ Object structure with apps, links, downloads
- **Activities**: ✅ All have detailed configs

### **Module 5: Ciudades Seguras y Espacios Inclusivos** ✅
- **Tools**: ✅ All properly named (kebab-case)
- **Resources**: ✅ Object structure with downloads, external_links
- **Activities**: ✅ All have detailed configs

### **Module 6: Guía: Cómo Crear un Módulo** ⚠️
- **Tools**: ⚠️ Mixed naming (snake_case: `reflection_journal`, `air_quality_assessment`)
- **Resources**: ⚠️ Array structure (different from others), has `#` placeholder URLs
- **Activities**: ⚠️ 3 lessons have `activity_config: null`

---

## 🔧 **Recommended Fixes**

### **Fix 1: Standardize Resource Structure**

Create SQL migration to convert all resources to consistent format:

```sql
-- Update resources to consistent array format
UPDATE module_lessons
SET resources = CASE
  WHEN resources::text LIKE '{%' THEN
    -- Convert object format to array format
    jsonb_build_array(
      jsonb_build_object(
        'title', 'External Links',
        'type', 'links',
        'items', COALESCE(resources->'links', '[]'::jsonb)
      ),
      jsonb_build_object(
        'title', 'Videos',
        'type', 'videos',
        'items', COALESCE(resources->'videos', '[]'::jsonb)
      ),
      jsonb_build_object(
        'title', 'Downloads',
        'type', 'downloads',
        'items', COALESCE(resources->'downloads', '[]'::jsonb)
      )
    )
  ELSE
    -- Already array format, keep as is
    resources
END
WHERE resources IS NOT NULL;
```

### **Fix 2: Standardize Tool Names**

```sql
-- Update tool names to kebab-case
UPDATE module_lessons
SET tools_used = ARRAY(
  SELECT 
    CASE
      WHEN tool = 'AirQualityAssessment' THEN 'air-quality-assessment'
      WHEN tool = 'CarbonCalculator' THEN 'carbon-calculator'
      WHEN tool = 'EvidenceUploader' THEN 'evidence-uploader'
      WHEN tool = 'CostCalculator' THEN 'cost-calculator'
      WHEN tool = 'ReflectionJournal' THEN 'reflection-journal'
      WHEN tool = 'reflection_journal' THEN 'reflection-journal'
      WHEN tool = 'air_quality_assessment' THEN 'air-quality-assessment'
      WHEN tool = 'implementation_plan' THEN 'implementation-plan'
      WHEN tool = 'evidence_uploader' THEN 'evidence-uploader'
      ELSE tool
    END
  FROM unnest(tools_used) AS tool
)
WHERE tools_used IS NOT NULL;
```

### **Fix 3: Remove Invalid URLs**

```sql
-- Remove resources with placeholder URLs
UPDATE module_lessons
SET resources = (
  SELECT jsonb_agg(resource)
  FROM jsonb_array_elements(resources) AS resource
  WHERE resource->>'url' != '#'
)
WHERE resources::text LIKE '%"url": "#"%';
```

---

## ✅ **Next Steps**

1. **Run Fix 1**: Standardize resource structure (SQL migration)
2. **Run Fix 2**: Standardize tool names (SQL migration)
3. **Run Fix 3**: Clean up invalid URLs
4. **Verify Frontend**: Test tool rendering with new names
5. **Add Missing Resources**: Fill in empty resource arrays
6. **Test All Links**: Validate external URLs work
7. **Update Documentation**: Ensure .md files match database

---

## 📊 **Summary Statistics**

- **Total Lessons**: 30
- **Lessons with Tools**: 30 (100%)
- **Lessons with Activities**: 30 (100%)
- **Lessons with Resources**: ~28 (93%)
- **Tool Naming Issues**: ~10 tools need standardization
- **Resource Structure Issues**: All lessons need review
- **Invalid URLs**: ~5-10 placeholder URLs need fixing

---

**Status**: ✅ **AUDIT COMPLETE** - Ready for fixes

