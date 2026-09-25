import { ImageResponse } from 'next/og'
import {
  downloadRecognitionPhoto,
  getPublicRecognitionBySlug,
} from '@/lib/reconocimientos'

export const runtime = 'nodejs'
export const alt = 'Reconocimiento · Crowd Conscious'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Image({ params }: Props) {
  const { slug } = await params
  const row = await getPublicRecognitionBySlug(slug)

  if (!row) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f1419',
            color: '#fff',
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          Crowd Conscious
        </div>
      ),
      { ...size }
    )
  }

  let photoSrc: string | null = null
  try {
    const { buffer, contentType: ct } = await downloadRecognitionPhoto(
      row.photo_path
    )
    const b64 = buffer.toString('base64')
    photoSrc = `data:${ct};base64,${b64}`
  } catch {
    photoSrc = null
  }

  const what =
    row.what.length > 120 ? `${row.what.slice(0, 117)}…` : row.what

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#0f1419',
        }}
      >
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt=""
            width={560}
            height={630}
            style={{
              width: 560,
              height: 630,
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: 560,
              height: 630,
              display: 'flex',
              background: '#151c26',
            }}
          />
        )}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 48,
            backgroundImage:
              'linear-gradient(165deg, #0f1419 0%, #151c26 50%, #0f1419 100%)',
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#10b981',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            Crowd Conscious
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.25,
              marginBottom: 20,
            }}
          >
            {what}
          </div>
          <div style={{ fontSize: 22, color: '#94a3b8' }}>{row.where_text}</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
