import JSZip from 'jszip'
import type { CanvasImage, OutputSettings } from '../../stores/workspaceStore'
import { getBubbleShapeVariantNumber } from '../bubbleShapes'
import { createZipEntryName, createZipExportName } from './fileNames'
import { createMetadataRemovalSummary } from './metadata'

const downloadBlob = (blob: Blob, filename: string) => {
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(objectUrl)
}

export const exportPagesAsZip = async (
  pages: CanvasImage[],
  outputSettings: OutputSettings,
): Promise<void> => {
  const zip = new JSZip()
  const metadataPolicy = createMetadataRemovalSummary()

  pages.forEach((page, index) => {
    const fileName = createZipEntryName(page.name, outputSettings, index)
    zip.file(
      fileName,
      [
        `name=${page.name}`,
        `source=${page.width}x${page.height}`,
        `output=${outputSettings.width}x${outputSettings.height}`,
        `quality=${outputSettings.qualityMode}`,
        `resizeFit=${outputSettings.resizeFitMode}`,
        `resizeBackground=${outputSettings.resizeBackgroundMode}`,
        `metadata=${metadataPolicy.metadata}`,
        `exif=${metadataPolicy.exif}`,
        `format=${outputSettings.format}`,
        `textLayers=${page.textLayers.filter((layer) => layer.visible).length}`,
        `messageWindowLayers=${page.messageWindowLayers.length}`,
        `bubbleLayers=${page.bubbleLayers.filter((layer) => layer.visible).length}`,
        `mosaicLayers=${page.mosaicLayers.filter((layer) => layer.visible).length}`,
        `overlayLayers=${page.overlayLayers.filter((layer) => layer.visible).length}`,
        `watermarkLayers=${page.watermarkLayers.length}`,
        ...page.textLayers.filter((layer) => layer.visible).map(
          (layer, layerIndex) =>
            `text${layerIndex + 1}=${layer.text}@${layer.x},${layer.y},${layer.fontSize},${layer.color},${layer.isVertical ? 'vertical' : 'horizontal'},outline:${layer.strokeWidth},shadow:${layer.shadowEnabled ? 'on' : 'off'}`,
        ),
        ...page.messageWindowLayers.map(
          (layer, layerIndex) =>
            `messageWindow${layerIndex + 1}=${layer.speaker}|${layer.body}|${layer.x},${layer.y},${layer.width},${layer.height},opacity:${layer.opacity.toFixed(1)},frame:${layer.frameStyle},asset:${layer.assetName ?? 'none'},render:${layer.assetName ? '9-slice' : 'frame-only'}`,
        ),
        ...page.bubbleLayers.filter((layer) => layer.visible).map(
          (layer, layerIndex) =>
            `bubble${layerIndex + 1}=${layer.text}@${layer.x},${layer.y},${layer.width},${layer.height},tail:${layer.tailDirection},style:${layer.stylePreset},shape:${layer.bubbleShape ?? 'round'},variant:${getBubbleShapeVariantNumber(layer.shapeSeed ?? 0)},fill:${layer.fillColor},border:${layer.borderColor}`,
        ),
        ...page.mosaicLayers.filter((layer) => layer.visible).map(
          (layer, layerIndex) =>
            `mosaic${layerIndex + 1}=${layer.x},${layer.y},${layer.width},${layer.height},intensity:${layer.intensity},style:${layer.style}`,
        ),
        ...page.overlayLayers.filter((layer) => layer.visible).map(
          (layer, layerIndex) =>
            `overlay${layerIndex + 1}=${layer.x},${layer.y},${layer.width},${layer.height},opacity:${layer.opacity.toFixed(1)},area:${layer.areaPreset},color:${layer.color},fill:${layer.fillMode},gradient:${layer.gradientFrom}->${layer.gradientTo},direction:${layer.gradientDirection}`,
        ),
        ...page.watermarkLayers.map(
          (layer, layerIndex) =>
            `watermark${layerIndex + 1}=${layer.mode === 'image' ? `[${layer.assetName ?? 'watermark.png'}]` : layer.text},opacity:${layer.opacity.toFixed(1)},angle:${layer.angle},density:${layer.density},mode:${layer.mode},scale:${layer.scale.toFixed(1)},tiled:${layer.tiled ? 'on' : 'off'}`,
        ),
      ].join('\n'),
    )
  })

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, createZipExportName(outputSettings, pages.length))
}
