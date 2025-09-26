'use client'

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
  Skeleton,
  SkeletonCard,
  CommunityCardSkeleton,
} from './ui'

export default function DesignSystemDemo() {
  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">
          Crowd Conscious Design System
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          A comprehensive component library built with CVA and consistent theming
        </p>
        <div className="text-neutral-600">Theme controls will be available soon!</div>
      </div>

      {/* Buttons */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Buttons</h2>
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra Large</Button>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button loading>Loading</Button>
            <Button leftIcon="🚀">With Icon</Button>
            <Button rightIcon="→">Arrow</Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Cards</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card variant="elevated" interactive>
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600 dark:text-neutral-400">
                This card has elevation with hover effects.
              </p>
            </CardContent>
          </Card>

          <Card variant="outlined" interactive>
            <CardHeader>
              <CardTitle>Outlined Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600 dark:text-neutral-400">
                This card has a clean border design.
              </p>
            </CardContent>
          </Card>

          <Card variant="glass" interactive>
            <CardHeader>
              <CardTitle>Glass Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600 dark:text-neutral-400">
                This card has a glassmorphism effect.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Badges</h2>
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">Primary</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <ImpactBadge impact="clean-air">Clean Air</ImpactBadge>
            <ImpactBadge impact="clean-water">Clean Water</ImpactBadge>
            <ImpactBadge impact="safe-cities">Safe Cities</ImpactBadge>
            <ImpactBadge impact="zero-waste">Zero Waste</ImpactBadge>
            <ImpactBadge impact="fair-trade">Fair Trade</ImpactBadge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
            <Badge pulse>Pulsing</Badge>
          </div>
        </div>
      </section>

      {/* Progress Bars */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Progress</h2>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <Progress value={25} variant="primary" showLabel label="Primary Progress" />
            <Progress value={50} variant="success" showLabel label="Success Progress" />
            <Progress value={75} variant="warning" showLabel label="Warning Progress" />
            <Progress value={90} variant="error" showLabel label="Error Progress" />
          </div>

          <div className="space-y-4">
            <Progress value={65} variant="clean-air" showLabel label="Clean Air Impact" />
            <Progress value={40} variant="clean-water" showLabel label="Clean Water Impact" />
            <Progress value={80} variant="zero-waste" showLabel label="Zero Waste Impact" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Community Garden Project</CardTitle>
            </CardHeader>
            <CardContent>
              <FundingProgress 
                currentFunding={7500} 
                goalFunding={10000}
                variant="success"
                pulse
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Solar Panel Installation</CardTitle>
            </CardHeader>
            <CardContent>
              <FundingProgress 
                currentFunding={12000} 
                goalFunding={8000}
                variant="success"
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Loading Skeletons */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Loading States</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <CommunityCardSkeleton />
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton height="1rem" width="60%" />
                  <Skeleton height="0.75rem" width="40%" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton height="0.75rem" width="100%" />
              <Skeleton height="0.75rem" width="80%" />
              <Skeleton height="0.75rem" width="60%" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Micro-interactions Demo */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Micro-interactions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            interactive 
            className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          >
            <CardHeader>
              <CardTitle>Hover to Scale</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600 dark:text-neutral-400">
                This card scales up on hover with smooth animation.
              </p>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-primary-500 to-purple-500 transform transition-transform duration-500 group-hover:scale-110" />
            <CardHeader>
              <CardTitle>Gradient Zoom</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600 dark:text-neutral-400">
                The gradient background zooms on hover.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
