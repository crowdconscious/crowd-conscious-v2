/**
 * Scripted Prompt 8 acceptance session (offline).
 * After a scripted sequence of typed events, every indicator shows a value
 * or an honest dash, and cost reconciles with ai_runs.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import {
  CICERON_EVENT_NAMES,
  parseEventProperties,
  recordCiceronEvent,
} from '@/lib/ciceron/events'
import {
  fixtureMetricsDashboard,
  reconcileCostWithAiRuns,
  RATE_SAMPLE_THRESHOLD,
} from '@/lib/ciceron/engagement/metrics-pure'
import { budgetStatusFromSpend } from '@/lib/ciceron/gateway/budget'
import { suggestionForReason } from '@/lib/ciceron/engagement/feedback-loop-pure'
import { formatPolicyCell } from '@/lib/ciceron/audit/policy-labels'

type StoredEvent = {
  name: string
  firm_id: string
  user_id: string
  properties: Record<string, unknown>
}

describe('Prompt 8 scripted acceptance session', () => {
  it('runs a scripted engagement loop and surfaces indicators', async () => {
    const store: StoredEvent[] = []
    const db = {
      from: (table: string) => ({
        insert: async (row: Record<string, unknown>) => {
          if (table === 'events') {
            store.push({
              name: String(row.name),
              firm_id: String(row.firm_id),
              user_id: String(row.user_id),
              properties: (row.properties ?? {}) as Record<string, unknown>,
            })
          }
          return { error: null }
        },
      }),
    }

    const firmId = CICERON_SEED.firmDemo
    const socio = CICERON_SEED.personas.socio
    const asociado = CICERON_SEED.personas.asociado

    const script: Array<Parameters<typeof recordCiceronEvent>[0]> = [
      {
        name: 'invite_redeemed',
        firmId,
        userId: socio,
        properties: { invite_role: 'socio', is_demo: true },
      },
      {
        name: 'session_started',
        firmId,
        userId: socio,
        properties: { surface: 'hoy', is_demo: true },
      },
      {
        name: 'room_opened',
        firmId,
        userId: socio,
        properties: { room: 'hoy', is_demo: true },
      },
      {
        name: 'watch_profile_created',
        firmId,
        userId: socio,
        properties: {
          client_id: CICERON_SEED.clients.nexora,
          is_demo: true,
        },
      },
      {
        name: 'alert_opened',
        firmId,
        userId: asociado,
        properties: {
          match_id: 'e2000000-0000-4000-8000-000000000090',
          is_demo: true,
        },
      },
      {
        name: 'alert_feedback',
        firmId,
        userId: asociado,
        properties: {
          verdict: 'not_relevant',
          reason_code: 'wrong_authority',
          match_id: 'e2000000-0000-4000-8000-000000000091',
          is_demo: true,
        },
      },
      {
        name: 'alert_feedback',
        firmId,
        userId: asociado,
        properties: {
          verdict: 'not_relevant',
          reason_code: 'wrong_authority',
          match_id: 'e2000000-0000-4000-8000-000000000092',
          is_demo: true,
        },
      },
      {
        name: 'alert_feedback',
        firmId,
        userId: asociado,
        properties: {
          verdict: 'not_relevant',
          reason_code: 'wrong_authority',
          match_id: 'e2000000-0000-4000-8000-000000000093',
          is_demo: true,
        },
      },
      {
        name: 'draft_created',
        firmId,
        userId: asociado,
        properties: { output_type: 'client_alert', is_demo: true },
      },
      {
        name: 'review_decided',
        firmId,
        userId: socio,
        properties: {
          decision: 'approved',
          output_type: 'client_alert',
          is_demo: true,
        },
      },
      {
        name: 'delivery_confirmed',
        firmId,
        userId: socio,
        properties: {
          output_type: 'client_alert',
          simulated: true,
          is_demo: true,
        },
      },
      {
        name: 'deadline_confirmed',
        firmId,
        userId: socio,
        properties: {
          matter_id: CICERON_SEED.matters.nexoraCnbv,
          is_demo: true,
        },
      },
      {
        name: 'briefing_opened',
        firmId,
        userId: socio,
        properties: { kind: 'morning', is_demo: true },
      },
      {
        name: 'saved_view_created',
        firmId,
        userId: socio,
        properties: { room: 'monitor-dof', is_demo: true },
      },
    ]

    for (const step of script) {
      const res = await recordCiceronEvent(step, db)
      assert.equal(res.ok, true, `event ${step.name} failed`)
    }

    assert.equal(store.length, script.length)
    for (const name of [
      'session_started',
      'alert_feedback',
      'delivery_confirmed',
      'deadline_confirmed',
    ] as const) {
      assert.ok(store.some((e) => e.name === name))
    }

    // Feedback loop fires at 3× same reason
    const notRelevant = store.filter(
      (e) =>
        e.name === 'alert_feedback' &&
        e.properties.verdict === 'not_relevant' &&
        e.properties.reason_code === 'wrong_authority'
    )
    assert.equal(notRelevant.length, 3)
    assert.ok(suggestionForReason('wrong_authority', 3))

    // Metrics fixture: every indicator is value or dash
    const dash = fixtureMetricsDashboard()
    const cells = [
      dash.overall.activation,
      dash.overall.habit,
      dash.overall.alertPrecision,
      dash.overall.reviewTurnaround,
      dash.overall.valueMoments,
      dash.overall.cost,
    ]
    for (const c of cells) {
      assert.ok(c.display === '—' || c.display.length > 0)
      assert.ok(typeof c.sampleSize === 'number')
    }
    assert.ok(dash.overall.expansion.display.includes('clientes'))

    // Cost reconciles with ai_runs (scripted costs matching fixture week)
    const aiRunCosts = [0.028, 0.004, 0.012, 0.01]
    const costSum = aiRunCosts.reduce((a, b) => a + b, 0)
    assert.equal(reconcileCostWithAiRuns(costSum, aiRunCosts), true)

    // Budget pause at 100%
    const paused = budgetStatusFromSpend(50, 50)
    assert.equal(paused.researchPaused, true)
    assert.match(paused.message ?? '', /Diario Oficial continúa|investigación está en pausa/)

    // Audit labels Spanish
    assert.doesNotMatch(
      formatPolicyCell('four_eyes', 'Editor cannot give final approval on this output type'),
      /Editor cannot/
    )

    // Catalog completeness
    assert.ok(CICERON_EVENT_NAMES.length >= 16)
    assert.equal(
      parseEventProperties('research_asked', { question: 'secreto' }).ok,
      false
    )
    assert.ok(RATE_SAMPLE_THRESHOLD >= 3)
  })

  it('migrations 314–315 exist with rollback and verify', () => {
    for (const n of [314, 315]) {
      const base =
        n === 314
          ? 'supabase/migrations/314_ciceron_engagement'
          : 'supabase/migrations/315_ciceron_engagement_seed'
      assert.match(readFileSync(`${base}.sql`, 'utf8'), /ciceron/)
      assert.match(readFileSync(`${base}.rollback.sql`, 'utf8'), /DROP|DELETE/)
      assert.match(readFileSync(`${base}.verify.sql`, 'utf8'), /BEGIN/)
      assert.match(readFileSync(`${base}.verify.sql`, 'utf8'), /ROLLBACK/)
    }
    const forward = readFileSync(
      'supabase/migrations/314_ciceron_engagement.sql',
      'utf8'
    )
    assert.match(forward, /security_invoker\s*=\s*true/)
    assert.match(forward, /record_product_event/)
    assert.match(forward, /metric_activation/)
    assert.match(forward, /metric_cost_weekly/)
    assert.doesNotMatch(forward, /vercel\.json/i)
    assert.doesNotMatch(forward, /CREATE.*CRON|cron\.schedule|app\/api\/ciceron\/cron/i)
  })
})
