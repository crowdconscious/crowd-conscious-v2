/**
 * In-process + cookie-backed demo connection state when firm_integrations
 * table is not yet applied. Never stores secrets.
 */

import { cookies } from 'next/headers'
import type { M365ConnectionStatus } from '@/lib/ciceron/m365/types'

export const CICERON_M365_COOKIE = 'ciceron_m365_sim'

export async function readM365CookieStatus(): Promise<M365ConnectionStatus> {
  const jar = await cookies()
  const v = jar.get(CICERON_M365_COOKIE)?.value
  return v === 'connected' ? 'connected' : 'disconnected'
}

export async function writeM365CookieStatus(status: M365ConnectionStatus): Promise<void> {
  const jar = await cookies()
  if (status === 'connected') {
    jar.set(CICERON_M365_COOKIE, 'connected', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/ciceron',
      maxAge: 60 * 60 * 24 * 30,
    })
  } else {
    jar.delete(CICERON_M365_COOKIE)
  }
}
