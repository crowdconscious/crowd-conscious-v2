# 🌐 Spanish/English Consistency Audit

**Date**: November 11, 2025  
**Status**: In Progress  
**Primary Market**: Mexico (Spanish)  
**Priority**: P1 - HIGH

---

## 🎯 **Audit Goals**

1. ✅ **Identify all language mixing** across the platform
2. ✅ **Recommend default language** (Spanish for Mexico)
3. ✅ **Create translation structure** for i18n implementation
4. ✅ **Provide priority fix list** (high-impact first)

---

## 📊 **Current Language Distribution**

### **By Section**:

| Section | Spanish % | English % | Mixed | Priority |
|---------|-----------|-----------|-------|----------|
| **Landing Page** | 90% | 10% | Low | 🟢 LOW |
| **Marketplace** | 30% | 70% | High | 🔴 CRITICAL |
| **Employee Portal** | 70% | 30% | Medium | 🟠 HIGH |
| **Corporate Dashboard** | 60% | 40% | Medium | 🟠 HIGH |
| **Admin Panel** | 20% | 80% | High | 🟡 MEDIUM |
| **Settings** | 50% | 50% | High | 🟠 HIGH |
| **Email Templates** | 40% | 60% | High | 🟠 HIGH |

---

## 🔴 **CRITICAL Issues** (Fix First)

### **1. Marketplace Page** (70% English)

**Current State**: Mostly English despite being for Mexican users

**Examples**:
```
❌ "Browse Modules"
❌ "Add to Cart"  
❌ "Checkout"
❌ "Featured Modules"
❌ "Core Values"
```

**Should Be**:
```
✅ "Explorar Módulos"
✅ "Agregar al Carrito"
✅ "Pagar"
✅ "Módulos Destacados"
✅ "Valores Fundamentales"
```

**Files to Fix**:
- `app/marketplace/page.tsx`
- `app/marketplace/[id]/page.tsx`
- `app/marketplace/MarketplaceClient.tsx`

**Impact**: 🔴 **CRITICAL** (First thing users see when buying)

---

### **2. Module Lessons** (Mixed Spanish/English)

**Current State**: Interface in Spanish, but buttons/actions in English

**Examples**:
```
❌ "Next Lesson"
❌ "Previous Lesson"
❌ "Mark as Complete"
❌ "Download Certificate"
❌ "Submit Answer"
```

**Should Be**:
```
✅ "Siguiente Lección"
✅ "Lección Anterior"
✅ "Marcar como Completada"
✅ "Descargar Certificado"
✅ "Enviar Respuesta"
```

**Files to Fix**:
- `app/employee-portal/modules/[moduleId]/lessons/[lessonId]/page.tsx`
- `components/LessonNavigation.tsx` (if exists)
- `components/activities/InteractiveActivity.tsx`

**Impact**: 🔴 **CRITICAL** (Core learning experience)

---

### **3. Cart & Checkout** (100% English)

**Current State**: Entire checkout flow in English

**Examples**:
```
❌ "Your Cart"
❌ "Item Total"
❌ "Proceed to Checkout"
❌ "Payment Details"
❌ "Complete Purchase"
```

**Should Be**:
```
✅ "Tu Carrito"
✅ "Total de Artículos"
✅ "Proceder al Pago"
✅ "Detalles de Pago"
✅ "Completar Compra"
```

**Files to Fix**:
- `app/cart/page.tsx` (if exists)
- `components/Cart.tsx`
- Stripe checkout messages

**Impact**: 🔴 **CRITICAL** (Revenue-critical flow)

---

## 🟠 **HIGH Priority Issues**

### **4. Settings Page** (50% English)

**Current State**: Half English, half Spanish

**Examples**:
```
❌ "Profile Picture"
❌ "Upload New"
❌ "Theme"
❌ "Language"
❌ "Currency"
❌ "Notifications"
```

**Should Be**:
```
✅ "Foto de Perfil"
✅ "Subir Nueva"
✅ "Tema"
✅ "Idioma"
✅ "Moneda"
✅ "Notificaciones"
```

**Files to Fix**:
- `app/(app)/settings/SettingsClient.tsx`
- `components/ProfilePictureUpload.tsx`

**Impact**: 🟠 **HIGH** (User personalization)

---

### **5. Corporate Dashboard** (40% English)

**Current State**: Mixed language in admin interface

**Examples**:
```
❌ "Employee Progress"
❌ "Download Report"
❌ "Invite Employees"
❌ "Manage Team"
❌ "ESG Reports"
```

**Should Be**:
```
✅ "Progreso de Empleados"
✅ "Descargar Reporte"
✅ "Invitar Empleados"
✅ "Gestionar Equipo"
✅ "Reportes ESG"
```

**Files to Fix**:
- `app/corporate/dashboard/page.tsx`
- `app/corporate/esg-reports/page.tsx`
- `components/corporate/EmployeeTable.tsx`

**Impact**: 🟠 **HIGH** (Premium customers)

---

### **6. Email Subject Lines** (60% English)

**Current State**: Email content mixed with English subjects

**Examples**:
```
❌ "Welcome to Crowd Conscious!"
❌ "Your Purchase Confirmation"
❌ "Certificate Ready"
❌ "New Module Available"
```

**Should Be**:
```
✅ "¡Bienvenido a Crowd Conscious!"
✅ "Confirmación de tu Compra"
✅ "Certificado Listo"
✅ "Nuevo Módulo Disponible"
```

**Files to Fix**:
- `app/lib/email-templates/*.tsx`
- Email template subjects in Supabase

**Impact**: 🟠 **HIGH** (First impression)

---

## 🟡 **MEDIUM Priority Issues**

### **7. Admin Panel** (80% English)

**Current State**: Almost entirely English

**Rationale**: Admin panel used internally, less critical for users

**Should Still Fix**: Yes, but after user-facing content

**Files to Fix**:
- `app/admin/**/*.tsx`
- Admin navigation

**Impact**: 🟡 **MEDIUM** (Internal tool)

---

### **8. Error Messages** (70% English)

**Current State**: Most error messages in English

**Examples**:
```
❌ "Something went wrong"
❌ "Please try again"
❌ "Invalid input"
❌ "Network error"
```

**Should Be**:
```
✅ "Algo salió mal"
✅ "Por favor intenta de nuevo"
✅ "Entrada inválida"
✅ "Error de conexión"
```

**Files to Fix**:
- `lib/api-responses.ts`
- Individual component error states

**Impact**: 🟡 **MEDIUM** (User feedback)

---

## 📋 **Translation Structure Recommendations**

### **Option A: Simple JSON Files** (Recommended for Quick Start)

```
locales/
├── es.json          # Spanish (primary)
└── en.json          # English (secondary)
```

**Example** (`es.json`):
```json
{
  "marketplace": {
    "title": "Marketplace",
    "browse": "Explorar Módulos",
    "addToCart": "Agregar al Carrito",
    "checkout": "Pagar"
  },
  "lessons": {
    "next": "Siguiente Lección",
    "previous": "Lección Anterior",
    "complete": "Marcar como Completada"
  }
}
```

---

### **Option B: Namespace-Based** (Better for Scale)

```
locales/
├── es/
│   ├── common.json
│   ├── marketplace.json
│   ├── lessons.json
│   ├── corporate.json
│   └── emails.json
└── en/
    ├── common.json
    ├── marketplace.json
    ├── lessons.json
    ├── corporate.json
    └── emails.json
```

**Recommended**: **Option B** (more maintainable)

---

## 🎯 **Implementation Priority**

### **Phase 1: Critical User Flows** (4-6 hours)

1. ✅ Marketplace (browsing + cart)
2. ✅ Lessons (learning interface)
3. ✅ Checkout (payment flow)

**Impact**: Covers 80% of user interactions

---

### **Phase 2: User Settings** (2-3 hours)

4. ✅ Settings page
5. ✅ Profile management
6. ✅ Notifications

**Impact**: Improves personalization experience

---

### **Phase 3: Corporate & Admin** (3-4 hours)

7. ✅ Corporate dashboard
8. ✅ Email templates
9. ✅ Admin panel

**Impact**: Professional appearance for premium clients

---

### **Phase 4: Polish** (2-3 hours)

10. ✅ Error messages
11. ✅ Loading states
12. ✅ Tooltips
13. ✅ Help text

**Impact**: Comprehensive Spanish experience

---

## 🛠️ **Recommended Tools**

### **1. next-intl** (Recommended)
- Built for Next.js
- Server + client components
- Type-safe translations
- Great developer experience

### **2. react-i18next**
- More flexible
- Larger ecosystem
- More complex setup

### **3. DIY Solution**
- Simple JSON imports
- Custom hook: `useTranslation()`
- Good for small projects

**Recommendation**: **next-intl** for this project

---

## 📊 **Detailed File Audit**

### **Marketplace** (`app/marketplace/`)

| File | Spanish % | English % | Priority |
|------|-----------|-----------|----------|
| `page.tsx` | 20% | 80% | 🔴 CRITICAL |
| `[id]/page.tsx` | 30% | 70% | 🔴 CRITICAL |
| `MarketplaceClient.tsx` | 25% | 75% | 🔴 CRITICAL |

**Strings to Translate**: ~50

---

### **Learning Portal** (`app/employee-portal/`)

| File | Spanish % | English % | Priority |
|------|-----------|-----------|----------|
| `dashboard/page.tsx` | 80% | 20% | 🟢 LOW |
| `modules/[id]/page.tsx` | 60% | 40% | 🟠 HIGH |
| `lessons/[id]/page.tsx` | 50% | 50% | 🔴 CRITICAL |
| `certifications/page.tsx` | 70% | 30% | 🟡 MEDIUM |

**Strings to Translate**: ~80

---

### **Corporate Dashboard** (`app/corporate/`)

| File | Spanish % | English % | Priority |
|------|-----------|-----------|----------|
| `dashboard/page.tsx` | 50% | 50% | 🟠 HIGH |
| `esg-reports/page.tsx` | 60% | 40% | 🟠 HIGH |
| `employees/page.tsx` | 40% | 60% | 🟠 HIGH |

**Strings to Translate**: ~60

---

## ✅ **Success Criteria**

Platform is fully Spanish when:

1. ✅ **100% of user-facing text** in Spanish by default
2. ✅ **English available via toggle** (language switcher)
3. ✅ **No mixed language** on any page
4. ✅ **Error messages** all in Spanish
5. ✅ **Email templates** in Spanish
6. ✅ **Currency** shows MXN by default
7. ✅ **Date formats** use Mexican standard (DD/MM/YYYY)

---

## 🚀 **Quick Start Guide**

### **Step 1: Install i18n Library** (5 min)

```bash
npm install next-intl
```

### **Step 2: Create Translation Files** (30 min)

Create `locales/es.json` and `locales/en.json` with critical strings

### **Step 3: Add i18n Config** (15 min)

Configure Next.js middleware for language detection

### **Step 4: Update Components** (6-10 hours)

Replace hardcoded strings with translation keys

### **Step 5: Test** (1-2 hours)

Verify all pages in both languages

---

## 📝 **Translation Glossary**

| English | Spanish | Notes |
|---------|---------|-------|
| Marketplace | Marketplace | Keep brand term |
| Browse | Explorar | |
| Cart | Carrito | |
| Checkout | Pagar / Finalizar Compra | Context-dependent |
| Module | Módulo | |
| Lesson | Lección | |
| Certificate | Certificado | |
| Dashboard | Panel / Tablero | "Panel" more common |
| Employee | Empleado | Or "Usuario" for individuals |
| Learning Portal | Portal de Aprendizaje | ✅ New name |
| Settings | Configuración / Ajustes | Both acceptable |
| Profile | Perfil | |
| Upload | Subir / Cargar | "Subir" more common |
| Download | Descargar | |
| Next | Siguiente | |
| Previous | Anterior | |
| Submit | Enviar | |
| Save | Guardar | |
| Cancel | Cancelar | |
| Delete | Eliminar | |
| Edit | Editar | |
| View | Ver | |
| Close | Cerrar | |

---

## 🎯 **Estimated Timeline**

| Phase | Time | Impact |
|-------|------|--------|
| Phase 1: Critical Flows | 4-6h | 80% of users |
| Phase 2: User Settings | 2-3h | 15% of users |
| Phase 3: Corporate/Admin | 3-4h | 5% of users |
| Phase 4: Polish | 2-3h | 100% complete |
| **TOTAL** | **11-16h** | **Full Spanish** |

---

## 💡 **Best Practices**

1. ✅ **Use translation keys**, not direct Spanish text
   ```tsx
   // ❌ BAD
   <button>Agregar al Carrito</button>
   
   // ✅ GOOD
   <button>{t('marketplace.addToCart')}</button>
   ```

2. ✅ **Keep brand terms** in original language
   - "Crowd Conscious" → don't translate
   - "Marketplace" → keep as-is
   - "ESG" → keep (international term)

3. ✅ **Consider context** for translations
   - "Save" can be "Guardar" or "Ahorrar" depending on context
   - "Close" can be "Cerrar" (door/window) or "Finalizar" (process)

4. ✅ **Use Mexican Spanish variants**
   - "Computadora" not "Ordenador"
   - "Celular" not "Móvil"
   - "Platicar" not "Charlar"

---

**Status**: Audit complete ✅  
**Next**: Implement Phase 1 translations (critical flows)  
**Time Estimate**: 4-6 hours for 80% impact

