/**
 * Demo invite sessions are ciceron.demo_personas, not auth.users.
 * Write companion *_persona columns and leave auth.users FK columns NULL.
 * Real signed-in lawyers (future) write the auth.users column instead.
 */

export type AuthActorWrite = {
  mode: 'auth'
  userId: string
}

export type PersonaActorWrite = {
  mode: 'persona'
  personaId: string
}

export type ActorWrite = AuthActorWrite | PersonaActorWrite

/** Current Cicéron invite path is always a demo persona. */
export function demoPersonaActor(personaId: string): PersonaActorWrite {
  return { mode: 'persona', personaId }
}

export function deadlineConfirmColumns(actor: ActorWrite): {
  confirmed_by: string | null
  confirmed_by_persona: string | null
} {
  if (actor.mode === 'auth') {
    return { confirmed_by: actor.userId, confirmed_by_persona: null }
  }
  return { confirmed_by: null, confirmed_by_persona: actor.personaId }
}

export function deadlineDiscardColumns(actor: ActorWrite): {
  discarded_by: string | null
  discarded_by_persona: string | null
} {
  if (actor.mode === 'auth') {
    return { discarded_by: actor.userId, discarded_by_persona: null }
  }
  return { discarded_by: null, discarded_by_persona: actor.personaId }
}

export function reviewAssigneeColumns(actor: ActorWrite): {
  assignee_id: string | null
  assignee_persona: string | null
} {
  if (actor.mode === 'auth') {
    return { assignee_id: actor.userId, assignee_persona: null }
  }
  return { assignee_id: null, assignee_persona: actor.personaId }
}

export function notifyApproveColumns(actor: ActorWrite): {
  approved_by: string | null
  approved_by_persona: string | null
} {
  if (actor.mode === 'auth') {
    return { approved_by: actor.userId, approved_by_persona: null }
  }
  return { approved_by: null, approved_by_persona: actor.personaId }
}

export function notifyCreatedByColumns(actor: ActorWrite): {
  created_by: string | null
  created_by_persona: string | null
} {
  if (actor.mode === 'auth') {
    return { created_by: actor.userId, created_by_persona: null }
  }
  return { created_by: null, created_by_persona: actor.personaId }
}

export function integrationConnectedByColumns(actor: ActorWrite): {
  connected_by: string | null
  connected_by_persona: string | null
} {
  if (actor.mode === 'auth') {
    return { connected_by: actor.userId, connected_by_persona: null }
  }
  return { connected_by: null, connected_by_persona: actor.personaId }
}
