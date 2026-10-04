/**
 * Shared filters that keep stand-only Pulses out of public discovery.
 *
 * Direct `/pulse/[id]` pages, OG images, voting, results, simulations and
 * reports stay reachable — only list/feed/sitemap/search/newsletter surfaces
 * apply this filter.
 *
 * PostgREST note: a plain `.not('tags', 'cs', '{stand-only}')` drops rows
 * where `tags` is NULL. The null-safe `or=` form keeps those rows:
 *   tags IS NULL OR tags does not contain stand-only
 *
 * Negation inside `or()` must be `column.not.op.value` (e.g. `tags.not.cs.{…}`).
 * Prefix form `not.tags.cs.{…}` is invalid (PGRST100) and empties every list.
 */

export const STAND_ONLY_TAG = 'stand-only'

/** PostgREST `or=` filter value for excludeStandOnly. */
export const STAND_ONLY_EXCLUDE_OR = `tags.is.null,tags.not.cs.{${STAND_ONLY_TAG}}`

/**
 * Apply the null-safe stand-only exclusion to a Supabase query builder.
 * Safe to chain after other `.or()` filters — PostgREST ANDs filter groups.
 */
export function excludeStandOnly<T extends { or: (filters: string) => T }>(query: T): T {
  return query.or(STAND_ONLY_EXCLUDE_OR)
}

/** JS predicate for post-filtering rows that already include `tags`. */
export function isStandOnly(tags: string[] | null | undefined): boolean {
  return Array.isArray(tags) && tags.includes(STAND_ONLY_TAG)
}
