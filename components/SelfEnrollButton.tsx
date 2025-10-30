'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'

interface SelfEnrollButtonProps {
  courseId: string
  courseName: string
}

export default function SelfEnrollButton({ courseId, courseName }: SelfEnrollButtonProps) {
  const [enrolling, setEnrolling] = useState(false)
  const router = useRouter()

  const handleEnroll = async () => {
    if (enrolling) return

    setEnrolling(true)
    try {
      const response = await fetch('/api/corporate/self-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      })

      if (response.ok) {
        // Refresh the page to show updated enrollment status
        router.refresh()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'No se pudo inscribir'}`)
      }
    } catch (error) {
      console.error('Enrollment error:', error)
      alert('Error al inscribirse en el curso')
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={enrolling}
      className="p-4 border-2 border-purple-300 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 hover:border-purple-500 hover:shadow-lg transition-all group disabled:opacity-50"
    >
      <BookOpen className="w-8 h-8 text-purple-500 group-hover:text-purple-600 mb-2" />
      <div className="font-medium text-slate-900 flex items-center gap-1">
        {enrolling ? 'Inscribiendo...' : 'Tomar el Curso'}
        <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full">TÚ</span>
      </div>
      <div className="text-sm text-purple-700">
        {enrolling ? 'Espera un momento...' : `Inscríbete en ${courseName}`}
      </div>
    </button>
  )
}

