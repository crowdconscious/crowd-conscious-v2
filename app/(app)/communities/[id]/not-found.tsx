import Link from 'next/link'

export default function CommunityNotFound() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Community Not Found</h1>
      <p className="text-slate-600 mb-8">
        The community you're looking for doesn't exist or may have been removed.
      </p>
      
      <div className="flex gap-4 justify-center">
        <Link
          href="/communities"
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Browse Communities
        </Link>
        <Link
          href="/communities/new"
          className="border border-slate-300 text-slate-700 font-semibold py-3 px-6 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Create Community
        </Link>
      </div>
    </div>
  )
}
