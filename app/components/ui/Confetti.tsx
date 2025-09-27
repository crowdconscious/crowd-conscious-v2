'use client'

import { useEffect, useState } from 'react'

interface ConfettiPiece {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  color: string
  shape: 'circle' | 'square' | 'triangle'
  velocityX: number
  velocityY: number
  gravity: number
}

interface ConfettiProps {
  trigger: boolean
  duration?: number
  particleCount?: number
  colors?: string[]
  onComplete?: () => void
}

export function Confetti({ 
  trigger, 
  duration = 3000, 
  particleCount = 50,
  colors = ['#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'],
  onComplete 
}: ConfettiProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (trigger && !isActive) {
      startConfetti()
    }
  }, [trigger, isActive])

  const startConfetti = () => {
    setIsActive(true)
    
    // Generate confetti pieces
    const pieces: ConfettiPiece[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: -20,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as 'circle' | 'square' | 'triangle',
      velocityX: (Math.random() - 0.5) * 4,
      velocityY: Math.random() * 3 + 2,
      gravity: 0.1 + Math.random() * 0.1,
    }))
    
    setConfetti(pieces)
    
    // Animation loop
    const animationId = requestAnimationFrame(function animate() {
      setConfetti(prevConfetti => 
        prevConfetti.map(piece => ({
          ...piece,
          x: piece.x + piece.velocityX,
          y: piece.y + piece.velocityY,
          rotation: piece.rotation + 2,
          velocityY: piece.velocityY + piece.gravity,
        })).filter(piece => piece.y < window.innerHeight + 50)
      )
      
      if (isActive) {
        requestAnimationFrame(animate)
      }
    })
    
    // Clean up after duration
    setTimeout(() => {
      setIsActive(false)
      setConfetti([])
      onComplete?.()
      cancelAnimationFrame(animationId)
    }, duration)
  }

  if (!isActive || confetti.length === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti.map(piece => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: piece.x,
            top: piece.y,
            transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`,
            transition: 'none',
          }}
        >
          {piece.shape === 'circle' && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: piece.color }}
            />
          )}
          {piece.shape === 'square' && (
            <div
              className="w-3 h-3"
              style={{ backgroundColor: piece.color }}
            />
          )}
          {piece.shape === 'triangle' && (
            <div
              className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent"
              style={{ borderBottomColor: piece.color }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// Hook for easy confetti triggering
export function useConfetti() {
  const [trigger, setTrigger] = useState(false)
  
  const fire = () => {
    setTrigger(true)
    setTimeout(() => setTrigger(false), 100)
  }
  
  return { trigger, fire }
}
