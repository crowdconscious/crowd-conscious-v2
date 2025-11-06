'use client'

import { useState, useEffect } from 'react'
import { Star, ThumbsUp, ThumbsDown, CheckCircle, Loader } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Review {
  id: string
  rating: number
  title: string | null
  review_text: string | null
  would_recommend: boolean
  completion_status: 'completed' | 'in_progress' | 'not_started'
  helpful_count: number
  not_helpful_count: number
  created_at: string
  user: {
    profiles: {
      full_name: string
      avatar_url: string | null
    }
  }
}

interface ReviewsListProps {
  moduleId?: string
  communityId?: string
  type: 'module' | 'community'
}

export default function ReviewsList({ moduleId, communityId, type }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent')

  useEffect(() => {
    fetchReviews()
  }, [moduleId, communityId])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const endpoint = type === 'module' 
        ? `/api/reviews/modules?moduleId=${moduleId}`
        : `/api/reviews/communities?communityId=${communityId}`
      
      const response = await fetch(endpoint)
      const data = await response.json()
      
      if (response.ok) {
        setReviews(data.reviews || [])
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    } else if (sortBy === 'helpful') {
      return b.helpful_count - a.helpful_count
    } else if (sortBy === 'rating') {
      return b.rating - a.rating
    }
    return 0
  })

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    stars: rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 
      : 0
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          Aún no hay reseñas
        </h3>
        <p className="text-slate-600">
          Sé el primero en compartir tu experiencia
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Rating Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Average Rating */}
          <div className="text-center md:text-left">
            <div className="text-5xl font-bold text-slate-900 mb-2">
              {averageRating}
            </div>
            <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${
                    star <= Math.round(parseFloat(averageRating))
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-slate-600">
              Basado en {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {ratingDistribution.map(({ stars, count, percentage }) => (
              <div key={stars} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-16">
                  {stars} {stars === 1 ? 'estrella' : 'estrellas'}
                </span>
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-slate-600 w-8 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          {reviews.length} {reviews.length === 1 ? 'Reseña' : 'Reseñas'}
        </h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="recent">Más recientes</option>
          <option value="helpful">Más útiles</option>
          <option value="rating">Mejor calificadas</option>
        </select>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedReviews.map((review) => (
          <div
            key={review.id}
            className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {review.user.profiles.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    {review.user.profiles.full_name}
                  </div>
                  <div className="text-sm text-slate-500">
                    {format(new Date(review.created_at), 'dd MMM yyyy', { locale: es })}
                  </div>
                </div>
              </div>

              {/* Completion Badge */}
              {review.completion_status === 'completed' && (
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Completado
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= review.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>

            {/* Title */}
            {review.title && (
              <h4 className="font-semibold text-slate-900 mb-2">
                {review.title}
              </h4>
            )}

            {/* Review Text */}
            {review.review_text && (
              <p className="text-slate-700 mb-4 whitespace-pre-wrap">
                {review.review_text}
              </p>
            )}

            {/* Would Recommend */}
            {review.would_recommend && (
              <div className="text-sm text-green-700 font-medium mb-4">
                ✓ Recomendaría este {type === 'module' ? 'módulo' : 'comunidad'}
              </div>
            )}

            {/* Helpfulness */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
              <span className="text-sm text-slate-600">¿Te fue útil esta reseña?</span>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                  {review.helpful_count > 0 && <span>{review.helpful_count}</span>}
                </button>
                <button className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 transition-colors">
                  <ThumbsDown className="w-4 h-4" />
                  {review.not_helpful_count > 0 && <span>{review.not_helpful_count}</span>}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

