/**
 * Map camera helpers (Task 4c follow-up): overview = full CDMX framing;
 * detail = Cuauhtémoc + Miguel Hidalgo with padding. SVG viewBox animation
 * keeps polygon paths stable while zooming.
 */

export type MapCamera = 'overview' | 'detail'

export type SvgViewBox = {
  x: number
  y: number
  width: number
  height: number
}

export const MAP_CAMERA_ZOOM_MS = 1200

/** Ease-in-out cubic — smooth start/end for the zoom. */
export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export function interpolateViewBox(
  from: SvgViewBox,
  to: SvgViewBox,
  t: number,
): SvgViewBox {
  const e = easeInOutCubic(t)
  return {
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e,
    width: from.width + (to.width - from.width) * e,
    height: from.height + (to.height - from.height) * e,
  }
}

export function viewBoxToString(vb: SvgViewBox): string {
  return `${vb.x} ${vb.y} ${vb.width} ${vb.height}`
}

export function overviewViewBox(width: number, height: number): SvgViewBox {
  return { x: 0, y: 0, width, height }
}

/**
 * Fit a viewBox around projected points (e.g. active alcaldía vertices)
 * preserving the viewport aspect ratio and adding padding.
 */
export function detailViewBoxFromPoints(
  points: readonly [number, number][],
  viewportWidth: number,
  viewportHeight: number,
  paddingPx = 28,
): SvgViewBox {
  if (
    points.length === 0 ||
    viewportWidth < 8 ||
    viewportHeight < 8
  ) {
    return overviewViewBox(viewportWidth, viewportHeight)
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return overviewViewBox(viewportWidth, viewportHeight)
  }

  const pad = Math.max(8, paddingPx)
  const contentW = Math.max(1, maxX - minX)
  const contentH = Math.max(1, maxY - minY)
  const aspect = viewportWidth / viewportHeight

  // Grow the content box with padding, then expand to match viewport aspect.
  let boxW = contentW + pad * 2
  let boxH = contentH + pad * 2
  if (boxW / boxH > aspect) {
    boxH = boxW / aspect
  } else {
    boxW = boxH * aspect
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return {
    x: cx - boxW / 2,
    y: cy - boxH / 2,
    width: boxW,
    height: boxH,
  }
}

/**
 * Convert a desired on-screen dot diameter (px) into SVG user-space radius
 * given the current viewBox vs viewport.
 */
export function userSpaceDotRadius(
  screenDiameterPx: number,
  viewBox: SvgViewBox,
  viewportWidth: number,
): number {
  if (viewportWidth <= 0 || viewBox.width <= 0) return screenDiameterPx / 2
  const scale = viewBox.width / viewportWidth
  return (screenDiameterPx / 2) * scale
}
