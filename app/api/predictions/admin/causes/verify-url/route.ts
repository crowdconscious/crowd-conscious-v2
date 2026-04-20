import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Admin-only: HEAD-request a URL and report whether it resolves. The admin
 * "Add New Cause" form calls this before saving to catch copy-paste typos
 * and outright 404s before the cause goes live.
 *
 * Server-side so we bypass CORS. We follow redirects, cap the timeout at
 * 5s, and treat any 2xx / 3xx / early 4xx as "reachable" (many orgs serve
 * 405 on HEAD but will work fine for humans).
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.user_type !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  let url: string | null = null
  try {
    const body = await request.json()
    url = typeof body.url === 'string' ? body.url.trim() : null
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
  if (!url.startsWith('https://')) {
    return NextResponse.json(
      { ok: false, reason: 'Must start with https://' },
      { status: 200 }
    )
  }
  if (url.includes('crowdconscious.app')) {
    return NextResponse.json(
      { ok: false, reason: 'URL points back at crowdconscious.app' },
      { status: 200 }
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
      })
    } catch {
      // Some hosts reject HEAD with a network error; fall back to GET.
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      })
    }

    if (res.status === 404) {
      return NextResponse.json({ ok: false, reason: '404 Not Found', status: res.status })
    }
    if (res.status >= 500) {
      return NextResponse.json({ ok: false, reason: `${res.status} Server Error`, status: res.status })
    }
    return NextResponse.json({ ok: true, status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unreachable'
    return NextResponse.json({ ok: false, reason: message })
  } finally {
    clearTimeout(timer)
  }
}
