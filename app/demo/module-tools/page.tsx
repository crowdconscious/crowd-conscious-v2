'use client'

import { useState } from 'react'
import {
  CarbonCalculator,
  CostCalculator,
  EvidenceUploader,
  ReflectionJournal,
  ImpactComparison
} from '@/components/module-tools'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ModuleToolsDemo() {
  const [activeTab, setActiveTab] = useState('carbon')

  const tabs = [
    { id: 'carbon', label: '🌱 Carbon Calculator', component: 'CarbonCalculator' },
    { id: 'cost', label: '💰 Cost Calculator', component: 'CostCalculator' },
    { id: 'evidence', label: '📸 Evidence Uploader', component: 'EvidenceUploader' },
    { id: 'reflection', label: '✍️ Reflection Journal', component: 'ReflectionJournal' },
    { id: 'impact', label: '✨ Impact Comparison', component: 'ImpactComparison' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white py-6 sm:py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Link 
            href="/employee-portal/dashboard"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Volver
          </Link>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
            🛠️ Herramientas de Módulos
          </h1>
          <p className="text-sm sm:text-base text-white/90">
            Componentes reutilizables para capacitación interactiva
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex overflow-x-auto gap-2 sm:gap-4 py-3 sm:py-4 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap transition-all min-h-[44px] ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-teal-600 to-purple-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 md:py-12">
        {/* Carbon Calculator */}
        {activeTab === 'carbon' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                Calculadora de Huella de Carbono
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mb-4">
                Permite a los empleados calcular sus emisiones de CO₂ y ver comparaciones visuales del impacto.
              </p>
              <div className="bg-slate-100 rounded-lg p-3 text-xs sm:text-sm font-mono text-slate-700 overflow-x-auto">
                {`<CarbonCalculator
  onCalculate={(result) => console.log(result)}
  showBreakdown={true}
  showComparison={true}
/>`}
              </div>
            </div>

            <CarbonCalculator
              onCalculate={(result) => {
                console.log('Carbon calculation:', result)
                alert(`Huella calculada: ${result.total.toFixed(0)} kg CO₂`)
              }}
              showBreakdown={true}
              showComparison={true}
            />
          </div>
        )}

        {/* Cost Calculator */}
        {activeTab === 'cost' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                Calculadora de Ahorros
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mb-4">
                Ayuda a las empresas a calcular ahorros potenciales, ROI y periodo de recuperación.
              </p>
              <div className="bg-slate-100 rounded-lg p-3 text-xs sm:text-sm font-mono text-slate-700 overflow-x-auto">
                {`<CostCalculator
  onCalculate={(result) => console.log(result)}
  showROI={true}
  showPaybackPeriod={true}
/>`}
              </div>
            </div>

            <CostCalculator
              onCalculate={(result) => {
                console.log('Cost calculation:', result)
              }}
              showROI={true}
              showPaybackPeriod={true}
            />
          </div>
        )}

        {/* Evidence Uploader */}
        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                Subidor de Evidencia
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mb-4">
                Permite a los empleados subir fotos de "antes/después" como prueba de implementación.
              </p>
              <div className="bg-slate-100 rounded-lg p-3 text-xs sm:text-sm font-mono text-slate-700 overflow-x-auto">
                {`<EvidenceUploader
  onUpload={(files) => console.log(files)}
  maxFiles={5}
  maxSizeMB={5}
  label="Evidencia Fotográfica"
  description="Sube fotos de tu implementación"
/>`}
              </div>
            </div>

            <EvidenceUploader
              onUpload={(files) => {
                console.log('Files uploaded:', files)
                alert(`${files.length} archivo(s) listo(s) para enviar`)
              }}
              maxFiles={5}
              maxSizeMB={5}
              label="Evidencia Fotográfica"
              description="Sube fotos de tu implementación (antes/después)"
            />
          </div>
        )}

        {/* Reflection Journal */}
        {activeTab === 'reflection' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                Diario de Reflexión
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mb-4">
                Captura reflexiones profundas de los empleados con conteo de palabras y validación.
              </p>
              <div className="bg-slate-100 rounded-lg p-3 text-xs sm:text-sm font-mono text-slate-700 overflow-x-auto">
                {`<ReflectionJournal
  prompts={[
    "¿Qué aprendiste?",
    "¿Cómo lo aplicarás?",
    "¿Qué desafíos prevés?"
  ]}
  onSave={(data) => console.log(data)}
  minWords={50}
  showWordCount={true}
/>`}
              </div>
            </div>

            <ReflectionJournal
              prompts={[
                '¿Qué fue lo más sorprendente que aprendiste en este módulo?',
                '¿Cómo planeas aplicar estos conocimientos en tu trabajo diario?',
                '¿Qué obstáculos podrías enfrentar y cómo los superarás?'
              ]}
              onSave={(data) => {
                console.log('Reflection saved:', data)
                alert(`Reflexión guardada: ${data.wordCount} palabras`)
              }}
              minWords={50}
              showWordCount={true}
              label="Reflexión Personal"
            />
          </div>
        )}

        {/* Impact Comparison */}
        {activeTab === 'impact' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                Comparación de Impacto
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mb-4">
                Muestra el impacto en términos que todos puedan entender (árboles, viajes, etc.).
              </p>
              <div className="bg-slate-100 rounded-lg p-3 text-xs sm:text-sm font-mono text-slate-700 overflow-x-auto">
                {`<ImpactComparison
  value={1250}
  unit="kg CO₂ reducidos"
  comparisons={[
    { icon: '🌳', label: 'Árboles plantados', value: 62 },
    { icon: '🚗', label: 'Viajes en auto evitados', value: 45 },
    { icon: '💡', label: 'Focos por 1 año', value: 120 }
  ]}
/>`}
              </div>
            </div>

            <ImpactComparison
              value={1250}
              unit="kg CO₂ reducidos este mes"
              comparisons={[
                { icon: '🌳', label: 'Árboles plantados equivalentes', value: 62 },
                { icon: '🚗', label: 'Viajes en auto evitados', value: 45, unit: '25km cada uno' },
                { icon: '💡', label: 'Focos LED por un año', value: 120 },
                { icon: '📱', label: 'Cargas de smartphone', value: 52000, unit: 'aprox' }
              ]}
              title="Tu Impacto en Perspectiva"
              description="Equivalencias del mundo real"
            />

            {/* Second Example */}
            <ImpactComparison
              value={15000}
              unit="litros de agua ahorrados"
              comparisons={[
                { icon: '🏊', label: 'Piscinas olímpicas', value: 0.006, unit: '~1/167' },
                { icon: '🚿', label: 'Duchas de 10 minutos', value: 150 },
                { icon: '🌊', label: 'Botellas de 1 litro', value: 15000 },
                { icon: '👨‍👩‍👧‍👦', label: 'Familias por 1 mes', value: 7, unit: '~7 familias' }
              ]}
              title="Ahorro de Agua Logrado"
              description="Tu contribución al cuidado del agua"
            />
          </div>
        )}

        {/* Documentation */}
        <div className="mt-8 sm:mt-12 bg-gradient-to-br from-teal-50 to-purple-50 border-2 border-teal-200 rounded-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-teal-900 mb-3 sm:mb-4">
            📚 Cómo Usar Estos Componentes
          </h2>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-teal-800">
            <div>
              <strong className="block text-teal-900 mb-1">1. Importa los componentes:</strong>
              <code className="bg-teal-100 px-2 py-1 rounded text-xs sm:text-sm block mt-1 overflow-x-auto">
                import {'{ CarbonCalculator, CostCalculator }'} from '@/components/module-tools'
              </code>
            </div>

            <div>
              <strong className="block text-teal-900 mb-1">2. Úsalos en tus lecciones:</strong>
              <p className="text-teal-700">
                Estos componentes son completamente móviles-first, accesibles y listos para producción.
              </p>
            </div>

            <div>
              <strong className="block text-teal-900 mb-1">3. Captura los datos:</strong>
              <p className="text-teal-700">
                Usa el prop <code className="bg-teal-100 px-1 rounded">onCalculate</code> o <code className="bg-teal-100 px-1 rounded">onSave</code> para 
                guardar los resultados en la base de datos.
              </p>
            </div>

            <div>
              <strong className="block text-teal-900 mb-1">4. Personaliza:</strong>
              <p className="text-teal-700">
                Todos los componentes aceptan props para personalizar colores, textos y comportamiento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

