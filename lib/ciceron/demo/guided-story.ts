/**
 * Prompt 9 guided story — max 6 steps, dismissible, resumable.
 * Progress via update_guided_story RPC + engagement_resume labels.
 */

import 'server-only'

import { cookies } from 'next/headers'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { hashSessionToken, isSessionTokenShape } from '@/lib/ciceron/demo/invite-hash'
import type { DemoSession } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'
import { setResumeCursor } from '@/lib/ciceron/engagement/resume'
import {
  GUIDED_STORY_STEPS,
  guidedStepHref,
  type GuidedStoryState,
  type GuidedStoryStep,
} from '@/lib/ciceron/demo/guided-story-pure'

const OFFLINE_STORY_COOKIE = 'ciceron_guided_story'

export type { GuidedStoryState, GuidedStoryStep }
export { GUIDED_STORY_STEPS, guidedStepHref }

export function guidedStepCopy(step: GuidedStoryStep) {
  const s = copy.guidedStory.steps
  switch (step) {
    case 1:
      return s[1]
    case 2:
      return s[2]
    case 3:
      return s[3]
    case 4:
      return s[4]
    case 5:
      return s[5]
    case 6:
      return s[6]
    case 7:
      return copy.guidedStory.finale
    default:
      return s[1]
  }
}

const OFFLINE_STATE: GuidedStoryState = {
  currentStep: 1,
  completedSteps: [],
  dismissed: false,
  completed: false,
}

async function readOfflineStoryCookie(): Promise<GuidedStoryState> {
  const jar = await cookies()
  const raw = jar.get(OFFLINE_STORY_COOKIE)?.value
  if (!raw) return OFFLINE_STATE
  try {
    const parsed = JSON.parse(raw) as Partial<GuidedStoryState>
    if (parsed.dismissed) return { ...OFFLINE_STATE, dismissed: true }
    const currentStep = Number(parsed.currentStep ?? 1) as GuidedStoryStep
    return {
      currentStep: currentStep >= 1 && currentStep <= 7 ? currentStep : 1,
      completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [],
      dismissed: false,
      completed: Boolean(parsed.completed) || currentStep >= 7,
    }
  } catch {
    return OFFLINE_STATE
  }
}

async function writeOfflineStoryCookie(state: GuidedStoryState): Promise<void> {
  const jar = await cookies()
  if (state.dismissed) {
    jar.set(OFFLINE_STORY_COOKIE, JSON.stringify({ dismissed: true }), {
      path: '/ciceron',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
      httpOnly: true,
    })
    return
  }
  jar.set(OFFLINE_STORY_COOKIE, JSON.stringify(state), {
    path: '/ciceron',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
    httpOnly: true,
  })
}

export async function loadGuidedStory(
  session: DemoSession
): Promise<GuidedStoryState> {
  if (session.storyDismissed) {
    return { ...OFFLINE_STATE, dismissed: true }
  }
  if (session.offline || !session.sessionId) {
    return readOfflineStoryCookie()
  }
  const db = tryCreateCiceronAdminClient()
  if (!db) return OFFLINE_STATE
  try {
    const { data } = await db
      .from('guided_story_progress')
      .select('current_step, completed_steps, dismissed, completed_at')
      .eq('session_id', session.sessionId)
      .limit(1)
    const row = Array.isArray(data) ? data[0] : null
    if (!row) return OFFLINE_STATE
    const currentStep = Number(row.current_step) as GuidedStoryStep
    const completedSteps = Array.isArray(row.completed_steps)
      ? (row.completed_steps as number[])
      : []
    return {
      currentStep: currentStep >= 1 && currentStep <= 7 ? currentStep : 1,
      completedSteps,
      dismissed: Boolean(row.dismissed),
      completed: Boolean(row.completed_at) || currentStep >= 7,
    }
  } catch {
    return OFFLINE_STATE
  }
}

export async function advanceGuidedStory(
  session: DemoSession,
  step: GuidedStoryStep,
  opts?: { dismiss?: boolean; resume?: boolean }
): Promise<GuidedStoryState> {
  if (opts?.dismiss) {
    if (session.offline || !isSessionTokenShape(session.token)) {
      const dismissed = { ...OFFLINE_STATE, dismissed: true }
      await writeOfflineStoryCookie(dismissed)
      return dismissed
    }
    const db = tryCreateCiceronAdminClient()
    if (db) {
      await db.rpc('update_guided_story', {
        p_token_hash: hashSessionToken(session.token),
        p_step: 1,
        p_dismiss: true,
      })
    }
    await recordCiceronEvent({
      name: 'guided_story_step',
      firmId: session.persona.firmId,
      userId: session.persona.id,
      properties: {
        step: 'dismiss',
        story_action: 'dismiss',
        is_demo: true,
      },
    })
    return { ...OFFLINE_STATE, dismissed: true }
  }

  if (opts?.resume) {
    if (session.offline || !isSessionTokenShape(session.token)) {
      const resumed = { ...OFFLINE_STATE, dismissed: false, currentStep: 1 }
      await writeOfflineStoryCookie(resumed)
      return resumed
    }
    const db = tryCreateCiceronAdminClient()
    if (db) {
      // p_dismiss=false clears dismissed flags (see migration 321 resume fix)
      await db.rpc('update_guided_story', {
        p_token_hash: hashSessionToken(session.token),
        p_step: Math.min(Math.max(Number(step) || 1, 1), 6),
        p_dismiss: false,
      })
    }
    await recordCiceronEvent({
      name: 'guided_story_step',
      firmId: session.persona.firmId,
      userId: session.persona.id,
      properties: {
        step: String(step),
        story_action: 'resume',
        is_demo: true,
      },
    })
    return loadGuidedStory({ ...session, storyDismissed: false })
  }

  const labelCode =
    `guided_step_${Math.min(Number(step), 6)}` as
      | 'guided_step_1'
      | 'guided_step_2'
      | 'guided_step_3'
      | 'guided_step_4'
      | 'guided_step_5'
      | 'guided_step_6'
  await setResumeCursor(session.persona, {
    room: 'hoy',
    href: guidedStepHref(step),
    labelCode,
  }).catch(() => undefined)

  await recordCiceronEvent({
    name: 'guided_story_step',
    firmId: session.persona.firmId,
    userId: session.persona.id,
    properties: {
      step: String(step),
      story_action: 'advance',
      is_demo: true,
    },
  })

  if (session.offline || !isSessionTokenShape(session.token)) {
    const completedSteps = GUIDED_STORY_STEPS.filter((s) => s <= Math.min(step, 6))
    const next: GuidedStoryState = {
      currentStep: step,
      completedSteps: [...completedSteps],
      dismissed: false,
      completed: step >= 7,
    }
    await writeOfflineStoryCookie(next)
    return next
  }

  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return {
      currentStep: step,
      completedSteps: [],
      dismissed: false,
      completed: step >= 7,
    }
  }

  const { data } = await db.rpc('update_guided_story', {
    p_token_hash: hashSessionToken(session.token),
    p_step: step,
    p_dismiss: false,
  })
  const row = data as Record<string, unknown> | null
  if (!row || row.ok === false) {
    return {
      currentStep: step,
      completedSteps: [],
      dismissed: false,
      completed: step >= 7,
    }
  }
  const completedSteps = Array.isArray(row.completed_steps)
    ? (row.completed_steps as number[])
    : []
  return {
    currentStep: Number(row.current_step) as GuidedStoryStep,
    completedSteps,
    dismissed: false,
    completed: Boolean(row.completed),
  }
}
