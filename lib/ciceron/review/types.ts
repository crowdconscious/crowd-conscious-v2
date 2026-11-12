export type ReviewTab = 'mine' | 'matters' | 'all'

export type ReviewInboxItem = {
  id: string
  title: string
  clientName: string
  clientId: string
  matterId: string
  matterTitle: string
  assigneeId: string | null
  assigneeName: string
  dueAt: string | null
  overdue: boolean
  status: 'pendiente' | 'en_curso' | 'cerrado'
  outputType: string | null
  isDemo: boolean
}

export type ReviewEvidence = {
  id: string
  authority: string
  title: string | null
  passage: string
  matchReason: string
  href: string | null
}

export type ReviewTaskDetail = ReviewInboxItem & {
  draftId: string | null
  aiOutputId: string | null
  modelBody: string
  currentBody: string
  modelVersionId: string | null
  currentVersionId: string | null
  humanEditAuthorId: string | null
  fourEyesOn: boolean
  aiRun: {
    model: string
    promptVersion: string
    purpose: string
    createdAt: string
  } | null
  evidence: ReviewEvidence[]
  clientContext: string
  decisionId: string | null
  closed: boolean
}

export type AuditViewerRow = {
  id: string
  createdAt: string
  actorName: string
  actorId: string | null
  action: string
  entityType: string
  entityId: string | null
  outcome: 'allowed' | 'denied'
  policyId: string | null
  policyReason: string | null
  snapshotHref: string | null
}

export type DeliveryPreview = {
  taskId: string
  aiOutputId: string
  matterId: string
  recipient: string
  subject: string
  body: string
  channel: string
  isSimulated: boolean
  clientName: string
}
