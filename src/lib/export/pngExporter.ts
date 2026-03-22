import type { CanvasImage, CanvasTransform, OutputSettings } from '../../stores/workspaceStore'
import { createPngExportName } from './fileNames'
import { sanitizeRenderedExportBlob } from './metadata'

const EXPORT_BACKGROUND = '#ffffff'
const EXPORT_TEXT = '#241b15'

const loadImageElement = async (sourceUrl: string): Promise<HTMLImageElement> =>
  await new Promise((resolve, reject) => {
    const image = new Image()
    const timeout = window.setTimeout(() => {
      reject(new Error(`Timed out while loading image: ${sourceUrl}`))
    }, 50)
    image.onload = () => {
      window.clearTimeout(timeout)
      resolve(image)
    }
    image.onerror = () => {
      window.clearTimeout(timeout)
      reject(new Error(`Failed to load image: ${sourceUrl}`))
    }
    image.src = sourceUrl
  })

const getExportFrame = (image: CanvasImage, outputSettings: OutputSettings) => {
  if (outputSettings.resizeFitMode === 'stretch') {
    return {
      x: 0,
      y: 0,
      width: outputSettings.width,
      height: outputSettings.height,
      scaleX: outputSettings.width / image.width,
      scaleY: outputSettings.height / image.height,
    }
  }

  const scale =
    outputSettings.resizeFitMode === 'cover'
      ? Math.max(outputSettings.width / image.width, outputSettings.height / image.height)
      : Math.min(outputSettings.width / image.width, outputSettings.height / image.height)
  const width = Math.round(image.width * scale)
  const height = Math.round(image.height * scale)
  const x = Math.round((outputSettings.width - width) / 2)
  const y = Math.round((outputSettings.height - height) / 2)

  return {
    x,
    y,
    width,
    height,
    scaleX: width / image.width,
    scaleY: height / image.height,
  }
}

const wrapText = (text: string, maxCharsPerLine: number) => {
  if (maxCharsPerLine <= 0) {
    return [text]
  }

  const explicitLines = text.split('\n')
  return explicitLines.flatMap((line) => {
    if (line.length <= maxCharsPerLine) {
      return [line]
    }

    const lines: string[] = []
    for (let index = 0; index < line.length; index += maxCharsPerLine) {
      lines.push(line.slice(index, index + maxCharsPerLine))
    }
    return lines
  })
}

const drawNineSliceWindowFrame = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  frameStyle: 'classic' | 'soft' | 'neon',
) => {
  const borderColor =
    frameStyle === 'neon' ? '#76fff4' : frameStyle === 'soft' ? '#ffe6bf' : '#f3efe6'
  const panelColor =
    frameStyle === 'neon'
      ? 'rgba(10, 48, 58, 0.88)'
      : frameStyle === 'soft'
        ? 'rgba(77, 58, 46, 0.82)'
        : 'rgba(28, 22, 18, 0.88)'
  const edge = Math.max(12, Math.round(Math.min(width, height) * 0.12))
  const innerInset = Math.max(6, Math.round(edge * 0.45))

  context.fillStyle = panelColor
  context.fillRect(x, y, width, height)

  context.fillStyle = 'rgba(255, 244, 214, 0.1)'
  context.fillRect(x, y, width, edge)
  context.fillRect(x, y + height - edge, width, edge)
  context.fillRect(x, y, edge, height)
  context.fillRect(x + width - edge, y, edge, height)

  context.fillStyle = 'rgba(255, 255, 255, 0.16)'
  context.fillRect(x, y, edge, edge)
  context.fillRect(x + width - edge, y, edge, edge)
  context.fillRect(x, y + height - edge, edge, edge)
  context.fillRect(x + width - edge, y + height - edge, edge, edge)

  context.strokeStyle = borderColor
  context.lineWidth = 2
  context.strokeRect(x, y, width, height)
  context.strokeStyle = 'rgba(255, 244, 214, 0.22)'
  context.strokeRect(x + innerInset, y + innerInset, width - innerInset * 2, height - innerInset * 2)
}

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

  const exportFrame = getExportFrame(image, outputSettings)
  const mapX = (value: number) => exportFrame.x + value * exportFrame.scaleX
  const mapY = (value: number) => exportFrame.y + value * exportFrame.scaleY
  const mapSize = (value: number) => Math.max(1, value * Math.min(exportFrame.scaleX, exportFrame.scaleY))

  if (outputSettings.resizeBackgroundMode === 'black') {
    context.fillStyle = '#000000'
    context.fillRect(0, 0, canvas.width, canvas.height)
  } else {
    context.fillStyle = EXPORT_BACKGROUND
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  let sourceImage: HTMLImageElement | null = null
  if (image.sourceUrl) {
    try {
      sourceImage = await loadImageElement(image.sourceUrl)
    } catch {
      sourceImage = null
    }
  }

  if (outputSettings.resizeBackgroundMode === 'blurred-art' && sourceImage && typeof context.drawImage === 'function') {
    context.save?.()
    context.filter = 'blur(36px) saturate(1.15)'
    context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height)
    context.restore?.()
    context.fillStyle = 'rgba(12, 12, 16, 0.22)'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  if (sourceImage && typeof context.drawImage === 'function') {
    context.drawImage(sourceImage, exportFrame.x, exportFrame.y, exportFrame.width, exportFrame.height)
  } else {
    context.fillStyle = outputSettings.resizeBackgroundMode === 'black' ? '#111111' : '#f4ede3'
    context.fillRect(exportFrame.x, exportFrame.y, exportFrame.width, exportFrame.height)
  }

  context.fillStyle = EXPORT_TEXT
  context.font = '48px Segoe UI'
  context.textAlign = 'center'
  context.fillText(image.name, exportFrame.x + exportFrame.width / 2, exportFrame.y + exportFrame.height / 2)
  context.font = '24px Segoe UI'
  context.fillText(
    `Quality ${outputSettings.qualityMode}`,
    exportFrame.x + exportFrame.width / 2,
    exportFrame.y + exportFrame.height / 2 + 88,
  )

  if (imageTransform) {
    context.font = '28px Segoe UI'
    context.fillText(
      `${imageTransform.width} x ${imageTransform.height} at ${imageTransform.x}, ${imageTransform.y}`,
      exportFrame.x + exportFrame.width / 2,
      exportFrame.y + exportFrame.height / 2 + 56,
    )
  }

  image.textLayers.filter((layer) => layer.visible).forEach((layer) => {
    context.textAlign = 'left'
    context.lineJoin = 'round'
    context.shadowColor = layer.shadowEnabled ? 'rgba(0, 0, 0, 0.35)' : 'transparent'
    context.shadowBlur = layer.shadowEnabled ? 12 : 0
    context.shadowOffsetX = layer.shadowEnabled ? 3 : 0
    context.shadowOffsetY = layer.shadowEnabled ? 3 : 0
    context.font = `${Math.max(12, Math.round(mapSize(layer.fontSize)))}px Segoe UI`
    const approxCharWidth = Math.max(1, layer.fontSize * 0.55 + layer.letterSpacing)
    const maxCharsPerLine = Math.max(1, Math.floor(layer.maxWidth / approxCharWidth))
    const wrappedLines = wrapText(layer.text, maxCharsPerLine)

    if (layer.fillMode === 'gradient' && 'createLinearGradient' in context) {
      const gradient = context.createLinearGradient(
        mapX(layer.x),
        mapY(layer.y - layer.fontSize),
        mapX(layer.x + layer.maxWidth),
        mapY(layer.y + layer.fontSize),
      )
      gradient.addColorStop(0, layer.gradientFrom)
      gradient.addColorStop(1, layer.gradientTo)
      context.fillStyle = gradient
    } else {
      context.fillStyle = layer.color
    }

    if (layer.strokeWidth > 0) {
      context.lineWidth = mapSize(layer.strokeWidth * 2)
      context.strokeStyle = layer.strokeColor
    }

    if (layer.isVertical) {
      layer.text.split('').forEach((character, index) => {
        const y = mapY(layer.y + index * (layer.fontSize * layer.lineHeight + 4 + layer.letterSpacing))
        if (layer.strokeWidth > 0) {
          context.strokeText(character, mapX(layer.x), y)
        }
        context.fillText(character, mapX(layer.x), y)
      })
    } else {
      wrappedLines.forEach((line, index) => {
        const y = mapY(layer.y + index * layer.fontSize * layer.lineHeight)
        const x = mapX(layer.x)
        const lineText =
          layer.letterSpacing > 0 ? line.split('').join(' '.repeat(Math.max(1, Math.round(layer.letterSpacing / 2)))) : line
        if (layer.strokeWidth > 0) {
          context.strokeText(lineText, x, y)
        }
        context.fillText(lineText, x, y)
      })
    }
  })

  image.messageWindowLayers.forEach((layer) => {
    context.save()
    context.globalAlpha = layer.opacity
    const frameX = mapX(layer.x - layer.width / 2)
    const frameY = mapY(layer.y - layer.height / 2)
    const frameWidth = mapSize(layer.width)
    const frameHeight = mapSize(layer.height)
    if (layer.assetName) {
      drawNineSliceWindowFrame(context, frameX, frameY, frameWidth, frameHeight, layer.frameStyle)
    } else {
      context.fillStyle =
        layer.frameStyle === 'neon'
          ? 'rgba(10, 48, 58, 0.88)'
          : layer.frameStyle === 'soft'
            ? 'rgba(77, 58, 46, 0.82)'
            : 'rgba(28, 22, 18, 0.88)'
      context.fillRect(frameX, frameY, frameWidth, frameHeight)
      context.globalAlpha = 1
      context.strokeStyle =
        layer.frameStyle === 'neon'
          ? '#76fff4'
          : layer.frameStyle === 'soft'
            ? '#ffe6bf'
            : '#f3efe6'
      context.lineWidth = 2
      context.strokeRect(frameX, frameY, frameWidth, frameHeight)
    }
    context.globalAlpha = 1
    context.fillStyle = '#f3efe6'
    context.textAlign = 'center'
    context.font = `${Math.max(12, Math.round(mapSize(28)))}px Segoe UI`
    context.fillText(layer.speaker, mapX(layer.x), mapY(layer.y - 8))
    context.font = `${Math.max(12, Math.round(mapSize(24)))}px Segoe UI`
    context.fillText(layer.body, mapX(layer.x), mapY(layer.y + 28))
    if (layer.assetName) {
      context.font = `${Math.max(10, Math.round(mapSize(18)))}px Segoe UI`
      context.fillText(`[${layer.assetName}]`, mapX(layer.x), mapY(layer.y + layer.height / 2 - 18))
      context.fillText('9-slice asset', mapX(layer.x), mapY(layer.y + layer.height / 2 - 42))
    }
    context.restore()
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
        mapX(layer.x - layer.width / 2),
        mapY(layer.y - layer.height / 2),
        mapSize(layer.width),
        mapSize(layer.height),
        Math.min(mapSize(layer.height / 2), mapSize(48)),
      )
      context.fill()
      context.stroke()
    } else {
      context.fillRect(
        mapX(layer.x - layer.width / 2),
        mapY(layer.y - layer.height / 2),
        mapSize(layer.width),
        mapSize(layer.height),
      )
    }
    context.beginPath?.()
    if (layer.tailDirection === 'left') {
      context.moveTo?.(mapX(layer.x - layer.width / 2 + 24), mapY(layer.y + layer.height / 2 - 10))
      context.lineTo?.(mapX(layer.x - layer.width / 2 - 24), mapY(layer.y + layer.height / 2 + 20))
      context.lineTo?.(mapX(layer.x - layer.width / 2 + 52), mapY(layer.y + layer.height / 2 - 2))
    } else if (layer.tailDirection === 'right') {
      context.moveTo?.(mapX(layer.x + layer.width / 2 - 24), mapY(layer.y + layer.height / 2 - 10))
      context.lineTo?.(mapX(layer.x + layer.width / 2 + 24), mapY(layer.y + layer.height / 2 + 20))
      context.lineTo?.(mapX(layer.x + layer.width / 2 - 52), mapY(layer.y + layer.height / 2 - 2))
    } else {
      context.moveTo?.(mapX(layer.x - 18), mapY(layer.y + layer.height / 2 - 4))
      context.lineTo?.(mapX(layer.x), mapY(layer.y + layer.height / 2 + 30))
      context.lineTo?.(mapX(layer.x + 18), mapY(layer.y + layer.height / 2 - 4))
    }
    context.fill?.()
    context.stroke?.()
    context.fillStyle = layer.borderColor
    context.font = `${Math.max(12, Math.round(mapSize(28)))}px Segoe UI`
    context.textAlign = 'center'
    context.fillText(layer.text, mapX(layer.x), mapY(layer.y + 8))
  })

  image.mosaicLayers.filter((layer) => layer.visible).forEach((layer) => {
    const x = mapX(layer.x - layer.width / 2)
    const y = mapY(layer.y - layer.height / 2)
    const width = mapSize(layer.width)
    const height = mapSize(layer.height)
    context.fillStyle =
      layer.style === 'blur'
        ? 'rgba(221, 199, 184, 0.78)'
        : layer.style === 'noise'
          ? 'rgba(255, 215, 177, 0.82)'
          : 'rgba(255, 215, 177, 0.72)'
    if (layer.style === 'blur') {
      context.save?.()
      context.filter = `blur(${Math.max(4, Math.round(layer.intensity / 2))}px)`
      context.fillRect(x, y, width, height)
      context.restore?.()
      context.filter = 'none'
    } else {
      context.fillRect(x, y, width, height)
    }

    if (layer.style === 'pixelate') {
      const blockSize = Math.max(8, Math.round(mapSize(layer.intensity)))
      context.fillStyle = 'rgba(36, 27, 21, 0.14)'
      for (let offsetX = 0; offsetX < width; offsetX += blockSize) {
        for (let offsetY = 0; offsetY < height; offsetY += blockSize) {
          if (((offsetX / blockSize) + (offsetY / blockSize)) % 2 === 0) {
            context.fillRect(x + offsetX, y + offsetY, Math.max(2, blockSize - 1), Math.max(2, blockSize - 1))
          }
        }
      }
    }

    if (layer.style === 'noise') {
      const noiseStep = Math.max(6, Math.round(mapSize(Math.max(4, layer.intensity / 2))))
      context.fillStyle = 'rgba(36, 27, 21, 0.2)'
      for (let offsetY = 0; offsetY < height; offsetY += noiseStep) {
        for (let offsetX = 0; offsetX < width; offsetX += noiseStep) {
          const shouldPaint = ((offsetX / noiseStep) * 3 + (offsetY / noiseStep) * 5) % 4 === 0
          if (shouldPaint) {
            context.fillRect(x + offsetX, y + offsetY, Math.max(2, Math.round(noiseStep * 0.45)), Math.max(2, Math.round(noiseStep * 0.45)))
          }
        }
      }
    }

    context.strokeStyle = '#241b15'
    context.lineWidth = 2
    context.strokeRect(x, y, width, height)
    context.fillStyle = '#241b15'
    context.font = `${Math.max(12, Math.round(mapSize(24)))}px Segoe UI`
    context.textAlign = 'center'
    context.fillText(
      `${layer.style === 'pixelate' ? 'Mosaic' : layer.style === 'blur' ? 'Blur' : 'Noise'} ${layer.intensity}`,
      mapX(layer.x),
      mapY(layer.y + 6),
    )
  })

  image.overlayLayers.filter((layer) => layer.visible).forEach((layer) => {
    context.globalAlpha = layer.opacity
    if (layer.fillMode === 'gradient' && 'createLinearGradient' in context) {
      const gradient = context.createLinearGradient(
        mapX(layer.x - layer.width / 2),
        mapY(layer.y - layer.height / 2),
        layer.gradientDirection === 'vertical'
          ? mapX(layer.x - layer.width / 2)
          : mapX(layer.x + layer.width / 2),
        layer.gradientDirection === 'horizontal'
          ? mapY(layer.y - layer.height / 2)
          : mapY(layer.y + layer.height / 2),
      )
      gradient.addColorStop(0, layer.gradientFrom)
      gradient.addColorStop(1, layer.gradientTo)
      context.fillStyle = gradient
    } else {
      context.fillStyle = layer.color
    }
    context.fillRect(
      mapX(layer.x - layer.width / 2),
      mapY(layer.y - layer.height / 2),
      mapSize(layer.width),
      mapSize(layer.height),
    )
    context.globalAlpha = 1
    context.strokeStyle = '#241b15'
    context.lineWidth = 2
    context.strokeRect(
      mapX(layer.x - layer.width / 2),
      mapY(layer.y - layer.height / 2),
      mapSize(layer.width),
      mapSize(layer.height),
    )
    context.fillStyle = '#241b15'
    context.font = `${Math.max(12, Math.round(mapSize(24)))}px Segoe UI`
    context.textAlign = 'center'
    context.fillText(
      `Overlay ${layer.opacity.toFixed(1)} ${layer.areaPreset}${layer.fillMode === 'gradient' ? ` ${layer.gradientDirection}` : ''}`,
      mapX(layer.x),
      mapY(layer.y + 6),
    )
  })

  image.watermarkLayers.forEach((layer) => {
    context.save()
    context.globalAlpha = layer.opacity
    context.translate(mapX(layer.x), mapY(layer.y))
    context.rotate((layer.angle * Math.PI) / 180)
    context.textAlign = 'center'
    context.fillStyle = layer.color
    context.font =
      layer.mode === 'image'
        ? `${Math.max(12, Math.round(mapSize(32)))}px Segoe UI`
        : `${Math.max(12, Math.round(mapSize(40)))}px Segoe UI`
    const watermarkLabel =
      layer.mode === 'image'
        ? `[${layer.assetName ?? 'watermark.png'}]`
        : layer.repeated
          ? Array.from({ length: Math.max(3, layer.density + 2) }, () => layer.text).join(' • ')
          : layer.text
    context.fillText(watermarkLabel, 0, 0)
    context.restore()
  })

  const renderedBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (!value) {
        reject(new Error('Failed to generate PNG data'))
        return
      }

      resolve(value)
    }, 'image/png')
  })
  const blob = await sanitizeRenderedExportBlob(renderedBlob, 'image/png')

  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = createPngExportName(image.name, outputSettings, pageIndex)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(objectUrl)
}
