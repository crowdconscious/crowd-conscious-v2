// Reusable Module Tools
// These components can be used across all training modules

// ============================================
// GENERAL PURPOSE TOOLS (Use in any module)
// ============================================
export { default as CarbonCalculator } from './CarbonCalculator'
export { default as CostCalculator } from './CostCalculator'
export { default as EvidenceUploader } from './EvidenceUploader'
export { default as ReflectionJournal } from './ReflectionJournal'
export { default as ImpactComparison } from './ImpactComparison'

// ============================================
// MODULE-SPECIFIC TOOLS (Clean Air Module)
// ============================================
export { default as AirQualityAssessment } from './AirQualityAssessment'
export { default as AirQualityROI } from './AirQualityROI'
export { default as AirQualityImpact } from './AirQualityImpact'

// Type exports
export type { default as CarbonResult } from './CarbonCalculator'
export type { default as CostResult } from './CostCalculator'
export type { default as UploadedFile } from './EvidenceUploader'
export type { default as ReflectionData } from './ReflectionJournal'

