/** Simulated Microsoft 365 types — demo only; no Graph SDK or tokens. */

export type M365ConnectionStatus = 'disconnected' | 'connected'

export type M365Permission = {
  id: string
  label: string
  description: string
}

export const M365_DEMO_PERMISSIONS: M365Permission[] = [
  {
    id: 'mail.read',
    label: 'Leer metadatos del correo',
    description: 'Asunto, remitente y fechas (no el cuerpo completo en la versión real hasta consentimiento).',
  },
  {
    id: 'calendars.readwrite',
    label: 'Calendario',
    description: 'Leer y escribir eventos de audiencias y plazos confirmados.',
  },
  {
    id: 'files.read',
    label: 'OneDrive / SharePoint',
    description: 'Leer documentos del archivo del despacho para investigación con citas.',
  },
  {
    id: 'mail.send',
    label: 'Enviar correo (con aprobación)',
    description: 'Solo tras revisión de nivel 2 por un socio o asociado.',
  },
]

export type ArchiveDoc = {
  id: string
  documentId: string
  title: string
  folderPath: string
  docDate: string
  parties: string
  excerpt: string
  chunkId: string
  isSample: true
}

export type OutlookCalendarEvent = {
  id: string
  title: string
  startsAt: string
  endsAt: string | null
  eventKind: 'hearing' | 'deadline' | 'dof_alert' | 'other'
  clientName: string | null
  lawyerName: string | null
  matterTitle: string | null
  caseFileNumber: string | null
  syncedFromCiceron: boolean
  isSample: true
}

export type ClientNotifyDraft = {
  id: string
  toEmail: string
  subject: string
  body: string
  status: 'borrador' | 'en_revision' | 'aprobado' | 'enviado_simulado' | 'rechazado'
  caseFileNumber: string | null
  clientName: string
}
