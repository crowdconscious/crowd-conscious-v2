'use server'

import { revalidatePath } from 'next/cache'
import {
  MAX_BULLETIN_TEXT_CHARS,
  TEXT_TOO_LONG_ES,
  parseManualUploadInput,
  type AllowedUploadMime,
} from '@/lib/ciceron/boletines/manual-upload-validation'
import { processManualBulletinUpload } from '@/lib/ciceron/boletines/manual-upload'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

const MIME_BY_EXT: Record<string, AllowedUploadMime> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  txt: 'text/plain',
}

function sniffMime(file: File): AllowedUploadMime | null {
  if (
    file.type === 'application/pdf' ||
    file.type === 'image/jpeg' ||
    file.type === 'image/png' ||
    file.type === 'text/plain'
  ) {
    return file.type
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return MIME_BY_EXT[ext] ?? null
}

export type UploadActionResult = {
  ok: boolean
  message: string
  uploadId?: string
  runId?: string
  status?: string
  entriesFound?: number
  hitsFound?: number
}

export async function uploadManualBulletinAction(
  formData: FormData
): Promise<UploadActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sin sesión.' }

  const pastedRaw = String(formData.get('pastedText') ?? '')
  // Reject oversized paste before any storage or RPC work.
  if (pastedRaw.length > MAX_BULLETIN_TEXT_CHARS) {
    return { ok: false, message: TEXT_TOO_LONG_ES }
  }

  const file = formData.get('file')
  const fileObj = file instanceof File && file.size > 0 ? file : null
  let mime: AllowedUploadMime | null = null
  let bytes: Uint8Array | null = null

  if (fileObj) {
    if (fileObj.size > 50 * 1024 * 1024) {
      return { ok: false, message: 'El archivo supera el límite de 50 MiB.' }
    }
    mime = sniffMime(fileObj)
    if (!mime) {
      return {
        ok: false,
        message: 'Formato no permitido. Use PDF, JPG, PNG o TXT.',
      }
    }
    bytes = new Uint8Array(await fileObj.arrayBuffer())
    if (mime === 'text/plain') {
      const decoded = new TextDecoder('utf-8').decode(bytes)
      if (decoded.length > MAX_BULLETIN_TEXT_CHARS) {
        return { ok: false, message: TEXT_TOO_LONG_ES }
      }
    }
  }

  const parsed = parseManualUploadInput({
    stateCode: String(formData.get('stateCode') ?? ''),
    publicationDate: String(formData.get('publicationDate') ?? ''),
    pastedText: pastedRaw.trim() || undefined,
    mime: mime ?? undefined,
    fileName: fileObj?.name,
  })
  if (!parsed.ok) return { ok: false, message: parsed.message }

  const result = await processManualBulletinUpload({
    persona,
    input: parsed.data,
    fileBytes: bytes,
    fileMime: mime,
  })

  if (result.ok) {
    revalidatePath('/ciceron/boletines')
    revalidatePath('/ciceron/boletines/coordinador')
    revalidatePath('/ciceron/boletines/estados')
    revalidatePath('/ciceron/hoy')
  }

  return {
    ok: result.ok,
    message: result.message,
    uploadId: result.uploadId,
    runId: result.runId,
    status: result.status,
    entriesFound: result.entriesFound,
    hitsFound: result.hitsFound,
  }
}
