import type { CanvasImage, CanvasTransform, OutputSettings } from '../../stores/workspaceStore'
import { createPngExportName } from './fileNames'

const EXPORT_BACKGROUND = '#f4ede3'
const EXPORT_TEXT = '#241b15'

export const exportPageAsPng = async (
  image: CanvasImage,
  imageTransform: CanvasTransform | null,
  outputSettings: OutputSettings,
  pageIndex = 0,
): Promise<void> => {
  const canvas = document.createElement('canvas')
  canvas.width = outputSettings.width
  canvas.height = outputSettings.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas export is not available')
  }

  context.fillStyle = EXPORT_BACKGROUND
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = EXPORT_TEXT
  context.font = '48px Segoe UI'
  context.textAlign = 'center'
  context.fillText(image.name, canvas.width / 2, canvas.height / 2)

  if (imageTransform) {
    context.font = '28px Segoe UI'
    context.fillText(
      `${imageTransform.width} x ${imageTransform.height} at ${imageTransform.x}, ${imageTransform.y}`,
      canvas.width / 2,
      canvas.height / 2 + 56,
    )
  }

  image.textLayers.filter((layer) => layer.visible).forEach((layer) => {
    context.textAlign = 'left'
    context.lineJoin = 'round'
    context.shadowColor = layer.shadowEnabled ? 'rgba(0, 0, 0, 0.35)' : 'transparent'
    context.shadowBlur = layer.shadowEnabled ? 12 : 0
    context.shadowOffsetX = layer.shadowEnabled ? 3 : 0
    context.shadowOffsetY = layer.shadowEnabled ? 3 : 0
    context.fillStyle = layer.color
    context.font = `${layer.fontSize}px Segoe UI`

    if (layer.strokeWidth > 0) {
      context.lineWidth = layer.strokeWidth * 2
      context.strokeStyle = layer.strokeColor
    }

    if (layer.isVertical) {
      layer.text.split('').forEach((character, index) => {
        const y = layer.y + index * (layer.fontSize + 4)
        if (layer.strokeWidth > 0) {
          context.strokeText(character, layer.x, y)
        }
        context.fillText(character, layer.x, y)
      })
    } else {
      if (layer.strokeWidth > 0) {
        context.strokeText(layer.text, layer.x, layer.y)
      }
      context.fillText(layer.text, layer.x, layer.y)
    }
  })

  image.bubbleLayers.filter((layer) => layer.visible).forEach((layer) => {
    context.shadowColor = 'transparent'
    context.shadowBlur = 0
    context.shadowOffsetX = 0
    context.shadowOffsetY = 0
    context.fillStyle = layer.fillColor
    context.strokeStyle = layer.borderColor
    context.lineWidth = 3
    if ('beginPath' in context && 'roundRect' in context && 'stroke' in context) {
      context.beginPath()
      context.roundRect(
        layer.x - layer.width / 2,
        layer.y - layer.height / 2,
        layer.width,
        layer.height,
        Math.min(layer.height / 2, 48),
      )
      context.fill()
      context.stroke()
    } else {
      context.fillRect(
        layer.x - layer.width / 2,
        layer.y - layer.height / 2,
        layer.width,
        layer.height,
      )
    }
    context.beginPath?.()
    if (layer.tailDirection === 'left') {
      context.moveTo?.(layer.x - layer.width / 2 + 24, layer.y + layer.height / 2 - 10)
      context.lineTo?.(layer.x - layer.width / 2 - 24, layer.y + layer.height / 2 + 20)
      context.lineTo?.(layer.x - layer.width / 2 + 52, layer.y + layer.height / 2 - 2)
    } else if (layer.tailDirection === 'right') {
      context.moveTo?.(layer.x + layer.width / 2 - 24, layer.y + layer.height / 2 - 10)
      context.lineTo?.(layer.x + layer.width / 2 + 24, layer.y + layer.height / 2 + 20)
      context.lineTo?.(layer.x + layer.width / 2 - 52, layer.y + layer.height / 2 - 2)
    } else {
      context.moveTo?.(layer.x - 18, layer.y + layer.height / 2 - 4)
      context.lineTo?.(layer.x, layer.y + layer.height / 2 + 30)
      context.lineTo?.(layer.x + 18, layer.y + layer.height / 2 - 4)
    }
    context.fill?.()
    context.stroke?.()
    context.fillStyle = layer.borderColor
    context.font = '28px Segoe UI'
    context.textAlign = 'center'
    context.fillText(layer.text, layer.x, layer.y + 8)
  })

  image.mosaicLayers.filter((layer) => layer.visible).forEach((layer) => {
    context.fillStyle = 'rgba(255, 215, 177, 0.72)'
    context.fillRect(
      layer.x - layer.width / 2,
      layer.y - layer.height / 2,
      layer.width,
      layer.height,
    )
    context.strokeStyle = '#241b15'
    context.lineWidth = 2
    context.strokeRect(
      layer.x - layer.width / 2,
      layer.y - layer.height / 2,
      layer.width,
      layer.height,
    )
    context.fillStyle = '#241b15'
    context.font = '24px Segoe UI'
    context.textAlign = 'center'
    context.fillText(`Mosaic ${layer.intensity}`, layer.x, layer.y + 6)
  })

  image.overlayLayers.filter((layer) => layer.visible).forEach((layer) => {
    context.globalAlpha = layer.opacity
    context.fillStyle = layer.color
    context.fillRect(
      layer.x - layer.width / 2,
      layer.y - layer.height / 2,
      layer.width,
      layer.height,
    )
    context.globalAlpha = 1
    context.strokeStyle = '#241b15'
    context.lineWidth = 2
    context.strokeRect(
      layer.x - layer.width / 2,
      layer.y - layer.height / 2,
      layer.width,
      layer.height,
    )
    context.fillStyle = '#241b15'
    context.font = '24px Segoe UI'
    context.textAlign = 'center'
    context.fillText(`Overlay ${layer.opacity.toFixed(1)}`, layer.x, layer.y + 6)
  })

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (!value) {
        reject(new Error('Failed to generate PNG data'))
        return
      }

      resolve(value)
    }, 'image/png')
  })

  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = createPngExportName(image.name, outputSettings, pageIndex)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(objectUrl)
}
