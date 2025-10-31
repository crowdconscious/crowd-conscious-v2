'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react'

interface EvidenceUploaderProps {
  onUpload?: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSizeMB?: number
  label?: string
  description?: string
  className?: string
}

interface UploadedFile {
  id: string
  name: string
  size: number
  preview: string
  file: File
}

export default function EvidenceUploader({
  onUpload,
  maxFiles = 5,
  maxSizeMB = 5,
  label = "Evidencia Fotográfica",
  description = "Sube fotos de tu implementación (antes/después)",
  className = ''
}: EvidenceUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setError(null)

    // Check max files
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Máximo ${maxFiles} archivos permitidos`)
      return
    }

    // Check file sizes and types
    const validFiles: UploadedFile[] = []
    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} no es una imagen válida`)
        continue
      }

      const sizeMB = file.size / (1024 * 1024)
      if (sizeMB > maxSizeMB) {
        setError(`${file.name} excede el tamaño máximo de ${maxSizeMB}MB`)
        continue
      }

      // Create preview
      const preview = await createPreview(file)
      validFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        preview,
        file
      })
    }

    const newFiles = [...files, ...validFiles]
    setFiles(newFiles)
    setSaved(false) // Mark as unsaved when new files are added

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = () => {
    if (files.length === 0) {
      setError('Agrega al menos una imagen antes de guardar')
      return
    }

    setUploading(true)
    
    // Simulate upload (in real app, this would upload to server)
    setTimeout(() => {
      if (onUpload) {
        onUpload(files)
      }
      setSaved(true)
      setUploading(false)
      setError(null)
    }, 500)
  }

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.readAsDataURL(file)
    })
  }

  const removeFile = (id: string) => {
    const newFiles = files.filter(f => f.id !== id)
    setFiles(newFiles)
    setSaved(false) // Mark as unsaved when files are removed
    setError(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className={`bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-purple-900">{label}</h3>
          <p className="text-xs sm:text-sm text-purple-700">{description}</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="space-y-3 sm:space-y-4">
        {files.length < maxFiles && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-purple-300 rounded-xl p-6 sm:p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-purple-400 mx-auto mb-3" />
            <div className="text-sm sm:text-base font-medium text-purple-900 mb-1">
              Click para subir imágenes
            </div>
            <div className="text-xs sm:text-sm text-purple-600">
              o arrastra archivos aquí
            </div>
            <div className="text-xs text-purple-500 mt-2">
              PNG, JPG, WEBP (max {maxSizeMB}MB) • {files.length}/{maxFiles} archivos
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border-2 border-red-200 rounded-lg p-3 text-xs sm:text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* File Previews */}
        {files.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-purple-900 font-medium">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              {files.length} imagen{files.length > 1 ? 'es' : ''} lista{files.length > 1 ? 's' : ''} para subir
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {files.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-purple-200">
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                    aria-label="Eliminar imagen"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <div className="mt-1 text-xs text-purple-700 truncate">
                    {file.name}
                  </div>
                  <div className="text-xs text-purple-500">
                    {formatFileSize(file.size)}
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={uploading || saved}
              className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
                saved
                  ? 'bg-green-600 text-white cursor-default'
                  : uploading
                  ? 'bg-purple-400 text-white cursor-wait'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 shadow-lg'
              }`}
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando...</span>
                </>
              ) : saved ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>✅ Evidencia Guardada</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Guardar Evidencia</span>
                </>
              )}
            </button>

            {saved && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-xs sm:text-sm text-green-800 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
                <span>
                  <strong>¡Perfecto!</strong> Tus imágenes han sido guardadas exitosamente. 
                  Estas fotos serán visibles en el reporte de tu empresa.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="bg-purple-100 rounded-lg p-3 text-xs sm:text-sm text-purple-800">
          <strong>💡 Consejos:</strong>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>Captura fotos claras en buena iluminación</li>
            <li>Incluye fotos de "antes" y "después"</li>
            <li>Muestra resultados medibles si es posible</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

