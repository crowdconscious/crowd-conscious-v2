'use client'

import { useState } from 'react'
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  ImpactBadge,
  Progress,
  FundingProgress,
  ToastProvider,
  useToast,
  Confetti,
  useConfetti,
  SwipeableTabs
} from '../components/ui'

export default function EnhancedDemoPage() {
  const [activeFeature, setActiveFeature] = useState<string | null>(null)
  
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white p-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">🚀 Enhanced Community Features</h1>
            <p className="text-xl text-teal-100">
              Experience the next generation of community engagement
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Feature Demos */}
          <DemoSection title="🎨 Design System Components">
            <ComponentShowcase />
          </DemoSection>

          <DemoSection title="📱 Mobile-First Interactions">
            <MobileInteractionsDemo />
          </DemoSection>

          <DemoSection title="✨ Visual Feedback System">
            <VisualFeedbackDemo />
          </DemoSection>

          <DemoSection title="🧱 Enhanced Content Layout">
            <ContentLayoutDemo />
          </DemoSection>
        </div>
      </div>
    </ToastProvider>
  )
}

function DemoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-8">{title}</h2>
      {children}
    </section>
  )
}

function ComponentShowcase() {
  const { addToast } = useToast()

  const showToast = (type: 'success' | 'error' | 'warning' | 'info') => {
    addToast({
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} notification`,
      description: `This is a ${type} toast message with auto-dismiss.`,
    })
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Button Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="primary" fullWidth>Primary Action</Button>
          <Button variant="secondary" fullWidth>Secondary</Button>
          <Button variant="ghost" fullWidth>Ghost Button</Button>
          <Button variant="destructive" size="sm">Destructive</Button>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Impact Badges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <ImpactBadge impact="clean-air">Clean Air</ImpactBadge>
            <ImpactBadge impact="clean-water">Water</ImpactBadge>
            <ImpactBadge impact="zero-waste">Zero Waste</ImpactBadge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Active</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="error">Urgent</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bars */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Indicators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FundingProgress
            currentFunding={7500}
            goalFunding={10000}
            variant="primary"
            animated
          />
          <Progress
            value={85}
            variant="success"
            showLabel
            label="Completion"
            animated
          />
        </CardContent>
      </Card>

      {/* Toast Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Toast System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" fullWidth onClick={() => showToast('success')}>
            Success Toast
          </Button>
          <Button variant="outline" size="sm" fullWidth onClick={() => showToast('error')}>
            Error Toast
          </Button>
          <Button variant="outline" size="sm" fullWidth onClick={() => showToast('warning')}>
            Warning Toast
          </Button>
          <Button variant="outline" size="sm" fullWidth onClick={() => showToast('info')}>
            Info Toast
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function MobileInteractionsDemo() {
  const tabs = [
    {
      id: 'content',
      label: 'Content',
      icon: '📄',
      badge: 12,
      content: (
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-4">Content Tab</h3>
          <p className="text-neutral-600">
            Swipe left/right or click tabs to navigate. Perfect for mobile browsing.
          </p>
        </div>
      )
    },
    {
      id: 'members',
      label: 'Members',
      icon: '👥',
      badge: 8,
      content: (
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-4">Members Tab</h3>
          <p className="text-neutral-600">
            Touch-friendly navigation with smooth animations and haptic feedback.
          </p>
        </div>
      )
    },
    {
      id: 'impact',
      label: 'Impact',
      icon: '📊',
      content: (
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-4">Impact Tab</h3>
          <p className="text-neutral-600">
            Responsive design that adapts to different screen sizes and orientations.
          </p>
        </div>
      )
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Swipeable Tabs</CardTitle>
      </CardHeader>
      <CardContent>
        <SwipeableTabs tabs={tabs} />
      </CardContent>
    </Card>
  )
}

function VisualFeedbackDemo() {
  const { fire: fireConfetti } = useConfetti()
  const { addToast } = useToast()

  const triggerSuccess = () => {
    fireConfetti()
    addToast({
      type: 'success',
      title: 'Success!',
      description: 'Action completed with confetti celebration!',
    })
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Confetti Celebrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-neutral-600">
            Celebrate user achievements with delightful confetti animations.
          </p>
          <Button 
            variant="primary" 
            fullWidth 
            onClick={triggerSuccess}
            leftIcon="🎉"
          >
            Trigger Success Animation
          </Button>
        </CardContent>
      </Card>

      <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <CardHeader>
          <CardTitle>Hover Interactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-neutral-600">
            Smooth hover effects and micro-interactions provide immediate feedback.
          </p>
          <div className="bg-gradient-to-r from-teal-500 to-purple-500 h-20 rounded-lg transform transition-transform duration-300 group-hover:scale-105 flex items-center justify-center text-white font-semibold">
            Hover me!
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ContentLayoutDemo() {
  const sampleContent = [
    {
      id: '1',
      type: 'need',
      title: 'Community Solar Installation',
      description: 'Help us install solar panels on the community center to reduce energy costs and promote renewable energy.',
      funding: { current: 7500, goal: 10000 },
      metrics: { votes: 23, rsvps: 0, completions: 3 }
    },
    {
      id: '2',
      type: 'event',
      title: 'Monthly Garden Workday',
      description: 'Join us for community garden maintenance and planting winter vegetables.',
      metrics: { votes: 0, rsvps: 18, completions: 0 }
    },
    {
      id: '3',
      type: 'poll',
      title: 'Next Workshop Topic',
      description: 'Help us decide what sustainability topic to focus on next.',
      metrics: { votes: 47, rsvps: 0, completions: 0 }
    }
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'need': return '💡'
      case 'event': return '📅'
      case 'poll': return '🗳️'
      default: return '📄'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'need': return 'from-blue-500 to-blue-600'
      case 'event': return 'from-purple-500 to-purple-600'
      case 'poll': return 'from-green-500 to-green-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sampleContent.map((item) => (
        <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          {/* Type Header */}
          <div className={`bg-gradient-to-r p-4 text-white ${getTypeColor(item.type)}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{getTypeIcon(item.type)}</span>
              <span className="font-semibold capitalize">{item.type}</span>
            </div>
          </div>

          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-lg text-neutral-900 group-hover:text-primary-600 transition-colors">
              {item.title}
            </h3>
            
            <p className="text-neutral-600 text-sm line-clamp-2">
              {item.description}
            </p>

            {/* Funding Progress for Needs */}
            {item.type === 'need' && item.funding && (
              <FundingProgress
                currentFunding={item.funding.current}
                goalFunding={item.funding.goal}
                variant="primary"
                animated
              />
            )}

            {/* Engagement Metrics */}
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              {item.metrics.votes > 0 && (
                <span className="flex items-center gap-1">
                  <span>👍</span>
                  {item.metrics.votes}
                </span>
              )}
              {item.metrics.rsvps > 0 && (
                <span className="flex items-center gap-1">
                  <span>✋</span>
                  {item.metrics.rsvps}
                </span>
              )}
              {item.metrics.completions > 0 && (
                <span className="flex items-center gap-1">
                  <span>✅</span>
                  {item.metrics.completions}
                </span>
              )}
            </div>

            {/* Quick Action Button */}
            <Button variant="outline" size="sm" fullWidth>
              {item.type === 'poll' ? '🗳️ Vote' : 
               item.type === 'event' ? '✋ RSVP' : 
               '💝 Support'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
