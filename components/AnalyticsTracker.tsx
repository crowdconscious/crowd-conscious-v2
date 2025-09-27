'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ErrorTracker } from '@/lib/monitoring-simple'

export default function AnalyticsTracker() {
  const pathname = usePathname()
  
  const trackPageView = (page: string) => {
    console.log(`Page view: ${page}`)
  }
  
  const trackUserAction = (action: string, metadata?: Record<string, any>) => {
    console.log(`User action: ${action}`, metadata)
  }

  useEffect(() => {
    // Track page view
    const finishTracking = trackPageView(pathname)

    // Set up error boundary for the page
    const handleError = (event: ErrorEvent) => {
      ErrorTracker.captureError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        pathname
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      ErrorTracker.captureError(new Error(String(event.reason)), {
        type: 'unhandled_promise_rejection',
        pathname
      })
    }

    // Add global error listeners
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Track user interactions
    const trackClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const tagName = target.tagName.toLowerCase()
      const className = target.className
      const id = target.id
      const text = target.textContent?.slice(0, 50) // Limit text length

      // Only track meaningful clicks (buttons, links, etc.)
      if (['button', 'a', 'input'].includes(tagName) || className.includes('btn')) {
        trackUserAction('click', {
          tagName,
          className,
          id,
          text,
          pathname
        })
      }
    }

    // Track form submissions
    const trackFormSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement
      const formName = form.name || form.id || 'unnamed'
      
      trackUserAction('form_submit', {
        formName,
        pathname
      })
    }

    // Add interaction listeners
    document.addEventListener('click', trackClick)
    document.addEventListener('submit', trackFormSubmit)

    // Cleanup
    return () => {
      // TODO: Fix monitoring implementation
      // finishTracking()
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      document.removeEventListener('click', trackClick)
      document.removeEventListener('submit', trackFormSubmit)
    }
  }, [pathname, trackPageView, trackUserAction])

  return null // This component doesn't render anything
}
