/**
 * Backfill `sponsor_accounts.user_id` for existing rows.
 *
 * Why this is a manual script (not a migration):
 * Existing sponsor accounts (Club Reset, the admin@jager test redemptions,
 * MH when we create them, etc.) were created before the coupon redeem route
 * learned to link to the current session. The right `user_id` for each row
 * is a product decision — automating it could silently attach a sponsor
 * account to the wrong human if multiple profiles share a contact_email.
 *
 * Run modes:
 *   # 1. Dry-run: list every sponsor_account that has no user_id, show
 *   #    whether a profile exists for its contact_email, print the SQL
 *   #    that WOULD run — no writes.
 *   npx tsx scripts/backfill-sponsor-owners.ts
 *
 *   # 2. Apply: for each sponsor_account with a matching profile by
 *   #    lowercase(email), set user_id = profile.id. Skips ambiguous
 *   #    matches (>1 profile for that email) and preserves any existing
 *   #    user_id value. Commit in small batches, surface per-row logs.
 *   npx tsx scripts/backfill-sponsor-owners.ts --apply
 *
 *   # 3. Single row: backfill one account by id, attaching it to an
 *   #    explicit user email — use this for MH and Club Reset where
 *   #    contact_email on file may differ from the login email.
 *   npx tsx scripts/backfill-sponsor-owners.ts \
 *     --account=<sponsor_account_id> --email=<user-email>
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Writes use the service role — review the dry-run output BEFORE applying.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local'), override: true })

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
  process.exit(1)
}

import { createAdminClient } from '../lib/supabase-admin'

type SponsorRow = {
  id: string
  company_name: string | null
  contact_email: string | null
  user_id: string | null
  tier: string | null
  status: string | null
  created_at: string | null
}

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
}

type CliFlags = {
  apply: boolean
  accountId: string | null
  explicitEmail: string | null
}

function parseFlags(argv: string[]): CliFlags {
  const flags: CliFlags = { apply: false, accountId: null, explicitEmail: null }
  for (const arg of argv.slice(2)) {
    if (arg === '--apply') flags.apply = true
    else if (arg.startsWith('--account=')) flags.accountId = arg.slice('--account='.length)
    else if (arg.startsWith('--email=')) flags.explicitEmail = arg.slice('--email='.length)
  }
  return flags
}

async function main() {
  const flags = parseFlags(process.argv)
  const admin = createAdminClient()

  // Single-row mode — explicit mapping specified on the command line.
  if (flags.accountId) {
    if (!flags.explicitEmail) {
      console.error('--account requires --email=<user-email>')
      process.exit(1)
    }
    await singleAccount(admin, flags.accountId, flags.explicitEmail, flags.apply)
    return
  }

  // Bulk mode — find every sponsor_account with no user_id and try to
  // reconcile by lowercase email match.
  const { data: rows, error } = await admin
    .from('sponsor_accounts')
    .select('id, company_name, contact_email, user_id, tier, status, created_at')
    .is('user_id', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ failed to load sponsor_accounts:', error)
    process.exit(1)
  }

  const list = (rows ?? []) as SponsorRow[]
  if (list.length === 0) {
    console.log('✅ no sponsor_accounts rows with null user_id — nothing to do')
    return
  }

  console.log(`\nFound ${list.length} sponsor_accounts rows without user_id.\n`)
  if (!flags.apply) console.log('DRY RUN — no writes will happen. Pass --apply to commit.\n')

  let linked = 0
  let ambiguous = 0
  let missing = 0
  let skipped = 0

  for (const row of list) {
    const email = (row.contact_email ?? '').trim().toLowerCase()
    if (!email) {
      console.log(`  · ${row.id} (${row.company_name ?? '—'}): no contact_email — skip`)
      skipped += 1
      continue
    }

    const { data: profiles, error: perr } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', email)
      .limit(2)

    if (perr) {
      console.error(`  ✗ ${row.id} profile lookup error:`, perr.message)
      skipped += 1
      continue
    }

    const matches = (profiles ?? []) as ProfileRow[]
    if (matches.length === 0) {
      console.log(
        `  ? ${row.id} (${row.company_name ?? '—'}) <${email}>: no matching profile`
      )
      missing += 1
      continue
    }
    if (matches.length > 1) {
      console.log(
        `  ! ${row.id} (${row.company_name ?? '—'}) <${email}>: ${matches.length} profiles match — skip`
      )
      ambiguous += 1
      continue
    }

    const target = matches[0]
    console.log(
      `  → ${row.id} (${row.company_name ?? '—'}) <${email}> → profile ${target.id} (${target.full_name ?? '—'})`
    )

    if (flags.apply) {
      const { error: uerr } = await admin
        .from('sponsor_accounts')
        .update({ user_id: target.id })
        .eq('id', row.id)
        .is('user_id', null)
      if (uerr) {
        console.error(`    ✗ update failed:`, uerr.message)
        skipped += 1
        continue
      }
      linked += 1
    } else {
      linked += 1
    }
  }

  console.log('\n— Summary —')
  console.log(`  matched + ${flags.apply ? 'linked' : 'would link'}: ${linked}`)
  console.log(`  no matching profile:                    ${missing}`)
  console.log(`  ambiguous (multiple profiles):          ${ambiguous}`)
  console.log(`  skipped (errors / no email):            ${skipped}`)
  if (!flags.apply) console.log('\n  Re-run with --apply to commit.')
}

async function singleAccount(
  admin: ReturnType<typeof createAdminClient>,
  accountId: string,
  email: string,
  apply: boolean
) {
  const { data: account, error: aerr } = await admin
    .from('sponsor_accounts')
    .select('id, company_name, contact_email, user_id')
    .eq('id', accountId)
    .maybeSingle()
  if (aerr || !account) {
    console.error('❌ account not found:', aerr?.message ?? accountId)
    process.exit(1)
  }

  const { data: profiles, error: perr } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .ilike('email', email)
    .limit(2)
  if (perr) {
    console.error('❌ profile lookup failed:', perr.message)
    process.exit(1)
  }
  const matches = (profiles ?? []) as ProfileRow[]
  if (matches.length === 0) {
    console.error(`❌ no profile found for <${email}>`)
    process.exit(1)
  }
  if (matches.length > 1) {
    console.error(`❌ ${matches.length} profiles match <${email}> — be more specific`)
    process.exit(1)
  }

  const target = matches[0]
  console.log(
    `${apply ? 'Linking' : 'Would link'} ${account.id} (${account.company_name ?? '—'}) → profile ${target.id} <${target.email}>`
  )
  if (account.user_id && account.user_id !== target.id) {
    console.warn(`⚠️  account already linked to user_id=${account.user_id}; aborting`)
    process.exit(1)
  }
  if (!apply) {
    console.log('DRY RUN — pass --apply to commit.')
    return
  }
  const { error: uerr } = await admin
    .from('sponsor_accounts')
    .update({ user_id: target.id })
    .eq('id', account.id)
  if (uerr) {
    console.error('❌ update failed:', uerr.message)
    process.exit(1)
  }
  console.log('✅ linked.')
}

main().catch((e) => {
  console.error('❌ fatal:', e)
  process.exit(1)
})
