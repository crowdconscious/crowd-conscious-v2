import { createServerAuth } from '../../../lib/auth-server'
import { redirect } from 'next/navigation'

export async function POST() {
  try {
    const supabase = await createServerAuth()
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Error signing out:', error)
  }
  
  redirect('/')
}
