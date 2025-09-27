// TODO: Fix monitoring implementation - temporarily stubbed for build

// Types for monitoring
export interface PerformanceMetric {
  name: string
  value: number
  timestamp: Date
  metadata?: Record<string, any>
}

export interface Alert {
  id: string
  type: 'response_time' | 'error_rate' | 'payment_failure' | 'new_signup' | 'community_milestone'
  severity: 'info' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  resolved: boolean
  data?: Record<string, any>
}

// Simple stub implementations
export const performanceMonitor = {
  getInstance: () => ({}),
  trackPageLoad: () => {},
  trackAPIResponse: () => {},
  getMetrics: () => [],
  getErrorRate: () => 5,
  getPaymentSuccessRate: () => 95
}

export const errorTracker = {
  captureError: (error: any) => console.error(error),
  captureMessage: (msg: string) => console.log(msg)
}

export class PerformanceMonitor {
  static getInstance() {
    return performanceMonitor
  }
}

export class ErrorTracker {
  static captureError(error: any) {
    console.error(error)
  }
  
  static captureMessage(msg: string) {
    console.log(msg)
  }
}