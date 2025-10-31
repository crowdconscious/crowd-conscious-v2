'use client'

import { X } from 'lucide-react'
import { 
  AirQualityAssessment, 
  AirQualityROI, 
  AirQualityImpact,
  CarbonCalculator,
  CostCalculator,
  EvidenceUploader,
  ReflectionJournal,
  ImpactComparison
} from '@/components/module-tools'

interface ToolModalProps {
  toolType: string
  toolTitle: string
  onClose: () => void
  onDataCapture?: (data: any) => void
}

export default function ToolModal({ toolType, toolTitle, onClose, onDataCapture }: ToolModalProps) {
  
  const renderTool = () => {
    switch (toolType) {
      case 'air_quality_assessment':
        return (
          <AirQualityAssessment
            inputs={[
              { id: 'ventilation', label: '¿Hay buena ventilación?', type: 'yes_no' },
              { id: 'occupancy', label: 'Densidad de ocupación', type: 'dropdown', options: ['Baja', 'Media', 'Alta'] },
              { id: 'emissions', label: '¿Hay fuentes de emisión?', type: 'yes_no' },
              { id: 'outdoor_air', label: 'Calidad del aire exterior', type: 'dropdown', options: ['Buena', 'Moderada', 'Mala'] },
              { id: 'hvac', label: '¿Sistema HVAC con filtros?', type: 'yes_no' },
              { id: 'plants', label: '¿Hay plantas?', type: 'yes_no' }
            ]}
            onCalculate={(data) => {
              if (onDataCapture) onDataCapture(data)
            }}
          />
        )
      
      case 'air_quality_roi':
        return (
          <AirQualityROI
            onCalculate={(data) => {
              if (onDataCapture) onDataCapture(data)
            }}
          />
        )
      
      case 'air_quality_impact':
        return (
          <AirQualityImpact
            onCalculate={(data) => {
              if (onDataCapture) onDataCapture(data)
            }}
          />
        )
      
      case 'carbon_calculator':
        return (
          <CarbonCalculator
            onCalculate={(data) => {
              if (onDataCapture) onDataCapture(data)
            }}
          />
        )
      
      case 'cost_calculator':
        return (
          <CostCalculator
            onCalculate={(data) => {
              if (onDataCapture) onDataCapture(data)
            }}
          />
        )
      
      case 'evidence_uploader':
        return (
          <EvidenceUploader
            onUpload={async (files) => {
              // This will be handled by the actual upload function in the parent
              if (onDataCapture) onDataCapture({ files })
            }}
          />
        )
      
      case 'reflection_journal':
        return (
          <ReflectionJournal
            prompts={[
              '¿Qué aprendiste hoy?',
              '¿Cómo aplicarás esto en tu trabajo?',
              '¿Qué retos anticipas?'
            ]}
            onReflect={(data) => {
              if (onDataCapture) onDataCapture(data)
            }}
          />
        )
      
      default:
        return (
          <div className="text-center py-12">
            <p className="text-slate-600">Herramienta no encontrada: {toolType}</p>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-purple-50">
          <h2 className="text-2xl font-bold text-slate-900">{toolTitle}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white shadow-md hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>
        
        {/* Tool Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderTool()}
        </div>
      </div>
    </div>
  )
}

