import { NextResponse } from 'next/server'
import { buildLlmsTxt } from '@/lib/agentic/llms-txt'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  return new NextResponse(buildLlmsTxt(), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
