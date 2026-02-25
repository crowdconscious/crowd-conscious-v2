/**
 * Predictions route group layout
 * Access gate is enforced by middleware - this layout wraps all predictions routes
 */
export default function PredictionsRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
