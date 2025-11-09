// Export all module tools
export { default as CarbonCalculator } from './CarbonCalculator'
export { default as CostCalculator } from './CostCalculator'
export { default as EvidenceUploader } from './EvidenceUploader'
export { default as ReflectionJournal } from './ReflectionJournal'
export { default as ImpactComparison } from './ImpactComparison'

// Module 1 (Aire Limpio) tools
export { default as AirQualityAssessment } from './AirQualityAssessment'
export { default as AirQualityImpact } from './AirQualityImpact'
export { default as AirQualityROI } from './AirQualityROI'
export { default as EmissionSourceIdentifier } from './EmissionSourceIdentifier'
export { default as ImplementationTimelinePlanner } from './ImplementationTimelinePlanner'
export { default as AirQualityMonitorTracker } from './AirQualityMonitorTracker'
// Module1Tools has named exports only - not a default export
export * from './Module1Tools'

// Module 2 (Agua Limpia) tools
export { default as WaterFootprintCalculator } from './WaterFootprintCalculator'
export { default as WaterAuditTool } from './WaterAuditTool'
export { default as WaterConservationTracker } from './WaterConservationTracker'
export { 
  WaterQualityTestLog, 
  RecyclingSystemDesigner, 
  default as Module2Tools 
} from './Module2Tools'

// Module 3 (Ciudades Seguras) tools
// Module3Tools has named exports only - not a default export
export * from './Module3Tools'

// Module 4 (Cero Residuos) tools
export {
  WasteStreamAnalyzer,
  FiveRsChecklist,
  CompostingCalculator,
  ZeroWasteCertificationRoadmap,
  default as Module4Tools
} from './Module4Tools'
