'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui'

export default function DemoHubPage() {
  const demos = [
    {
      title: 'Enhanced Community Features',
      description: 'Experience the immersive header, masonry content grid, mobile-first design, and interactive features',
      href: '/enhanced-demo',
      color: 'from-teal-500 to-teal-600',
      icon: '🚀',
      features: ['Immersive parallax header', 'Masonry content grid', 'Mobile-first interactions', 'Visual feedback system']
    },
    {
      title: 'Design System Components',
      description: 'Comprehensive component library with CVA variants and consistent theming',
      href: '/design-system',
      color: 'from-purple-500 to-purple-600',
      icon: '🎨',
      features: ['CVA component variants', 'Dark mode support', 'Micro-interactions', 'Loading skeletons']
    },
    {
      title: 'Main Application',
      description: 'Live application with all the enhanced features integrated',
      href: '/',
      color: 'from-blue-500 to-blue-600',
      icon: '🏠',
      features: ['Real community data', 'Authentication flow', 'Content management', 'Impact tracking']
    },
    {
      title: 'Communities',
      description: 'Browse and join communities with enhanced detail pages',
      href: '/communities',
      color: 'from-green-500 to-green-600',
      icon: '👥',
      features: ['Community discovery', 'Enhanced detail pages', 'Member management', 'Content creation']
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 via-purple-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h1 className="text-5xl font-bold mb-4">✨ Enhanced Community Platform</h1>
          <p className="text-xl text-teal-100 mb-8">
            Experience the next generation of community engagement with immersive design,
            mobile-first interactions, and delightful visual feedback.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-semibold">🎨 Design System</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-semibold">📱 Mobile-First</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-semibold">✨ Interactive</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-semibold">🚀 Performance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Cards */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {demos.map((demo, index) => (
            <Card 
              key={demo.href}
              className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
            >
              {/* Card Header with Gradient */}
              <div className={`bg-gradient-to-r ${demo.color} p-6 text-white`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{demo.icon}</span>
                  <h3 className="text-xl font-bold">{demo.title}</h3>
                </div>
                <p className="text-white/90">{demo.description}</p>
              </div>

              <CardContent className="p-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-neutral-900 mb-3">Key Features:</h4>
                  <ul className="space-y-2">
                    {demo.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 text-neutral-600">
                        <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-4">
                    <Link href={demo.href}>
                      <Button 
                        variant="primary" 
                        fullWidth
                        className="group-hover:scale-105 transition-transform duration-200"
                      >
                        Explore {demo.title} →
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Implementation Highlights */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-neutral-900 mb-12">
            Implementation Highlights
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  Technical Excellence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-neutral-600">
                  <li>• Next.js 15 with App Router</li>
                  <li>• TypeScript with strict typing</li>
                  <li>• CVA for component variants</li>
                  <li>• Tailwind CSS with design tokens</li>
                  <li>• Framer Motion principles</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  Mobile-First Design
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-neutral-600">
                  <li>• Touch-optimized interactions</li>
                  <li>• Swipeable navigation</li>
                  <li>• Bottom sheet modals</li>
                  <li>• Pull-to-refresh</li>
                  <li>• Responsive breakpoints</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">✨</span>
                  User Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-neutral-600">
                  <li>• Confetti celebrations</li>
                  <li>• Toast notifications</li>
                  <li>• Smooth transitions</li>
                  <li>• Loading states</li>
                  <li>• Micro-interactions</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-teal-500 to-purple-500 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Explore?</h3>
            <p className="text-lg text-teal-100 mb-6 max-w-2xl mx-auto">
              Start with any demo above to experience the enhanced community platform features.
              Each demo showcases different aspects of the modern, mobile-first design system.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/enhanced-demo">
                <Button variant="secondary" size="lg" className="min-w-[200px]">
                  🚀 Enhanced Features
                </Button>
              </Link>
              <Link href="/design-system">
                <Button variant="outline" size="lg" className="min-w-[200px] border-white text-white hover:bg-white hover:text-teal-700">
                  🎨 Design System
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
