# 🛠️ How to Activate Module Tools

## 🎯 **The Problem You're Experiencing**

You built **19 interactive tools** across 4 modules, but they're **not showing up in lessons**. 

**Why?** The tools exist in the code, but the **database doesn't know which tools to display** in which lessons.

The lesson page reads `lesson.tools_used` from the database to decide which tools to render. Right now, those fields are empty or have placeholder values.

---

## ✅ **The Solution: Configure Database**

You need to run SQL scripts to tell the database which tools belong in which lessons.

---

## 🚀 **Quick Start (Recommended)**

### **Option 1: Run the Master Script (All Modules at Once)**

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy & paste** the contents of: `CONFIGURE-ALL-MODULE-TOOLS.sql`
3. **Click RUN** ▶️
4. **Verify** the output shows:
   ```
   ✅ ALL MODULE TOOLS CONFIGURED!
   🔧 Module 1: 5 Air Quality Tools
   💧 Module 2: 5 Water Management Tools
   🏙️ Module 3: 5 Urban Safety Tools
   ♻️ Module 4: 4 Zero Waste Tools
   📊 Total: 19 Interactive Tools Active
   ```
5. **Refresh your lesson pages** in the browser
6. **You should now see the tools!** 🎉

---

## 🎓 **Option 2: Configure Modules Individually**

If you want more control or want to test one module at a time:

### **Module 1 (Aire Limpio):**
- Run: `CONFIGURE-MODULE-1-TOOLS.sql`
- Tools: Air Quality Assessment, Emission Identifier, ROI Calculator, Timeline Planner, Monitor Tracker

### **Module 2 (Agua Limpia):**
- Run: `CONFIGURE-MODULE-2-TOOLS.sql`
- Tools: Water Footprint Calculator, Water Audit, Conservation Tracker, Quality Test Log, Recycling Designer

### **Module 3 (Ciudades Seguras):**
- Run: `CONFIGURE-MODULE-3-TOOLS.sql`
- Tools: Security Audit, Community Survey, Cost Calculator

### **Module 4 (Cero Residuos):**
- Run: `CONFIGURE-MODULE-4-TOOLS.sql`
- Tools: Waste Stream Analyzer, 5 R's Checklist, Composting Calculator, Certification Roadmap

---

## 🔍 **How to Verify It Worked**

After running the SQL scripts, verify with this query:

```sql
SELECT 
  mm.title as module,
  ml.lesson_order,
  ml.title as lesson,
  ml.tools_used
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.core_value IN ('clean_air', 'clean_water', 'safe_cities', 'zero_waste')
ORDER BY mm.core_value, ml.lesson_order;
```

**Expected Output:** Each lesson should have at least one tool in the `tools_used` array.

Example:
```
Module: Estrategias Avanzadas de Calidad del Aire
Lesson 1: El Impacto Invisible
tools_used: {air-quality-assessment}

Module: Gestión Sostenible del Agua
Lesson 1: El Pozo se Seca
tools_used: {water-footprint-calculator}
```

---

## 🧪 **What to Test After Configuration**

### **Module 1 (Aire Limpio):**
1. Go to any Module 1 lesson
2. Look for "Herramientas Interactivas" section
3. Test each tool:
   - **Lesson 1:** Air Quality Assessment (6 questions)
   - **Lesson 2:** Emission Source Identifier (facility map)
   - **Lesson 3:** ROI Calculator (3-year projection)
   - **Lesson 4:** Timeline Planner (90-day plan)
   - **Lesson 5:** Monitor Tracker (compliance tracking)

### **Module 2 (Agua Limpia):**
1. Go to any Module 2 lesson
2. Test each tool:
   - **Lesson 1:** Water Footprint Calculator (industry benchmarks)
   - **Lesson 2:** Water Audit Tool (room-by-room)
   - **Lesson 3:** Conservation Tracker (goal setting)
   - **Lesson 4:** Quality Test Log (pH, turbidity)
   - **Lesson 5:** Recycling System Designer (ROI analysis)

### **Module 3 (Ciudades Seguras):**
1. Test:
   - Security Audit Tool
   - Community Survey Tool
   - Cost Calculator

### **Module 4 (Cero Residuos):**
1. Test:
   - Waste Stream Analyzer (pie charts)
   - 5 R's Checklist (implementation tracking)
   - Composting Calculator (CO₂ savings)
   - Certification Roadmap (Bronze/Silver/Gold)

---

## 📝 **What Each Tool Does**

### **Module 1: Air Quality Tools**
1. **Air Quality Assessment** - 6-question quiz to evaluate facility
2. **Emission Source Identifier** - Interactive map to mark pollution sources
3. **ROI Calculator** - Financial justification for improvements
4. **Timeline Planner** - 90-day action plan with tasks
5. **Monitor Tracker** - Log air quality readings over time

### **Module 2: Water Management Tools**
1. **Water Footprint Calculator** - Calculate usage by area, compare to industry
2. **Water Audit Tool** - Room-by-room leak detection
3. **Conservation Tracker** - Set reduction goals, track weekly progress
4. **Quality Test Log** - Log pH/turbidity, check NOM-001 compliance
5. **Recycling System Designer** - Design greywater/rainwater systems, calculate payback

### **Module 3: Urban Safety Tools**
1. **Security Audit Tool** - Identify security risks
2. **Community Survey Tool** - Gather community input
3. **Cost Calculator** - Budget safety improvements

### **Module 4: Zero Waste Tools**
1. **Waste Stream Analyzer** - Categorize waste, see pie charts
2. **5 R's Checklist** - Track Refuse/Reduce/Reuse/Recycle/Regenerate
3. **Composting Calculator** - Calculate compost production & savings
4. **Certification Roadmap** - Plan path to Bronze/Silver/Gold certification

---

## 🎯 **Expected User Experience**

**Before SQL configuration:**
- Lesson page loads ✅
- Shows story content ✅
- Shows activity section ✅
- **Missing:** "Herramientas Interactivas" section ❌

**After SQL configuration:**
- Lesson page loads ✅
- Shows story content ✅
- Shows activity section ✅
- **Shows:** "Herramientas Interactivas" section with beautiful tool cards ✅
- Tools are interactive, save data, and work perfectly ✅

---

## 🐛 **Troubleshooting**

### **Tools still not showing?**

1. **Hard refresh** the page: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Check the database:** Run the verification query above
3. **Check module slug:** Make sure you're enrolled in the right module
4. **Check browser console:** Look for any JavaScript errors

### **Tools showing but not saving data?**

- This means the tools are configured correctly!
- The save functionality is separate and should work automatically
- Check browser console for API errors

### **Wrong tools showing up?**

- Re-run the configuration SQL for that module
- Make sure tool names match **exactly** (case-sensitive)

---

## 📊 **Tool Name Reference**

**CRITICAL:** Tool names in database **MUST match** the switch cases in the code:

| Module | Database Value | React Component |
|--------|---------------|-----------------|
| Module 1 | `air-quality-assessment` | AirQualityAssessment |
| Module 1 | `emission-source-identifier` | EmissionSourceIdentifier |
| Module 1 | `air-quality-roi` | AirQualityROI |
| Module 1 | `implementation-timeline` | ImplementationTimelinePlanner |
| Module 1 | `air-quality-monitor` | AirQualityMonitorTracker |
| Module 2 | `water-footprint-calculator` | WaterFootprintCalculator |
| Module 2 | `water-audit-tool` | WaterAuditTool |
| Module 2 | `water-conservation-tracker` | WaterConservationTracker |
| Module 2 | `water-quality-test-log` | WaterQualityTestLog |
| Module 2 | `recycling-system-designer` | RecyclingSystemDesigner |
| Module 3 | `security-audit-tool` | SecurityAuditTool |
| Module 3 | `community-survey-tool` | CommunitySurveyTool |
| Module 3 | `cost-calculator` | CostCalculatorTool |
| Module 4 | `waste-stream-analyzer` | WasteStreamAnalyzer |
| Module 4 | `five-rs-checklist` | FiveRsChecklist |
| Module 4 | `composting-calculator` | CompostingCalculator |
| Module 4 | `zero-waste-certification-roadmap` | ZeroWasteCertificationRoadmap |

---

## 🎉 **What Happens After Configuration**

Once you run the SQL scripts:

1. ✅ **19 tools** will be visible across 4 modules
2. ✅ Each tool will appear in the appropriate lesson
3. ✅ Tools will save data to `lesson_responses` table
4. ✅ Data will be available for ESG/impact reports
5. ✅ Users can interact with all tools on mobile/desktop
6. ✅ Progress tracking works automatically

---

## 🚀 **Next Steps**

After configuring tools:

1. **Test all 19 tools** across 4 modules
2. **Verify data is saving** (check `lesson_responses` table)
3. **Get user feedback** on tool UX
4. **Optional:** Build Module 5 & 6 tools (10 more tools)
5. **Optional:** Add more tools to existing modules

---

## 💡 **Pro Tips**

- **Multiple tools per lesson:** You can assign multiple tools by using: `ARRAY['tool-1', 'tool-2']`
- **Reuse tools:** The same tool can be used in multiple lessons (e.g., Security Audit in Lessons 1 & 3)
- **Order matters:** Tools render in the order they appear in the array
- **Mobile-first:** All tools are designed mobile-responsive
- **Offline-capable:** Tools work without constant server connection (save on submit)

---

## 📞 **Need Help?**

If tools still aren't showing:
1. Share the output of the verification query
2. Share a screenshot of a lesson page
3. Share browser console errors (F12 → Console tab)

---

**Ready to activate your tools? Run `CONFIGURE-ALL-MODULE-TOOLS.sql` now!** 🚀

