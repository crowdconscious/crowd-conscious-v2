/**
 * Public-slug minting for Citizen Signals.
 *
 * We stamp a short, URL-safe slug at create time so /signals/[slug] is
 * shareable from the moment the moderator approves the row. The slug
 * combines a base derived from the title with a 5-char random suffix so
 * collisions are vanishingly unlikely without a server-side uniqueness
 * loop. The DB still has UNIQUE(public_slug) so worst case we retry.
 */

function baseSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'signal'
}

function randomSuffix(length = 5): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789' // no l, i, o, 0, 1
  let out = ''
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

export function mintSignalSlug(title: string): string {
  return `${baseSlug(title)}-${randomSuffix()}`
}
