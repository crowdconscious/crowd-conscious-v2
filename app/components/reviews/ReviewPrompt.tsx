'use client'

import { useState } from 'react'
import { Star, X, Sparkles } from 'lucide-react'
import ModuleReviewForm from './ModuleReviewForm'

interface ReviewPromptProps {
  moduleId: string
  moduleTitle: string
  onClose: () => void
}

export default function ReviewPrompt({ moduleId, moduleTitle, onClose }: ReviewPromptProps) {
  const [showForm, setShowForm] = useState(false)

  if (showForm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Tu opinión importa</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <ModuleReviewForm
            moduleId={moduleId}
            moduleTitle={moduleTitle}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-6 max-w-md z-50 animate-bounce-in">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-white/80 hover:text-white"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-2">
            ¡Felicidades! 🎉
          </h3>
          <p className="text-white/90 text-sm mb-4">
            Has completado "{moduleTitle}". ¿Nos ayudas con tu opinión?
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="flex-1 bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:scale-105 transition-transform"
            >
              Dejar reseña
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-white/80 hover:text-white text-sm"
            >
              Más tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

