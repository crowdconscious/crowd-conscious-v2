/**
 * Microsoft 365 provider adapter — wraps the existing demo/sim surface.
 * Never calls Microsoft Graph; never auto-sends mail.
 */

import { readM365CookieStatus } from '@/lib/ciceron/m365/demo-store'
import { fixtureArchiveDocs } from '@/lib/ciceron/m365/fixtures'
import type {
  CalendarPlazoInput,
  CalendarPlazoResult,
  DriveDocument,
  MailDraftInput,
  MailDraftResult,
  WorkspaceConnectionStatus,
  WorkspaceProvider,
} from './types'

export function createMicrosoft365Provider(): WorkspaceProvider {
  return {
    id: 'microsoft365',
    label: 'Microsoft 365',

    async createMailDraft(input: MailDraftInput): Promise<MailDraftResult> {
      // Draft-only: return a local draft id. Real Graph create-draft is future work.
      if (!input.toEmail || !input.subject) {
        return { ok: false, reason: 'missing_fields' }
      }
      return {
        ok: true,
        draftId: `m365-draft-${Date.now()}`,
        mode: 'draft_only',
      }
    },

    async upsertCalendarPlazo(
      input: CalendarPlazoInput
    ): Promise<CalendarPlazoResult> {
      if (!input.title || !input.dueAtIso) {
        return { ok: false, reason: 'missing_fields' }
      }
      return { ok: true, eventId: `m365-cal-${Date.now()}` }
    },

    async listDriveDocuments(): Promise<DriveDocument[]> {
      return fixtureArchiveDocs.map((d) => ({
        id: d.id,
        title: d.title,
        folderPath: d.folderPath,
        docDate: d.docDate,
        excerpt: d.excerpt,
      }))
    },

    async getStatus(): Promise<WorkspaceConnectionStatus> {
      return readM365CookieStatus()
    },
  }
}
