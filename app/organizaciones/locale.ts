import { cookies } from 'next/headers'
import type { OrgLocale } from '@/lib/i18n/organizaciones'

export async function getOrgLocale(): Promise<OrgLocale> {
  const store = await cookies()
  return store.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}
