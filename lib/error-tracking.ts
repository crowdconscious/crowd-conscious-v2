/**
 * Error Tracking Utility
 * 
 * Centralized error tracking that can integrate with Sentry or other services.
 * Currently logs to console, but can be enhanced with Sentry later.
 * 
 * Usage:
 * ```typescript
 * import { trackError } from '@/lib/error-tracking'
 * 
 * try {
 *   // your code
 * } catch (error) {
 *   trackError(error, { context: 'API endpoint', endpoint: '/api/example' })
 *   return ApiResponse.serverError(...)
 * }
 * ```
 */

interface ErrorContext {
  endpoint?: string
  userId?: string
  requestId?: string
  metadata?: Record<string, any>
  [key: string]: any
}

/**
 * Track an error with context
 */
export function trackError(error: Error | unknown, context?: ErrorContext) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined
  
  const errorData = {
    message: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
    context: {
      ...context,
      environment: process.env.NODE_ENV,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    },
  }

  // Log to console (always)
  console.error('[Error Tracked]', errorData)

  // TODO: Integrate with Sentry when available
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  //   Sentry.captureException(error, {
  //     tags: context,
  //     extra: errorData,
  //   })
  // }

  // TODO: Send to monitoring service
  // Could send to Supabase, external API, etc.
}

/**
 * Track a message/event (not an error)
 */
export function trackMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
  const messageData = {
    message,
    level,
    timestamp: new Date().toISOString(),
    context: {
      ...context,
      environment: process.env.NODE_ENV,
    },
  }

  // Log to console
  const logMethod = level === 'error' ? console.error : level === 'warning' ? console.warn : console.log
  logMethod(`[${level.toUpperCase()}]`, messageData)

  // TODO: Integrate with Sentry when available
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  //   Sentry.captureMessage(message, {
  //     level: level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'info',
  //     tags: context,
  //   })
  // }
}

/**
 * Track API endpoint errors
 */
export function trackApiError(
  error: Error | unknown,
  endpoint: string,
  method: string,
  userId?: string,
  requestBody?: any
) {
  trackError(error, {
    endpoint,
    method,
    userId,
    metadata: {
      requestBody: requestBody ? JSON.stringify(requestBody).slice(0, 500) : undefined, // Limit size
    },
  })
}

/**
 * Track performance metrics
 */
export function trackPerformance(metric: string, value: number, unit: string = 'ms', context?: ErrorContext) {
  const perfData = {
    metric,
    value,
    unit,
    timestamp: new Date().toISOString(),
    context: {
      ...context,
      environment: process.env.NODE_ENV,
    },
  }

  console.log('[Performance]', perfData)

  // TODO: Send to monitoring service
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, userType?: string, email?: string) {
  console.log('[User Context]', { userId, userType, email })

  // TODO: Set Sentry user context
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  //   Sentry.setUser({
  //     id: userId,
  //     userType,
  //     email,
  //   })
  // }
}

