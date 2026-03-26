import { useEffect, useRef } from 'react'
import type { CanvasImage } from '../stores/workspaceStore'
import { useWorkspaceStore } from '../stores/workspaceStore'

const THUMB_W = 160
const THUMB_H = 90

/** Draw all layer types onto a canvas context, scaled from the page's native size. */
function drawLayers(ctx: CanvasRenderingContext2D, page: CanvasImage, scaleX: number, scaleY: number) {
  // Overlay layers
  for (const layer of page.overlayLayers) {
    if (layer.visible === false) continue
    ctx.save()
    ctx.globalAlpha = Math.min(1, (layer.opacity / 100) * 0.85)
    const x = layer.x * scaleX
    const y = layer.y * scaleY
    const w = layer.width * scaleX
    const h = layer.height * scaleY
    if (layer.fillMode === 'gradient') {
      const grad = ctx.createLinearGradient(
        x, y,
        layer.gradientDirection === 'horizontal' ? x + w : x,
        layer.gradientDirection !== 'horizontal' ? y + h : y,
      )
      grad.addColorStop(0, layer.gradientFrom || layer.color)
      grad.addColorStop(1, layer.gradientTo || layer.color)
      ctx.fillStyle = grad
    } else {
      ctx.fillStyle = layer.color
    }
    ctx.fillRect(x, y, w, h)
    ctx.restore()
  }

  // Message window layers
  for (const layer of page.messageWindowLayers) {
    if (layer.visible === false) continue
    ctx.save()
    const x = layer.x * scaleX
    const y = layer.y * scaleY
    const w = layer.width * scaleX
    const h = layer.height * scaleY
    ctx.globalAlpha = Math.min(1, (layer.opacity / 100) * 0.92)
    ctx.fillStyle = '#111827'
    ctx.strokeStyle = '#4b5563'
    ctx.lineWidth = 1
    const r = Math.min(3, w * 0.05, h * 0.05)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    const speakerH = Math.max(4, h * 0.22)
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(x + 2, y + 2, w * 0.45, speakerH - 2)
    ctx.fillStyle = '#6b7280'
    const lineH = Math.max(2, h * 0.12)
    const startY = y + speakerH + 3
    for (let li = 0; li < 3 && startY + li * (lineH + 2) < y + h - 4; li++) {
      const lineW = li === 2 ? w * 0.55 : w * 0.85
      ctx.fillRect(x + 4, startY + li * (lineH + 2), lineW - 8, lineH)
    }
    ctx.restore()
  }

  // Mosaic layers
  for (const layer of page.mosaicLayers) {
    if (layer.visible === false) continue
    ctx.save()
    const x = layer.x * scaleX
    const y = layer.y * scaleY
    const w = layer.width * scaleX
    const h = layer.height * scaleY
    ctx.fillStyle = '#374151'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = '#4b5563'
    ctx.lineWidth = 0.5
    const step = 3
    for (let i = 0; i < w + step; i += step) {
      ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + h); ctx.stroke()
    }
    for (let j = 0; j < h + step; j += step) {
      ctx.beginPath(); ctx.moveTo(x, y + j); ctx.lineTo(x + w, y + j); ctx.stroke()
    }
    ctx.restore()
  }

  // Bubble layers
  for (const layer of page.bubbleLayers) {
    if (layer.visible === false) continue
    ctx.save()
    ctx.globalAlpha = 0.92
    ctx.fillStyle = layer.fillColor || '#ffffff'
    ctx.strokeStyle = layer.borderColor || '#374151'
    ctx.lineWidth = 1
    const cx = (layer.x + layer.width / 2) * scaleX
    const cy = (layer.y + layer.height / 2) * scaleY
    const rx = Math.max(2, (layer.width / 2) * scaleX)
    const ry = Math.max(2, (layer.height / 2) * scaleY)
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  // Text layers
  for (const layer of page.textLayers) {
    if (layer.visible === false) continue
    ctx.save()
    const px = layer.x * scaleX
    const py = layer.y * scaleY
    const fs = Math.max(5, layer.fontSize * Math.min(scaleX, scaleY))
    ctx.font = `bold ${fs}px "${layer.fontFamily || 'sans-serif'}", sans-serif`
    ctx.fillStyle = layer.color || '#ffffff'
    if (layer.strokeWidth > 0) {
      ctx.strokeStyle = layer.strokeColor || '#000'
      ctx.lineWidth = Math.max(1, layer.strokeWidth * Math.min(scaleX, scaleY) * 2)
      ctx.strokeText(layer.text.slice(0, 20), px, py + fs)
    }
    ctx.fillText(layer.text.slice(0, 20), px, py + fs)
    ctx.restore()
  }

  // Watermark layers
  for (const layer of page.watermarkLayers) {
    if (layer.visible === false) continue
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.fillStyle = layer.color || '#9ca3af'
    const wmText = (layer.text || 'WM').slice(0, 12)
    const wmFs = Math.max(4, 12 * Math.min(scaleX, scaleY))
    ctx.font = `${wmFs}px sans-serif`
    const wmX = layer.x > 0 ? layer.x * scaleX : THUMB_W * 0.68
    const wmY = layer.y > 0 ? layer.y * scaleY : THUMB_H * 0.88
    ctx.fillText(wmText, wmX, wmY)
    ctx.restore()
  }
}

type PageThumbProps = {
  page: CanvasImage
  isActive?: boolean
  className?: string
}

export function PageThumb({ page, isActive, className }: PageThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setPageThumbnail = useWorkspaceStore((s) => s.setPageThumbnail)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scaleX = THUMB_W / (page.width || 1920)
    const scaleY = THUMB_H / (page.height || 1080)

    const render = () => {
      ctx.clearRect(0, 0, THUMB_W, THUMB_H)
      // Checkerboard background
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, THUMB_W, THUMB_H)
      drawLayers(ctx, page, scaleX, scaleY)
      // Store as dataURL
      setPageThumbnail(page.id, canvas.toDataURL('image/jpeg', 0.7))
    }

    // Load base image if available
    if (page.sourceUrl) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, THUMB_W, THUMB_H)
        ctx.drawImage(img, 0, 0, THUMB_W, THUMB_H)
        drawLayers(ctx, page, scaleX, scaleY)
        setPageThumbnail(page.id, canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = render
      img.src = page.sourceUrl
    } else {
      render()
    }
  }, [
    page,
    page.id,
    page.sourceUrl,
    page.textLayers,
    page.messageWindowLayers,
    page.bubbleLayers,
    page.mosaicLayers,
    page.overlayLayers,
    page.watermarkLayers,
    setPageThumbnail,
  ])

  return (
    <canvas
      ref={canvasRef}
      width={THUMB_W}
      height={THUMB_H}
      className={[
        'block w-full rounded-lg object-cover',
        isActive ? 'ring-2 ring-[#bf8f52]' : 'ring-1 ring-[rgba(243,239,230,0.1)]',
        className,
      ].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  )
}
