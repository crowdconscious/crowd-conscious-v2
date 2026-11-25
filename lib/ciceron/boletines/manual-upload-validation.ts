import { z } from 'zod'
import { findStateDirectoryEntry } from '@/lib/ciceron/boletines/state-directory'

export const ALLOWED_UPLOAD_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain',
] as const

export type AllowedUploadMime = (typeof ALLOWED_UPLOAD_MIMES)[number]

const mimeSchema = z.enum(ALLOWED_UPLOAD_MIMES)

export const manualUploadInputSchema = z
  .object({
    stateCode: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .transform((s) => s.toUpperCase()),
    publicationDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Indique la fecha de publicación (AAAA-MM-DD).'),
    pastedText: z.string().trim().max(500_000).optional(),
    mime: mimeSchema.optional(),
    fileName: z.string().trim().max(240).optional(),
  })
  .superRefine((val, ctx) => {
    const hasText = Boolean(val.pastedText && val.pastedText.length > 0)
    const hasFile = Boolean(val.mime)
    if (!hasText && !hasFile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Adjunte un archivo o pegue el texto del boletín.',
      })
    }
    if (!findStateDirectoryEntry(val.stateCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stateCode'],
        message: 'Seleccione una entidad federativa válida.',
      })
    }
  })

export type ManualUploadInput = z.infer<typeof manualUploadInputSchema>

export function parseManualUploadInput(raw: Record<string, unknown>):
  | { ok: true; data: ManualUploadInput }
  | { ok: false; message: string } {
  const parsed = manualUploadInputSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Datos de carga no válidos.',
    }
  }
  return { ok: true, data: parsed.data }
}

export function isTextProcessable(mime: string | null | undefined, pastedText?: string): boolean {
  if (pastedText && pastedText.trim().length > 0) return true
  return mime === 'text/plain'
}

export function extForMime(mime: AllowedUploadMime): string {
  switch (mime) {
    case 'application/pdf':
      return 'pdf'
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'text/plain':
      return 'txt'
  }
}

export function buildUploadStoragePath(opts: {
  firmId: string
  publicationDate: string
  uploadId: string
  mime: AllowedUploadMime
}): string {
  return `${opts.firmId}/boletines/uploads/${opts.publicationDate}/${opts.uploadId}.${extForMime(opts.mime)}`
}
