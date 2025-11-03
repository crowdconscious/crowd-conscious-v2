# Platform Modules & Templates Strategy

**Date**: November 2, 2025  
**Status**: Planning Phase  
**Priority**: High

---

## 🎯 **OBJECTIVES**

### 1. Platform-Owned Flagship Modules (6 modules)

- Build modules 1-6 as **platform-owned** courses
- 100% revenue stays with platform (no community/creator split)
- Immediately available in marketplace
- High-quality baseline for the platform

### 2. Template Library for Community Builders

- Create 3-4 **mock template modules** as examples
- Educational/onboarding purpose
- Show creators how to structure content
- One-click clone functionality

---

## 📚 **PLATFORM FLAGSHIP MODULES** (100% Platform Revenue)

### Module Structure:

```
Creator: "Crowd Conscious Platform"
Community ID: NULL (platform-owned)
Creator User ID: NULL (system)
Revenue Split: 100% platform, 0% community, 0% creator
Status: Published
Featured: TRUE
```

### The 6 Modules:

1. **🌬️ Aire Limpio / Clean Air**
   - Duration: 8-10 hours
   - Lessons: ~15 lessons
   - Price: $18,000 MXN base
   - Source: `module-1-clean-air-english.md` + `module-1-aire-limpio-español.md`

2. **💧 Agua Limpia / Clean Water**
   - Duration: 8-10 hours
   - Lessons: ~12 lessons
   - Price: $18,000 MXN base
   - Source: `module-2-clean-water-english.md` + `module-2-agua-limpia-español.md`

3. **🏙️ Ciudades Seguras / Safe Cities**
   - Duration: 8-10 hours
   - Lessons: ~14 lessons
   - Price: $18,000 MXN base
   - Source: `module-3-safe-cities-english.md` + `module-3-ciudades-seguras-español.md`

4. **♻️ Cero Residuos / Zero Waste**
   - Duration: 8-10 hours
   - Lessons: ~13 lessons
   - Price: $18,000 MXN base
   - Source: `module-4-zero-waste-english.md` + `module-4-cero-residuos-español.md`

5. **🤝 Comercio Justo / Fair Trade**
   - Duration: 8-10 hours
   - Lessons: ~12 lessons
   - Price: $18,000 MXN base
   - Source: `module-5-fair-trade-english.md` + `module-5-comercio-justo-español.md`

6. **🌟 Integración e Impacto / Integration & Impact**
   - Duration: 8-10 hours
   - Lessons: ~10 lessons
   - Price: $18,000 MXN base
   - Source: `module-6-integration-impact-english.md` + `module-6-integracion-impacto-español.md`

---

## 🎨 **TEMPLATE LIBRARY** (Mock Examples for Creators)

### Purpose:

- Onboarding for new module creators
- Show best practices
- Demonstrate tool integration
- Provide structure examples

### Template Modules (3-4 examples):

#### Template 1: "Cómo Construir un Módulo Efectivo"

- **Purpose**: Meta-module teaching module creation
- **Lessons**: 5 short lessons
- **Content**:
  1. Introducción: Qué hace un buen módulo
  2. Estructurando tus lecciones
  3. Integrando herramientas interactivas
  4. Escribiendo contenido atractivo
  5. Preparando para revisión

#### Template 2: "Módulo de Ejemplo: Sostenibilidad Básica"

- **Purpose**: Show complete module structure
- **Lessons**: 8 lessons
- **Content**: Generic sustainability content
- **Tools Used**: All 8 tools demonstrated
- **Format**: Story-driven like real modules

#### Template 3: "Plantilla Rápida: Capacitación Corporativa"

- **Purpose**: Quick-start template
- **Lessons**: 6 lessons
- **Content**: Generic corporate training structure
- **Tools Used**: 4-5 common tools
- **Format**: Professional, straightforward

#### Template 4: "Ejemplo Avanzado: Impacto Medible"

- **Purpose**: Advanced template with metrics
- **Lessons**: 10 lessons
- **Content**: How to track and measure impact
- **Tools Used**: Calculators, evidence uploader
- **Format**: Data-driven approach

---

## 🛠️ **IMPLEMENTATION PLAN**

### Phase 1: Database Setup for Platform Modules

```sql
-- Add platform-owned flag to marketplace_modules
ALTER TABLE marketplace_modules
ADD COLUMN is_platform_module BOOLEAN DEFAULT FALSE;

-- Platform modules don't split revenue
-- When is_platform_module = TRUE:
--   - 100% goes to platform wallet
--   - No community/creator wallets involved
--   - Featured in marketplace
```

### Phase 2: Module Parser Script

Create a script to parse the .md files and convert to database format:

- Extract lessons from markdown
- Parse story content, key points, activities
- Map tools to tool IDs
- Generate lesson order
- Create module + lessons in database

### Phase 3: Bulk Import API

```typescript
POST /api/admin/modules/import
- Accepts module data (parsed from .md)
- Creates module with is_platform_module = TRUE
- Creates all lessons
- Sets status = 'published'
- Admin-only endpoint
```

### Phase 4: Template System

```typescript
GET /api/modules/templates
- Returns template modules
- Includes preview data
- Metadata about lessons, tools used

POST /api/modules/clone-template
- Clones template to community
- User can edit after cloning
- Sets creator_community_id to user's community
```

### Phase 5: UI Components

- Template browser page
- "Start from Template" button in module builder
- Template preview modal
- Clone confirmation

---

## 📊 **REVENUE LOGIC UPDATE**

### Current Logic (Community Modules):

```
$18,000 sale
├─ Platform (30%): $5,400
├─ Community (50%): $9,000
└─ Creator (20%): $3,600
```

### New Logic (Platform Modules):

```
$18,000 sale
└─ Platform (100%): $18,000
```

### Implementation:

```typescript
// In process_module_sale() function
if (module.is_platform_module) {
  // All revenue to platform wallet
  platform_share = total_amount;
  community_share = 0;
  creator_share = 0;
} else {
  // Existing split logic
  platform_share = total_amount * 0.3;
  community_share = total_amount * 0.5;
  creator_share = total_amount * 0.2;
}
```

---

## 🎯 **SUCCESS CRITERIA**

### For Platform Modules:

- [x] 6 modules published in marketplace
- [x] All lessons properly structured
- [x] Tools correctly integrated
- [x] Pricing set appropriately
- [x] Featured in marketplace
- [x] 100% revenue to platform
- [x] High-quality thumbnails
- [x] Bilingual (English + Spanish)

### For Templates:

- [x] 3-4 template modules created
- [x] Template browser UI built
- [x] Clone functionality working
- [x] Templates clearly marked as examples
- [x] Educational content about module building
- [x] One-click start from template

---

## 📝 **NEXT STEPS**

### Immediate (Today):

1. Create SQL migration for `is_platform_module` column
2. Build module parser script for .md files
3. Create bulk import API endpoint
4. Import 6 flagship modules to database
5. Verify they appear in marketplace

### Short-term (This Week):

1. Create 3-4 mock template modules
2. Build template browser UI
3. Implement clone functionality
4. Add "Start from Template" to module builder
5. Update revenue split logic

### Testing:

1. Verify platform modules appear in marketplace
2. Test purchase flow (100% to platform)
3. Test template cloning
4. Verify cloned modules are editable
5. Check template preview functionality

---

## 🔐 **SECURITY CONSIDERATIONS**

### Platform Modules:

- Only admins can create platform modules
- `is_platform_module` can only be set by admins
- Cannot be edited after publication (or admin-only edits)
- Featured status controlled by admins

### Templates:

- Templates are read-only (cannot be edited directly)
- Cloning creates new module owned by community
- Cloned modules are fully editable
- Templates don't count toward community module limits

---

## 💡 **RECOMMENDATIONS**

1. **Start with 2-3 flagship modules** instead of all 6
   - Test the system
   - Gather feedback
   - Iterate before full launch

2. **Create 1-2 simple templates first**
   - Validate clone functionality
   - Get creator feedback
   - Expand based on usage

3. **Consider module bundles**
   - "Complete Sustainability Package" (all 6 modules)
   - Discounted pricing for bundles
   - Increases average order value

4. **Track template usage**
   - Which templates are most cloned?
   - Do cloned modules get published?
   - Template → published conversion rate

---

## 📈 **ESTIMATED EFFORT**

### Platform Modules Import:

- Parser script: 3-4 hours
- Bulk import API: 2-3 hours
- Database migration: 30 minutes
- Manual review/cleanup: 2-3 hours
- **Total**: 8-10 hours

### Template System:

- Mock template creation: 2-3 hours
- Template browser UI: 3-4 hours
- Clone API: 2-3 hours
- Integration with builder: 2 hours
- **Total**: 9-12 hours

### Revenue Logic Update:

- SQL function update: 1 hour
- Testing: 1 hour
- **Total**: 2 hours

**GRAND TOTAL**: 19-24 hours (2-3 full days)

---

_Last Updated: November 2, 2025_  
_Status: Ready to Begin Implementation_  
_Priority: High - Blocks marketplace launch_
