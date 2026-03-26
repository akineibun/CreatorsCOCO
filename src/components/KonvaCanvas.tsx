import { useCallback, useEffect, useRef, useState } from 'react'
import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { Image as KonvaImage, Layer, Line as KonvaLine, Rect, Shape, Stage } from 'react-konva'
import { getBubblePolygonPoints } from '../lib/bubbleShapes'
import type {
  CanvasBubbleLayer,
  CanvasImage,
  CanvasMosaicLayer,
  CanvasMessageWindowLayer,
  CanvasOverlayLayer,
  CanvasTextLayer,
  CanvasTransform,
  CanvasWatermarkLayer,
  ResizeHandle,
  RubyAnnotation,
} from '../stores/workspaceStore'
import { useBackendStore, parseBackendLayerSuggestion } from '../stores/backendStore'
import { useWorkspaceStore } from '../stores/workspaceStore'

// ── Constants ──────────────────────────────────────────────────────────────────

const CANVAS_W = 1920
const CANVAS_H = 1080
const HANDLE_SIZE = 14
const SELECTION_STROKE = 'rgba(191, 143, 82, 0.9)'

// ── Text helpers ───────────────────────────────────────────────────────────────

const wrapText = (text: string, maxCharsPerLine: number): string[] => {
  if (maxCharsPerLine <= 0) return [text]
  return text.split('\n').flatMap((line) => {
    if (line.length <= maxCharsPerLine) return [line]
    const chunks: string[] = []
    for (let i = 0; i < line.length; i += maxCharsPerLine) {
      chunks.push(line.slice(i, i + maxCharsPerLine))
    }
    return chunks
  })
}

const getWrappedLines = (layer: CanvasTextLayer): string[] => {
  const approxCharWidth = Math.max(1, layer.fontSize * 0.55 + layer.letterSpacing)
  const maxChars = Math.max(1, Math.floor(layer.maxWidth / approxCharWidth))
  return wrapText(layer.text, maxChars)
}

// ── Drawing helpers ────────────────────────────────────────────────────────────

/** Draw horizontal rich text (gradient, stroke, shadow, ruby) using Canvas 2D. */
const drawHorizontalText = (
  ctx: CanvasRenderingContext2D,
  layer: CanvasTextLayer,
  lines: string[],
) => {
  const { fontSize, fontFamily = 'sans-serif', color, lineHeight, letterSpacing, fillMode, gradientFrom, gradientTo, strokeWidth, strokeColor, shadowEnabled } = layer
  const ruby = layer.ruby ?? []
  const rubyFontSize = Math.max(8, Math.round(fontSize * 0.5))
  const rubyReserve = ruby.length > 0 ? rubyFontSize + 2 : 0

  ctx.save()

  // Background band
  const band = layer.backgroundBand
  if (band?.enabled) {
    const lineH2 = fontSize * lineHeight
    const rubyReserve2 = (layer.ruby?.length ?? 0) > 0 ? Math.max(8, Math.round(fontSize * 0.5)) + 2 : 0
    const totalH2 = lines.length * lineH2 + rubyReserve2
    ctx.save()
    ctx.globalAlpha = band.opacity
    ctx.fillStyle = band.color
    ctx.fillRect(-band.paddingX, -band.paddingY, layer.maxWidth + band.paddingX * 2, totalH2 + band.paddingY * 2)
    ctx.restore()
  }

  ctx.font = `${fontSize}px "${fontFamily}", sans-serif`
  ctx.textBaseline = 'top'

  if (shadowEnabled) {
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetX = 3
    ctx.shadowOffsetY = 3
  }

  const lineH = fontSize * lineHeight
  const totalW = layer.maxWidth

  // Track cumulative char index across all lines for ruby lookup
  let globalCharIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const baseY = i * lineH + rubyReserve
    const text = lines[i]

    // Compute per-character x positions (needed for ruby placement)
    const charPositions: number[] = []
    let cursorX = 0
    for (const ch of text) {
      charPositions.push(cursorX)
      cursorX += ctx.measureText(ch).width + letterSpacing
    }

    // Build fill
    if (fillMode === 'gradient') {
      const grad = ctx.createLinearGradient(0, baseY, totalW, baseY + fontSize)
      grad.addColorStop(0, gradientFrom)
      grad.addColorStop(1, gradientTo)
      ctx.fillStyle = grad
    } else {
      ctx.fillStyle = color
    }

    // Draw base chars
    for (let ci = 0; ci < text.length; ci++) {
      const ch = text[ci]
      const cx = charPositions[ci]
      if (strokeWidth > 0) {
        ctx.save()
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = strokeWidth * 2
        ctx.lineJoin = 'round'
        ctx.strokeText(ch, cx, baseY)
        ctx.restore()
      }
      ctx.fillText(ch, cx, baseY)
    }

    // Draw ruby annotations that overlap this line
    for (const ann of ruby) {
      // Convert global indices to line-local indices
      const localStart = ann.start - globalCharIndex
      const localEnd = ann.end - globalCharIndex
      const clampedStart = Math.max(0, localStart)
      const clampedEnd = Math.min(text.length, localEnd)
      if (clampedStart >= clampedEnd) continue

      // x range of the annotated base chars
      const xLeft = charPositions[clampedStart] ?? 0
      const xRight = clampedEnd < charPositions.length
        ? charPositions[clampedEnd] ?? cursorX
        : cursorX

      ctx.save()
      ctx.font = `${rubyFontSize}px sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillStyle = color
      const rubyW = ctx.measureText(ann.text).width
      const rubyX = xLeft + (xRight - xLeft - rubyW) / 2
      ctx.fillText(ann.text, rubyX, baseY - rubyFontSize - 2)
      ctx.restore()

      // Restore main font
      ctx.font = `${fontSize}px "${fontFamily}", sans-serif`
    }

    globalCharIndex += text.length
  }

  ctx.restore()
}

/** Draw vertical rich text (one char per column, right-to-left) using Canvas 2D. */
const drawVerticalText = (
  ctx: CanvasRenderingContext2D,
  layer: CanvasTextLayer,
) => {
  const { text, fontSize, fontFamily = 'sans-serif', color, lineHeight, letterSpacing, fillMode, gradientFrom, gradientTo, strokeWidth, strokeColor, shadowEnabled } = layer
  const ruby = layer.ruby ?? []
  const rubyFontSize = Math.max(7, Math.round(fontSize * 0.45))
  const rubyColW = ruby.length > 0 ? rubyFontSize + 3 : 0

  ctx.save()

  // Background band for vertical text
  const band2 = layer.backgroundBand
  if (band2?.enabled) {
    const vLines = text.split('\n')
    const colW2 = fontSize + letterSpacing + rubyColW
    const maxLen = Math.max(...vLines.map((l) => l.length))
    const totalW2 = vLines.length * colW2
    const totalH2 = maxLen * (fontSize * lineHeight + letterSpacing)
    ctx.save()
    ctx.globalAlpha = band2.opacity
    ctx.fillStyle = band2.color
    ctx.fillRect(-band2.paddingX, -band2.paddingY, totalW2 + band2.paddingX * 2, totalH2 + band2.paddingY * 2)
    ctx.restore()
  }

  ctx.font = `${fontSize}px "${fontFamily}", sans-serif`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'

  if (shadowEnabled) {
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetX = 3
    ctx.shadowOffsetY = 3
  }

  const charH = fontSize * lineHeight + letterSpacing
  const lines = text.split('\n')

  // Build a flat index → (lineIndex, charIndex) map for ruby lookups
  const flatChars: Array<{ lineIdx: number; charIdx: number }> = []
  for (let li = 0; li < lines.length; li++) {
    for (let ci = 0; ci < lines[li].length; ci++) {
      flatChars.push({ lineIdx: li, charIdx: ci })
    }
  }

  // Per-column x positions (right-to-left)
  // First column at x = columnCount-1 * colStep, last at 0
  const colStep = fontSize + letterSpacing + rubyColW
  let colX = (lines.length - 1) * colStep  // rightmost column

  let globalCharIndex = 0
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    let cursorY = 0

    // Build char positions for this column (for ruby)
    const charPositionsY: number[] = []

    for (let ci = 0; ci < line.length; ci++) {
      const ch = line[ci]
      charPositionsY.push(cursorY)

      const grad = fillMode === 'gradient'
        ? (() => {
            const g = ctx.createLinearGradient(colX, cursorY, colX, cursorY + fontSize)
            g.addColorStop(0, gradientFrom)
            g.addColorStop(1, gradientTo)
            return g
          })()
        : null

      if (strokeWidth > 0) {
        ctx.save()
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = strokeWidth * 2
        ctx.lineJoin = 'round'
        ctx.strokeText(ch, colX + fontSize / 2, cursorY)
        ctx.restore()
      }

      ctx.fillStyle = grad ?? color
      ctx.fillText(ch, colX + fontSize / 2, cursorY)
      cursorY += charH
    }

    // Draw ruby annotations for this column
    for (const ann of ruby) {
      const localStart = ann.start - globalCharIndex
      const localEnd = ann.end - globalCharIndex
      const clampedStart = Math.max(0, localStart)
      const clampedEnd = Math.min(line.length, localEnd)
      if (clampedStart >= clampedEnd) continue

      const yTop = charPositionsY[clampedStart] ?? 0
      const yBottom = clampedEnd < charPositionsY.length
        ? charPositionsY[clampedEnd] ?? cursorY
        : cursorY

      ctx.save()
      ctx.font = `${rubyFontSize}px sans-serif`
      ctx.textBaseline = 'top'
      ctx.textAlign = 'center'
      ctx.fillStyle = color

      // Draw ruby chars vertically to the right of the column
      const rubyX = colX + fontSize + 2 + rubyFontSize / 2
      const rubyCharH = (yBottom - yTop) / ann.text.length
      for (let ri = 0; ri < ann.text.length; ri++) {
        ctx.fillText(ann.text[ri], rubyX, yTop + ri * rubyCharH)
      }
      ctx.restore()

      ctx.font = `${fontSize}px "${fontFamily}", sans-serif`
      ctx.textAlign = 'center'
    }

    globalCharIndex += line.length
    colX -= colStep
  }

  ctx.restore()
}

// ── 9-slice message window drawing ─────────────────────────────────────────────

const drawMessageWindow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  frameStyle: 'classic' | 'soft' | 'neon',
  hasAsset: boolean,
) => {
  const borderColor = frameStyle === 'neon' ? '#76fff4' : frameStyle === 'soft' ? '#ffe6bf' : '#f3efe6'
  const edge = Math.max(12, Math.round(Math.min(width, height) * 0.12))
  const innerInset = Math.max(6, Math.round(edge * 0.45))

  // Background fill
  if (hasAsset) {
    const bg = ctx.createLinearGradient(x, y, x, y + height)
    bg.addColorStop(0, 'rgba(28,22,18,0.96)')
    bg.addColorStop(1, 'rgba(45,31,26,0.9)')
    ctx.fillStyle = bg
  } else if (frameStyle === 'neon') {
    const bg = ctx.createLinearGradient(x, y, x + width, y + height)
    bg.addColorStop(0, 'rgba(5,51,64,0.96)')
    bg.addColorStop(1, 'rgba(18,22,54,0.92)')
    ctx.fillStyle = bg
  } else if (frameStyle === 'soft') {
    const bg = ctx.createLinearGradient(x, y, x, y + height)
    bg.addColorStop(0, 'rgba(73,55,44,0.92)')
    bg.addColorStop(1, 'rgba(43,31,27,0.86)')
    ctx.fillStyle = bg
  } else {
    const bg = ctx.createLinearGradient(x, y, x, y + height)
    bg.addColorStop(0, 'rgba(28,22,18,0.94)')
    bg.addColorStop(1, 'rgba(20,16,13,0.88)')
    ctx.fillStyle = bg
  }
  ctx.fillRect(x, y, width, height)

  // Edge highlights
  ctx.fillStyle = 'rgba(255,244,214,0.10)'
  ctx.fillRect(x, y, width, edge)
  ctx.fillRect(x, y + height - edge, width, edge)
  ctx.fillRect(x, y, edge, height)
  ctx.fillRect(x + width - edge, y, edge, height)

  // Corner accents
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  ctx.fillRect(x, y, edge, edge)
  ctx.fillRect(x + width - edge, y, edge, edge)
  ctx.fillRect(x, y + height - edge, edge, edge)
  ctx.fillRect(x + width - edge, y + height - edge, edge, edge)

  // Border
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, width, height)
  ctx.strokeStyle = 'rgba(255,244,214,0.22)'
  ctx.strokeRect(x + innerInset, y + innerInset, width - innerInset * 2, height - innerInset * 2)

  if (frameStyle === 'neon') {
    ctx.shadowColor = 'rgba(118,255,244,0.4)'
    ctx.shadowBlur = 16
    ctx.strokeStyle = '#76fff4'
    ctx.lineWidth = 1.5
    ctx.strokeRect(x, y, width, height)
    ctx.shadowBlur = 0
    ctx.shadowColor = 'transparent'
  }
}

// ── Mosaic drawing ─────────────────────────────────────────────────────────────

const drawMosaic = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: 'pixelate' | 'blur' | 'noise',
  intensity: number,
) => {
  ctx.save()
  if (style === 'pixelate') {
    const blockSize = Math.max(4, intensity)
    ctx.fillStyle = 'rgba(36,27,21,0.15)'
    ctx.fillRect(x, y, width, height)
    for (let row = y; row < y + height; row += blockSize) {
      for (let col = x; col < x + width; col += blockSize) {
        const shade = 120 + Math.random() * 80
        ctx.fillStyle = `rgba(${shade},${shade - 10},${shade - 20},0.7)`
        ctx.fillRect(col, row, Math.min(blockSize - 1, x + width - col), Math.min(blockSize - 1, y + height - row))
      }
    }
  } else if (style === 'blur') {
    ctx.filter = `blur(${Math.max(4, intensity * 0.4)}px)`
    ctx.fillStyle = 'rgba(200,160,120,0.6)'
    ctx.fillRect(x, y, width, height)
    ctx.filter = 'none'
  } else {
    // noise
    const blockSize = Math.max(3, intensity)
    for (let row = y; row < y + height; row += blockSize) {
      for (let col = x; col < x + width; col += blockSize) {
        const v = Math.random()
        ctx.fillStyle = `rgba(${Math.round(v * 200 + 30)},${Math.round(v * 180 + 20)},${Math.round(v * 160 + 10)},0.75)`
        ctx.fillRect(col, row, Math.min(blockSize, x + width - col), Math.min(blockSize, y + height - row))
      }
    }
  }
  ctx.restore()
}

// ── Bubble drawing ─────────────────────────────────────────────────────────────

const drawBubble = (
  ctx: CanvasRenderingContext2D,
  layer: CanvasBubbleLayer,
) => {
  const { x, y, width, height, bubbleShape = 'round', shapeSeed = 0, fillColor, borderColor } = layer
  ctx.save()
  ctx.fillStyle = fillColor
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 2

  if (bubbleShape === 'round') {
    ctx.beginPath()
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (bubbleShape === 'rounded-rect') {
    const r = Math.min(height / 3, 32)
    if ('roundRect' in ctx) {
      ctx.beginPath()
      ;(ctx as unknown as { roundRect: (...args: unknown[]) => void }).roundRect(x, y, width, height, r)
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.fillRect(x, y, width, height)
      ctx.strokeRect(x, y, width, height)
    }
  } else {
    const pts = getBubblePolygonPoints(bubbleShape, shapeSeed)
    ctx.beginPath()
    ctx.moveTo(x + pts[0].x * width, y + pts[0].y * height)
    for (const p of pts.slice(1)) {
      ctx.lineTo(x + p.x * width, y + p.y * height)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

// ── Selection bounds helper ────────────────────────────────────────────────────

export type SelectionBounds = {
  left: number
  top: number
  right: number
  bottom: number
}

const getLayerBounds = (image: CanvasImage, ids: Set<string>): SelectionBounds | null => {
  const all: SelectionBounds[] = []

  for (const l of image.textLayers) {
    if (!ids.has(l.id) || !l.visible) continue
    const approxW = l.maxWidth
    const approxH = getWrappedLines(l).length * l.fontSize * l.lineHeight
    all.push({ left: l.x, top: l.y, right: l.x + approxW, bottom: l.y + approxH })
  }
  for (const l of image.bubbleLayers) {
    if (!ids.has(l.id) || !l.visible) continue
    all.push({ left: l.x, top: l.y, right: l.x + l.width, bottom: l.y + l.height })
  }
  for (const l of image.messageWindowLayers) {
    if (!ids.has(l.id) || !l.visible) continue
    all.push({ left: l.x, top: l.y, right: l.x + l.width, bottom: l.y + l.height })
  }
  for (const l of image.mosaicLayers) {
    if (!ids.has(l.id) || !l.visible) continue
    all.push({ left: l.x, top: l.y, right: l.x + l.width, bottom: l.y + l.height })
  }
  for (const l of image.overlayLayers) {
    if (!ids.has(l.id) || !l.visible) continue
    all.push({ left: l.x, top: l.y, right: l.x + l.width, bottom: l.y + l.height })
  }

  if (all.length === 0) return null
  return {
    left: Math.min(...all.map((b) => b.left)),
    top: Math.min(...all.map((b) => b.top)),
    right: Math.max(...all.map((b) => b.right)),
    bottom: Math.max(...all.map((b) => b.bottom)),
  }
}

const collectMarqueeIds = (
  image: CanvasImage,
  left: number,
  top: number,
  right: number,
  bottom: number,
): string[] => {
  const hit = (lx: number, ly: number, lr: number, lb: number) =>
    lx <= right && lr >= left && ly <= bottom && lb >= top

  return [
    ...image.textLayers
      .filter((l) => l.visible && l.x >= left && l.x <= right && l.y >= top && l.y <= bottom)
      .map((l) => l.id),
    ...image.bubbleLayers
      .filter((l) => l.visible && hit(l.x, l.y, l.x + l.width, l.y + l.height))
      .map((l) => l.id),
    ...image.mosaicLayers
      .filter((l) => l.visible && hit(l.x, l.y, l.x + l.width, l.y + l.height))
      .map((l) => l.id),
    ...image.overlayLayers
      .filter((l) => l.visible && hit(l.x, l.y, l.x + l.width, l.y + l.height))
      .map((l) => l.id),
  ]
}

// ── Backend preview types ──────────────────────────────────────────────────────

export type Sam3ReviewCandidate = {
  index: number
  x: number
  y: number
  width: number
  height: number
  selected: boolean
  focused: boolean
  style: 'pixelate' | 'blur' | 'noise'
  intensity: number
  label: string
}

export type NsfwReviewCandidate = {
  index: number
  x: number
  y: number
  width: number
  height: number
  selected: boolean
  focused: boolean
  color: string
  opacity: number
}

export type ManualSegmentPointPreview = {
  x: number
  y: number
  label: 0 | 1
}

// ── Props ──────────────────────────────────────────────────────────────────────

export type KonvaCanvasProps = {
  image: CanvasImage
  imageTransform: CanvasTransform | null
  selectedLayerId: string | null
  selectedLayerIds: string[]

  // Callbacks
  onSelectLayers: (ids: string[], additive: boolean) => void
  onMoveSelectedLayers: (dx: number, dy: number) => void
  onResizeSelectedLayers: (dx: number, dy: number, handle: ResizeHandle, preserveAspectRatio: boolean) => void
  onCursorMove?: (x: number, y: number) => void

  // Container styling
  className?: string
}

// ── Main component ─────────────────────────────────────────────────────────────

export function KonvaCanvas({
  image,
  imageTransform,
  selectedLayerId,
  selectedLayerIds,
  onSelectLayers,
  onMoveSelectedLayers,
  onResizeSelectedLayers,
  onCursorMove,
  className,
}: KonvaCanvasProps) {
  const {
    backendManualPointPickingMode,
    backendManualSegmentPoints,
    selectedBackendManualSegmentPointIndex,
    backendReviewStateByPage,
    setBackendManualPointPickingMode,
    setBackendManualSegmentPoints,
    setSelectedBackendManualSegmentPointIndex,
    updateBackendReviewStateByPage,
  } = useBackendStore()

  const { activeTool, addFreehandMosaicLayer } = useWorkspaceStore()
  const [freehandPath, setFreehandPath] = useState<Array<{ x: number; y: number }> | null>(null)

  // Derive active page review state for canvas overlays.
  // In practice only one page has candidates at a time; use the last entry.
  const allReviewStates = Object.values(backendReviewStateByPage)
  const activeReviewState = allReviewStates[allReviewStates.length - 1]

  const sam3AutoMosaic = activeReviewState?.backendActionResults.sam3AutoMosaic ?? []
  const nsfwDetections = activeReviewState?.backendActionResults.nsfwDetections ?? []
  const focusedSam3Index = activeReviewState?.focusedSam3ReviewCandidateIndex ?? null
  const focusedNsfwIndex = activeReviewState?.focusedNsfwReviewCandidateIndex ?? null

  const sam3ReviewCandidates: Sam3ReviewCandidate[] = sam3AutoMosaic.map((mask, index) => ({
    ...parseBackendLayerSuggestion(mask, index),
    index,
    selected: activeReviewState?.backendActionResults.sam3AutoMosaicSelection[index] !== false,
    focused: focusedSam3Index === index,
    label: activeReviewState?.backendActionResults.sam3AutoMosaicLabel[index]?.trim() || `SAM3 candidate ${index + 1}`,
    style: activeReviewState?.backendActionResults.sam3AutoMosaicStyle[index] ?? 'pixelate',
    intensity: activeReviewState?.backendActionResults.sam3AutoMosaicIntensity[index] ?? 16,
  }))

  const nsfwReviewCandidates: NsfwReviewCandidate[] = nsfwDetections.map((detection, index) => ({
    ...parseBackendLayerSuggestion(detection, index),
    index,
    selected: activeReviewState?.backendActionResults.nsfwDetectionSelection[index] !== false,
    focused: focusedNsfwIndex === index,
    label: activeReviewState?.backendActionResults.nsfwDetectionLabel[index]?.trim() || `NSFW candidate ${index + 1}`,
    color: activeReviewState?.backendActionResults.nsfwDetectionColor[index] ?? '#ff4d6d',
    opacity: activeReviewState?.backendActionResults.nsfwDetectionOpacity[index] ?? 0.4,
  }))

  // Manual segment points: local drag state (manualPtDragState below) overrides
  // the display position in render, so we pass the raw points here.
  const manualSegmentPoints: ManualSegmentPointPreview[] = backendManualSegmentPoints

  const onSam3ReviewCandidateClick = (index: number) => {
    updateBackendReviewStateByPage((byPage) => {
      const keys = Object.keys(byPage)
      const key = keys[keys.length - 1]
      if (!key) return byPage
      return { ...byPage, [key]: { ...byPage[key]!, focusedSam3ReviewCandidateIndex: index } }
    })
  }

  const onNsfwReviewCandidateClick = (index: number) => {
    updateBackendReviewStateByPage((byPage) => {
      const keys = Object.keys(byPage)
      const key = keys[keys.length - 1]
      if (!key) return byPage
      return { ...byPage, [key]: { ...byPage[key]!, focusedNsfwReviewCandidateIndex: index } }
    })
  }

  const onManualSegmentPointClick = (index: number) => {
    setSelectedBackendManualSegmentPointIndex(index)
  }

  const onManualSegmentPointDragEnd = (index: number, x: number, y: number) => {
    setBackendManualSegmentPoints((current) =>
      current.map((pt, i) => (i === index ? { ...pt, x, y } : pt)),
    )
    setSelectedBackendManualSegmentPointIndex(index)
  }

  const onCanvasPointerUp = (x: number, y: number) => {
    const label: 1 | 0 = backendManualPointPickingMode === 'negative' ? 0 : 1
    setBackendManualSegmentPoints((current) => [...current, { x, y, label }])
    setSelectedBackendManualSegmentPointIndex(backendManualSegmentPoints.length)
    setBackendManualPointPickingMode('off')
  }
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [displayWidth, setDisplayWidth] = useState(720)

  // Measure container for responsive Stage sizing
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setDisplayWidth(Math.round(entry.contentRect.width))
    })
    obs.observe(el)
    setDisplayWidth(Math.round(el.getBoundingClientRect().width) || 720)
    return () => obs.disconnect()
  }, [])

  const displayHeight = Math.round(displayWidth * (CANVAS_H / CANVAS_W))
  const scale = displayWidth / CANVAS_W

  // ── Interaction state ──────────────────────────────────────────────────────

  type DragState = { startX: number; startY: number; currentX: number; currentY: number }
  type ResizeState = DragState & { handle: ResizeHandle; preserveAspectRatio: boolean }
  type MarqueeState = { startX: number; startY: number; currentX: number; currentY: number; additive: boolean }
  type ManualPtDragState = { index: number; startX: number; startY: number; currentX: number; currentY: number }

  const [dragState, setDragState] = useState<DragState | null>(null)
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)
  const [marqueeState, setMarqueeState] = useState<MarqueeState | null>(null)
  const [manualPtDragState, setManualPtDragState] = useState<ManualPtDragState | null>(null)

  // ── Source image loading ───────────────────────────────────────────────────

  useEffect(() => {
    if (!image.sourceUrl) {
      setBgImage(null)
      return
    }
    const img = new Image()
    img.onload = () => setBgImage(img)
    img.onerror = () => setBgImage(null)
    img.src = image.sourceUrl
  }, [image.sourceUrl])

  // ── Coordinate helpers ─────────────────────────────────────────────────────

  const getStageCanvasPos = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current
    if (!stage) return null
    const pos = stage.getPointerPosition()
    if (!pos) return null
    return { x: Math.round(pos.x / scale), y: Math.round(pos.y / scale) }
  }, [scale])

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

  // ── Selection helpers ──────────────────────────────────────────────────────

  const effectiveSelectedIds = new Set(
    selectedLayerIds.length > 0
      ? selectedLayerIds.filter((id) => id !== 'base-image')
      : selectedLayerId && selectedLayerId !== 'base-image'
        ? [selectedLayerId]
        : [],
  )

  const dragDelta = dragState
    ? { x: dragState.currentX - dragState.startX, y: dragState.currentY - dragState.startY }
    : null

  const selectionBounds = effectiveSelectedIds.size > 0
    ? getLayerBounds(image, effectiveSelectedIds)
    : null

  const displaySelectionBounds = selectionBounds && dragDelta
    ? {
        left: selectionBounds.left + dragDelta.x,
        top: selectionBounds.top + dragDelta.y,
        right: selectionBounds.right + dragDelta.x,
        bottom: selectionBounds.bottom + dragDelta.y,
      }
    : selectionBounds

  const marqueeBounds = marqueeState
    ? {
        left: Math.min(marqueeState.startX, marqueeState.currentX),
        top: Math.min(marqueeState.startY, marqueeState.currentY),
        right: Math.max(marqueeState.startX, marqueeState.currentX),
        bottom: Math.max(marqueeState.startY, marqueeState.currentY),
      }
    : null

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleLayerPointerDown = useCallback(
    (e: KonvaEventObject<MouseEvent>, layerId: string) => {
      if (e.evt.button !== 0) return
      e.cancelBubble = true

      if (!effectiveSelectedIds.has(layerId)) return
      if (dragState || resizeState) return

      const pos = getStageCanvasPos()
      if (!pos) return
      setDragState({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveSelectedIds, dragState, resizeState, getStageCanvasPos],
  )

  const handleLayerClick = useCallback(
    (e: KonvaEventObject<MouseEvent>, layerId: string) => {
      e.cancelBubble = true
      if (dragState) return
      onSelectLayers([layerId], e.evt.ctrlKey || e.evt.metaKey)
    },
    [dragState, onSelectLayers],
  )

  const handleResizeHandlePointerDown = useCallback(
    (e: KonvaEventObject<MouseEvent>, handle: ResizeHandle) => {
      e.cancelBubble = true
      const pos = getStageCanvasPos()
      if (!pos) return
      setResizeState({
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
        handle,
        preserveAspectRatio: e.evt.shiftKey,
      })
    },
    [getStageCanvasPos],
  )

  const handleManualPtPointerDown = useCallback(
    (e: KonvaEventObject<MouseEvent>, index: number) => {
      e.cancelBubble = true
      onManualSegmentPointClick(index)
      const pos = getStageCanvasPos()
      if (!pos) return
      setManualPtDragState({ index, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
    },
    [getStageCanvasPos, onManualSegmentPointClick],
  )

  const handleStagePointerDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (e.target !== e.target.getStage()) return
      if (backendManualPointPickingMode !== 'off') return
      if (dragState || resizeState) return
      const pos = getStageCanvasPos()
      if (!pos) return
      if (activeTool === 'freehand-mosaic') {
        setFreehandPath([{ x: pos.x, y: pos.y }])
        return
      }
      setMarqueeState({
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
        additive: e.evt.ctrlKey || e.evt.metaKey,
      })
    },
    [backendManualPointPickingMode, dragState, resizeState, getStageCanvasPos, activeTool],
  )

  const handleStagePointerMove = useCallback(() => {
    const pos = getStageCanvasPos()
    if (!pos) return

    onCursorMove?.(pos.x, pos.y)

    if (freehandPath) {
      setFreehandPath((p) => p ? [...p, { x: pos.x, y: pos.y }] : p)
      return
    }
    if (manualPtDragState) {
      setManualPtDragState((s) => s ? { ...s, currentX: pos.x, currentY: pos.y } : s)
      return
    }
    if (dragState) {
      setDragState((s) => s ? { ...s, currentX: pos.x, currentY: pos.y } : s)
      return
    }
    if (resizeState) {
      setResizeState((s) => s ? { ...s, currentX: pos.x, currentY: pos.y } : s)
      return
    }
    if (marqueeState) {
      setMarqueeState((s) => s ? { ...s, currentX: pos.x, currentY: pos.y } : s)
    }
  }, [getStageCanvasPos, onCursorMove, freehandPath, manualPtDragState, dragState, resizeState, marqueeState])

  const handleStagePointerUp = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const pos = getStageCanvasPos()
      if (!pos) return

      if (freehandPath) {
        const finalPath = [...freehandPath, { x: pos.x, y: pos.y }]
        if (finalPath.length >= 3) {
          addFreehandMosaicLayer(finalPath, 'pixelate', 16)
        }
        setFreehandPath(null)
        return
      }

      if (manualPtDragState) {
        onManualSegmentPointDragEnd(manualPtDragState.index, clamp(pos.x, 0, CANVAS_W), clamp(pos.y, 0, CANVAS_H))
        setManualPtDragState(null)
        return
      }

      if (backendManualPointPickingMode !== 'off') {
        onCanvasPointerUp(clamp(pos.x, 0, CANVAS_W), clamp(pos.y, 0, CANVAS_H))
        return
      }

      if (resizeState) {
        onResizeSelectedLayers(
          resizeState.currentX - resizeState.startX,
          resizeState.currentY - resizeState.startY,
          resizeState.handle,
          resizeState.preserveAspectRatio,
        )
        setResizeState(null)
        return
      }

      if (dragState) {
        const dx = dragState.currentX - dragState.startX
        const dy = dragState.currentY - dragState.startY
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          onMoveSelectedLayers(dx, dy)
        }
        setDragState(null)
        return
      }

      if (marqueeState) {
        const mb = {
          left: Math.min(marqueeState.startX, marqueeState.currentX),
          top: Math.min(marqueeState.startY, marqueeState.currentY),
          right: Math.max(marqueeState.startX, marqueeState.currentX),
          bottom: Math.max(marqueeState.startY, marqueeState.currentY),
        }
        if (mb.right - mb.left < 4 && mb.bottom - mb.top < 4) {
          // Tiny click on background = deselect
          if (!(e.evt.ctrlKey || e.evt.metaKey)) {
            onSelectLayers([], false)
          }
        } else {
          const ids = collectMarqueeIds(image, mb.left, mb.top, mb.right, mb.bottom)
          onSelectLayers(ids, marqueeState.additive)
        }
        setMarqueeState(null)
      }
    },
    [
      getStageCanvasPos,
      freehandPath,
      addFreehandMosaicLayer,
      manualPtDragState,
      backendManualPointPickingMode,
      resizeState,
      dragState,
      marqueeState,
      onManualSegmentPointDragEnd,
      onCanvasPointerUp,
      onResizeSelectedLayers,
      onMoveSelectedLayers,
      onSelectLayers,
      image,
    ],
  )

  // ── Layer position with drag preview ──────────────────────────────────────

  const layerX = (baseX: number, id: string) =>
    effectiveSelectedIds.has(id) && dragDelta ? baseX + dragDelta.x : baseX
  const layerY = (baseY: number, id: string) =>
    effectiveSelectedIds.has(id) && dragDelta ? baseY + dragDelta.y : baseY

  // ── Background image dimensions ────────────────────────────────────────────

  const bgX = imageTransform ? imageTransform.x : 0
  const bgY = imageTransform ? imageTransform.y : 0
  const bgW = imageTransform ? imageTransform.width : image.width
  const bgH = imageTransform ? imageTransform.height : image.height

  // ── Resize handle positions ────────────────────────────────────────────────

  const buildHandles = (b: SelectionBounds) => {
    const mx = (b.left + b.right) / 2
    const my = (b.top + b.bottom) / 2
    const h = HANDLE_SIZE / scale
    return [
      { handle: 'top-left' as ResizeHandle, cx: b.left, cy: b.top },
      { handle: 'top' as ResizeHandle, cx: mx, cy: b.top },
      { handle: 'top-right' as ResizeHandle, cx: b.right, cy: b.top },
      { handle: 'left' as ResizeHandle, cx: b.left, cy: my },
      { handle: 'right' as ResizeHandle, cx: b.right, cy: my },
      { handle: 'bottom-left' as ResizeHandle, cx: b.left, cy: b.bottom },
      { handle: 'bottom' as ResizeHandle, cx: mx, cy: b.bottom },
      { handle: 'bottom-right' as ResizeHandle, cx: b.right, cy: b.bottom },
    ].map((hd) => ({ ...hd, hs: h }))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className={className} style={{ lineHeight: 0 }}>
    <Stage
      ref={stageRef}
      width={displayWidth}
      height={displayHeight}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={handleStagePointerDown}
      onMouseMove={handleStagePointerMove}
      onMouseUp={handleStagePointerUp}
      style={{ cursor: backendManualPointPickingMode !== 'off' ? 'crosshair' : dragState ? 'grabbing' : 'default' }}
    >
      {/* ── Background image layer ── */}
      <Layer>
        {/* Checkerboard placeholder when no image */}
        <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#f4ede3" />
        {bgImage && (
          <KonvaImage
            image={bgImage}
            x={bgX}
            y={bgY}
            width={bgW}
            height={bgH}
          />
        )}
      </Layer>

      {/* ── Content layer ── */}
      <Layer>
        {/* Overlay layers */}
        {image.overlayLayers.filter((l) => l.visible).map((layer) => (
          <OverlayNode
            key={layer.id}
            layer={layer}
            x={layerX(layer.x, layer.id)}
            y={layerY(layer.y, layer.id)}
            selected={effectiveSelectedIds.has(layer.id)}
            onPointerDown={(e) => handleLayerPointerDown(e, layer.id)}
            onClick={(e) => handleLayerClick(e, layer.id)}
          />
        ))}

        {/* Mosaic layers */}
        {image.mosaicLayers.filter((l) => l.visible).map((layer) => (
          <MosaicNode
            key={layer.id}
            layer={layer}
            x={layerX(layer.x, layer.id)}
            y={layerY(layer.y, layer.id)}
            selected={effectiveSelectedIds.has(layer.id)}
            onPointerDown={(e) => handleLayerPointerDown(e, layer.id)}
            onClick={(e) => handleLayerClick(e, layer.id)}
          />
        ))}

        {/* Message window layers */}
        {image.messageWindowLayers.filter((l) => l.visible).map((layer) => (
          <MessageWindowNode
            key={layer.id}
            layer={layer}
            x={layerX(layer.x, layer.id)}
            y={layerY(layer.y, layer.id)}
            selected={effectiveSelectedIds.has(layer.id)}
            onPointerDown={(e) => handleLayerPointerDown(e, layer.id)}
            onClick={(e) => handleLayerClick(e, layer.id)}
          />
        ))}

        {/* Bubble layers */}
        {image.bubbleLayers.filter((l) => l.visible).map((layer) => (
          <BubbleNode
            key={layer.id}
            layer={layer}
            x={layerX(layer.x, layer.id)}
            y={layerY(layer.y, layer.id)}
            selected={effectiveSelectedIds.has(layer.id)}
            onPointerDown={(e) => handleLayerPointerDown(e, layer.id)}
            onClick={(e) => handleLayerClick(e, layer.id)}
          />
        ))}

        {/* Text layers */}
        {image.textLayers.filter((l) => l.visible).map((layer) =>
          layer.isVertical ? (
            <VerticalTextNode
              key={layer.id}
              layer={layer}
              x={layerX(layer.x, layer.id)}
              y={layerY(layer.y, layer.id)}
              selected={effectiveSelectedIds.has(layer.id)}
              onPointerDown={(e) => handleLayerPointerDown(e, layer.id)}
              onClick={(e) => handleLayerClick(e, layer.id)}
            />
          ) : (
            <HorizontalTextNode
              key={layer.id}
              layer={layer}
              x={layerX(layer.x, layer.id)}
              y={layerY(layer.y, layer.id)}
              selected={effectiveSelectedIds.has(layer.id)}
              onPointerDown={(e) => handleLayerPointerDown(e, layer.id)}
              onClick={(e) => handleLayerClick(e, layer.id)}
            />
          ),
        )}

        {/* Watermark layers */}
        {image.watermarkLayers.filter((l) => l.visible).map((layer) => (
          <WatermarkNode
            key={layer.id}
            layer={layer}
            selected={effectiveSelectedIds.has(layer.id)}
            onClick={(e) => handleLayerClick(e, layer.id)}
          />
        ))}

        {/* SAM3 review candidates */}
        {sam3ReviewCandidates.map((c) => (
          <Rect
            key={`sam3-${c.index}`}
            x={c.x}
            y={c.y}
            width={c.width}
            height={c.height}
            fill={c.selected ? 'rgba(255,215,177,0.38)' : 'rgba(255,215,177,0.15)'}
            stroke={c.focused ? '#ffaa44' : 'rgba(255,180,80,0.6)'}
            strokeWidth={c.focused ? 3 / scale : 1.5 / scale}
            onClick={(e) => { e.cancelBubble = true; onSam3ReviewCandidateClick(c.index) }}
          />
        ))}

        {/* NSFW review candidates */}
        {nsfwReviewCandidates.map((c) => (
          <Rect
            key={`nsfw-${c.index}`}
            x={c.x}
            y={c.y}
            width={c.width}
            height={c.height}
            fill={`${c.color}22`}
            stroke={c.color}
            strokeWidth={(c.focused ? 3 : 1.5) / scale}
            opacity={c.opacity}
            onClick={(e) => { e.cancelBubble = true; onNsfwReviewCandidateClick(c.index) }}
          />
        ))}

        {/* Manual segment points */}
        {manualSegmentPoints.map((pt, i) => {
          const displayPt = manualPtDragState?.index === i
            ? { x: manualPtDragState.currentX, y: manualPtDragState.currentY }
            : pt
          const r = 12 / scale
          return (
            <Shape
              key={`mpt-${i}`}
              sceneFunc={(ctx, shape) => {
                ctx.beginPath()
                ctx.arc(0, 0, r, 0, Math.PI * 2)
                ctx.fillStyle = pt.label === 1 ? '#4ade80' : '#f87171'
                ctx.fill()
                ctx.strokeStyle = selectedBackendManualSegmentPointIndex === i ? '#ffffff' : 'rgba(255,255,255,0.5)'
                ctx.lineWidth = (selectedBackendManualSegmentPointIndex === i ? 2.5 : 1.5) / scale
                ctx.stroke()
                ctx.fillStyle = '#fff'
                ctx.font = `bold ${11 / scale}px sans-serif`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(String(i + 1), 0, 0)
                shape.setAttr('_cached', true)
              }}
              x={displayPt.x}
              y={displayPt.y}
              onMouseDown={(e) => handleManualPtPointerDown(e, i)}
              onClick={(e) => { e.cancelBubble = true; onManualSegmentPointClick(i) }}
            />
          )
        })}
      </Layer>

      {/* ── UI overlay layer (selection / marquee) ── */}
      <Layer listening={false}>
        {/* Selection bounds */}
        {displaySelectionBounds && !resizeState && (
          <Rect
            x={displaySelectionBounds.left}
            y={displaySelectionBounds.top}
            width={displaySelectionBounds.right - displaySelectionBounds.left}
            height={displaySelectionBounds.bottom - displaySelectionBounds.top}
            stroke={SELECTION_STROKE}
            strokeWidth={2 / scale}
            fill="rgba(191,143,82,0.04)"
            listening={false}
          />
        )}
        {/* Marquee selection */}
        {marqueeBounds && (
          <Rect
            x={marqueeBounds.left}
            y={marqueeBounds.top}
            width={marqueeBounds.right - marqueeBounds.left}
            height={marqueeBounds.bottom - marqueeBounds.top}
            stroke="rgba(36,27,21,0.7)"
            strokeWidth={1.5 / scale}
            dash={[6 / scale, 3 / scale]}
            fill="rgba(191,143,82,0.12)"
            listening={false}
          />
        )}
        {/* Freehand mosaic path preview */}
        {freehandPath && freehandPath.length >= 2 && (
          <KonvaLine
            points={freehandPath.flatMap((p) => [p.x, p.y])}
            stroke="rgba(191,143,82,0.9)"
            strokeWidth={2 / scale}
            dash={[4 / scale, 2 / scale]}
            fill="rgba(191,143,82,0.12)"
            closed={false}
            listening={false}
          />
        )}
      </Layer>

      {/* ── Resize handles layer (needs listening) ── */}
      <Layer>
        {displaySelectionBounds && !dragState && !resizeState && (
          <>
            {buildHandles(displaySelectionBounds).map(({ handle, cx, cy, hs }) => (
              <Rect
                key={handle}
                x={cx - hs / 2}
                y={cy - hs / 2}
                width={hs}
                height={hs}
                fill="#ffffff"
                stroke={SELECTION_STROKE}
                strokeWidth={1.5 / scale}
                cornerRadius={2 / scale}
                onMouseDown={(e) => handleResizeHandlePointerDown(e, handle)}
              />
            ))}
          </>
        )}
      </Layer>
    </Stage>
    </div>
  )
}

// ── Sub-nodes ──────────────────────────────────────────────────────────────────

type NodeProps<T> = {
  layer: T
  x: number
  y: number
  selected: boolean
  onPointerDown: (e: KonvaEventObject<MouseEvent>) => void
  onClick: (e: KonvaEventObject<MouseEvent>) => void
}

// ── Horizontal text node ───────────────────────────────────────────────────────

function HorizontalTextNode({ layer, x, y, selected, onPointerDown, onClick }: NodeProps<CanvasTextLayer>) {
  const lines = getWrappedLines(layer)
  const lineH = layer.fontSize * layer.lineHeight
  const totalH = lines.length * lineH

  return (
    <Shape
      x={x}
      y={y}
      width={layer.maxWidth}
      height={totalH}
      rotation={layer.rotation ?? 0}
      sceneFunc={(ctx) => {
        drawHorizontalText(ctx as unknown as CanvasRenderingContext2D, layer, lines)
      }}
      hitFunc={(ctx, shape) => {
        ctx.beginPath()
        ctx.rect(0, 0, shape.width(), shape.height())
        ctx.closePath()
        ctx.fillStrokeShape(shape)
      }}
      stroke={selected ? SELECTION_STROKE : undefined}
      strokeWidth={selected ? 0 : 0}
      onMouseDown={onPointerDown}
      onClick={onClick}
    />
  )
}

// ── Vertical text node ─────────────────────────────────────────────────────────

function VerticalTextNode({ layer, x, y, selected, onPointerDown, onClick }: NodeProps<CanvasTextLayer>) {
  const lines = layer.text.split('\n')
  const colW = layer.fontSize + layer.letterSpacing
  const totalW = lines.length * colW
  const maxLineLen = Math.max(...lines.map((l) => l.length))
  const totalH = maxLineLen * (layer.fontSize * layer.lineHeight + layer.letterSpacing)

  return (
    <Shape
      x={x}
      y={y}
      width={totalW}
      height={totalH}
      rotation={layer.rotation ?? 0}
      sceneFunc={(ctx) => {
        drawVerticalText(ctx as unknown as CanvasRenderingContext2D, layer)
      }}
      hitFunc={(ctx, shape) => {
        ctx.beginPath()
        ctx.rect(0, 0, shape.width(), shape.height())
        ctx.closePath()
        ctx.fillStrokeShape(shape)
      }}
      onMouseDown={onPointerDown}
      onClick={onClick}
    />
  )
}

// ── Overlay node ───────────────────────────────────────────────────────────────

function OverlayNode({
  layer,
  x,
  y,
  selected,
  onPointerDown,
  onClick,
}: NodeProps<CanvasOverlayLayer>) {
  return (
    <Shape
      x={x}
      y={y}
      width={layer.width}
      height={layer.height}
      opacity={layer.opacity}
      sceneFunc={(ctx, shape) => {
        const w = shape.width()
        const h = shape.height()
        let fill: string | CanvasGradient

        if (layer.fillMode === 'gradient') {
          const angle =
            layer.gradientDirection === 'vertical' ? 180 :
            layer.gradientDirection === 'horizontal' ? 90 : 135
          const rad = (angle * Math.PI) / 180
          const grad = (ctx as unknown as CanvasRenderingContext2D).createLinearGradient(
            0, 0, Math.cos(rad) * w, Math.sin(rad) * h,
          )
          grad.addColorStop(0, layer.gradientFrom)
          grad.addColorStop(1, layer.gradientTo)
          fill = grad
        } else {
          fill = layer.color
        }

        ctx.fillStyle = fill
        ctx.fillRect(0, 0, w, h)

        if (selected) {
          ctx.strokeStyle = SELECTION_STROKE
          ctx.lineWidth = 2
          ctx.strokeRect(0, 0, w, h)
        }
      }}
      onMouseDown={onPointerDown}
      onClick={onClick}
    />
  )
}

// ── Mosaic node ────────────────────────────────────────────────────────────────

function MosaicNode({
  layer,
  x,
  y,
  selected,
  onPointerDown,
  onClick,
}: NodeProps<CanvasMosaicLayer>) {
  return (
    <Shape
      x={x}
      y={y}
      width={layer.width}
      height={layer.height}
      sceneFunc={(ctx, shape) => {
        const w = shape.width()
        const h = shape.height()
        const cctx = ctx as unknown as CanvasRenderingContext2D
        if (layer.shape === 'freehand' && layer.path && layer.path.length >= 3) {
          cctx.save()
          cctx.beginPath()
          cctx.moveTo(layer.path[0].x, layer.path[0].y)
          for (const pt of layer.path.slice(1)) cctx.lineTo(pt.x, pt.y)
          cctx.closePath()
          cctx.clip()
          drawMosaic(cctx, 0, 0, w, h, layer.style, layer.intensity)
          cctx.restore()
          if (selected) {
            cctx.strokeStyle = SELECTION_STROKE
            cctx.lineWidth = 2
            cctx.beginPath()
            cctx.moveTo(layer.path[0].x, layer.path[0].y)
            for (const pt of layer.path.slice(1)) cctx.lineTo(pt.x, pt.y)
            cctx.closePath()
            cctx.stroke()
          }
        } else {
          drawMosaic(cctx, 0, 0, w, h, layer.style, layer.intensity)
          if (selected) {
            ctx.strokeStyle = SELECTION_STROKE
            ctx.lineWidth = 2
            ctx.strokeRect(0, 0, w, h)
          }
        }
      }}
      onMouseDown={onPointerDown}
      onClick={onClick}
    />
  )
}

// ── Message window node ────────────────────────────────────────────────────────

function MessageWindowNode({
  layer,
  x,
  y,
  selected,
  onPointerDown,
  onClick,
}: NodeProps<CanvasMessageWindowLayer>) {
  const { fontSize, lineH, speakerH } = (() => {
    const fs = Math.max(16, Math.round(layer.height * 0.12))
    const lh = fs * 1.4
    const sh = layer.speaker ? Math.round(layer.height * 0.22) : 0
    return { fontSize: fs, lineH: lh, speakerH: sh }
  })()
  const nineSliceImgRef = useRef<HTMLImageElement | null>(null)
  const [nineSliceLoaded, setNineSliceLoaded] = useState(false)
  useEffect(() => {
    if (!layer.assetDataUrl) { nineSliceImgRef.current = null; setNineSliceLoaded(false); return }
    const img = new Image()
    img.onload = () => { nineSliceImgRef.current = img; setNineSliceLoaded(true) }
    img.onerror = () => { nineSliceImgRef.current = null; setNineSliceLoaded(false) }
    img.src = layer.assetDataUrl
  }, [layer.assetDataUrl])

  return (
    <Shape
      x={x}
      y={y}
      opacity={layer.opacity}
      sceneFunc={(ctx, shape) => {
        const cctx = ctx as unknown as CanvasRenderingContext2D
        const w = layer.width
        const h = layer.height
        if (nineSliceLoaded && nineSliceImgRef.current) {
          // 9-slice rendering
          const img = nineSliceImgRef.current
          const s = Math.min(32, Math.floor(img.width / 3), Math.floor(img.height / 3))
          const iw = img.width, ih = img.height
          const mw = iw - s * 2, mh = ih - s * 2
          const dw = w - s * 2, dh = h - s * 2
          // Corners
          cctx.drawImage(img, 0, 0, s, s, 0, 0, s, s)
          cctx.drawImage(img, iw - s, 0, s, s, w - s, 0, s, s)
          cctx.drawImage(img, 0, ih - s, s, s, 0, h - s, s, s)
          cctx.drawImage(img, iw - s, ih - s, s, s, w - s, h - s, s, s)
          // Edges
          if (dw > 0) {
            cctx.drawImage(img, s, 0, mw, s, s, 0, dw, s)
            cctx.drawImage(img, s, ih - s, mw, s, s, h - s, dw, s)
          }
          if (dh > 0) {
            cctx.drawImage(img, 0, s, s, mh, 0, s, s, dh)
            cctx.drawImage(img, iw - s, s, s, mh, w - s, s, s, dh)
          }
          // Center
          if (dw > 0 && dh > 0) cctx.drawImage(img, s, s, mw, mh, s, s, dw, dh)
        } else {
          drawMessageWindow(cctx, 0, 0, w, h, layer.frameStyle, layer.assetName !== null)
        }

        // Speaker name
        if (layer.speaker) {
          const borderColor = layer.frameStyle === 'neon' ? '#76fff4' : layer.frameStyle === 'soft' ? '#ffe6bf' : '#f3efe6'
          cctx.fillStyle = borderColor
          cctx.font = `bold ${fontSize}px sans-serif`
          cctx.textBaseline = 'middle'
          cctx.fillText(layer.speaker, 20, speakerH / 2)
        }

        // Body text
        const bodyFontSize = Math.max(14, Math.round(layer.height * 0.1))
        cctx.fillStyle = 'rgba(243,239,230,0.92)'
        cctx.font = `${bodyFontSize}px sans-serif`
        cctx.textBaseline = 'top'
        const bodyLines = layer.body.split('\n')
        bodyLines.forEach((line, i) => {
          cctx.fillText(line, 20, speakerH + 12 + i * lineH)
        })

        if (selected) {
          cctx.strokeStyle = SELECTION_STROKE
          cctx.lineWidth = 2
          cctx.strokeRect(0, 0, w, h)
        }
        shape.setAttr('width', w)
        shape.setAttr('height', h)
      }}
      hitFunc={(ctx, shape) => {
        ctx.beginPath()
        ctx.rect(0, 0, layer.width, layer.height)
        ctx.closePath()
        ctx.fillStrokeShape(shape)
      }}
      onMouseDown={onPointerDown}
      onClick={onClick}
    />
  )
}

// ── Bubble node ────────────────────────────────────────────────────────────────

function BubbleNode({
  layer,
  x,
  y,
  selected,
  onPointerDown,
  onClick,
}: NodeProps<CanvasBubbleLayer>) {
  return (
    <Shape
      x={x}
      y={y}
      sceneFunc={(ctx) => {
        const cctx = ctx as unknown as CanvasRenderingContext2D
        drawBubble(cctx, { ...layer, x: 0, y: 0 })

        // Bubble text
        const { text, width, height, fontSize: _fs } = layer as CanvasBubbleLayer & { fontSize?: number }
        const fs = _fs ?? Math.max(14, Math.round(Math.min(width, height) * 0.18))
        cctx.fillStyle = '#241b15'
        cctx.font = `${fs}px sans-serif`
        cctx.textAlign = 'center'
        cctx.textBaseline = 'middle'
        cctx.fillText(text, width / 2, height / 2)

        if (selected) {
          cctx.strokeStyle = SELECTION_STROKE
          cctx.lineWidth = 2
          cctx.strokeRect(0, 0, width, height)
        }
      }}
      hitFunc={(ctx, shape) => {
        ctx.beginPath()
        ctx.ellipse(layer.width / 2, layer.height / 2, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fillStrokeShape(shape)
      }}
      onMouseDown={onPointerDown}
      onClick={onClick}
    />
  )
}

// ── Watermark node ─────────────────────────────────────────────────────────────

function WatermarkNode({
  layer,
  selected,
  onClick,
}: {
  layer: CanvasWatermarkLayer
  selected: boolean
  onClick: (e: KonvaEventObject<MouseEvent>) => void
}) {
  const displayText = layer.repeated
    ? Array.from({ length: Math.max(3, layer.density + 2) }, () => layer.text).join(' • ')
    : layer.text

  return (
    <Shape
      x={layer.x}
      y={layer.y}
      opacity={layer.opacity}
      sceneFunc={(ctx) => {
        const cctx = ctx as unknown as CanvasRenderingContext2D
        cctx.save()
        cctx.translate(0, 0)
        cctx.rotate((layer.angle * Math.PI) / 180)
        cctx.scale(layer.scale, layer.scale)
        cctx.fillStyle = layer.color
        cctx.font = `bold 48px sans-serif`
        cctx.textBaseline = 'middle'
        ;(cctx as unknown as Record<string, unknown>).letterSpacing = `${0.08 * layer.density}em`
        cctx.fillText(layer.mode === 'image' ? `[${layer.assetName ?? 'watermark.png'}]` : displayText, 0, 0)
        cctx.restore()
        if (selected) {
          cctx.strokeStyle = SELECTION_STROKE
          cctx.lineWidth = 2
          const m = cctx.measureText(displayText)
          cctx.strokeRect(-4, -28, m.width + 8, 56)
        }
      }}
      onClick={onClick}
    />
  )
}
