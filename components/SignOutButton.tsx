'use client'

import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import { LogOut } from 'lucide-react'

interface SignOutButtonProps {
  className?: string
  showIcon?: boolean
  label?: string
}

export default function SignOutButton({ 
  className = "text-sm text-slate-600 hover:text-teal-600 transition-colors",
  showIcon = false,
  label = "Cerrar Sesión"
}: SignOutButtonProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await supabaseClient.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      className={className}
    >
      {showIcon && <LogOut className="w-4 h-4 inline mr-1" />}
      {label}
    </button>
  )
}

