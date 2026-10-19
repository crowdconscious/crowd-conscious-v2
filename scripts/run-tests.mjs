#!/usr/bin/env node
// Runs every *.test.ts under lib/, app/ and scripts/geo/ with node:test via tsx.
// A file list (not a glob) keeps it working on Node 20, which lacks --test globs.
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const roots = ['lib', 'app', 'scripts/geo']
const files = []
function walk(dir) {
  let entries
  try { entries = readdirSync(dir) } catch { return }
  for (const e of entries) {
    if (e === 'node_modules' || e.startsWith('.')) continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p)
    else if (p.endsWith('.test.ts')) files.push(p)
  }
}
roots.forEach(walk)
if (!files.length) { console.error('no test files found'); process.exit(1) }
const r = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files.sort()], { stdio: 'inherit' })
process.exit(r.status ?? 1)
