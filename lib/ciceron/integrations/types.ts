/** Shared workspace integration provider interface (Microsoft 365 / Google). */

export type WorkspaceProviderId = 'microsoft365' | 'google_workspace'

export type WorkspaceConnectionStatus = 'disconnected' | 'connected'

export type MailDraftInput = {
  toEmail: string
  subject: string
  body: string
}

export type MailDraftResult =
  | { ok: true; draftId: string; mode: 'draft_only' }
  | { ok: false; reason: string }

export type CalendarPlazoInput = {
  title: string
  dueAtIso: string
  clientName?: string
  matterTitle?: string
}

export type CalendarPlazoResult =
  | { ok: true; eventId: string }
  | { ok: false; reason: string }

export type DriveDocument = {
  id: string
  title: string
  folderPath: string
  docDate: string | null
  excerpt: string
}

export type WorkspaceProvider = {
  id: WorkspaceProviderId
  label: string
  /** Never send mail automatically — drafts only. */
  createMailDraft: (input: MailDraftInput) => Promise<MailDraftResult>
  upsertCalendarPlazo: (input: CalendarPlazoInput) => Promise<CalendarPlazoResult>
  listDriveDocuments: () => Promise<DriveDocument[]>
  getStatus: () => Promise<WorkspaceConnectionStatus>
}

export const WORKSPACE_PROVIDER_LABELS: Record<WorkspaceProviderId, string> = {
  microsoft365: 'Microsoft 365',
  google_workspace: 'Google Workspace',
}

/** Minimal Google OAuth scopes — drafts + calendar events + drive read + identity. */
export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.readonly',
] as const
