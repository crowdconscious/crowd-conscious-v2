import 'server-only'
import sharp from 'sharp'
import { selloSvg, type SelloVariant } from './sello-badge'

/** Transparent PNG of the badge, rendered from the font-free SVG (no files to trace). */
export async function selloPng(v: SelloVariant, px = 1024): Promise<Buffer> {
  return sharp(Buffer.from(selloSvg(v, 'sello', 512)), { density: (72 * px) / 512 }).resize(px, px).png().toBuffer()
}
