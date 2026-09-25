import sharp from 'sharp'
import { MAX_IMAGE_EDGE } from './constants'

// MAX_IMAGE_EDGE caps longest side after EXIF-orient + metadata strip.

export type ProcessedRecognitionPhoto = {
  buffer: Buffer
  contentType: 'image/jpeg'
  width: number
  height: number
}

/**
 * Re-encode / resize a submitted photo for storage.
 * - Auto-orients via EXIF then strips all metadata (incl. GPS) by re-encoding.
 * - Caps longest edge at MAX_IMAGE_EDGE.
 * - Outputs JPEG for consistent storage + share cards.
 *
 * HEIC/HEIF is attempted when sharp/libvips supports it; callers should
 * surface a friendly error if processing fails for those formats.
 */
export async function processRecognitionPhoto(
  input: Buffer
): Promise<ProcessedRecognitionPhoto> {
  const image = sharp(input, { failOn: 'none' }).rotate()
  const meta = await image.metadata()

  const width = meta.width ?? MAX_IMAGE_EDGE
  const height = meta.height ?? MAX_IMAGE_EDGE
  const longest = Math.max(width, height)
  const needsResize = longest > MAX_IMAGE_EDGE

  let pipeline = image
  if (needsResize) {
    pipeline = pipeline.resize({
      width: MAX_IMAGE_EDGE,
      height: MAX_IMAGE_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  const buffer = await pipeline
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer({ resolveWithObject: false })

  const outMeta = await sharp(buffer).metadata()

  return {
    buffer,
    contentType: 'image/jpeg',
    width: outMeta.width ?? width,
    height: outMeta.height ?? height,
  }
}
