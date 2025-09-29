export default function DemoDisclaimer() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Demo Page</h1>
        <p className="text-gray-600 mb-6">
          This is a demo/development page. The live application uses real data from your database.
        </p>
        <a 
          href="/dashboard" 
          className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
        >
          Go to Real App →
        </a>
      </div>
    </div>
  )
}
