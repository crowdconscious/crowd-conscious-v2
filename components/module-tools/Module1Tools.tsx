'use client'

// Module 1: Aire Limpio - All Tools
// These tools support the 5 lessons of the Clean Air module

import AirQualityAssessment from './AirQualityAssessment'
import EmissionSourceIdentifier from './EmissionSourceIdentifier'
import AirQualityROI from './AirQualityROI'
import ImplementationTimelinePlanner from './ImplementationTimelinePlanner'
import AirQualityMonitorTracker from './AirQualityMonitorTracker'

// Export individual tools for use in lesson pages
export {
  AirQualityAssessment,
  EmissionSourceIdentifier,
  AirQualityROI,
  ImplementationTimelinePlanner,
  AirQualityMonitorTracker
}

// Tool Configuration for Lesson Integration
export const MODULE_1_TOOLS = {
  'air-quality-assessment': AirQualityAssessment,
  'emission-source-identifier': EmissionSourceIdentifier,
  'air-quality-roi': AirQualityROI,
  'implementation-timeline': ImplementationTimelinePlanner,
  'air-quality-monitor': AirQualityMonitorTracker
}

// Tool Metadata for UI Display
export const MODULE_1_TOOL_INFO = {
  'air-quality-assessment': {
    name: 'Evaluación de Calidad del Aire',
    description: 'Cuestionario de 6 preguntas para evaluar tu espacio',
    icon: '🌬️',
    lesson: 1
  },
  'emission-source-identifier': {
    name: 'Identificador de Fuentes de Emisión',
    description: 'Mapea y cataloga las fuentes de contaminación',
    icon: '🏭',
    lesson: 2
  },
  'air-quality-roi': {
    name: 'Calculadora ROI de Aire Limpio',
    description: 'Calcula el retorno de inversión en mejoras',
    icon: '💰',
    lesson: 3
  },
  'implementation-timeline': {
    name: 'Plan de Implementación 90 Días',
    description: 'Organiza tu proyecto con tareas y presupuesto',
    icon: '📅',
    lesson: 4
  },
  'air-quality-monitor': {
    name: 'Monitor de Calidad del Aire',
    description: 'Registra y analiza mediciones PM2.5 y PM10',
    icon: '📊',
    lesson: 5
  }
}

