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
      
      // Show enhanced success notification
      const notification = document.createElement('div')
      notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(16, 185, 129, 0.4);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        animation: slideInRight 0.3s ease-out;
      `
      
      notification.innerHTML = `
        <div style="font-size: 24px; line-height: 1;">✅</div>
        <div>
          <div style="font-weight: 700; font-size: 16px; margin-bottom: 2px;">¡Guardado exitosamente!</div>
          <div style="font-size: 13px; opacity: 0.95;">Datos guardados para reporte ESG</div>
        </div>
      `
      
      // Add animation styles
      const style = document.createElement('style')
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `
      document.head.appendChild(style)
      
      document.body.appendChild(notification)
      
      // Remove with fade out animation
      setTimeout(() => {
        notification.style.transition = 'all 0.3s ease-out'
        notification.style.opacity = '0'
        notification.style.transform = 'translateX(100px)'
        setTimeout(() => {
          notification.remove()
          style.remove()
        }, 300)
      }, 4000) // 4 seconds (increased from 2.5)

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

