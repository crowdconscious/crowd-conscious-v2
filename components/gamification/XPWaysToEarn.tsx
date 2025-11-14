'use client'

import { motion } from 'framer-motion'
import { BookOpen, GraduationCap, Heart, ThumbsUp, MessageSquare, Calendar, Trophy, Sparkles } from 'lucide-react'

interface XPActivity {
  icon: React.ReactNode
  title: string
  xp: number
  description: string
  color: string
}

const xpActivities: XPActivity[] = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Complete a Lesson',
    xp: 50,
    description: 'Finish any lesson in a module',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: <GraduationCap className="w-5 h-5" />,
    title: 'Complete a Module',
    xp: 200,
    description: 'Finish an entire learning module',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: <Heart className="w-5 h-5" />,
    title: 'Sponsor a Need',
    xp: 100,
    description: 'Support a community project',
    color: 'from-red-500 to-rose-500'
  },
  {
    icon: <ThumbsUp className="w-5 h-5" />,
    title: 'Vote on Content',
    xp: 25,
    description: 'Approve community content',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Create Content',
    xp: 75,
    description: 'Post needs, events, or polls',
    color: 'from-orange-500 to-amber-500'
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    title: 'Daily Login',
    xp: 10,
    description: 'Visit the platform daily',
    color: 'from-teal-500 to-cyan-500'
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    title: 'Unlock Achievement',
    xp: 100,
    description: 'Earn special achievements',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: '7-Day Streak',
    xp: 50,
    description: 'Maintain daily activity',
    color: 'from-indigo-500 to-purple-500'
  }
]

export function XPWaysToEarn() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-teal-600" />
        <h2 className="text-xl font-semibold text-slate-900">
          Ways to Earn XP
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {xpActivities.map((activity, index) => (
          <motion.div
            key={activity.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-lg bg-gradient-to-br ${activity.color} text-white relative overflow-hidden group hover:scale-105 transition-transform cursor-pointer`}
          >
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">{activity.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{activity.title}</h3>
                  <p className="text-white/90 text-xs">{activity.description}</p>
                </div>
              </div>
              <div className="ml-4 text-right">
                <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                  <div className="text-lg font-bold">+{activity.xp}</div>
                  <div className="text-xs text-white/80">XP</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
        <p className="text-sm text-teal-800">
          <strong>💡 Pro Tip:</strong> Complete modules for the biggest XP gains! Each module completion gives you 200 XP, plus 50 XP for each lesson inside.
        </p>
      </div>
    </div>
  )
}

