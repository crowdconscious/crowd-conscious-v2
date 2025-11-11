# 🔄 Rename Employee Portal → Portal de Aprendizaje

**Issue**: "Employee Portal" sounds too corporate, excludes individual users  
**Solution**: Rename to "Portal de Aprendizaje" (Learning Portal)  
**Impact**: 188 matches across 72 files  
**Priority**: P1 - HIGH (UX improvement)

---

## 📊 **Analysis**

### **Current Structure**:
```
app/
├── employee-portal/              ← Main directory
│   ├── dashboard/
│   ├── modules/
│   ├── impact/
│   ├── certifications/
│   ├── courses/
│   └── layout.tsx
├── employee-portal-public/       ← Public invitation page
└── (app)/
    └── employee-portal/          ← Duplicate structure?
        └── mi-impacto/
```

### **New Structure**:
```
app/
├── (app)/
│   └── learning-portal/          ← Renamed & consolidated
│       ├── dashboard/
│       ├── modules/
│       ├── impact/
│       ├── mi-impacto/
│       ├── certifications/
│       ├── courses/
│       └── layout.tsx
└── learning-portal-public/       ← Public invitation (if needed)
```

---

## 🎯 **Rename Strategy**

### **Option A: Full Rename** (Recommended)
- **Pro**: Clean, no legacy code
- **Pro**: Better for users (more inclusive)
- **Con**: Need to update all 188 references
- **Time**: ~2 hours

### **Option B: Redirect + Gradual**
- **Pro**: Backward compatible (old URLs still work)
- **Pro**: Can update UI text separately from URLs
- **Con**: Technical debt (two names coexist)
- **Time**: ~1 hour + future cleanup

**Recommendation**: **Option B** (Redirect approach)
- Keep URLs as `/employee-portal/...` (no breaking changes)
- Update UI text to "Portal de Aprendizaje"
- Add redirects for future `/learning-portal/...` URLs

---

## 🚀 **Implementation Plan (Option B)**

### **Phase 1: UI Text Only** (30 minutes)

Update display text without changing URLs:

#### **1. Navigation & Menus**:
- `app/(app)/HeaderClient.tsx` - Change "Employee Portal" → "Portal de Aprendizaje"
- `components/MobileNavigation.tsx` - Same
- `app/employee-portal/layout.tsx` - Update sidebar title

#### **2. Page Titles**:
- `app/employee-portal/dashboard/page.tsx` - Update page title
- `app/employee-portal/modules/[moduleId]/page.tsx` - Update breadcrumbs
- Other pages - Update headings

#### **3. Documentation**:
- Update README, guides to use new name
- Keep technical docs with old path for reference

---

### **Phase 2: Add Redirects** (15 minutes)

Create middleware to support both URLs:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  
  // Redirect new URLs to old (for now)
  if (url.pathname.startsWith('/learning-portal')) {
    url.pathname = url.pathname.replace('/learning-portal', '/employee-portal')
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}
```

---

### **Phase 3: Full Migration** (Future - Optional)

When ready for breaking changes:
1. Rename directory: `app/employee-portal/` → `app/(app)/learning-portal/`
2. Update all internal references
3. Update API routes
4. Update database references (if any)
5. Remove redirects

---

## 📝 **Files to Update (Phase 1 - UI Text)**

### **High Priority** (User-facing):

1. **Navigation**:
   - `app/(app)/HeaderClient.tsx` - Nav link text
   - `components/MobileNavigation.tsx` - Mobile nav text
   - `app/employee-portal/layout.tsx` - Sidebar title

2. **Page Titles**:
   - `app/employee-portal/dashboard/page.tsx`
   - `app/employee-portal/modules/[moduleId]/page.tsx`
   - `app/employee-portal/impact/page.tsx`
   - `app/(app)/employee-portal/mi-impacto/page.tsx`

3. **Breadcrumbs**:
   - Any component showing "Employee Portal" in breadcrumbs

### **Medium Priority** (Backend references):

4. **API Routes**:
   - `app/api/cart/checkout/route.ts` - Success URL
   - Any API returning employee-portal URLs

5. **Email Templates**:
   - Update links to use new terminology

### **Low Priority** (Documentation):

6. **Markdown Files**:
   - Update guides to use "Portal de Aprendizaje"
   - Keep old name in parentheses for search

---

## 🧪 **Testing Checklist**

After Phase 1 (UI Text):
- [ ] Header shows "Portal de Aprendizaje" ✅
- [ ] Mobile nav shows "Portal de Aprendizaje" ✅
- [ ] Sidebar title updated ✅
- [ ] Page titles updated ✅
- [ ] All links still work (no broken navigation) ✅
- [ ] Breadcrumbs show new name ✅

After Phase 2 (Redirects):
- [ ] `/employee-portal/dashboard` still works ✅
- [ ] `/learning-portal/dashboard` redirects correctly ✅
- [ ] No 404 errors ✅

---

## 💡 **Alternative Names (Spanish)**

If "Portal de Aprendizaje" doesn't fit:

| Spanish | English | Notes |
|---------|---------|-------|
| Portal de Aprendizaje | Learning Portal | ✅ Recommended (inclusive) |
| Mi Aprendizaje | My Learning | Good for personal feel |
| Centro de Formación | Training Center | More formal |
| Zona de Aprendizaje | Learning Zone | Modern, friendly |
| Academia | Academy | Simple, clear |

**Final Choice**: **Portal de Aprendizaje** ✅

---

## 🎯 **Quick Win Approach**

**Start with just UI text** (30 min):
1. Update HeaderClient.tsx
2. Update MobileNavigation.tsx  
3. Update layout.tsx sidebar
4. Update main page titles

**Result**: Users see "Portal de Aprendizaje" everywhere, but URLs stay the same (no breaking changes)

**Later**: Full directory rename when ready (2 hours)

---

## ✅ **Success Criteria**

Phase 1 Complete When:
- All user-facing text says "Portal de Aprendizaje"
- No references to "Employee Portal" in UI
- All navigation works correctly
- Mobile and desktop updated

---

**Recommended Approach**: Start with Phase 1 (UI text only) ✅  
**Time Estimate**: 30-45 minutes  
**Breaking Changes**: None  
**User Impact**: Immediate (more inclusive language)

