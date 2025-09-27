// Simple monitoring without external dependencies for immediate deployment

export interface PerformanceMetric {
  name: string
  value: number
  timestamp: Date
  metadata?: Record<string, any>
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  trackPageLoad(page: string, loadTime: number, metadata?: Record<string, any>) {
    this.metrics.push({
      name: 'page_load_time',
      value: loadTime,
      timestamp: new Date(),
      metadata: { page, ...metadata }
    })

    if (loadTime > 3000) {
      console.warn(`Slow page load: ${page} took ${loadTime}ms`)
    }
  }

  trackAPIResponse(endpoint: string, responseTime: number, status: number) {
    this.metrics.push({
      name: 'api_response_time',
      value: responseTime,
      timestamp: new Date(),
      metadata: { endpoint, status }
    })

    if (responseTime > 3000) {
      console.warn(`Slow API response: ${endpoint} took ${responseTime}ms`)
    }
  }

  getMetrics(limit = 100): PerformanceMetric[] {
    return this.metrics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }
}

export class ErrorTracker {
  static captureError(error: Error, context?: Record<string, any>) {
    console.error('Error captured:', error.message, context)
  }

  static captureMessage(message: string, level: string = 'info', context?: Record<string, any>) {
    console[level as keyof Console](message, context)
  }

  static setUserContext(userId: string, userType: string) {
    console.log(`User context set: ${userId} (${userType})`)
  }

  static addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    console.log(`Breadcrumb: [${category}] ${message}`, data)
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()
