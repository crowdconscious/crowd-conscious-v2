# Template Module - Deployment Guide

**Module**: "Guía: Cómo Crear un Módulo de Capacitación Efectivo"  
**Status**: Ready for Deployment  
**Date**: November 3, 2025

---

## 📋 **DEPLOYMENT STEPS**

### **Step 1: Add Template Flag to Database**

Run this in **Supabase SQL Editor**:

```sql
-- Add is_template column
ALTER TABLE marketplace_modules 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;

-- Add index
CREATE INDEX IF NOT EXISTS idx_marketplace_modules_template 
ON marketplace_modules(is_template) 
WHERE is_template = TRUE;

-- Verify
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'marketplace_modules' 
AND column_name = 'is_template';
```

**Expected Result**: Should show `is_template | boolean | false`

---

### **Step 2: Insert Template Module**

Run the entire contents of:  
`scripts/insert-template-module.sql`

Or copy/paste this in Supabase SQL Editor:

```sql
-- (Full SQL script from insert-template-module.sql)
```

**Expected Output**:
```
NOTICE: Template module created: <uuid>
NOTICE: Template module lessons created successfully
```

**Verification Query**:
```sql
SELECT 
  id,
  title,
  is_template,
  is_platform_module,
  status,
  lesson_count,
  base_price_mxn
FROM marketplace_modules
WHERE is_template = TRUE;
```

Should return 1 row with:
- title: "Guía: Cómo Crear un Módulo de Capacitación Efectivo"
- is_template: true
- is_platform_module: true
- status: published
- lesson_count: 4
- base_price_mxn: 0 (FREE)

---

## ✅ **VERIFICATION**

### **Check in Marketplace**

1. Go to: `https://crowdconscious.app/marketplace`
2. You should now see **5 modules** (4 platform + 1 template)
3. Template module should show with 🌱 Biodiversity badge
4. Price should show as **GRATIS** or **$0 MXN**

### **Check Module Detail**

1. Click on the template module
2. Should show:
   - ✅ 4 lessons
   - ✅ 2 hours duration
   - ✅ 500 XP total
   - ✅ Free pricing
   - ✅ "Crowd Conscious Platform" as creator

---

## 📚 **TEMPLATE MODULE CONTENT**

### **Module Overview**
- **Title**: Guía: Cómo Crear un Módulo de Capacitación Efectivo
- **Description**: Step-by-step guide for creating impactful training modules
- **Duration**: 2 hours
- **Lessons**: 4
- **XP**: 500
- **Price**: FREE
- **Type**: Educational Template

### **Lessons**:

1. **Introducción: Anatomía de un Módulo Exitoso** (20 min, 100 XP)
   - Module structure
   - Essential components
   - Best practices

2. **Paso 1: Define tu Propuesta de Valor** (30 min, 150 XP)
   - Problem identification
   - Value proposition
   - Target audience
   - Learning objectives

3. **Paso 2: Estructura tu Contenido con Narrativa** (40 min, 150 XP)
   - Narrative structure
   - Emotional hooks
   - Theory/practice balance
   - Interactive tools

4. **Paso 3: Lanza y Mejora Continuamente** (30 min, 100 XP)
   - Launch checklist
   - Success metrics
   - Feedback loops
   - Continuous improvement

---

## 🎯 **NEXT STEPS** (After Deployment)

### **Immediate** (Today):
1. ✅ Deploy template flag
2. ✅ Insert template module
3. ✅ Verify in marketplace
4. ✅ Test module detail page

### **Short Term** (This Week):
1. Create template browser page (`/templates`)
2. Add "Start from Template" in module builder
3. Add clone functionality
4. Test full workflow

### **Medium Term** (Next Week):
1. Add 2-3 more templates (different core values)
2. Template analytics
3. Template rating system
4. Community feedback on templates

---

## 🚀 **TEMPLATE USAGE FLOW**

```
Community Creator
  ↓
Browse Templates (/templates)
  ↓
Select Template
  ↓
Preview Template Content
  ↓
Click "Use This Template"
  ↓
Clone to Module Builder
  ↓
Customize Content
  ↓
Submit for Review
  ↓
Publish to Marketplace
```

---

## 💡 **TEMPLATE BENEFITS**

### **For Community Creators**:
- ✅ Clear structure to follow
- ✅ Best practices built-in
- ✅ Real examples to learn from
- ✅ Faster module creation
- ✅ Higher quality baseline

### **For Platform**:
- ✅ Consistent module quality
- ✅ Reduced support burden
- ✅ Faster creator onboarding
- ✅ Showcases platform capabilities
- ✅ Encourages module creation

### **For Corporate Clients**:
- ✅ Higher quality modules
- ✅ More consistent experience
- ✅ Better learning outcomes
- ✅ Proven structure

---

## 📊 **SUCCESS METRICS**

Track these metrics after deployment:

- **Template Views**: How many creators view the template
- **Template Clones**: How many use it to create modules
- **Completion Rate**: % who finish the template guide
- **Module Quality**: Compare template-based vs non-template modules
- **Time to Create**: Average time to create module (with vs without template)
- **Approval Rate**: % of template-based modules approved on first submission

---

## 🔧 **TROUBLESHOOTING**

### **Template Not Showing in Marketplace**:
- Check `is_template = TRUE` in database
- Check `status = 'published'`
- Clear browser cache
- Check API endpoint returns template

### **Lessons Not Loading**:
- Verify all 4 lessons inserted
- Check `lesson_order` is correct (1, 2, 3, 4)
- Check `module_id` matches template module

### **Price Shows Wrong**:
- Should be 0 MXN (FREE)
- Check `base_price_mxn = 0`
- Check `price_per_50_employees = 0`

---

**Ready to Deploy!** 🚀

Run the SQL scripts in Supabase and verify the template appears in the marketplace.


