import { z } from 'zod'

export const clientNeedNoteContextSchema = z.enum([
  'hoy',
  'boletines',
  'preferencias',
  'general',
])

export const clientNeedNoteBodySchema = z
  .string()
  .trim()
  .min(1, 'Escriba entre 1 y 2000 caracteres.')
  .max(2000, 'Escriba entre 1 y 2000 caracteres.')

export const submitClientNeedNoteInputSchema = z.object({
  context: clientNeedNoteContextSchema.default('general'),
  body: clientNeedNoteBodySchema,
})

export type SubmitClientNeedNoteInput = z.infer<typeof submitClientNeedNoteInputSchema>

export function parseSubmitClientNeedNoteInput(raw: {
  context?: unknown
  body?: unknown
}):
  | { ok: true; data: SubmitClientNeedNoteInput }
  | { ok: false; message: string } {
  const parsed = submitClientNeedNoteInputSchema.safeParse({
    context: raw.context ?? 'general',
    body: raw.body,
  })
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? 'Los datos de la nota no son válidos.'
    return { ok: false, message: msg }
  }
  return { ok: true, data: parsed.data }
}
