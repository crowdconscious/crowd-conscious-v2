'use client'

import { useState } from 'react'
import { createClientAuth } from '@/lib/auth'

interface NeedActivity {
  id: string
  title: string
  is_completed: boolean
  completed_by: string | null
}

interface NeedActivitiesProps {
  contentId: string
  activities: NeedActivity[]
  fundingGoal: number | null
  currentFunding: number
  onUpdate: () => void
}

export default function NeedActivities({ 
  contentId, 
  activities, 
  fundingGoal,
  currentFunding,
  onUpdate 
}: NeedActivitiesProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientAuth()

  const completedActivities = activities.filter(a => a.is_completed).length
  const progressPercentage = activities.length > 0 ? (completedActivities / activities.length) * 100 : 0
  const fundingPercentage = fundingGoal ? (currentFunding / fundingGoal) * 100 : 0

  const handleCompleteActivity = async (activityId: string) => {
    setLoading(activityId)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to complete activities')
        setLoading(null)
        return
      }

      const { error: updateError } = await (supabase as any)
        .from('need_activities')
        .update({
          is_completed: true,
          completed_by: user.id,
          completed_at: new Date().toISOString()
        })
        .eq('id', activityId)

      if (updateError) {
        setError(updateError.message)
      } else {
        onUpdate()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(null)
    }
  }

  const handleUncompleteActivity = async (activityId: string) => {
    setLoading(activityId)
    setError(null)

    try {
      const { error: updateError } = await (supabase as any)
        .from('need_activities')
        .update({
          is_completed: false,
          completed_by: null,
          completed_at: null
        })
        .eq('id', activityId)

      if (updateError) {
        setError(updateError.message)
      } else {
        onUpdate()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Funding Progress */}
      {fundingGoal && (
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-3">Funding Progress</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Raised: ${currentFunding.toFixed(2)}</span>
              <span>Goal: ${fundingGoal.toFixed(2)}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div 
                className="bg-teal-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, fundingPercentage)}%` }}
              ></div>
            </div>
            <div className="text-center text-sm text-slate-600">
              {fundingPercentage.toFixed(0)}% funded
            </div>
          </div>
        </div>
      )}

      {/* Activity Progress */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-slate-900">Project Activities</h4>
          <span className="text-sm text-slate-600">
            {completedActivities} / {activities.length} completed
          </span>
        </div>
        
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        <div className="space-y-2">
          {activities.map((activity) => (
            <div 
              key={activity.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                activity.is_completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  activity.is_completed 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-slate-300'
                }`}>
                  {activity.is_completed && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${
                  activity.is_completed ? 'text-green-700 line-through' : 'text-slate-700'
                }`}>
                  {activity.title}
                </span>
              </div>
              
              <button
                onClick={() => activity.is_completed 
                  ? handleUncompleteActivity(activity.id)
                  : handleCompleteActivity(activity.id)
                }
                disabled={loading === activity.id}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  activity.is_completed
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } disabled:opacity-50`}
              >
                {loading === activity.id ? 'Updating...' : 
                 activity.is_completed ? 'Mark Incomplete' : 'Mark Complete'}
              </button>
            </div>
          ))}
        </div>
        
        {activities.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            No activities defined for this need.
          </p>
        )}
      </div>
      
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
