/**
 * Ops: mint a Cicéron demo invite (pepper_version=2).
 *
 * Prints the plaintext code ONCE to stdout. Only the v2 hash is stored.
 * Never commit the printed code. No admin (or other) invites in public SQL.
 *
 * Usage (placeholder values only — do not paste real codes or peppers):
 *   npx tsx scripts/ciceron/create-invite.ts \
 *     --persona=socio \
 *     --label="Prospect Example LLP" \
 *     --max-uses=5 \
 *     --expires-days=30
 *
 *   npx tsx scripts/ciceron/create-invite.ts \
 *     --persona-id=<uuid> \
 *     --firm=<uuid> \
 *     --label="Custom prospect"
 *
 * --persona is REQUIRED (socio|asociado|pasante|admin|asociado2|abac)
 *   unless --persona-id is provided. There is no silent admin default.
 * --max-uses: positive integer, max 100 (default 50)
 * --expires-days: positive number, max 90 (default 90)
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

function parsePositiveInt(raw: string, label: string): number {
  if (!/^\d+$/.test(raw.trim())) {
    console.error(`${label} must be a positive integer (no decimals)`)
    process.exit(1)
  }
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) {
    console.error(`${label} must be a positive integer`)
    process.exit(1)
  }
  return n
}

async function main() {
  // Validate CLI args before env/secrets so operators get clear errors in dry checks.
  const label = arg('label')
  const personaRole = arg('persona')
  const personaIdArg = arg('persona-id')

  if (!personaRole && !personaIdArg) {
    console.error(
      'Required: --persona=socio|asociado|pasante|admin|asociado2|abac (or --persona-id=<uuid>). No default.'
    )
    process.exit(1)
  }

  const personaId =
    personaIdArg ??
    (personaRole ? PERSONA_BY_ROLE[personaRole] : undefined)

  if (!personaId) {
    console.error(
      'Unknown --persona. Use socio|asociado|pasante|admin|asociado2|abac or --persona-id=<uuid>'
    )
    process.exit(1)
  }

  if (!label || label.length < 1 || label.length > 200) {
    console.error('Required: --label="Prospect label" (1–200 chars)')
    process.exit(1)
  }

  const maxUsesRaw = arg('max-uses')
  const maxUses = maxUsesRaw ? parsePositiveInt(maxUsesRaw, '--max-uses') : 50
  if (maxUses > 100) {
    console.error('--max-uses cannot exceed 100')
    process.exit(1)
  }

  const expiresDaysRaw = arg('expires-days')
  let expiresDays = 90
  if (expiresDaysRaw) {
    const n = Number(expiresDaysRaw)
    if (!Number.isFinite(n) || n < 1) {
      console.error('--expires-days must be a positive number')
      process.exit(1)
    }
    expiresDays = n
  }
  if (expiresDays > 90) {
    console.error('--expires-days cannot exceed 90')
    process.exit(1)
  }

  const firmId = arg('firm') === 'demo' || !arg('firm') ? DEMO_FIRM : arg('firm')!

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
