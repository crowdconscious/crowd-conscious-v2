import Link from 'next/link'

export default function UnsubscribedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1419] p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Te has dado de baja</h1>
        <p className="mt-2 text-gray-400">Ya no recibirás nuestros correos de marketing.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-emerald-400 hover:underline">
          ← Volver a Crowd Conscious
        </Link>
      </div>
    </div>
  )
}
