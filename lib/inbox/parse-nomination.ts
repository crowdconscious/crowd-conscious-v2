/**
 * Conscious Inbox: structured-description parser.
 *
 * Sponsor-side nominations (POSTed to /api/inbox/nominate as
 * `type=cause_suggestion_municipal`) build a description like:
 *
 *   Organization: <name>
 *   Website: <url>
 *   Email: <optional>
 *
 *   <free-form "why" narrative>
 *
 *   Sponsor account: <sponsor_accounts.id>
 *
 * Consumer-side nominations (Submit Idea form) write a free-form description
 * with no structured prefix.
 *
 * `parseNominationDescription` recovers the structured fields when present
 * so the Promote-to-Cause modal can pre-fill organization / website /
 * suggested_by_sponsor_id correctly, and so the cause's description is the
 * narrative only — never the audit-trail metadata.
 *
 * Always returns a usable shape: even pure free-form descriptions return
 * `{ narrative: <whole string> }`.
 */
export interface ParsedNomination {
  organization: string | null
  website_url: string | null
  email: string | null
  suggested_by_sponsor_id: string | null
  /**
   * The user-written reason. Strips the metadata header, the blank
   * separator line, and any trailing "Sponsor account: <id>" stamp.
   */
  narrative: string
}

const META_KEYS = ['Organization', 'Website', 'Email'] as const

/** UUID v1-v5 shape, lowercase or uppercase. Matches what `gen_random_uuid()` emits. */
const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

export function parseNominationDescription(
  raw: string | null | undefined
): ParsedNomination {
  const text = (raw ?? '').replace(/\r\n/g, '\n').trim()
  if (!text) {
    return {
      organization: null,
      website_url: null,
      email: null,
      suggested_by_sponsor_id: null,
      narrative: '',
    }
  }

  let organization: string | null = null
  let website: string | null = null
  let email: string | null = null
  let sponsorId: string | null = null

  // Pull the trailing "Sponsor account: <uuid>" stamp out first so it never
  // leaks into the narrative regardless of where it sits in the body.
  const sponsorMatch = text.match(/^Sponsor account:\s*(.+)$/m)
  if (sponsorMatch) {
    const candidate = sponsorMatch[1].trim()
    const u = candidate.match(UUID_RE)
    if (u) sponsorId = u[0].toLowerCase()
  }

  // Walk the leading lines while they look like `Key: value` for the keys
  // we know about. As soon as we hit a non-meta line (or a blank), the rest
  // is the narrative.
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i += 1
      // A single blank line is the separator between metadata and narrative.
      // Don't keep eating blanks here — they'll be trimmed by the join below.
      break
    }
    const m = line.match(/^([A-Za-z][A-Za-z _-]+):\s*(.+)$/)
    if (!m) break
    const key = m[1].trim()
    const value = m[2].trim()
    if (!META_KEYS.includes(key as (typeof META_KEYS)[number])) break
    if (key === 'Organization') organization = organization ?? value
    else if (key === 'Website') website = website ?? value
    else if (key === 'Email') email = email ?? value
    i += 1
  }

  const remaining = lines
    .slice(i)
    // Drop the trailing "Sponsor account: ..." line wherever it lands.
    .filter((line) => !/^Sponsor account:/i.test(line.trim()))
    .join('\n')
    .trim()

  const narrative = remaining || text // fall back to full text if we mis-parsed
  return {
    organization,
    website_url: website,
    email,
    suggested_by_sponsor_id: sponsorId,
    narrative,
  }
}
