/**
 * Repo-wide CI guard: Cicéron module must not call judiciary portals
 * or Microsoft Graph / login domains (Prompt 6 — demo honesty + rule 9).
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const ROOTS = ['lib/ciceron', 'app/ciceron']

/** Domains that must never appear as request targets in Cicéron module source. */
const FORBIDDEN = [
  // Judiciary / case-file portals (non-exhaustive; extend carefully — no exploit detail)
  'cjf.gob.mx',
  'pjenl.gob.mx',
  'poderjudicialcdmx.gob.mx',
  'scjn.gob.mx',
  'tfja.gob.mx',
  'servicios.pjf.gob.mx',
  'sise.pjf.gob.mx',
  // Microsoft Graph / identity (simulated M365 must stay offline)
  'graph.microsoft.com',
  'login.microsoftonline.com',
  'login.microsoft.com',
  'outlook.office.com',
  'outlook.office365.com',
  'microsoftonline.com',
]

const ALLOWED_MENTION_FILES = new Set([
  // This test file lists the domains on purpose
  'lib/ciceron/case-files/network-guard.test.ts',
])

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const e of entries) {
    if (e === 'node_modules' || e.startsWith('.')) continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|js|jsx|mjs|cjs|md|sql)$/.test(e)) out.push(p)
  }
  return out
}

function isAllowedMention(file: string, line: string): boolean {
  const rel = file.replace(/\\/g, '/')
  if (ALLOWED_MENTION_FILES.has(rel)) return true
  // Comments / docs that forbid the domains are OK if they don't construct a URL fetch
  const trimmed = line.trim()
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
    return true
  }
  // DECISIONS / PLAN prose
  if (file.includes('docs/ciceron/')) return true
  // Public bulletin landings (rule 9b) — adapters, demo board, registry seeds.
  // Still forbids Graph/login hosts AND federal judiciary hosts (rule 9).
  if (
    rel.includes('/boletines/') ||
    rel.includes('boletines-run.ts') ||
    rel.includes('boletines-probe.ts') ||
    /supabase\/migrations\/\d+_ciceron_boletines/.test(rel)
  ) {
    if (
      /graph\.microsoft\.com|login\.microsoft|outlook\.office|microsoftonline\.com/i.test(
        line
      )
    ) {
      return false
    }
    if (
      /cjf\.gob\.mx|scjn\.gob\.mx|sise\.pjf\.gob\.mx|servicios\.pjf\.gob\.mx|tfja\.gob\.mx/i.test(
        line
      )
    ) {
      return false
    }
    return true
  }
  return false
}

describe('ciceron network domain guard', () => {
  it('fails if module source targets judiciary or Microsoft identity/Graph hosts', () => {
    const files = ROOTS.flatMap((r) => walk(r))
    const violations: string[] = []

    for (const file of files) {
      const rel = file.replace(/\\/g, '/')
      const text = readFileSync(file, 'utf8')
      const lines = text.split(/\n/)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!
        for (const domain of FORBIDDEN) {
          if (!line.toLowerCase().includes(domain.toLowerCase())) continue
          if (isAllowedMention(rel, line)) continue
          // Flag URL-like or fetch/host constructions
          if (
            /https?:\/\//i.test(line) ||
            /fetch\s*\(/i.test(line) ||
            /new\s+URL/i.test(line) ||
            /host\s*[:=]/i.test(line) ||
            /baseUrl/i.test(line)
          ) {
            violations.push(`${rel}:${i + 1}: ${domain} — ${line.trim().slice(0, 120)}`)
          } else if (!line.trim().startsWith('//') && !line.includes('FORBIDDEN') && !line.includes('not enabled')) {
            // Bare domain string literals in code (not comments) are also banned
            if (line.includes(`'${domain}'`) || line.includes(`"${domain}"`) || line.includes(`\`${domain}`)) {
              violations.push(`${rel}:${i + 1}: ${domain} — ${line.trim().slice(0, 120)}`)
            }
          }
        }
      }
    }

    assert.equal(
      violations.length,
      0,
      `Forbidden judiciary/Microsoft domains in Cicéron module:\n${violations.join('\n')}`
    )
  })
})
