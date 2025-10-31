# 🛠️ Tools Integration Guide - Clean Air Module

> **Status:** Step-by-step guide to integrate reusable tools into lessons  
> **Date:** October 31, 2025

---

## 📋 Setup Checklist

### 1. ✅ Run SQL Migrations

**In Supabase SQL Editor, run these files in order:**

```sql
-- Step 1: Create storage bucket for images
-- File: sql-migrations/create-storage-buckets.sql
-- Creates 'employee-evidence' bucket with RLS policies

-- Step 2: Enhance lesson_responses table
-- File: sql-migrations/enhance-lesson-responses.sql
-- Adds carbon_data, cost_data, evidence_urls, impact_comparisons columns
```

### 2. ✅ Verify APIs Are Working

Test the new endpoints:

```bash
# Test save-activity endpoint
curl -X POST https://your-app.vercel.app/api/corporate/progress/save-activity \
  -H "Content-Type: application/json" \
  -d '{"courseId":"test","moduleId":"test","lessonId":"test","activityType":"carbon","activityData":{}}'

# Should return: { "success": true, "responseId": "..." }
```

### 3. ✅ Verify Storage Bucket

In Supabase Dashboard → Storage:
- Bucket `employee-evidence` should exist
- Public access enabled
- 5MB file limit
- RLS policies active

---

## 🎓 Integration Strategy

### **Clean Air Module - 3 Lessons**

| Lesson | Activity Type | Tools to Use |
|--------|---------------|--------------|
| **Lesson 1**: María's Story | Calculator | Carbon Calculator + Evidence Uploader + Impact Comparison |
| **Lesson 2**: Community Meeting | Plan | Reflection Journal (for action plan) + Cost Calculator |
| **Lesson 3**: Transformation | Commitment | Reflection Journal (for commitments) + Impact Comparison |

---

## 📝 Lesson 1 Integration - "The Invisible Threat"

### Current Activity
- Type: `calculator`
- Generic calculator inputs

### New Integration

**Replace the activity section with:**

```tsx
{lesson.activity.type === 'calculator' && (
  <div className="space-y-6">
    {/* 1. Carbon Calculator */}
    <CarbonCalculator
      onCalculate={(result) => {
        setActivityData(result)
        saveActivityData('carbon', result)
        setImpactData(result)
        setActivityCompleted(true)
      }}
      showBreakdown={true}
      showComparison={true}
    />

    {/* 2. Impact Comparison (shows after calculation) */}
    {impactData && (
      <ImpactComparison
        value={impactData.total}
        unit="kg CO₂ calculados"
        comparisons={[
          {
            icon: '🌳',
            label: 'Árboles necesarios para compensar',
            value: impactData.comparisons.trees
          },
          {
            icon: '🚗',
            label: 'Viajes en auto equivalentes',
            value: impactData.comparisons.carTrips,
            unit: '25km cada uno'
          },
          {
            icon: '💡',
            label: 'Focos LED por 1 año',
            value: impactData.comparisons.lightBulbs
          }
        ]}
        title="Tu Huella de Carbono en Perspectiva"
      />
    )}

    {/* 3. Evidence Uploader */}
    <EvidenceUploader
      onUpload={async (files) => {
        setUploadedFiles(files)
        const urls = await uploadEvidence(files)
        console.log('✅ Evidence URLs:', urls)
      }}
      maxFiles={5}
      maxSizeMB={5}
      label="Fotos de Tu Espacio"
      description="Sube fotos del área que evaluaste (opcional)"
    />

    {/* 4. Cost Calculator (for improvement costs) */}
    <CostCalculator
      onCalculate={(result) => {
        saveActivityData('cost', result)
      }}
      showROI={true}
      showPaybackPeriod={true}
    />
  </div>
)}
```

**What This Does:**
1. Employee calculates their carbon footprint
2. Data is saved to `lesson_responses.carbon_data`
3. Impact comparison shows relatable equivalents
4. Employee uploads photos (saved to Storage)
5. URLs stored in `lesson_responses.evidence_urls`
6. Employee calculates potential cost savings
7. Data saved to `lesson_responses.cost_data`
8. All data available for corporate reporting

---

## 📝 Lesson 2 Integration - "The Community Meeting"

### Current Activity
- Type: `plan`
- Reflection prompts for action plan

### New Integration

**Replace the activity section with:**

```tsx
{lesson.activity.type === 'plan' && lesson.activity.reflectionPrompts && (
  <div className="space-y-6">
    {/* 1. Action Plan (Reflection Journal) */}
    <ReflectionJournal
      prompts={lesson.activity.reflectionPrompts}
      onSave={(data) => {
        setActivityData(data)
        saveActivityData('plan', data)
        setActivityCompleted(true)
      }}
      minWords={100}
      showWordCount={true}
      label="Plan de Acción de Aire Limpio"
    />

    {/* 2. Cost Calculator for Budget Planning */}
    <CostCalculator
      onCalculate={(result) => {
        saveActivityData('cost_projection', result)
      }}
      showROI={true}
      showPaybackPeriod={true}
    />

    {/* 3. Evidence Uploader (for current space photos) */}
    <EvidenceUploader
      onUpload={async (files) => {
        setUploadedFiles(files)
        const urls = await uploadEvidence(files)
      }}
      maxFiles={3}
      maxSizeMB={5}
      label="Fotos del Espacio Actual"
      description="Documenta el estado actual para comparar después"
    />
  </div>
)}
```

**What This Does:**
1. Employee writes detailed action plan
2. Plan saved to `lesson_responses.responses.plan`
3. Employee estimates costs and ROI
4. Employee documents current state with photos
5. All data ready for 90-day review

---

## 📝 Lesson 3 Integration - "The Transformation"

### Current Activity
- Type: `commitment`
- Reflection prompts for commitments

### New Integration

**Replace the activity section with:**

```tsx
{lesson.activity.type === 'commitment' && lesson.activity.reflectionPrompts && (
  <div className="space-y-6">
    {/* 1. Commitment Journal */}
    <ReflectionJournal
      prompts={lesson.activity.reflectionPrompts}
      onSave={(data) => {
        setActivityData(data)
        saveActivityData('commitment', data)
        setActivityCompleted(true)
      }}
      minWords={75}
      showWordCount={true}
      label="Tu Compromiso de Aire Limpio"
    />

    {/* 2. Before/After Evidence */}
    <EvidenceUploader
      onUpload={async (files) => {
        setUploadedFiles(files)
        const urls = await uploadEvidence(files)
      }}
      maxFiles={5}
      maxSizeMB={5}
      label="Evidencia de Implementación"
      description="Sube fotos de antes/después de tus mejoras"
    />

    {/* 3. Final Impact Comparison */}
    <div className="bg-gradient-to-br from-teal-50 to-purple-50 border-2 border-teal-300 rounded-xl p-6">
      <h3 className="text-xl font-bold text-teal-900 mb-4">
        🎉 ¡Felicidades por Completar el Módulo!
      </h3>
      <p className="text-teal-800 mb-4">
        Has aprendido cómo mejorar la calidad del aire en tu espacio de trabajo.
        Tu compromiso hará una diferencia real.
      </p>
      <div className="bg-white rounded-lg p-4">
        <h4 className="font-bold text-slate-900 mb-2">Próximos Pasos:</h4>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>✅ Implementa tu plan en los próximos 30 días</li>
          <li>✅ Mide el progreso mensualmente</li>
          <li>✅ Comparte tus resultados con tu equipo</li>
          <li>✅ Solicita tu certificado al completar</li>
        </ul>
      </div>
    </div>
  </div>
)}
```

**What This Does:**
1. Employee commits to specific actions
2. Commitment saved to database
3. Employee uploads before/after photos
4. Evidence logged for verification
5. Module completion triggers certificate eligibility

---

## 🔧 Helper Functions Reference

### Already Added to Lesson Viewer

```tsx
// Save any activity data
const saveActivityData = async (activityType: string, data: any) => {
  try {
    const response = await fetch('/api/corporate/progress/save-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: cleanAirCourseId,
        moduleId,
        lessonId,
        activityType,
        activityData: data
      })
    })
    if (!response.ok) {
      console.error('Failed to save activity data')
    } else {
      console.log(`✅ ${activityType} data saved`)
    }
  } catch (error) {
    console.error(`Error saving ${activityType} data:`, error)
  }
}

// Upload evidence images
const uploadEvidence = async (files: any[]) => {
  try {
    const formData = new FormData()
    formData.append('courseId', cleanAirCourseId)
    formData.append('moduleId', moduleId)
    formData.append('lessonId', lessonId)

    files.forEach(fileData => {
      formData.append('files', fileData.file)
    })

    const response = await fetch('/api/corporate/progress/upload-evidence', {
      method: 'POST',
      body: formData
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Evidence uploaded:', result.uploadedUrls)
      return result.uploadedUrls
    } else {
      console.error('Failed to upload evidence')
      return []
    }
  } catch (error) {
    console.error('Error uploading evidence:', error)
    return []
  }
}
```

---

## 📊 Corporate Dashboard Integration

### Display Captured Data

Once tool data is saved, corporate admins can view it on `/corporate/progress`:

**Example Query:**

```tsx
// In corporate/progress/page.tsx
const { data: lessonResponses } = await supabase
  .from('lesson_responses')
  .select(`
    *,
    profiles!inner(full_name, email)
  `)
  .eq('corporate_account_id', corporateAccountId)
  .order('completed_at', { ascending: false })

// Display carbon calculator results
{response.carbon_data && (
  <div className="bg-green-50 rounded-lg p-4">
    <h4 className="font-bold text-green-900">Huella de Carbono Calculada</h4>
    <p className="text-2xl font-bold text-green-600">
      {response.carbon_data.total.toFixed(0)} kg CO₂
    </p>
    <div className="text-sm text-green-700 mt-2">
      🌳 {response.carbon_data.comparisons.trees} árboles necesarios
    </div>
  </div>
)}

// Display evidence photos
{response.evidence_urls && response.evidence_urls.length > 0 && (
  <div className="grid grid-cols-3 gap-2">
    {response.evidence_urls.map((url, i) => (
      <img
        key={i}
        src={url}
        alt={`Evidence ${i + 1}`}
        className="w-full aspect-square object-cover rounded-lg"
      />
    ))}
  </div>
)}

// Display cost savings
{response.cost_data && (
  <div className="bg-blue-50 rounded-lg p-4">
    <h4 className="font-bold text-blue-900">Ahorros Proyectados</h4>
    <p className="text-2xl font-bold text-blue-600">
      ${response.cost_data.annualSavings.toLocaleString()} MXN/año
    </p>
    <div className="text-sm text-blue-700 mt-2">
      ROI: {response.cost_data.roi?.toFixed(0)}%
    </div>
  </div>
)}
```

---

## 🧪 Testing Checklist

### As Employee:

- [ ] **Lesson 1:**
  - [ ] Carbon calculator works
  - [ ] Can upload images
  - [ ] Cost calculator shows results
  - [ ] Activity marked as complete
  - [ ] Can proceed to Lesson 2

- [ ] **Lesson 2:**
  - [ ] Reflection journal accepts input
  - [ ] Word count validation works
  - [ ] Plan is saved
  - [ ] Can proceed to Lesson 3

- [ ] **Lesson 3:**
  - [ ] Commitment journal works
  - [ ] Evidence uploader accepts files
  - [ ] Module completion triggers
  - [ ] Can view certificate

### As Corporate Admin:

- [ ] **Progress Page:**
  - [ ] See all lesson responses
  - [ ] Carbon data displays correctly
  - [ ] Cost data displays correctly
  - [ ] Evidence images load
  - [ ] Reflections are readable

- [ ] **Impact Page:**
  - [ ] Aggregated carbon data
  - [ ] Total cost savings
  - [ ] ROI calculations
  - [ ] Evidence gallery

---

## 🚀 Next Steps

1. **Complete Integration:**
   - Update lesson viewer activity sections
   - Test all 3 lessons end-to-end
   - Verify data saves correctly

2. **Corporate Reports:**
   - Add tool data to progress page
   - Create downloadable ESG reports
   - Build evidence gallery view

3. **Additional Modules:**
   - Apply same patterns to new modules
   - Create module-specific calculators
   - Build library of reusable activities

---

## 💡 Pro Tips

1. **Always save data immediately after tool completion**
   - Use `onCalculate`, `onSave`, `onUpload` callbacks
   - Don't wait for lesson completion

2. **Show loading states during uploads**
   ```tsx
   const [uploading, setUploading] = useState(false)
   
   const handleUpload = async (files) => {
     setUploading(true)
     const urls = await uploadEvidence(files)
     setUploading(false)
   }
   ```

3. **Provide visual feedback**
   ```tsx
   {activityCompleted && (
     <div className="bg-green-50 border-2 border-green-500 p-4 rounded-lg">
       ✅ Actividad completada - Datos guardados
     </div>
   )}
   ```

4. **Handle errors gracefully**
   ```tsx
   try {
     await saveActivityData('carbon', result)
   } catch (error) {
     alert('Error al guardar. Intenta de nuevo.')
   }
   ```

---

**Status:** Ready for implementation!  
**Estimated Time:** 2-3 hours for full Clean Air module integration  
**Dependencies:** SQL migrations must be run first ✅

---

_Created: October 31, 2025_  
_Last Updated: October 31, 2025_  
_Author: AI Assistant_

