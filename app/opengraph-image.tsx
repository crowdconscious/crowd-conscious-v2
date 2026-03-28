import { ImageResponse } from 'next/og'

export const alt = 'Crowd Conscious — Predicciones con propósito'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f1419',
          backgroundImage: 'linear-gradient(165deg, #0f1419 0%, #151c26 45%, #0f1419 100%)',
          padding: 56,
        }}
      >
        <div
          style={{
            width: 120,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#10b981',
            marginBottom: 36,
          }}
        />
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: -1,
            textAlign: 'center',
            lineHeight: 1.1,
            marginBottom: 28,
          }}
        >
          Crowd Conscious
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: '#e2e8f0',
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.35,
            marginBottom: 20,
          }}
        >
          Predicciones Gratis que Financian Causas Reales
        </div>
        <div
          style={{
            fontSize: 22,
            color: '#10b981',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Mundial 2026 · Ciudad de México
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
