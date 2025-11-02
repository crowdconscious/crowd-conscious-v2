'use client'

import { useState } from 'react'
import { createClientAuth } from '@/lib/auth'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadProps {
  currentUrl?: string
  onUploadComplete: (url: string) => void
  userId: string
}

export default function ModuleThumbnailUpload({ currentUrl, onUploadComplete, userId }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe ser menor a 5MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      const supabase = createClientAuth()

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('module-thumbnails')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('module-thumbnails')
        .getPublicUrl(data.path)

      setPreview(publicUrl)
      onUploadComplete(publicUrl)
    } catch (err) {
      console.error('Error uploading image:', err)
      setError(err instanceof Error ? err.message : 'Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onUploadComplete('')
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative group">
          <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-slate-200">
            <Image
              src={preview}
              alt="Module thumbnail"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
              <button
                onClick={handleRemove}
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white p-3 rounded-full hover:bg-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Haz clic en la X para eliminar y subir una nueva imagen
          </p>
        </div>
      ) : (
        <div>
          <label
            htmlFor="thumbnail-upload"
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              uploading
                ? 'border-purple-400 bg-purple-50'
                : 'border-slate-300 hover:border-purple-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex flex-col items-center justify-center py-6">
              {uploading ? (
                <>
                  <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-3" />
                  <p className="text-sm font-medium text-purple-600">Subiendo imagen...</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    Haz clic para subir una miniatura
                  </p>
                  <p className="text-xs text-slate-500">
                    PNG, JPG, WEBP hasta 5MB
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Recomendado: 1200x630px (16:9)
                  </p>
                </>
              )}
            </div>
            <input
              id="thumbnail-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <span className="text-red-600 text-sm">⚠️</span>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>💡 Consejo:</strong> Una buena miniatura aumenta las conversiones hasta un 40%. 
          Usa imágenes de alta calidad que representen el contenido del módulo.
        </p>
      </div>
    </div>
  )
}

