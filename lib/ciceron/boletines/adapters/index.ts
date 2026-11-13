import type { BulletinAdapter } from '@/lib/ciceron/boletines/adapter'
import { jaliscoAdapter } from '@/lib/ciceron/boletines/adapters/jalisco'
import { queretaroAdapter } from '@/lib/ciceron/boletines/adapters/queretaro'

const ADAPTERS: Record<string, BulletinAdapter> = {
  queretaro: queretaroAdapter,
  jalisco: jaliscoAdapter,
}

export function getBulletinAdapter(key: string | null | undefined): BulletinAdapter | null {
  if (!key) return null
  return ADAPTERS[key] ?? null
}

export function listBulletinAdapters(): BulletinAdapter[] {
  return Object.values(ADAPTERS)
}

export { jaliscoAdapter, queretaroAdapter }
