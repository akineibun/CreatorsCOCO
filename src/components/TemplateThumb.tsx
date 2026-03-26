import { useEffect, useRef } from 'react'
import type { PageTemplate } from '../stores/workspaceStore'

const THUMB_W = 160
const THUMB_H = 90
const SCALE = THUMB_W / 1920

export function TemplateThumb({ template }: { template: PageTemplate }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.clearRect(0, 0, THUMB_W, THUMB_H)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, THUMB_W, THUMB_H)

    // Overlay layers
    for (const layer of template.overlayLayers) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, (layer.opacity / 100) * 0.85)
      if (layer.fillMode === 'gradient') {
        const grad = ctx.createLinearGradient(
          layer.x * SCALE,
          layer.y * SCALE,
          layer.fillMode === 'gradient' && layer.gradientDirection === 'horizontal'
            ? (layer.x + layer.width) * SCALE
            : layer.x * SCALE,
          layer.fillMode === 'gradient' && layer.gradientDirection !== 'horizontal'
            ? (layer.y + layer.height) * SCALE
            : layer.y * SCALE,
        )
        grad.addColorStop(0, layer.gradientFrom || layer.color)
        grad.addColorStop(1, layer.gradientTo || layer.color)
        ctx.fillStyle = grad
      } else {
        ctx.fillStyle = layer.color
      }
      ctx.fillRect(layer.x * SCALE, layer.y * SCALE, layer.width * SCALE, layer.height * SCALE)
      ctx.restore()
    }

    // Message window layers
    for (const layer of template.messageWindowLayers) {
      ctx.save()
      const x = layer.x * SCALE
      const y = layer.y * SCALE
      const w = layer.width * SCALE
      const h = layer.height * SCALE
      ctx.globalAlpha = Math.min(1, (layer.opacity / 100) * 0.92)
      // Panel body
      ctx.fillStyle = '#111827'
      ctx.strokeStyle = '#4b5563'
      ctx.lineWidth = 1
      ctx.beginPath()
      const r = 3
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
      // Speaker name bar
      const speakerH = Math.max(4, h * 0.22)
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(x + 2, y + 2, w * 0.45, speakerH - 2)
      // Body text lines (simulated)
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
    for (const layer of template.mosaicLayers) {
      ctx.save()
      const x = layer.x * SCALE
      const y = layer.y * SCALE
      const w = layer.width * SCALE
      const h = layer.height * SCALE
      ctx.fillStyle = '#374151'
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = '#4b5563'
      ctx.lineWidth = 0.5
      const step = 3
      for (let i = 0; i < w + step; i += step) {
        ctx.beginPath()
        ctx.moveTo(x + i, y)
        ctx.lineTo(x + i, y + h)
        ctx.stroke()
      }
      for (let j = 0; j < h + step; j += step) {
        ctx.beginPath()
        ctx.moveTo(x, y + j)
        ctx.lineTo(x + w, y + j)
        ctx.stroke()
      }
      ctx.restore()
    }

    // Bubble layers
    for (const layer of template.bubbleLayers) {
      ctx.save()
      ctx.globalAlpha = 0.92
      ctx.fillStyle = layer.fillColor || '#ffffff'
      ctx.strokeStyle = layer.borderColor || '#374151'
      ctx.lineWidth = 1
      const cx = (layer.x + layer.width / 2) * SCALE
      const cy = (layer.y + layer.height / 2) * SCALE
      const rx = (layer.width / 2) * SCALE
      const ry = (layer.height / 2) * SCALE
      ctx.beginPath()
      ctx.ellipse(cx, cy, Math.max(2, rx), Math.max(2, ry), 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    // Text layers
    for (const layer of template.textLayers) {
      ctx.save()
      const px = layer.x * SCALE
      const py = layer.y * SCALE
      const fs = Math.max(5, layer.fontSize * SCALE)
      ctx.font = `bold ${fs}px "${layer.fontFamily || 'sans-serif'}", sans-serif`
      ctx.fillStyle = layer.color || '#ffffff'
      if (layer.strokeWidth > 0) {
        ctx.strokeStyle = layer.strokeColor || '#000'
        ctx.lineWidth = Math.max(1, layer.strokeWidth * SCALE * 2)
        ctx.strokeText(layer.text.slice(0, 16), px, py + fs)
      }
      ctx.fillText(layer.text.slice(0, 16), px, py + fs)
      ctx.restore()
    }

    // Watermark layers
    for (const layer of template.watermarkLayers) {
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.fillStyle = layer.color || '#9ca3af'
      const wmText = (layer.text || 'WM').slice(0, 12)
      const wmFs = Math.max(4, 12 * SCALE)
      ctx.font = `${wmFs}px sans-serif`
      const wmX = layer.x > 0 ? layer.x * SCALE : THUMB_W * 0.68
      const wmY = layer.y > 0 ? layer.y * SCALE : THUMB_H * 0.88
      ctx.fillText(wmText, wmX, wmY)
      ctx.restore()
    }
  }, [template])

  return (
    <canvas
      ref={canvasRef}
      width={THUMB_W}
      height={THUMB_H}
      className="template-thumb"
      aria-hidden="true"
    />
  )
}
