'use client'

import { useState, useEffect, useRef } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { AnimatedButton } from '@/components/ui/UIComponents'
// Note: addToast will be available from ToastProvider context

interface Comment {
  id: string
  content: string
  content_id: string
  user_id: string
  parent_id?: string
  mentions: string[]
  reactions: Record<string, string[]> // emoji -> user_ids
  created_at: string
  updated_at: string
  user: {
    full_name: string
    email: string
  }
  replies?: Comment[]
}

interface Mention {
  id: string
  name: string
  email: string
}

// Rich Text Editor Component (Simple)
export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Add a comment...",
  mentions = [],
  onMentionSearch,
  minRows = 3
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  mentions?: Mention[]
  onMentionSearch?: (query: string) => void
  minRows?: number
}) {
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart
    
    onChange(newValue)
    setCursorPosition(cursorPos)

    // Check for @ mentions
    const beforeCursor = newValue.slice(0, cursorPos)
    const mentionMatch = beforeCursor.match(/@(\w*)$/)
    
    if (mentionMatch) {
      const query = mentionMatch[1]
      setMentionQuery(query)
      setShowMentions(true)
      onMentionSearch?.(query)
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (mention: Mention) => {
    const beforeCursor = value.slice(0, cursorPosition)
    const afterCursor = value.slice(cursorPosition)
    const mentionMatch = beforeCursor.match(/@(\w*)$/)
    
    if (mentionMatch) {
      const beforeMention = beforeCursor.slice(0, mentionMatch.index)
      const newValue = `${beforeMention}@${mention.name} ${afterCursor}`
      onChange(newValue)
      setShowMentions(false)
      
      // Focus back to textarea
      setTimeout(() => {
        textareaRef.current?.focus()
        const newCursorPos = beforeMention.length + mention.name.length + 2
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
  }

  // Parse text for mentions and format
  const formatText = (text: string) => {
    return text.split(/(@\w+)/g).map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-teal-600 font-medium bg-teal-50 px-1 rounded">
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className="relative">
      <div className="border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder}
          rows={minRows}
          className="w-full px-3 py-2 border-0 rounded-lg resize-none focus:outline-none"
        />
        
        {/* Formatting Toolbar */}
        <div className="border-t border-slate-200 px-3 py-2 bg-slate-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>💬</span>
              <span>Use @username to mention</span>
              <span>•</span>
              <span>😊 for reactions</span>
            </div>
            <div className="text-xs text-slate-400">
              {value.length}/1000
            </div>
          </div>
        </div>
      </div>

      {/* Mentions Dropdown */}
      {showMentions && mentions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {mentions.filter(m => 
            m.name.toLowerCase().includes(mentionQuery.toLowerCase())
          ).map((mention) => (
            <button
              key={mention.id}
              onClick={() => insertMention(mention)}
              className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
            >
              <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-xs font-bold text-teal-700">
                {mention.name[0]?.toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-slate-900">{mention.name}</div>
                <div className="text-xs text-slate-500">{mention.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Preview (when not focused) */}
      {value && !showMentions && (
        <div className="mt-2 p-2 bg-slate-50 rounded text-sm text-slate-600">
          <strong>Preview:</strong> {formatText(value)}
        </div>
      )}
    </div>
  )
}

// Emoji Reactions Component
export function EmojiReactions({ 
  reactions, 
  onReact, 
  currentUserId 
}: {
  reactions: Record<string, string[]>
  onReact: (emoji: string) => void
  currentUserId: string
}) {
  const [showPicker, setShowPicker] = useState(false)
  
  const availableEmojis = ['👍', '❤️', '😄', '🎉', '🤔', '👎']
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Existing Reactions */}
      {Object.entries(reactions).map(([emoji, userIds]) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all
            ${userIds.includes(currentUserId)
              ? 'bg-teal-100 text-teal-700 border border-teal-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }
          `}
        >
          <span>{emoji}</span>
          <span className="text-xs font-medium">{userIds.length}</span>
        </button>
      ))}
      
      {/* Add Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center"
        >
          😊
        </button>
        
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 flex gap-1 z-10">
            {availableEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji)
                  setShowPicker(false)
                }}
                className="w-8 h-8 hover:bg-slate-100 rounded transition-colors flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        
        {/* Click outside to close */}
        {showPicker && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  )
}

// Single Comment Component
export function CommentItem({ 
  comment, 
  onReply, 
  onReact, 
  currentUserId,
  mentions = [],
  onMentionSearch
}: {
  comment: Comment
  onReply: (parentId: string, content: string) => void
  onReact: (commentId: string, emoji: string) => void
  currentUserId: string
  mentions?: Mention[]
  onMentionSearch?: (query: string) => void
}) {
  const [showReply, setShowReply] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReply = async () => {
    if (!replyContent.trim()) return
    
    setIsSubmitting(true)
    try {
      await onReply(comment.id, replyContent)
      setReplyContent('')
      setShowReply(false)
      addToast({
        type: 'success',
        title: 'Reply Posted!',
        message: 'Your reply has been added to the discussion.'
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Reply Failed',
        message: 'Could not post your reply. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCommentText = (text: string) => {
    return text.split(/(@\w+)/g).map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-teal-600 font-medium bg-teal-50 px-1 rounded">
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className="border-l-2 border-slate-100 pl-4">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
          {comment.user.full_name?.[0]?.toUpperCase() || comment.user.email[0].toUpperCase()}
        </div>
        
        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-slate-50 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-slate-900 text-sm">
                {comment.user.full_name || comment.user.email}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(comment.created_at).toLocaleDateString()} at{' '}
                {new Date(comment.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="text-slate-700 text-sm leading-relaxed">
              {formatCommentText(comment.content)}
            </div>
          </div>
          
          {/* Reactions and Actions */}
          <div className="flex items-center gap-4 mb-3">
            <EmojiReactions
              reactions={comment.reactions}
              onReact={(emoji) => onReact(comment.id, emoji)}
              currentUserId={currentUserId}
            />
            
            <button
              onClick={() => setShowReply(!showReply)}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              Reply
            </button>
          </div>
          
          {/* Reply Form */}
          {showReply && (
            <div className="mb-4">
              <RichTextEditor
                value={replyContent}
                onChange={setReplyContent}
                placeholder="Write a reply..."
                mentions={mentions}
                onMentionSearch={onMentionSearch}
                minRows={2}
              />
              <div className="flex gap-2 mt-2">
                <AnimatedButton
                  onClick={handleReply}
                  variant="primary"
                  size="sm"
                  loading={isSubmitting}
                  disabled={!replyContent.trim()}
                >
                  Reply
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => setShowReply(false)}
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </AnimatedButton>
              </div>
            </div>
          )}
          
          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-3 mt-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onReact={onReact}
                  currentUserId={currentUserId}
                  mentions={mentions}
                  onMentionSearch={onMentionSearch}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main Comments Section Component
export function CommentsSection({ 
  contentId, 
  currentUserId 
}: {
  contentId: string
  currentUserId: string
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [mentions, setMentions] = useState<Mention[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComments()
    fetchMentions()
  }, [contentId])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseClient
        .from('comments')
        .select(`
          *,
          user:profiles(full_name, email)
        `)
        .eq('content_id', contentId)
        .is('parent_id', null)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabaseClient
            .from('comments')
            .select(`
              *,
              user:profiles(full_name, email)
            `)
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true })

          return { ...comment, replies: replies || [] }
        })
      )

      setComments(commentsWithReplies)
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMentions = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, full_name, email')
        .limit(20)

      if (!error && data) {
        setMentions(data.map(profile => ({
          id: profile.id,
          name: profile.full_name || profile.email.split('@')[0],
          email: profile.email
        })))
      }
    } catch (error) {
      console.error('Error fetching mentions:', error)
    }
  }

  const handleMentionSearch = (query: string) => {
    // In a real app, you'd search for users matching the query
    // For now, we just use the existing mentions
  }

  const postComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const mentions = extractMentions(newComment)
      
      const { data, error } = await supabaseClient
        .from('comments')
        .insert({
          content_id: contentId,
          user_id: currentUserId,
          content: newComment,
          mentions: mentions,
          reactions: {}
        })
        .select(`
          *,
          user:profiles(full_name, email)
        `)
        .single()

      if (error) throw error

      // Add to comments list
      setComments(prev => [...prev, { ...data, replies: [] }])
      setNewComment('')
      
      addToast({
        type: 'success',
        title: 'Comment Posted!',
        message: 'Your comment has been added to the discussion.'
      })

      // Send notifications for mentions
      if (mentions.length > 0) {
        // This would normally be handled by a backend function
        console.log('Would send notifications to:', mentions)
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Comment Failed',
        message: 'Could not post your comment. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const replyToComment = async (parentId: string, content: string) => {
    const mentions = extractMentions(content)
    
    const { data, error } = await supabaseClient
      .from('comments')
      .insert({
        content_id: contentId,
        user_id: currentUserId,
        parent_id: parentId,
        content: content,
        mentions: mentions,
        reactions: {}
      })
      .select(`
        *,
        user:profiles(full_name, email)
      `)
      .single()

    if (error) throw error

    // Add reply to the appropriate comment
    setComments(prev => prev.map(comment => 
      comment.id === parentId 
        ? { ...comment, replies: [...(comment.replies || []), data] }
        : comment
    ))
  }

  const reactToComment = async (commentId: string, emoji: string) => {
    try {
      // Find the comment
      let targetComment: Comment | null = null
      let isReply = false
      let parentComment: Comment | null = null

      for (const comment of comments) {
        if (comment.id === commentId) {
          targetComment = comment
          break
        }
        const reply = comment.replies?.find(r => r.id === commentId)
        if (reply) {
          targetComment = reply
          isReply = true
          parentComment = comment
          break
        }
      }

      if (!targetComment) return

      // Toggle reaction
      const currentReactions = { ...targetComment.reactions }
      if (!currentReactions[emoji]) {
        currentReactions[emoji] = []
      }

      const userIndex = currentReactions[emoji].indexOf(currentUserId)
      if (userIndex > -1) {
        currentReactions[emoji].splice(userIndex, 1)
        if (currentReactions[emoji].length === 0) {
          delete currentReactions[emoji]
        }
      } else {
        currentReactions[emoji].push(currentUserId)
      }

      // Update in database
      const { error } = await supabaseClient
        .from('comments')
        .update({ reactions: currentReactions })
        .eq('id', commentId)

      if (error) throw error

      // Update local state
      if (isReply && parentComment) {
        setComments(prev => prev.map(comment => 
          comment.id === parentComment!.id
            ? {
                ...comment, 
                replies: comment.replies?.map(reply => 
                  reply.id === commentId 
                    ? { ...reply, reactions: currentReactions }
                    : reply
                ) || []
              }
            : comment
        ))
      } else {
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, reactions: currentReactions }
            : comment
        ))
      }
    } catch (error) {
      console.error('Error reacting to comment:', error)
      addToast({
        type: 'error',
        title: 'Reaction Failed',
        message: 'Could not add your reaction. Please try again.'
      })
    }
  }

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g
    const mentionMatches = text.match(mentionRegex)
    return mentionMatches ? mentionMatches.map(m => m.slice(1)) : []
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-4" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 mb-4">
              <div className="w-8 h-8 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-12 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">
        💬 Discussion ({comments.length + comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0)})
      </h3>
      
      {/* New Comment Form */}
      <div className="mb-6">
        <RichTextEditor
          value={newComment}
          onChange={setNewComment}
          placeholder="Join the discussion..."
          mentions={mentions}
          onMentionSearch={handleMentionSearch}
        />
        <div className="flex justify-end mt-3">
          <AnimatedButton
            onClick={postComment}
            variant="primary"
            loading={isSubmitting}
            disabled={!newComment.trim()}
          >
            Post Comment
          </AnimatedButton>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={replyToComment}
            onReact={reactToComment}
            currentUserId={currentUserId}
            mentions={mentions}
            onMentionSearch={handleMentionSearch}
          />
        ))}

        {comments.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">💬</div>
            <h4 className="text-lg font-medium text-slate-900 mb-2">Start the Discussion</h4>
            <p className="text-slate-600">Be the first to share your thoughts and ideas!</p>
          </div>
        )}
      </div>
    </div>
  )
}
