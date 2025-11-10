'use client'

import { useState, useEffect } from 'react'
import { Star, ThumbsUp, MessageCircle, Edit, Trash2, Check } from 'lucide-react'
import ModuleReviewForm from '@/app/components/reviews/ModuleReviewForm'

interface Review {
  id: string
  rating: number
  title: string | null
  review_text: string | null
  would_recommend: boolean
  created_at: string
  profiles: {
    full_name: string
    avatar_url: string | null
  }
}

interface ModuleReviewsSectionProps {
  moduleId: string
  moduleTitle: string
  currentUserId?: string
  isEnrolled?: boolean
}

export default function ModuleReviewsSection({
  moduleId,
  moduleTitle,
  currentUserId,
  isEnrolled = false
}: ModuleReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [userReview, setUserReview] = useState<Review | null>(null)

  useEffect(() => {
    fetchReviews()
  }, [moduleId])

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews/modules?moduleId=${moduleId}`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews || [])
        
        // Find user's existing review
        if (currentUserId) {
          const existingReview = data.reviews.find((r: any) => r.user_id === currentUserId)
          setUserReview(existingReview || null)
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewSuccess = () => {
    setShowForm(false)
    fetchReviews() // Reload reviews
  }

  const calculateRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++
    })
    return distribution
  }

  const getAverageRating = () => {
    if (reviews.length === 0) return 0
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }

  const distribution = calculateRatingDistribution()
  const avgRating = getAverageRating()

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center text-slate-600">
          Cargando reseñas...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-2xl font-bold text-slate-900 mb-6">Reseñas de Estudiantes</h3>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-6xl font-bold text-slate-900 mb-2">{avgRating}</div>
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${
                    star <= Math.round(parseFloat(avgRating))
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-slate-600">{reviews.length} reseñas</div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = distribution[rating as keyof typeof distribution]
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
              return (
                <div key={rating} className="flex items-center gap-2">
                  <div className="w-12 text-sm text-slate-600">{rating} ⭐</div>
                  <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-slate-600 text-right">{count}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Write Review Button */}
        {isEnrolled && !userReview && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              <Star className="w-5 h-5" />
              Escribe una Reseña
            </button>
          </div>
        )}

        {/* User has already reviewed */}
        {userReview && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <Check className="w-5 h-5" />
              Ya has dejado una reseña para este módulo
            </div>
          </div>
        )}

        {/* Not enrolled message */}
        {!isEnrolled && currentUserId && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="text-slate-600 text-sm text-center">
              Debes estar inscrito en este módulo para dejar una reseña
            </div>
          </div>
        )}
      </div>

      {/* Review Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Escribe tu Reseña</h3>
            <ModuleReviewForm
              moduleId={moduleId}
              moduleTitle={moduleTitle}
              onSuccess={handleReviewSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Reviewer Info */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {review.profiles?.full_name?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900">
                    {review.profiles?.full_name || 'Usuario'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-slate-500">
                      {new Date(review.created_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                {review.would_recommend && (
                  <div className="flex items-center gap-1 text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full">
                    <ThumbsUp className="w-4 h-4" />
                    Recomendado
                  </div>
                )}
              </div>

              {/* Review Title */}
              {review.title && (
                <h4 className="font-bold text-slate-900 mb-2">{review.title}</h4>
              )}

              {/* Review Text */}
              {review.review_text && (
                <p className="text-slate-700 leading-relaxed">{review.review_text}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Sé el primero en reseñar
          </h3>
          <p className="text-slate-600">
            Este módulo aún no tiene reseñas. ¡Compártenos tu experiencia!
          </p>
        </div>
      )}
    </div>
  )
}

