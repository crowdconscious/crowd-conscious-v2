import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Iniciar Sesión | Crowd Conscious' },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
