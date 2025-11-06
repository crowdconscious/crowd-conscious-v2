# 📚 **Content Enrichment Plan**

**Goal**: Transform existing database lessons from basic structure to rich, story-driven, interactive experiences using content from MD files and existing tools.

**Status**: Ready to implement  
**Date**: November 6, 2025

---

## 🎯 **What We Have**

### **✅ Existing Tools** (9 Interactive Components)

Location: `/components/module-tools/`

#### **General Purpose Tools**
- `CarbonCalculator` - Calculate carbon footprint
- `CostCalculator` - Project cost savings
- `EvidenceUploader` - Upload photos/documents for proof
- `ReflectionJournal` - Guided reflection prompts
- `ImpactComparison` - Before/after metric visualization

#### **Air Quality Tools**
- `AirQualityAssessment` - Measure current air quality
- `AirQualityROI` - Calculate ROI of air improvements
- `AirQualityImpact` - Track air quality impact over time

### **✅ Content Files** (14 Module MD Files)

- 6 Spanish modules (aire limpio, agua limpia, ciudades seguras, cero residuos, comercio justo, integración)
- 6 English modules (clean air, clean water, safe cities, zero waste, fair trade, integration)

Each MD file includes:
- ✅ Full story narrative with characters
- ✅ Learning objectives
- ✅ Key concepts with data/statistics
- ✅ Real-world examples (Mexican companies)
- ✅ Interactive activities
- ✅ Deliverables and evidence requirements
- ✅ Reflection prompts

### **✅ Database Structure** (Ready for Rich Content)

`module_lessons` table has columns for:
- `story_content` (JSONB) - Full narrative
- `learning_objectives` (ARRAY)
- `key_points` (ARRAY)
- `did_you_know` (ARRAY)
- `real_world_example` (TEXT)
- `activity_type` (TEXT)
- `activity_config` (JSONB)
- `tools_used` (ARRAY)
- `resources` (JSONB)
- `next_steps` (ARRAY)

**Currently**: Mostly empty/basic content  
**Goal**: Fill with content from MD files

---

## 🗺️ **Tool-to-Module Mapping**

### **Module 1: Aire Limpio (Clean Air)**

**Lessons**:
1. El Impacto Invisible
2. ¿De Dónde Viene?
3. Calculando el ROI
4. Plan de Acción 90 Días
5. Reflexión y Compromiso

**Tools to Use**:
- Lesson 1: `AirQualityAssessment`, `CarbonCalculator`
- Lesson 2: `AirQualityAssessment`, `EvidenceUploader`
- Lesson 3: `AirQualityROI`, `CostCalculator`
- Lesson 4: `ReflectionJournal`, `EvidenceUploader`
- Lesson 5: `ImpactComparison`, `ReflectionJournal`

---

### **Module 2: Agua Limpia (Clean Water)**

**Tools to Use**:
- `CarbonCalculator` (for water-related emissions)
- `CostCalculator` (water cost savings)
- `EvidenceUploader` (before/after photos)
- `ReflectionJournal`
- `ImpactComparison` (water usage comparison)

---

### **Module 3: Ciudades Seguras (Safe Cities)**

**Tools to Use**:
- `EvidenceUploader` (safety mapping photos)
- `ReflectionJournal` (community feedback)
- `ImpactComparison` (safety metrics before/after)
- `CostCalculator` (safety improvement costs)

---

### **Module 4: Cero Residuos (Zero Waste)**

**Tools to Use**:
- `CarbonCalculator` (waste-related emissions)
- `CostCalculator` (waste disposal cost savings)
- `EvidenceUploader` (waste audit photos)
- `ImpactComparison` (waste reduction metrics)
- `ReflectionJournal`

---

### **Module 5: Comercio Justo (Fair Trade)**

**Tools to Use**:
- `CostCalculator` (local sourcing economics)
- `EvidenceUploader` (supply chain documentation)
- `ReflectionJournal` (supplier relationships)
- `ImpactComparison` (local vs global sourcing)

---

### **Module 6: Integración e Impacto**

**Tools to Use**:
- All tools (culminating project)
- `ImpactComparison` (overall impact)
- `CarbonCalculator` (total carbon reduction)
- `CostCalculator` (total savings)
- `EvidenceUploader` (comprehensive documentation)
- `ReflectionJournal` (transformation story)

---

## 📝 **Content Structure Template**

Each lesson should be updated with this structure:

```json
{
  "story_content": {
    "opening": "Character-driven scene introducing the lesson topic",
    "conflict": "Problem or challenge the character faces",
    "dialogue": [
      "María: 'I never thought our factory could affect the air quality.'",
      "Carlos: 'Let me show you the data from the monitoring station.'"
    ],
    "resolution_preview": "Hint at the solution without spoiling",
    "cliffhanger": "Hook for next lesson"
  },
  
  "learning_objectives": [
    "Understand air quality metrics (PM2.5, PM10, CO2)",
    "Identify emission sources in your organization",
    "Calculate your organization's carbon footprint"
  ],
  
  "key_points": [
    "PM2.5 particles are less than 2.5 micrometers and penetrate deep into lungs",
    "Safe level: <12 µg/m³ (WHO standard). Mexico City averages 25-30 µg/m³",
    "Grupo Bimbo reduced PM2.5 emissions by 38% and saved $2.8M MXN annually"
  ],
  
  "did_you_know": [
    "Air pollution causes 7 million premature deaths globally each year (WHO)",
    "Mexico City loses $5.8 billion annually due to poor air quality",
    "Indoor air quality can be 2-5x worse than outdoor air"
  ],
  
  "real_world_example": {
    "company": "Grupo Bimbo",
    "challenge": "High emissions from 12 manufacturing plants and 4,500 delivery vehicles",
    "solution": "Installed air quality monitors, switched to electric/hybrid vehicles, optimized HVAC",
    "results": "38% reduction in PM2.5, $2.8M MXN annual savings, 50% reduction in Scope 1+2 emissions by 2030",
    "source": "Grupo Bimbo 2020 Sustainability Report"
  },
  
  "activity_type": "audit",
  "activity_config": {
    "title": "Tu Línea Base de Calidad del Aire",
    "instructions": [
      "Download an air quality app (IQAir, AIRE)",
      "Record readings for your facility (3x/day for 3 days)",
      "Record readings for nearby residential areas",
      "Map pollution sources within 5km radius",
      "Calculate your Scope 1 & 2 carbon footprint"
    ],
    "required_evidence": ["Air quality readings", "Carbon footprint calculation", "Emission source photos"],
    "time_estimate": "30-45 minutes",
    "tools_needed": ["Phone with air quality app", "Calculator", "Camera"],
    "success_criteria": "Complete air quality baseline document with readings, calculations, and photos"
  },
  "activity_required": true,
  
  "tools_used": [
    "AirQualityAssessment",
    "CarbonCalculator",
    "EvidenceUploader"
  ],
  
  "resources": {
    "downloads": [
      {
        "title": "Air Quality Assessment Template",
        "url": "/resources/air-quality-template.pdf",
        "type": "PDF"
      },
      {
        "title": "Carbon Footprint Calculator Spreadsheet",
        "url": "/resources/carbon-calculator.xlsx",
        "type": "Excel"
      }
    ],
    "links": [
      {
        "title": "WHO Air Quality Guidelines",
        "url": "https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health"
      },
      {
        "title": "Mexico's Air Quality Standards (NOM-025)",
        "url": "https://www.gob.mx/semarnat"
      }
    ]
  },
  
  "next_steps": [
    "Review your air quality baseline with your team",
    "Identify top 3 emission sources you can address",
    "Schedule a walkthrough of your facility to map all emission points",
    "Research air quality regulations for your industry",
    "Set a 30-day review meeting to check progress"
  ],
  
  "reflection_prompts": [
    "What surprised you most about your facility's air quality impact?",
    "Which emission sources are within your control to change quickly?",
    "How might improving air quality benefit your employees and neighbors?",
    "What resources or support would you need to make improvements?"
  ]
}
```

---

## 🚀 **Implementation Steps**

### **Phase 1: Module 1 Enrichment** (Proof of Concept)

1. **Extract content from `module-1-aire-limpio-español.md`**
   - Parse story sections
   - Extract learning content
   - Identify tools needed per lesson

2. **Create SQL UPDATE statements** for 5 lessons
   - Update `story_content` with full narrative
   - Update `learning_objectives`, `key_points`, `did_you_know`
   - Update `real_world_example` with Grupo Bimbo case
   - Update `activity_config` with detailed instructions
   - Update `tools_used` array with appropriate tool names

3. **Test with one lesson first**
   - Run SQL for Lesson 1
   - Test in frontend (lesson player)
   - Verify tools load correctly
   - Verify story displays properly

4. **If successful, repeat for all 5 lessons**

---

### **Phase 2: Automated Content Parser** (Scale to All Modules)

Create a script that:

```javascript
// parse-module-content.js

const fs = require('fs');

function parseModuleMD(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract lessons
  const lessons = extractLessons(content);
  
  // For each lesson:
  return lessons.map(lesson => ({
    title: lesson.title,
    story_content: extractStory(lesson.content),
    learning_objectives: extractObjectives(lesson.content),
    key_points: extractKeyPoints(lesson.content),
    did_you_know: extractDidYouKnow(lesson.content),
    real_world_example: extractRealWorldExample(lesson.content),
    activity_config: extractActivity(lesson.content),
    tools_used: inferTools(lesson.content),
    resources: extractResources(lesson.content),
    next_steps: extractNextSteps(lesson.content),
    reflection_prompts: extractReflectionPrompts(lesson.content)
  }));
}

function generateSQL(moduleId, lessons) {
  return lessons.map((lesson, index) => {
    const lessonId = getLessonId(moduleId, index + 1);
    
    return `
UPDATE module_lessons
SET 
  story_content = '${JSON.stringify(lesson.story_content)}'::jsonb,
  learning_objectives = ARRAY[${lesson.learning_objectives.map(o => `'${escape(o)}'`).join(',')}],
  key_points = ARRAY[${lesson.key_points.map(k => `'${escape(k)}'`).join(',')}],
  did_you_know = ARRAY[${lesson.did_you_know.map(d => `'${escape(d)}'`).join(',')}],
  real_world_example = '${escape(lesson.real_world_example)}',
  activity_type = '${lesson.activity_config.type}',
  activity_config = '${JSON.stringify(lesson.activity_config)}'::jsonb,
  tools_used = ARRAY[${lesson.tools_used.map(t => `'${t}'`).join(',')}],
  resources = '${JSON.stringify(lesson.resources)}'::jsonb,
  next_steps = ARRAY[${lesson.next_steps.map(s => `'${escape(s)}'`).join(',')}]
WHERE id = '${lessonId}';
    `;
  }).join('\n\n');
}

// Run for all modules
const modules = [
  { id: 'module-1-uuid', file: 'module-1-aire-limpio-español.md' },
  { id: 'module-2-uuid', file: 'module-2-agua-limpia-español.md' },
  // ... etc
];

modules.forEach(module => {
  const lessons = parseModuleMD(module.file);
  const sql = generateSQL(module.id, lessons);
  fs.writeFileSync(`enrich-${module.id}.sql`, sql);
});
```

---

### **Phase 3: Module Builder Integration**

Update module builder to:

1. **Show available tools** when creating lessons
   - Dropdown: "Add Interactive Tool"
   - Options: All 9 tools with descriptions
   - Allow multiple tools per lesson

2. **Template Library**
   - "Use Air Quality Template" (pre-fills with Módulo 1 structure)
   - "Use Water Management Template"
   - etc.

3. **Tool Preview**
   - Show what each tool looks like
   - Example data
   - Usage instructions for creators

---

## 📊 **Quality Checklist**

Before considering a module "enriched", verify:

- [ ] Story content is complete (opening, conflict, dialogue, resolution preview, cliffhanger)
- [ ] Learning objectives are specific and measurable
- [ ] Key points include data/statistics with sources
- [ ] "Did You Know" facts are surprising and engaging
- [ ] Real-world example includes company name, challenge, solution, and results
- [ ] Activity has clear step-by-step instructions
- [ ] Required evidence is specified
- [ ] At least 2 interactive tools are assigned
- [ ] Resources include downloadable templates
- [ ] Next steps are actionable with timelines
- [ ] Reflection prompts encourage deep thinking

---

## 🎯 **Success Metrics**

After enrichment:

- **User engagement**: Time spent per lesson increases 3x
- **Completion rate**: Increases from 67% to 85%+
- **Evidence submission**: 90%+ of users submit evidence
- **Review scores**: Average rating increases to 4.8/5
- **Word-of-mouth**: Users recommend modules to others

---

## 📅 **Timeline**

- **Week 1**: Module 1 enrichment (proof of concept)
- **Week 2**: Automated parser + Modules 2-3
- **Week 3**: Modules 4-6 + English versions
- **Week 4**: Module builder integration + templates
- **Week 5**: Testing, refinement, documentation
- **Week 6**: Launch enriched modules, gather feedback

---

## 🛠️ **Tools Needed**

- [ ] Content parser script (Node.js)
- [ ] SQL generation script
- [ ] Module IDs from database
- [ ] Lesson IDs from database
- [ ] Testing environment
- [ ] Content review by domain experts

---

**Ready to start? Let's begin with Module 1, Lesson 1! 🚀**

