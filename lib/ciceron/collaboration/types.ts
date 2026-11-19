/** Types for DOF match assignments + comments (migration 331). */

export type MatchAssignmentStatus = 'pendiente' | 'en_curso' | 'hecho'

export type MatchAssignment = {
  id: string
  firmId: string
  matchId: string
  matterId: string
  assigneeActor: string
  assignedByActor: string
  dueAt: string | null
  status: MatchAssignmentStatus
  isDemo: boolean
  createdAt: string
  updatedAt: string
  /** Joined display fields (optional). */
  matchTitle?: string
  clientName?: string
  matterTitle?: string
  assigneeName?: string
}

export type MatchComment = {
  id: string
  firmId: string
  matchId: string
  matterId: string
  authorActor: string
  body: string
  mentions: string[]
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
  isDemo: boolean
  authorName?: string
}

export type FirmMemberOption = {
  id: string
  displayName: string
  role: string
}

export type MatterOption = {
  id: string
  title: string
  clientId: string
}

export type CollabRpcResult =
  | { ok: true; id?: string }
  | { ok: false; policyId: string; policyReason: string }
