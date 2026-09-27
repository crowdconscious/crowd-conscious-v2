/**
 * Page-gate contract for `/pulse/[id]/simulacion` (Task 3).
 *
 * The page calls `decideReplayAccess` (copied from Task 2 / PR #19) and
 * maps `allow: false` → Next.js `notFound()` (HTTP 404). These tests lock
 * that contract: denied callers must see 404, never 403.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  decideReplayAccess,
  type ReplayAccessInput,
} from './access.ts'
import { isSimViewerPublicClosedEnabled } from './public-closed-flag.ts'

function base(over: Partial<ReplayAccessInput> = {}): ReplayAccessInput {
  return {
    isAdmin: false,
    includeRealParam: false,
    pulseStatus: 'active',
    runRevealedAt: null,
    runIsFixture: false,
    publicClosedEnabled: true,
    ...over,
  }
}

/** What the page does with a denied decision. */
function pageHttpStatus(decision: ReturnType<typeof decideReplayAccess>): number {
  if (!decision.allow) return decision.status
  return 200
}

test('page gate: open pulse + anonymous → 404, not 403', () => {
  const d = decideReplayAccess(base({ pulseStatus: 'active', isAdmin: false }))
  assert.equal(pageHttpStatus(d), 404)
  assert.notEqual(pageHttpStatus(d), 403)
})

test('page gate: open pulse + non-admin → 404, not 403', () => {
  const d = decideReplayAccess(
    base({
      pulseStatus: 'active',
      isAdmin: false,
      runRevealedAt: '2026-09-01T00:00:00.000Z',
      publicClosedEnabled: true,
    }),
  )
  assert.equal(pageHttpStatus(d), 404)
  assert.notEqual(pageHttpStatus(d), 403)
})

test('page gate: resolved + revealed + non-fixture + public ON → 200 (logged-out OK)', () => {
  const d = decideReplayAccess(
    base({
      pulseStatus: 'resolved',
      isAdmin: false,
      runRevealedAt: '2026-09-01T00:00:00.000Z',
      runIsFixture: false,
      publicClosedEnabled: true,
    }),
  )
  assert.equal(d.allow, true)
  assert.equal(pageHttpStatus(d), 200)
})

test('page gate: resolved + fixture + non-admin → 404 (fixtures admin-only)', () => {
  const d = decideReplayAccess(
    base({
      pulseStatus: 'resolved',
      isAdmin: false,
      runRevealedAt: '2026-09-01T00:00:00.000Z',
      runIsFixture: true,
      publicClosedEnabled: true,
    }),
  )
  assert.equal(pageHttpStatus(d), 404)
  assert.notEqual(pageHttpStatus(d), 403)
})

test('page gate: resolved + revealed + SIM_VIEWER_PUBLIC_CLOSED=false → 404', () => {
  const d = decideReplayAccess(
    base({
      pulseStatus: 'resolved',
      isAdmin: false,
      runRevealedAt: '2026-09-01T00:00:00.000Z',
      runIsFixture: false,
      publicClosedEnabled: false,
    }),
  )
  assert.equal(pageHttpStatus(d), 404)
})

test('page gate: status=closed (not resolved) + non-admin → 404', () => {
  // Only exact "resolved" unlocks public replay (Task 2 decision).
  const d = decideReplayAccess(
    base({
      pulseStatus: 'closed',
      isAdmin: false,
      runRevealedAt: '2026-09-01T00:00:00.000Z',
      publicClosedEnabled: true,
    }),
  )
  assert.equal(pageHttpStatus(d), 404)
})

test('page gate: admin + open + fixture → 200', () => {
  const d = decideReplayAccess(
    base({
      pulseStatus: 'active',
      isAdmin: true,
      runIsFixture: true,
      runRevealedAt: null,
    }),
  )
  assert.equal(pageHttpStatus(d), 200)
})

test('isSimViewerPublicClosedEnabled defaults ON when unset', () => {
  const prev = process.env.SIM_VIEWER_PUBLIC_CLOSED
  delete process.env.SIM_VIEWER_PUBLIC_CLOSED
  try {
    assert.equal(isSimViewerPublicClosedEnabled(), true)
  } finally {
    if (prev === undefined) delete process.env.SIM_VIEWER_PUBLIC_CLOSED
    else process.env.SIM_VIEWER_PUBLIC_CLOSED = prev
  }
})
