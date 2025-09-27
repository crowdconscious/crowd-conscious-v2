import React from 'react'
import { cardVariants, cn, type CardVariants } from '@/lib/design-system'

interface CardProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    CardVariants {
  children: React.ReactNode
  hover?: boolean
  as?: any
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    children, 
    variant, 
    size, 
    interactive, 
    hover = true,
    className,
    as: Component = 'div',
    ...props 
  }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          cardVariants({ variant, size, interactive }),
          hover && interactive && 'group',
          className
        )}
        {...props}
      >
        {children}
        
        {/* Subtle glow effect on hover for interactive cards */}
        {interactive && hover && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary-500/5 to-purple-500/5 rounded-[inherit] transition-opacity duration-300 pointer-events-none" />
        )}
      </Component>
    )
  }
)

Card.displayName = 'Card'

// Card subcomponents for better composition
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-1.5", className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight text-neutral-900 dark:text-neutral-100",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-neutral-600 dark:text-neutral-400", className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("pt-4", className)}
    {...props}
  />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  cardVariants 
}
export type { CardProps }
