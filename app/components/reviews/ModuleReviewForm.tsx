'use client'

import { useState } from 'react'
import { Star, Loader, Check, AlertCircle } from 'lucide-react'

interface ModuleReviewFormProps {
  moduleId: string
  moduleTitle: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ModuleReviewForm({ 
  moduleId, 
  moduleTitle, 
  onSuccess,
  onCancel 
}: ModuleReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState(true)
  const [completionStatus, setCompletionStatus] = useState<'completed' | 'in_progress' | 'not_started'>('completed')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === 0) {
      setError('Por favor selecciona una calificación')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/reviews/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          rating,
          title,
          reviewText,
          wouldRecommend,
          completionStatus
        })
      })

      const responseData = await response.json()

      if (!response.ok) {
        // ✅ PHASE 4: Extract error message from standardized format
        const errorMessage = responseData.error?.message || responseData.error || 'Error al enviar la reseña'
        setError(errorMessage)
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 1500)
    } catch (error) {
      console.error('Error submitting review:', error)
      setError('Error al enviar la reseña')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Check className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-green-900 mb-2">¡Gracias por tu reseña!</h3>
        <p className="text-green-700">Tu opinión ayuda a otros a tomar mejores decisiones.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Deja tu reseña</h3>
        <p className="text-slate-600">¿Qué te pareció "{moduleTitle}"?</p>
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Calificación general <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-10 h-10 ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-slate-300'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-slate-600 font-medium">
            {rating > 0 && (
              <>
                {rating === 5 && '¡Excelente!'}
                {rating === 4 && 'Muy bueno'}
                {rating === 3 && 'Bueno'}
                {rating === 2 && 'Regular'}
                {rating === 1 && 'Necesita mejorar'}
              </>
            )}
          </span>
        </div>
      </div>

      {/* Completion Status */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Estado de completitud
        </label>
        <select
          value={completionStatus}
          onChange={(e) => setCompletionStatus(e.target.value as any)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="completed">Completado</option>
          <option value="in_progress">En progreso</option>
          <option value="not_started">No iniciado</option>
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Título de tu reseña (opcional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Excelente módulo, muy práctico"
          maxLength={100}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Review Text */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Tu experiencia (opcional)
        </label>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Cuéntanos qué te gustó, qué aprendiste, o qué se podría mejorar..."
          rows={4}
          maxLength={1000}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
        <div className="text-xs text-slate-500 mt-1 text-right">
          {reviewText.length}/1000 caracteres
        </div>
      </div>

      {/* Would Recommend */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="recommend"
          checked={wouldRecommend}
          onChange={(e) => setWouldRecommend(e.target.checked)}
          className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
        />
        <label htmlFor="recommend" className="text-sm text-slate-700">
          Recomendaría este módulo a otros
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800 font-medium">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || rating === 0}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            'Publicar reseña'
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:border-slate-400 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

