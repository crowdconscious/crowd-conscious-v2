import { cva, type VariantProps } from 'class-variance-authority'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility function for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// =============================================================================
// SPACING SCALE - Fluid responsive spacing system
// =============================================================================

export const spacing = {
  xs: 'var(--space-xs)', // 0.25rem (4px)
  sm: 'var(--space-sm)', // 0.5rem (8px)
  md: 'var(--space-md)', // 1rem (16px)
  lg: 'var(--space-lg)', // 1.5rem (24px)
  xl: 'var(--space-xl)', // 2rem (32px)
  '2xl': 'var(--space-2xl)', // 3rem (48px)
  '3xl': 'var(--space-3xl)', // 4rem (64px)
  '4xl': 'var(--space-4xl)', // 6rem (96px)
  '5xl': 'var(--space-5xl)', // 8rem (128px)
}

// =============================================================================
// TYPOGRAPHY SCALE - Fluid typography with perfect scaling
// =============================================================================

export const typography = {
  'heading-1': 'var(--text-heading-1)', // Massive headings
  'heading-2': 'var(--text-heading-2)', // Large headings
  'heading-3': 'var(--text-heading-3)', // Medium headings
  'heading-4': 'var(--text-heading-4)', // Small headings
  'body-lg': 'var(--text-body-lg)',     // Large body text
  'body-md': 'var(--text-body-md)',     // Regular body text
  'body-sm': 'var(--text-body-sm)',     // Small body text
  'caption': 'var(--text-caption)',     // Captions and labels
}

// =============================================================================
// COLOR SYSTEM - Complete theme-aware color palette
// =============================================================================

export const colors = {
  // Brand colors
  primary: {
    50: 'var(--color-primary-50)',
    100: 'var(--color-primary-100)',
    200: 'var(--color-primary-200)',
    300: 'var(--color-primary-300)',
    400: 'var(--color-primary-400)',
    500: 'var(--color-primary-500)', // Main teal
    600: 'var(--color-primary-600)',
    700: 'var(--color-primary-700)',
    800: 'var(--color-primary-800)',
    900: 'var(--color-primary-900)',
  },
  
  // Impact colors for badges and progress
  impact: {
    'clean-air': 'var(--color-clean-air)',     // Light blue
    'clean-water': 'var(--color-clean-water)', // Blue
    'safe-cities': 'var(--color-safe-cities)', // Pink
    'zero-waste': 'var(--color-zero-waste)',   // Orange
    'fair-trade': 'var(--color-fair-trade)',   // Green
  },

  // Semantic colors
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',

  // Neutral scale
  neutral: {
    0: 'var(--color-neutral-0)',
    50: 'var(--color-neutral-50)',
    100: 'var(--color-neutral-100)',
    200: 'var(--color-neutral-200)',
    300: 'var(--color-neutral-300)',
    400: 'var(--color-neutral-400)',
    500: 'var(--color-neutral-500)',
    600: 'var(--color-neutral-600)',
    700: 'var(--color-neutral-700)',
    800: 'var(--color-neutral-800)',
    900: 'var(--color-neutral-900)',
    950: 'var(--color-neutral-950)',
  }
}

// =============================================================================
// ANIMATION SYSTEM - Consistent motion design
// =============================================================================

export const animations = {
  // Easing functions
  easing: {
    'ease-out-cubic': 'cubic-bezier(0.33, 1, 0.68, 1)',
    'ease-in-cubic': 'cubic-bezier(0.32, 0, 0.67, 0)',
    'ease-in-out-cubic': 'cubic-bezier(0.65, 0, 0.35, 1)',
    'ease-out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
    'ease-spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  // Duration scale
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },

  // Keyframes for reusable animations
  keyframes: {
    'fade-in': {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    'slide-up': {
      '0%': { transform: 'translateY(10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    'slide-down': {
      '0%': { transform: 'translateY(-10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    'scale-in': {
      '0%': { transform: 'scale(0.95)', opacity: '0' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
    'bounce-in': {
      '0%': { transform: 'scale(0.3)', opacity: '0' },
      '50%': { transform: 'scale(1.05)' },
      '70%': { transform: 'scale(0.9)' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
    'shimmer': {
      '0%': { transform: 'translateX(-100%)' },
      '100%': { transform: 'translateX(100%)' },
    },
    'pulse-glow': {
      '0%, 100%': { 
        boxShadow: '0 0 0 0 rgba(20, 184, 166, 0.4)',
        transform: 'scale(1)',
      },
      '50%': { 
        boxShadow: '0 0 0 10px rgba(20, 184, 166, 0)',
        transform: 'scale(1.02)',
      },
    },
  }
}

// =============================================================================
// BUTTON VARIANTS - Complete button system with CVA
// =============================================================================

export const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center',
    'font-semibold transition-all duration-250',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'relative overflow-hidden',
    'select-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-gradient-to-r from-primary-600 to-primary-700',
          'text-white shadow-lg shadow-primary-500/25',
          'hover:from-primary-700 hover:to-primary-800',
          'hover:shadow-xl hover:shadow-primary-500/30',
          'hover:scale-[1.02]',
          'active:scale-[0.98] active:shadow-md',
          'focus-visible:ring-primary-500',
        ],
        secondary: [
          'bg-white border-2 border-primary-200',
          'text-primary-700 shadow-sm',
          'hover:bg-primary-50 hover:border-primary-300',
          'hover:shadow-md hover:scale-[1.02]',
          'active:scale-[0.98]',
          'focus-visible:ring-primary-500',
          'dark:bg-neutral-800 dark:border-neutral-600',
          'dark:text-primary-300 dark:hover:bg-neutral-700',
        ],
        ghost: [
          'text-primary-700 hover:bg-primary-50',
          'hover:text-primary-800',
          'focus-visible:ring-primary-500',
          'dark:text-primary-300 dark:hover:bg-primary-900/20',
        ],
        destructive: [
          'bg-gradient-to-r from-red-600 to-red-700',
          'text-white shadow-lg shadow-red-500/25',
          'hover:from-red-700 hover:to-red-800',
          'hover:shadow-xl hover:shadow-red-500/30',
          'focus-visible:ring-red-500',
        ],
        outline: [
          'border border-neutral-200 bg-transparent',
          'text-neutral-900 hover:bg-neutral-50',
          'hover:border-neutral-300',
          'focus-visible:ring-neutral-500',
          'dark:border-neutral-700 dark:text-neutral-100',
          'dark:hover:bg-neutral-800',
        ],
      },
      size: {
        sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
        md: 'px-4 py-2 text-base rounded-lg gap-2',
        lg: 'px-6 py-3 text-lg rounded-xl gap-3',
        xl: 'px-8 py-4 text-xl rounded-2xl gap-4',
        icon: 'p-2 rounded-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
)

export type ButtonVariants = VariantProps<typeof buttonVariants>

// =============================================================================
// CARD VARIANTS - Flexible card system
// =============================================================================

export const cardVariants = cva(
  [
    'rounded-xl transition-all duration-250',
    'focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2',
    'focus-within:ring-primary-500',
  ],
  {
    variants: {
      variant: {
        elevated: [
          'bg-white shadow-lg border border-neutral-100',
          'hover:shadow-xl hover:-translate-y-1',
          'dark:bg-neutral-800 dark:border-neutral-700',
          'dark:shadow-2xl dark:shadow-black/20',
        ],
        outlined: [
          'bg-white border-2 border-neutral-200',
          'hover:border-primary-300 hover:shadow-md',
          'dark:bg-neutral-800 dark:border-neutral-600',
          'dark:hover:border-primary-500',
        ],
        filled: [
          'bg-neutral-50 border border-neutral-200',
          'hover:bg-neutral-100 hover:shadow-sm',
          'dark:bg-neutral-900 dark:border-neutral-700',
          'dark:hover:bg-neutral-800',
        ],
        glass: [
          'bg-white/80 backdrop-blur-md border border-white/20',
          'shadow-lg hover:bg-white/90',
          'dark:bg-neutral-800/80 dark:border-neutral-700/20',
          'dark:hover:bg-neutral-800/90',
        ],
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      interactive: {
        true: 'cursor-pointer',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'elevated',
      size: 'md',
      interactive: false,
    },
  }
)

export type CardVariants = VariantProps<typeof cardVariants>

// =============================================================================
// BADGE VARIANTS - Impact and status badges
// =============================================================================

export const badgeVariants = cva(
  [
    'inline-flex items-center justify-center',
    'px-2.5 py-0.5 rounded-full text-xs font-medium',
    'transition-colors duration-150',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
        secondary: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
        success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        'clean-air': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
        'clean-water': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'safe-cities': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
        'zero-waste': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        'fair-trade': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export type BadgeVariants = VariantProps<typeof badgeVariants>

// =============================================================================
// PROGRESS BAR VARIANTS - Animated progress indicators
// =============================================================================

export const progressVariants = cva(
  [
    'relative overflow-hidden rounded-full bg-neutral-200',
    'dark:bg-neutral-700',
  ],
  {
    variants: {
      size: {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3',
        xl: 'h-4',
      },
      variant: {
        primary: '[&>div]:bg-gradient-to-r [&>div]:from-primary-500 [&>div]:to-primary-600',
        success: '[&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-green-600',
        warning: '[&>div]:bg-gradient-to-r [&>div]:from-yellow-500 [&>div]:to-yellow-600',
        error: '[&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-red-600',
        'clean-air': '[&>div]:bg-gradient-to-r [&>div]:from-sky-400 [&>div]:to-sky-500',
        'clean-water': '[&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-blue-600',
        'safe-cities': '[&>div]:bg-gradient-to-r [&>div]:from-pink-500 [&>div]:to-pink-600',
        'zero-waste': '[&>div]:bg-gradient-to-r [&>div]:from-orange-500 [&>div]:to-orange-600',
        'fair-trade': '[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-600',
      },
      animated: {
        true: '[&>div]:relative [&>div]:overflow-hidden [&>div]:[background-size:200%_100%] [&>div]:animate-pulse',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'primary',
      animated: false,
    },
  }
)

export type ProgressVariants = VariantProps<typeof progressVariants>

// =============================================================================
// INPUT VARIANTS - Form field styling
// =============================================================================

export const inputVariants = cva(
  [
    'w-full rounded-lg border transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'placeholder:text-neutral-400',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-neutral-300 bg-white',
          'focus:border-primary-500 focus:ring-primary-500/20',
          'dark:border-neutral-600 dark:bg-neutral-800',
          'dark:focus:border-primary-400',
        ],
        error: [
          'border-red-300 bg-white',
          'focus:border-red-500 focus:ring-red-500/20',
          'dark:border-red-600 dark:bg-neutral-800',
        ],
        success: [
          'border-green-300 bg-white',
          'focus:border-green-500 focus:ring-green-500/20',
          'dark:border-green-600 dark:bg-neutral-800',
        ],
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-3 py-2 text-base',
        lg: 'px-4 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export type InputVariants = VariantProps<typeof inputVariants>

// =============================================================================
// SKELETON VARIANTS - Loading states
// =============================================================================

export const skeletonVariants = cva(
  [
    'animate-pulse bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200',
    'bg-[length:200%_100%] rounded',
    'dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700',
  ],
  {
    variants: {
      variant: {
        default: '',
        shimmer: 'animate-[shimmer_2s_infinite]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export type SkeletonVariants = VariantProps<typeof skeletonVariants>

// =============================================================================
// UTILITY CLASSES - Common styling patterns
// =============================================================================

export const utilityClasses = {
  // Focus states
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500',
  
  // Micro-interactions
  pressable: 'active:scale-[0.98] transition-transform duration-100',
  hoverable: 'hover:scale-[1.02] transition-transform duration-200',
  
  // Glass morphism
  glass: 'bg-white/80 backdrop-blur-md border border-white/20 dark:bg-neutral-800/80 dark:border-neutral-700/20',
  
  // Gradient backgrounds
  gradientPrimary: 'bg-gradient-to-r from-primary-600 to-primary-700',
  gradientSecondary: 'bg-gradient-to-r from-purple-600 to-pink-600',
  gradientSuccess: 'bg-gradient-to-r from-green-500 to-emerald-600',
  
  // Text gradients
  textGradientPrimary: 'bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent',
  textGradientSecondary: 'bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent',
  
  // Shadows
  shadowSoft: 'shadow-lg shadow-neutral-200/50 dark:shadow-black/20',
  shadowMedium: 'shadow-xl shadow-neutral-300/50 dark:shadow-black/30',
  shadowHard: 'shadow-2xl shadow-neutral-400/50 dark:shadow-black/40',
}

// =============================================================================
// RESPONSIVE BREAKPOINTS - Consistent breakpoint system
// =============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

// =============================================================================
// THEME CONFIGURATION - Dark mode and theme switching
// =============================================================================

export type Theme = 'light' | 'dark' | 'system'

export const themeConfig = {
  themes: ['light', 'dark', 'system'] as const,
  defaultTheme: 'system' as Theme,
  storageKey: 'crowd-conscious-theme',
}

// =============================================================================
// COMPONENT PRESETS - Pre-configured component combinations
// =============================================================================

export const presets = {
  // Hero CTA button
  heroCTA: cn(
    buttonVariants({ variant: 'primary', size: 'xl' }),
    'shadow-2xl shadow-primary-500/30',
    'hover:shadow-3xl hover:shadow-primary-500/40',
    'transform transition-all duration-300',
  ),
  
  // Community card
  communityCard: cn(
    cardVariants({ variant: 'elevated', size: 'md' }),
    'group cursor-pointer',
    'hover:-translate-y-2 hover:shadow-2xl',
    'transition-all duration-300',
  ),
  
  // Impact badge
  impactBadge: cn(
    badgeVariants({ size: 'md' }),
    'font-semibold tracking-wide',
    'shadow-sm',
  ),
  
  // Progress bar with animation
  animatedProgress: cn(
    progressVariants({ variant: 'primary', size: 'md', animated: true }),
    'shadow-inner',
  ),
}

export default {
  cn,
  spacing,
  typography,
  colors,
  animations,
  buttonVariants,
  cardVariants,
  badgeVariants,
  progressVariants,
  inputVariants,
  skeletonVariants,
  utilityClasses,
  breakpoints,
  themeConfig,
  presets,
}
