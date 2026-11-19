#!/usr/bin/env tsx
/**
 * A3 — scan lawyer-facing Cicerón copy for developer / English wording.
 * Scans the copy module, label helper outputs, persona/firm display names,
 * and bulletin-number display. Fails on snake_case, lowercase tier|token|demo,
 * capital «Demo» in names, «-DEMO» tokens, or listed English words outside
 * fenced code blocks.
 *
 * Usage: npm run ciceron:scan-wording
 */

import { bulletinNumberDisplay } from '../../lib/ciceron/boletines/bulletin-number-display'
import { copy } from '../../lib/ciceron/copy/es-MX'
import {
  auditActionLabel,
  computationDisplayText,
  eventTypeLabel,
  failureStageLabel,
  hitReasonLabel,
  sourceTierLabel,
} from '../../lib/ciceron/copy/labels'
import { CICERON_FIRM_NAME } from '../../lib/ciceron/config'
import {
  FIRM_DISPLAY_NAME,
  PERSONA_DISPLAY_NAMES,
} from '../../lib/ciceron/demo/display-names'

const ENGLISH_WORDS = [
  'database',
  'fixture',
  'cloudflare',
  'captcha',
  'failure',
  'match',
  'token',
  'tier',
  'pipeline',
  'parser',
  'endpoint',
  'payload',
  'schema',
  'undefined',
  'debug',
  'stub',
  'mock',
  'fallback',
  'null',
]

type Finding = { where: string; token: string; excerpt: string }

function collectCopyStrings(value: unknown, path: string, out: { path: string; text: string }[]): void {
  if (typeof value === 'string') {
    out.push({ path, text: value })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectCopyStrings(v, `${path}[${i}]`, out))
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      collectCopyStrings(v, path ? `${path}.${k}` : k, out)
    }
  }
}

function stripCodeBlocks(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '\n')
}

function scanText(text: string, where: string, findings: Finding[]): void {
  const cleaned = stripCodeBlocks(text)

  // Lowercase whole-word tier / token / demo
  for (const word of ['tier', 'token', 'demo'] as const) {
    const re = new RegExp(`(^|[^A-Za-zÁÉÍÓÚáéíóúÑñ])${word}([^A-Za-zÁÉÍÓÚáéíóúÑñ]|$)`)
    if (re.test(cleaned)) {
      findings.push({ where, token: word, excerpt: cleaned.slice(0, 140) })
    }
  }

  // Capital «Demo» inside names / labels (not «demostración»)
  if (/\bDemo\b/.test(cleaned)) {
    findings.push({ where, token: 'Demo', excerpt: cleaned.slice(0, 140) })
  }

  // Internal publication tokens like QRO-DEMO / CDMX-DEMO-512
  if (/-DEMO\b/i.test(cleaned) || /\bDEMO-/i.test(cleaned)) {
    const m = cleaned.match(/[A-Z0-9_-]*DEMO[A-Z0-9_-]*/i)
    findings.push({
      where,
      token: m?.[0] ?? '-DEMO',
      excerpt: cleaned.slice(0, 140),
    })
  }

  const snake = cleaned.match(/\b[a-z]+(?:_[a-z0-9]+)+\b/g) ?? []
  for (const token of snake) {
    findings.push({ where, token, excerpt: cleaned.slice(0, 140) })
  }

  for (const word of ENGLISH_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, 'i')
    if (re.test(cleaned)) {
      findings.push({ where, token: word, excerpt: cleaned.slice(0, 140) })
    }
  }
}

function main(): number {
  const findings: Finding[] = []
  const leaves: { path: string; text: string }[] = []
  collectCopyStrings(copy, 'copy', leaves)

  for (const leaf of leaves) {
    scanText(leaf.text, leaf.path, findings)
  }

  const rendered: { where: string; text: string }[] = [
    { where: 'label:tier:A', text: sourceTierLabel('A') },
    { where: 'label:tier:not_verified', text: sourceTierLabel('not_verified') },
    { where: 'label:failure:fetch', text: failureStageLabel('fetch')! },
    {
      where: 'label:failure:manual_required',
      text: failureStageLabel('manual_required')!,
    },
    {
      where: 'label:reason:possible',
      text: hitReasonLabel({
        matchKind: 'possible',
        partyVariant: 'Fondo Pedregal Inmuebles',
      }),
    },
    {
      where: 'label:reason:exact',
      text: hitReasonLabel({
        matchKind: 'exact',
        expedienteNumber: '512/2026',
        courtName: 'Juzgado 32 Civil',
      }),
    },
    {
      where: 'label:eventType',
      text: eventTypeLabel('notificacion_demanda'),
    },
    {
      where: 'label:auditAction',
      text: auditActionLabel('view_client_material'),
    },
    {
      where: 'label:computation',
      text: computationDisplayText(
        'Regla: notificacion_demanda · 15 días hábiles → vence 2026-11-14.'
      ),
    },
    { where: 'config:firmName', text: CICERON_FIRM_NAME },
    { where: 'display:firm', text: FIRM_DISPLAY_NAME },
    ...Object.entries(PERSONA_DISPLAY_NAMES).map(([id, name]) => ({
      where: `display:persona:${id.slice(0, 8)}`,
      text: name,
    })),
    {
      where: 'bulletin:QRO-DEMO',
      text: bulletinNumberDisplay('QRO-DEMO') ?? '',
    },
    {
      where: 'bulletin:CDMX-DEMO-512',
      text: bulletinNumberDisplay('CDMX-DEMO-512') ?? '',
    },
    {
      where: 'bulletin:MEX-LISTA-DEMO',
      text: bulletinNumberDisplay('MEX-LISTA-DEMO') ?? '',
    },
    {
      where: 'bulletin:GRO-DEMO',
      text: bulletinNumberDisplay('GRO-DEMO') ?? '',
    },
  ]

  for (const r of rendered) {
    scanText(r.text, r.where, findings)
  }

  const key = (f: Finding) => `${f.where}::${f.token}::${f.excerpt}`
  const bad = [...new Map(findings.map((f) => [key(f), f])).values()]

  if (bad.length) {
    console.error(
      'Cicerón wording scan FAILED — lawyer-facing text has forbidden tokens:\n'
    )
    for (const f of bad.slice(0, 60)) {
      console.error(`  ${f.where}  [${f.token}]  ${f.excerpt}`)
    }
    if (bad.length > 60) console.error(`  … and ${bad.length - 60} more`)
    console.error(`\nTotal findings: ${bad.length}`)
    return 1
  }

  console.log(
    `Cicerón wording scan OK — checked ${leaves.length} copy strings and ${rendered.length} rendered labels.`
  )
  return 0
}

process.exit(main())
