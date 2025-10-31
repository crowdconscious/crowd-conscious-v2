# Remaining Features & Next Steps

## ✅ **FIXED TODAY** (Oct 31, 2025)

### 1. Progress Tracking Bug ✅
**Issue:** Progress stuck at 33% even after completing multiple lessons
**Fix:** Now tracks unique lessons only (no duplicate counting)
**Status:** COMPLETE

### 2. Evidence Uploader ✅  
**Issue:** No save button or upload confirmation
**Fix:** Added prominent "Guardar Evidencia" button with 3 states:
- Default: Purple gradient "Guardar Evidencia"
- Uploading: Spinner + "Guardando..."
- Saved: Green "✅ Evidencia Guardada" + success message
**Status:** COMPLETE

### 3. Lesson Completion Error Handling ✅
**Issue:** Generic error message on completion failure
**Fix:** Detailed logging + success toast notifications
- Success: "✅ Lección completada! +250 XP"
- Module complete: "🎉 ¡Módulo Completado!"
**Status:** COMPLETE

### 4. Plan de Implementación 90 Días ✅
**Issue:** Tool not found error
**Fix:** Changed to external article link (Google Docs template)
**Status:** COMPLETE (placeholder URL - needs actual template)

---

## 🚧 **TO BUILD** (Priority Order)

### **HIGH PRIORITY** (Core Functionality)

#### 1. 🎓 Certification System
**Employee Certificates:**
- Generate certificate after completing each module
- PDF download with employee name, company, module name, completion date
- Shareable certificate image for social media
- Badge/icon in employee dashboard showing earned certificates

**Corporate Certificates:**
- "Conscious Company" certification upon joining Concientizaciones
- Module-specific badges (e.g., "Aire Limpio Certified")
- Shareable badge for each module their employees complete
- Social media share cards with company logo
- Certificate should show:
  - Company name
  - Module(s) completed
  - Number of employees trained
  - Completion date
  - Impact metrics (CO2 reduced, etc.)

**Implementation Needed:**
- [ ] Certificate generation API (`/api/certificates/generate`)
- [ ] Certificate template (PDF/image)
- [ ] Social share cards generator
- [ ] Certificate storage in Supabase Storage
- [ ] Update `certifications` table schema
- [ ] Add certificate download buttons
- [ ] Add social share buttons (Twitter, LinkedIn, Facebook)

---

#### 2. 📊 Employee Impact Section
**Missing from Employee Dashboard**

**Should Display:**
- Personal impact metrics:
  - Total XP earned
  - Modules completed
  - Time spent learning
  - CO2 equivalent reduced (from activities)
  - Money saved for company (from calculators)
- Visual impact comparison:
  - "Your actions = X trees planted"
  - "Your learning saved company $X"
- Progress toward next level/badge
- Community projects their company funded

**Implementation Needed:**
- [ ] Build `/employee-portal/impact` page
- [ ] Add "Mi Impacto" nav link
- [ ] Aggregate data from `lesson_responses` table
- [ ] Calculate impact metrics from tool data
- [ ] Create visual impact cards
- [ ] Add gamification elements (levels, badges)

---

#### 3. 🏆 Employee Certifications Section
**Missing from Employee Dashboard**

**Should Display:**
- Grid of earned certificates
- Download buttons for each certificate
- Share buttons for social media
- "In Progress" certificates (modules started but not completed)
- Certificate preview cards
- Verification link for each certificate

**Implementation Needed:**
- [ ] Build `/employee-portal/certifications` page
- [ ] Add "Certificaciones" nav link
- [ ] Display certificates from `certifications` table
- [ ] Certificate card component
- [ ] Download functionality
- [ ] Social share functionality
- [ ] Certificate verification system

---

### **MEDIUM PRIORITY** (Enhance Functionality)

#### 4. 📈 Corporate Reports - Employee Answers Visibility
**Issue:** Not clear how corporate admins see employee answers

**Should Have:**
- [ ] Enhanced `/corporate/progress` page
- [ ] Click on employee → See detailed answers
- [ ] View all responses for a specific lesson
- [ ] Export employee responses to Excel/CSV
- [ ] Filter responses by module/lesson
- [ ] Search within responses
- [ ] View evidence photos employees uploaded
- [ ] Track which tools employees used

**Implementation Needed:**
- [ ] Employee detail view modal
- [ ] Response viewer component
- [ ] Image gallery for evidence photos
- [ ] Export to CSV functionality
- [ ] Filter/search UI
- [ ] Response analytics dashboard

---

#### 5. 📝 Community Articles Feature
**Issue:** Need article upload capability for communities

**Should Allow:**
- Community admins to write articles
- Upload images/media to articles
- Tag articles by topic/core value
- Comments on articles
- Like/upvote articles
- Share articles
- Reference articles in courses (as resources)

**Implementation Needed:**
- [ ] Database table: `community_articles`
- [ ] Article editor (rich text)
- [ ] Image upload to Supabase Storage
- [ ] Article listing page
- [ ] Article detail page
- [ ] Comments system
- [ ] Social features (likes, shares)
- [ ] Article management in community dashboard

---

### **LOW PRIORITY** (Nice to Have)

#### 6. 🔔 Notification System
- Email notifications for:
  - Employee invitation
  - Module completion
  - Certificate earned
  - New modules available
  - Corporate admin: employee completed module
- In-app notifications
- Notification preferences

#### 7. 📱 Mobile App Considerations
- PWA (Progressive Web App) setup
- App install prompts
- Offline access to completed lessons
- Push notifications

#### 8. 🌐 Multi-language Support
- English version of courses
- Language toggle
- Translated certificates

---

## 📋 **IMPLEMENTATION PLAN**

### **Week 1: Certification System** (Highest Impact)
**Day 1-2:** Employee certificates
- Generate PDF certificates
- Download functionality
- Add to employee dashboard

**Day 3-4:** Corporate certificates  
- Generate company badges
- Social share cards
- Add to corporate dashboard

**Day 5:** Social sharing
- Twitter/LinkedIn/Facebook share buttons
- Open Graph meta tags
- Certificate preview images

---

### **Week 2: Employee Dashboard Sections**
**Day 1-2:** Impact Section
- Build impact page
- Aggregate metrics from lesson_responses
- Visual impact cards
- Gamification elements

**Day 3-4:** Certifications Section
- Build certifications page
- Display earned certificates
- Certificate cards
- Download/share functionality

**Day 5:** Polish & testing
- Mobile optimization
- User testing
- Bug fixes

---

### **Week 3: Corporate Reports Enhancement**
**Day 1-2:** Employee detail views
- Click employee → see detailed answers
- Response viewer component
- Evidence photo gallery

**Day 3-4:** Export & analytics
- CSV export functionality
- Response analytics
- Filters/search

**Day 5:** Testing & refinement

---

### **Week 4: Community Articles** (If time permits)
- Article system design
- Database tables
- Basic article creation
- Article display

---

## 🎯 **RECOMMENDED NEXT STEPS**

### **Option A: Build Certificates First** (Recommended)
**Why:** Highest user value, visible achievement, shareable
**Time:** 3-5 days
**Impact:** Employees get tangible reward, companies can share achievements

### **Option B: Complete Employee Dashboard**
**Why:** Two sections missing (Impact & Certifications)
**Time:** 5-7 days
**Impact:** Full employee experience, better engagement

### **Option C: Enhance Corporate Reports**
**Why:** Show ROI to paying customers, justify pricing
**Time:** 4-6 days
**Impact:** Corporations see detailed data, better retention

---

## 🛠️ **TECHNICAL REQUIREMENTS**

### **Certificates:**
- PDF generation library (e.g., `jsPDF`, `pdfmake`)
- Image generation (e.g., `canvas`, `sharp`)
- Social share meta tags
- Supabase Storage for certificates
- Certificate verification system

### **Employee Dashboard:**
- Data aggregation queries
- Chart library (e.g., `recharts`, `chart.js`)
- Gamification logic (levels, XP, badges)
- Impact calculation formulas

### **Corporate Reports:**
- Data export to CSV
- Modal/drawer components
- Image viewer
- Advanced filtering logic

### **Community Articles:**
- Rich text editor (e.g., `TipTap`, `Quill`)
- Image upload system
- Comments system (table + API)
- Like/vote system

---

## 📊 **ESTIMATED TIMELINE**

| Feature | Priority | Time | Complexity |
|---------|----------|------|------------|
| Employee Certificates | HIGH | 2-3 days | Medium |
| Corporate Certificates | HIGH | 2-3 days | Medium |
| Employee Impact Section | HIGH | 3-4 days | Medium |
| Employee Certifications Section | HIGH | 2-3 days | Low |
| Corporate Reports Enhancement | MEDIUM | 4-5 days | High |
| Community Articles | LOW | 5-7 days | High |
| Notification System | LOW | 3-4 days | Medium |

**TOTAL: 21-29 days of focused development**

---

## 💬 **QUESTIONS FOR USER**

1. **Certificates Priority:**
   - Should we build employee certificates first, or corporate certificates?
   - What design style? (Formal, modern, playful?)
   - What social platforms to prioritize? (LinkedIn, Twitter, Facebook?)

2. **Impact Metrics:**
   - What specific metrics are most important?
   - Should we create an "Impact Score" or "Sustainability Score"?
   - Gamification: levels, badges, leaderboards?

3. **Corporate Reports:**
   - How detailed should response viewing be?
   - Export format preference? (CSV, Excel, PDF?)
   - Should there be analytics/charts?

4. **Community Articles:**
   - Is this a must-have for Phase 2?
   - Or can it wait until marketplace is fully built?

---

## ✅ **WHAT'S WORKING WELL**

- Progress tracking (unique lessons)
- Tool modals (all 8 tools)
- Evidence uploader (with save button)
- Marketplace browse page
- Module detail page
- Module builder interface
- Database schema (Phase 2 ready)
- Mobile optimization
- Smart routing
- Course content (Clean Air module)

---

## 🚀 **RECOMMENDATION**

**START WITH CERTIFICATES** because:
1. High user value (tangible achievement)
2. Shareable (organic marketing)
3. Professional (builds trust)
4. Relatively quick to implement
5. Visual impact (good for demos/sales)

Then move to **Employee Dashboard completion** to provide full experience.

Then tackle **Corporate Reports** to show ROI to paying customers.

---

_Document Version: 1.0_  
_Created: October 31, 2025_  
_Status: Planning_  
_Next Review: After certificate system is built_

