import DesignSystemDemo from '../components/DesignSystemDemo'
import ThemeProvider from '../components/ThemeProvider'

export default function DesignSystemPage() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors duration-300">
        <DesignSystemDemo />
      </div>
    </ThemeProvider>
  )
}
