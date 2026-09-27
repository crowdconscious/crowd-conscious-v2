import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  decideReplayAccess,
  isPulseResolvedForViewer,
  toSimulationPulseStatus,
  type ReplayAccessInput,
} from './access.ts'

function base(over: Partial<ReplayAccessInput> = {}): ReplayAccessInput {
  return {
    isAdmin: false,
    includeRealParam: false,
    pulseStatus: 'active',
    runRevealedAt: null,
    runIsFixture: false,
    publicClosedEnabled: false,
    ...over,
  }
}

test('isPulseResolvedForViewer: only exact "resolved"', () => {
  assert.equal(isPulseResolvedForViewer('resolved'), true)
  assert.equal(isPulseResolvedForViewer('active'), false)
  assert.equal(isPulseResolvedForViewer('draft'), false)
  assert.equal(isPulseResolvedForViewer('cancelled'), false)
  assert.equal(isPulseResolvedForViewer('closed'), false)
})

test('toSimulationPulseStatus maps resolved→closed, else→open', () => {
  assert.equal(toSimulationPulseStatus('resolved'), 'closed')
  assert.equal(toSimulationPulseStatus('active'), 'open')
  assert.equal(toSimulationPulseStatus('draft'), 'open')
})

// ---------------------------------------------------------------------------
// Open pulse + non-admin → 404 (not 403)
// ---------------------------------------------------------------------------

test('open (active) pulse + anonymous → 404, not 403', () => {
  const d = decideReplayAccess(base({ pulseStatus: 'active', isAdmin: false }))
  assert.equal(d.allow, false)
  if (!d.allow) {
    assert.equal(d.status, 404)
    assert.notEqual(d.status, 403)
  }
})

test('open (active) pulse + non-admin authenticated → 404, not 403', () => {
  const d = decideReplayAccess(
    base({
      pulseStatus: 'active',
      isAdmin: false,
      // public switch on would not matter — status is not resolved
      publicClosedEnabled: true,
      runRevealedAt: '2026-09-01T00:00:00.000Z',
    }),
  )
  assert.equal(d.allow, false)
  if (!d.allow) assert.equal(d.status, 404)
})

test('draft / cancelled / trading pulse + non-admin → 404', () => {
  for (const status of ['draft', 'cancelled', 'trading', 'proposed', 'disputed']) {
    const d = decideReplayAccess(
      base({
        pulseStatus: status,
        isAdmin: false,
        publicClosedEnabled: true,
        runRevealedAt: '2026-09-01T00:00:00.000Z',
      }),
    )
    assert.equal(d.allow, false, `expected deny for status=${status}`)
    if (!d.allow) assert.equal(d.status, 404)
  }
})

// ---------------------------------------------------------------------------
// Admin → 200 (allow)
// ---------------------------------------------------------------------------

test('admin + open pulse → allow, realAggregates null', () => {
  const d = decideReplayAccess(
    base({ pulseStatus: 'active', isAdmin: true, includeRealParam: false }),
  )
  assert.equal(d.allow, true)
  if (d.allow) {
    assert.equal(d.includeRealAggregates, false)
    assert.equal(d.cachePublic, false)
  }
})

test('admin + open pulse + includeReal=1 → allow with realAggregates', () => {
  const d = decideReplayAccess(
    base({ pulseStatus: 'active', isAdmin: true, includeRealParam: true }),
  )
  assert.equal(d.allow, true)
  if (d.allow) assert.equal(d.includeRealAggregates, true)
})

test('admin + fixture run on open pulse → allow', () => {
  const d = decideReplayAccess(
    base({ pulseStatus: 'active', isAdmin: true, runIsFixture: true }),
  )
  assert.equal(d.allow, true)
})

test('admin + resolved pulse → allow with realAggregates', () => {
  const d = decideReplayAccess(
    base({
      pulseStatus: 'resolved',
      isAdmin: true,
      runRevealedAt: null, // admin ignores reveal gate
    }),
  )
  assert.equal(d.allow, true)
  if (d.allow) assert.equal(d.includeRealAggregates, true)
})

// ---------------------------------------------------------------------------
// Resolved + non-admin → 404 while public switch is off
// ---------------------------------------------------------------------------

test('resolved + non-admin + public switch OFF → 404', () => {
  const d = decideReplayAccess(
    base({
      pulseStatus: 'resolved',
      isAdmin: false,
      publicClosedEnabled: false,
      runRevealedAt: '2026-09-01T00:00:00.000Z',
      runIsFixture: false,
    }),
  )
  assert.equal(d.allow, false)
  if (!d.allow) assert.equal(d.status, 404)
})

test('resolved + non-admin + public switch ON + revealed → allow', () => {
  const d = decideReplayAccess(
    base({
      pulseStatus: 'resolved',
      isAdmin: false,
      publicClosedEnabled: true,
      runRevealedAt: '2026-09-01T00:00:00.000Z',
      runIsFixture: false,
    }),
  )
  assert.equal(d.allow, true)
  if (d.allow) {
    assert.equal(d.includeRealAggregates, true)
    assert.equal(d.cachePublic, true)
  }
})

// ---------------------------------------------------------------------------
// Stricter of status ↔ revealed_at
// ---------------------------------------------------------------------------

test('resolved but revealed_at null + non-admin → 404 (stricter)', () => {
  const d = decideReplayAccess(
    base({
      pulseStatus: 'resolved',
      isAdmin: false,
      publicClosedEnabled: true,
      runRevealedAt: null,
    }),
  )
  assert.equal(d.allow, false)
  if (!d.allow) assert.equal(d.status, 404)
})

test('revealed_at set but status active + non-admin → 404 (stricter)', () => {
  const d = decideReplayAccess(
    base({
      pulseStatus: 'active',
      isAdmin: false,
      publicClosedEnabled: true,
      runRevealedAt: '2026-09-01T00:00:00.000Z',
    }),
  )
  assert.equal(d.allow, false)
  if (!d.allow) assert.equal(d.status, 404)
})

// ---------------------------------------------------------------------------
// Fixture runs are admin-only
// ---------------------------------------------------------------------------

test('fixture run + non-admin even when resolved/public → 404', () => {
  const d = decideReplayAccess(
    base({
      pulseStatus: 'resolved',
      isAdmin: false,
      publicClosedEnabled: true,
      runRevealedAt: '2026-09-01T00:00:00.000Z',
      runIsFixture: true,
    }),
  )
  assert.equal(d.allow, false)
  if (!d.allow) assert.equal(d.status, 404)
})
