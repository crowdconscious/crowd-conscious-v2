import { NextResponse } from 'next/server'

/**
 * Standardized API response utilities
 * 
 * **BENEFITS**:
 * - Consistent error messages across all API routes
 * - Easier to add logging/monitoring
 * - Better client-side error handling
 * - Reduced code duplication
 * 
 * **USAGE**:
 * ```typescript
 * import { ApiResponse } from '@/lib/api-responses'
 * 
 * // Success
 * return ApiResponse.ok({ data: result })
 * 
 * // Errors
 * if (!user) return ApiResponse.unauthorized()
 * if (!hasPermission) return ApiResponse.forbidden('Admin access required')
 * if (!found) return ApiResponse.notFound('Module')
 * ```
 */
/**
 * ✅ PHASE 4: Enhanced standardized API responses
 * 
 * All responses now include:
 * - success: boolean flag
 * - error: standardized error object with code, message, timestamp
 * - Consistent format across all endpoints
 */
export const ApiResponse = {
  // ============================================================================
  // SUCCESS RESPONSES
  // ============================================================================

  /**
   * 200 OK - Successful request
   */
  ok: <T>(data: T) => {
    return NextResponse.json(
      {
        success: true,
        data
      },
      { status: 200 }
    )
  },

  /**
   * 201 Created - Resource successfully created
   */
  created: <T>(data: T) => {
    return NextResponse.json(
      {
        success: true,
        data
      },
      { status: 201 }
    )
  },

  /**
   * 204 No Content - Successful request with no response body
   */
  noContent: () => {
    return new NextResponse(null, { status: 204 })
  },

  // ============================================================================
  // CLIENT ERROR RESPONSES (4xx)
  // ============================================================================

  /**
   * 400 Bad Request - Invalid request data
   */
  badRequest: (message: string, code = 'BAD_REQUEST', details?: any) => {
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          timestamp: new Date().toISOString(),
          ...(details && { details })
        }
      },
      { status: 400 }
    )
  },

  /**
   * 401 Unauthorized - Authentication required
   */
  unauthorized: (message = 'Please log in to continue', code = 'UNAUTHORIZED') => {
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          timestamp: new Date().toISOString()
        }
      },
      { status: 401 }
    )
  },

  /**
   * 403 Forbidden - Insufficient permissions
   */
  forbidden: (message = 'You do not have permission to perform this action', code = 'FORBIDDEN') => {
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          timestamp: new Date().toISOString()
        }
      },
      { status: 403 }
    )
  },

  /**
   * 404 Not Found - Resource does not exist
   */
  notFound: (resource: string, code = 'NOT_FOUND') => {
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message: `${resource} not found`,
          timestamp: new Date().toISOString()
        }
      },
      { status: 404 }
    )
  },

  /**
   * 409 Conflict - Resource already exists or conflict with current state
   */
  conflict: (message: string, code = 'CONFLICT') => {
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          timestamp: new Date().toISOString()
        }
      },
      { status: 409 }
    )
  },

  /**
   * 422 Unprocessable Entity - Validation failed
   */
  validationError: (errors: Record<string, string[]>, code = 'VALIDATION_ERROR') => {
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message: 'The request data is invalid',
          timestamp: new Date().toISOString(),
          errors
        }
      },
      { status: 422 }
    )
  },

  // ============================================================================
  // SERVER ERROR RESPONSES (5xx)
  // ============================================================================

  /**
   * 500 Internal Server Error - Unexpected server error
   */
  serverError: (message = 'An unexpected error occurred', code = 'INTERNAL_SERVER_ERROR', details?: any) => {
    // Track error for monitoring
    const { trackError } = require('@/lib/error-tracking')
    trackError(new Error(message), {
      code,
      details,
      type: 'server_error',
    })

    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          timestamp: new Date().toISOString(),
          ...(process.env.NODE_ENV === 'development' && details && { details })
        }
      },
      { status: 500 }
    )
  },

  /**
   * 503 Service Unavailable - Service temporarily unavailable
   */
  serviceUnavailable: (message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') => {
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          timestamp: new Date().toISOString()
        }
      },
      { status: 503 }
    )
  },

  // ============================================================================
  // CUSTOM RESPONSES
  // ============================================================================

  /**
   * Custom response with any status code
   */
  custom: <T>(data: T, status: number) => {
    return NextResponse.json(data, { status })
  }
}

/**
 * Type guard to check if a response is an error
 */
export function isErrorResponse(response: NextResponse): boolean {
  return response.status >= 400
}

/**
 * Extract error message from response
 */
export async function getErrorMessage(response: NextResponse): Promise<string> {
  try {
    const data = await response.json()
    return data.message || data.error || 'An error occurred'
  } catch {
    return 'An error occurred'
  }
}

