/**
 * Hook to save tool results to database for ESG reporting
 * Usage: const { saveToolData, loading, saved } = useToolDataSaver()
 */

import { useState } from 'react'

interface SaveToolDataParams {
  enrollment_id: string
  module_id: string
  lesson_id: string
  tool_name: string
  tool_data: any
  tool_type?: 'assessment' | 'calculator' | 'planner' | 'tracker' | 'analyzer' | 'mapper' | 'other'
}

export function useToolDataSaver() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveToolData = async (params: SaveToolDataParams) => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('💾 Saving tool data:', params.tool_name)
      
      const response = await fetch('/api/tools/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error guardando datos')
      }

      const data = await response.json()
      console.log('✅ Tool data saved:', data)
      
      setSaved(true)
      
      // Show success notification
      const successDiv = document.createElement('div')
      successDiv.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 text-sm'
      successDiv.innerHTML = `
        <span>✅</span>
        <span>Datos guardados para reporte ESG</span>
      `
      document.body.appendChild(successDiv)
      setTimeout(() => successDiv.remove(), 2500)

      return { success: true, ...data }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      console.error('❌ Error saving tool data:', errorMsg)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  const loadToolData = async (params: {
    lesson_id: string
    module_id: string
    tool_name?: string
  }) => {
    try {
      const url = new URL('/api/tools/save-result', window.location.origin)
      url.searchParams.set('lesson_id', params.lesson_id)
      url.searchParams.set('module_id', params.module_id)
      if (params.tool_name) {
        url.searchParams.set('tool_name', params.tool_name)
      }

      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error('Error loading tool data')
      }

      const data = await response.json()
      console.log('📥 Tool data loaded:', data)
      
      return data.tool_data
    } catch (err) {
      console.error('❌ Error loading tool data:', err)
      return null
    }
  }

  return {
    saveToolData,
    loadToolData,
    loading,
    saved,
    error
  }
}

