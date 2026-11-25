'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { ManualUploadDialog } from './ManualUploadDialog'

export function BoletinesUploadControls({
  canUpload,
  initialStateCode,
}: {
  canUpload: boolean
  initialStateCode?: string | null
}) {
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [prefill, setPrefill] = useState<string | null>(initialStateCode ?? null)

  useEffect(() => {
    const subir = searchParams.get('subir')
    const estado = searchParams.get('estado')
    if (subir === '1') {
      setOpen(true)
      if (estado) setPrefill(estado.toUpperCase())
    }
  }, [searchParams])

  return (
    <>
      <button
        type="button"
        className="cic-btn"
        onClick={() => {
          setPrefill(initialStateCode ?? prefill)
          setOpen(true)
        }}
      >
        {copy.boletines.uploadCta}
      </button>
      <ManualUploadDialog
        open={open}
        onClose={() => setOpen(false)}
        initialStateCode={prefill}
        canUpload={canUpload}
      />
    </>
  )
}
