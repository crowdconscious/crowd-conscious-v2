'use client'

import { useState, useEffect } from 'react'
import { createClientAuth } from '@/lib/auth'

interface Comment {
  id: string
  content: string
  created_at: string
  updated_at: string
  parent_id: string | null
  profiles: {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
  }
  replies: Comment[]
}

interface CommentsSectionProps {
  contentId: string
  contentType: 'poll' | 'event' | 'need' | 'challenge'
  initialUser?: any // User data passed from server component
}

export default function CommentsSection({ contentId, contentType, initialUser }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)

  const supabase = createClientAuth()

  useEffect(() => {
    fetchComments()
    
    // Always check client-side auth for reliability
    getCurrentUser()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'No user')
      setUser(session?.user || null)
    })

    // Set up real-time subscription for new comments
    const commentsChannel = supabase
      .channel(`comments_${contentId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'comments',
          filter: `content_id=eq.${contentId}`
        },
        (payload) => {
          console.log('💬 Real-time comment update:', payload)
          // Refresh comments when any change occurs
          fetchComments()
        }
      )
      .subscribe((status) => {
        console.log('📡 Comments subscription status:', status)
      })

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(commentsChannel)
    }
  }, [contentId])

  const getCurrentUser = async () => {
    try {
      console.log('🔍 CommentsSection: Checking authentication...')
      
      // Try getting user from current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('❌ Error getting session:', sessionError)
        setUser(null)
        return
      }
      
      if (session?.user) {
        console.log('✅ User from session:', `${session.user.email} (${session.user.id})`)
        setUser(session.user)
        return
      }
      
      // Fallback to getUser
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('❌ Error getting user:', error)
        setUser(null)
      } else {
        console.log('✅ Current user in comments:', user ? `${user.email} (${user.id})` : 'No user')
        setUser(user)
      }
    } catch (error) {
      console.error('💥 Error in getCurrentUser:', error)
      setUser(null)
    }
  }

  const fetchComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/comments?contentId=${contentId}`)
      const data = await response.json()
      
      if (response.ok) {
        setComments(data.comments || [])
      } else {
        console.error('Error fetching comments:', data.error)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitComment = async (content: string, parentId?: string) => {
    if (!content.trim() || !user) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId,
          content: content.trim(),
          parentId: parentId || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh comments to get updated list
        await fetchComments()
        
        // Clear form
        if (parentId) {
          setReplyContent('')
          setReplyingTo(null)
        } else {
          setNewComment('')
        }
      } else {
        alert(data.error || 'Failed to post comment')
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      alert('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-8 mt-3' : 'mb-6'} ${isReply ? 'border-l-2 border-slate-200 pl-4' : ''}`}>
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.profiles.avatar_url ? (
            <img
              src={comment.profiles.avatar_url}
              alt={comment.profiles.full_name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-400 to-purple-400 flex items-center justify-center text-white text-sm font-medium">
              {comment.profiles.full_name?.charAt(0) || comment.profiles.email?.charAt(0) || '?'}
            </div>
          )}
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-slate-900">
                {comment.profiles.full_name || comment.profiles.email?.split('@')[0] || 'Anonymous'}
              </h4>
              <span className="text-xs text-slate-500">
                {formatDate(comment.created_at)}
              </span>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>

          {/* Reply Button */}
          {!isReply && user && (
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="text-xs text-teal-600 hover:text-teal-700 mt-2 font-medium"
            >
              Reply
            </button>
          )}

          {/* Reply Form */}
          {replyingTo === comment.id && (
            <div className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${comment.profiles.full_name || 'this comment'}...`}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                rows={2}
              />
              <div className="flex items-center justify-end space-x-2 mt-2">
                <button
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyContent('')
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitComment(replyContent, comment.id)}
                  disabled={!replyContent.trim() || submitting}
                  className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white text-xs font-medium px-3 py-1 rounded transition-colors"
                >
                  {submitting ? 'Posting...' : 'Reply'}
                </button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3">
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} isReply={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (!user) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Comments</h3>
        <div className="text-center py-8">
          <p className="text-slate-600 mb-4">Sign in to view and post comments</p>
          <a
            href="/login"
            className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Comments ({comments.length})
      </h3>

      {/* New Comment Form */}
      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={`Share your thoughts about this ${contentType}...`}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          rows={3}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-500">
            Be respectful and constructive in your comments
          </span>
          <button
            onClick={() => submitComment(newComment)}
            disabled={!newComment.trim() || submitting}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="bg-slate-200 rounded-lg p-3">
                    <div className="h-4 bg-slate-300 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-slate-300 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-slate-600 mb-2">No comments yet</p>
          <p className="text-sm text-slate-500">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  )
}
