import * as Sentry from '@sentry/nextjs'

// Types for monitoring
export interface PerformanceMetric {
  name: string
  value: number
  timestamp: Date
  metadata?: Record<string, any>
}

export interface AlertConfig {
  type: 'payment_failure' | 'error_rate' | 'response_time' | 'new_signup'
  threshold: number
  enabled: boolean
}

export interface SystemAlert {
  id: string
  type: AlertConfig['type']
  severity: 'info' | 'warning' | 'error'
  message: string
  timestamp: Date
  resolved: boolean
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Track page load time
  trackPageLoad(page: string, loadTime: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name: 'page_load_time',
      value: loadTime,
      timestamp: new Date(),
      metadata: { page, ...metadata }
    }

    this.metrics.push(metric)
    
    // Send to Sentry for tracking
    Sentry.addBreadcrumb({
      message: `Page load: ${page}`,
      category: 'performance',
      data: { loadTime, ...metadata },
      level: 'info'
    })

    // Alert if load time is too high
    if (loadTime > 3000) {
      this.triggerAlert('response_time', {
        page,
        loadTime,
        threshold: 3000
      })
    }
  }

  // Track API response time
  trackAPIResponse(endpoint: string, responseTime: number, status: number) {
    const metric: PerformanceMetric = {
      name: 'api_response_time',
      value: responseTime,
      timestamp: new Date(),
      metadata: { endpoint, status }
    }

    this.metrics.push(metric)

    // Alert if response time is too high
    if (responseTime > 3000) {
      this.triggerAlert('response_time', {
        endpoint,
        responseTime,
        status,
        threshold: 3000
      })
    }
  }

  // Track payment events
  trackPayment(success: boolean, amount: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name: 'payment_event',
      value: success ? 1 : 0,
      timestamp: new Date(),
      metadata: { amount, success, ...metadata }
    }

    this.metrics.push(metric)

    if (!success) {
      this.triggerAlert('payment_failure', {
        amount,
        ...metadata
      })

      // Send to Sentry
      Sentry.captureMessage('Payment failed', {
        level: 'warning',
        extra: { amount, ...metadata }
      })
    }
  }

  // Track user signups
  trackSignup(userType: 'user' | 'brand', metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name: 'user_signup',
      value: 1,
      timestamp: new Date(),
      metadata: { userType, ...metadata }
    }

    this.metrics.push(metric)

    // Celebrate new signups!
    this.triggerAlert('new_signup', {
      userType,
      ...metadata
    })

    // Track in Sentry
    Sentry.addBreadcrumb({
      message: `New ${userType} signup`,
      category: 'user',
      data: { userType, ...metadata },
      level: 'info'
    })
  }

  // Get recent metrics
  getMetrics(limit = 100): PerformanceMetric[] {
    return this.metrics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  // Calculate error rate
  getErrorRate(timeWindow = 60 * 60 * 1000): number { // 1 hour default
    const cutoff = new Date(Date.now() - timeWindow)
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff)
    
    const apiMetrics = recentMetrics.filter(m => m.name === 'api_response_time')
    if (apiMetrics.length === 0) return 0

    const errorCount = apiMetrics.filter(m => 
      m.metadata?.status && m.metadata.status >= 400
    ).length

    return (errorCount / apiMetrics.length) * 100
  }

  // Calculate payment success rate
  getPaymentSuccessRate(timeWindow = 24 * 60 * 60 * 1000): number { // 24 hours default
    const cutoff = new Date(Date.now() - timeWindow)
    const paymentMetrics = this.metrics.filter(m => 
      m.name === 'payment_event' && m.timestamp > cutoff
    )

    if (paymentMetrics.length === 0) return 100

    const successCount = paymentMetrics.filter(m => m.value === 1).length
    return (successCount / paymentMetrics.length) * 100
  }

  private triggerAlert(type: AlertConfig['type'], data: Record<string, any>) {
    // In a real implementation, this would send alerts via email, Slack, etc.
    console.log(`🚨 Alert triggered: ${type}`, data)

    // Send to Sentry based on alert type
    const severity = this.getAlertSeverity(type, data)
    
    if (severity === 'error') {
      Sentry.captureMessage(`Alert: ${type}`, {
        level: 'error',
        extra: data
      })
    }
  }

  private getAlertSeverity(type: AlertConfig['type'], data: Record<string, any>): 'info' | 'warning' | 'error' {
    switch (type) {
      case 'payment_failure':
        return 'error'
      case 'error_rate':
        return data.rate > 5 ? 'error' : 'warning'
      case 'response_time':
        return data.responseTime > 5000 ? 'error' : 'warning'
      case 'new_signup':
        return 'info'
      default:
        return 'info'
    }
  }
}

// Error tracking utilities
export class ErrorTracker {
  static captureError(error: Error, context?: Record<string, any>) {
    Sentry.captureException(error, {
      extra: context
    })

    // Also track in performance monitor
    PerformanceMonitor.getInstance().getMetrics().push({
      name: 'error_event',
      value: 1,
      timestamp: new Date(),
      metadata: {
        message: error.message,
        stack: error.stack,
        ...context
      }
    })
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    Sentry.captureMessage(message, {
      level,
      extra: context
    })
  }

  static setUserContext(userId: string, userType: 'user' | 'brand' | 'admin') {
    Sentry.setUser({
      id: userId,
      segment: userType
    })
  }

  static addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info'
    })
  }
}

// Real-time monitoring hook for client components
export function useMonitoring() {
  const monitor = PerformanceMonitor.getInstance()

  const trackPageView = (page: string) => {
    const startTime = performance.now()
    
    return () => {
      const loadTime = performance.now() - startTime
      monitor.trackPageLoad(page, loadTime)
    }
  }

  const trackUserAction = (action: string, metadata?: Record<string, any>) => {
    monitor.getMetrics().push({
      name: 'user_action',
      value: 1,
      timestamp: new Date(),
      metadata: { action, ...metadata }
    })

    Sentry.addBreadcrumb({
      message: `User action: ${action}`,
      category: 'user',
      data: metadata,
      level: 'info'
    })
  }

  const trackError = (error: Error, context?: Record<string, any>) => {
    ErrorTracker.captureError(error, context)
  }

  return {
    trackPageView,
    trackUserAction,
    trackError,
    getMetrics: () => monitor.getMetrics(),
    getErrorRate: () => monitor.getErrorRate(),
    getPaymentSuccessRate: () => monitor.getPaymentSuccessRate()
  }
}

// Server-side monitoring utilities
export const serverMonitoring = {
  // Track API endpoint performance
  wrapAPIHandler: (handler: Function, endpoint: string) => {
    return async (...args: any[]) => {
      const startTime = Date.now()
      const monitor = PerformanceMonitor.getInstance()

      try {
        const result = await handler(...args)
        const responseTime = Date.now() - startTime
        
        monitor.trackAPIResponse(endpoint, responseTime, 200)
        return result
      } catch (error: any) {
        const responseTime = Date.now() - startTime
        const status = error.status || 500
        
        monitor.trackAPIResponse(endpoint, responseTime, status)
        ErrorTracker.captureError(error, { endpoint, responseTime, status })
        
        throw error
      }
    }
  },

  // Track database query performance
  trackDBQuery: (query: string, duration: number, success: boolean) => {
    PerformanceMonitor.getInstance().getMetrics().push({
      name: 'db_query',
      value: duration,
      timestamp: new Date(),
      metadata: { query, success }
    })

    if (duration > 1000) { // Alert if query takes longer than 1 second
      Sentry.captureMessage('Slow database query', {
        level: 'warning',
        extra: { query, duration, success }
      })
    }
  },

  // Track email sending
  trackEmail: (template: string, success: boolean, recipient?: string) => {
    PerformanceMonitor.getInstance().getMetrics().push({
      name: 'email_sent',
      value: success ? 1 : 0,
      timestamp: new Date(),
      metadata: { template, success, recipient: recipient ? 'redacted' : undefined }
    })

    if (!success) {
      ErrorTracker.captureMessage('Email failed to send', 'warning', { template })
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()
