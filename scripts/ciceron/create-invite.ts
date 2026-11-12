/**
 * Ops: mint a Cicéron demo invite (pepper_version=2).
 *
 * Prints the plaintext code ONCE to stdout. Only the v2 hash is stored.
 * Never commit the printed code. No admin (or other) invites in public SQL.
 *
 * Usage:
 *   npx tsx scripts/ciceron/create-invite.ts --persona=admin --label="Ops admin"
 *   npx tsx scripts/ciceron/create-invite.ts --persona=socio --label="Prospect Acme" --max-uses=5 --expires-days=30
 *   npx tsx scripts/ciceron/create-invite.ts --persona-id=<uuid> --firm=<uuid> --label="Custom"
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CICERON_INVITE_PEPPER_V2
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import {
  hashInviteCodeForInsert,
  mintInviteCode,
} from '../../lib/ciceron/demo/invite-hash'

const DEMO_FIRM = 'a1000000-0000-4000-8000-000000000001'

const PERSONA_BY_ROLE: Record<string, string> = {
  socio: 'b1000000-0000-4000-8000-000000000001',
  asociado: 'b1000000-0000-4000-8000-000000000002',
  pasante: 'b1000000-0000-4000-8000-000000000003',
  admin: 'b1000000-0000-4000-8000-000000000004',
  asociado2: 'b1000000-0000-4000-8000-000000000005',
  abac: 'e3000000-0000-4000-8000-000000000010',
}

function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (!process.env.CICERON_INVITE_PEPPER_V2?.trim()) {
    console.error('Missing CICERON_INVITE_PEPPER_V2 (required for runtime invites)')
    process.exit(1)
  }

  const label = arg('label')
  if (!label || label.length < 1 || label.length > 200) {
    console.error('Required: --label="Prospect label" (1–200 chars)')
    process.exit(1)
  }

  const firmId = arg('firm') === 'demo' || !arg('firm') ? DEMO_FIRM : arg('firm')!
  const personaRole = arg('persona')
  const personaIdArg = arg('persona-id')
  const personaId =
    personaIdArg ??
    (personaRole ? PERSONA_BY_ROLE[personaRole] : undefined) ??
    PERSONA_BY_ROLE.admin

  if (!personaId) {
    console.error(
      'Unknown --persona. Use socio|asociado|pasante|admin|asociado2|abac or --persona-id=<uuid>'
    )
    process.exit(1)
  }

  const maxUsesRaw = arg('max-uses')
  const maxUses = maxUsesRaw ? Number(maxUsesRaw) : 50
  if (!Number.isFinite(maxUses) || maxUses < 1) {
    console.error('--max-uses must be a positive integer')
    process.exit(1)
  }

  const expiresDaysRaw = arg('expires-days')
  const expiresDays = expiresDaysRaw ? Number(expiresDaysRaw) : 90
  if (!Number.isFinite(expiresDays) || expiresDays < 1) {
    console.error('--expires-days must be a positive number')
    process.exit(1)
  }

  const code = mintInviteCode()
  const { hash, pepperVersion } = hashInviteCodeForInsert(code, 2)
  const id = randomUUID()
  const expiresAt = new Date(
    Date.now() + expiresDays * 24 * 60 * 60 * 1000
  ).toISOString()

  const sb = createClient(url, key, { db: { schema: 'ciceron' } })
  const { error } = await sb.from('invite_codes').insert({
    id,
    code_hash: hash,
    pepper_version: pepperVersion,
    prospect_label: label,
    firm_id: firmId,
    default_persona_id: personaId,
    expires_at: expiresAt,
    max_uses: maxUses,
    use_count: 0,
    is_active: true,
    is_demo: true,
  })

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  // Metadata to stderr; plaintext code once to stdout.
  console.error(
    JSON.stringify({
      ok: true,
      invite_id: id,
      firm_id: firmId,
      persona_id: personaId,
      pepper_version: pepperVersion,
      max_uses: maxUses,
      expires_at: expiresAt,
      prospect_label: label,
    })
  )
  process.stdout.write(`${code}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
