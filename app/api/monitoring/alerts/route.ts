import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitor, ErrorTracker } from '@/lib/monitoring-simple'
import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', (user as any).id)
      .single()

    if ((profile as any)?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get current metrics and alerts
    // TODO: Fix monitoring implementation
    const metrics = [] as any
    const errorRate = 5 // Mock error rate
    const paymentSuccessRate = 95 // Mock payment success rate

    // Generate alerts based on current conditions
    const alerts = []

    // Payment failure alert
    if (paymentSuccessRate < 95) {
      alerts.push({
        id: 'payment-success-rate',
        type: 'payment_failure',
        severity: paymentSuccessRate < 90 ? 'error' : 'warning',
        title: 'Low Payment Success Rate',
        message: `Payment success rate is ${paymentSuccessRate.toFixed(1)}% (target: >95%)`,
        timestamp: new Date().toISOString(),
        resolved: false
      })
    }

    // Error rate alert
    if (errorRate > 1) {
      alerts.push({
        id: 'error-rate',
        type: 'error_rate',
        severity: errorRate > 5 ? 'error' : 'warning',
        title: 'High Error Rate',
        message: `Error rate is ${errorRate.toFixed(1)}% (target: <1%)`,
        timestamp: new Date().toISOString(),
        resolved: false
      })
    }

    // Check for recent signups to celebrate
    const recentSignups = metrics.filter((m: any) => 
      m.name === 'user_signup' && 
      Date.now() - m.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    )

    if (recentSignups.length > 0) {
      alerts.push({
        id: 'new-signups',
        type: 'new_signup',
        severity: 'info',
        title: 'New Users Joined! 🎉',
        message: `${recentSignups.length} new user${recentSignups.length > 1 ? 's' : ''} joined in the last hour`,
        timestamp: new Date().toISOString(),
        resolved: false
      })
    }

    // Check for slow response times
    const slowRequests = metrics.filter((m: any) => 
      (m.name === 'api_response_time' || m.name === 'page_load_time') &&
      m.value > 3000 &&
      Date.now() - m.timestamp.getTime() < 30 * 60 * 1000 // Last 30 minutes
    )

    if (slowRequests.length > 0) {
      alerts.push({
        id: 'slow-responses',
        type: 'response_time',
        severity: 'warning',
        title: 'Slow Response Times Detected',
        message: `${slowRequests.length} requests took longer than 3 seconds in the last 30 minutes`,
        timestamp: new Date().toISOString(),
        resolved: false
      })
    }

    return NextResponse.json({
      alerts,
      summary: {
        errorRate,
        paymentSuccessRate,
        totalMetrics: metrics.length,
        recentSignups: recentSignups.length
      }
    })

  } catch (error: any) {
    ErrorTracker.captureError(error, { endpoint: '/api/monitoring/alerts' })
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', (user as any).id)
      .single()

    if ((profile as any)?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { alertId, action } = await request.json()

    if (action === 'resolve') {
      // In a real implementation, you'd update the alert status in a database
      // For now, we'll just log it
      console.log(`Alert ${alertId} resolved by admin ${(user as any).id}`)
      
      ErrorTracker.addBreadcrumb(
        `Alert resolved: ${alertId}`,
        'admin',
        { userId: (user as any).id, alertId }
      )

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    ErrorTracker.captureError(error, { endpoint: '/api/monitoring/alerts' })
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    )
  }
}
