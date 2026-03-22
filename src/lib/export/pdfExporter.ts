import type { CanvasImage, CanvasTransform, OutputSettings } from '../../stores/workspaceStore'
import { createPdfExportName } from './fileNames'
import { createMetadataRemovalSummary, sanitizeRenderedExportBlob } from './metadata'

const escapePdfText = (text: string) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

export const exportPageAsPdf = async (
  image: CanvasImage,
  imageTransform: CanvasTransform | null,
  outputSettings: OutputSettings,
  pageIndex = 0,
): Promise<void> => {
  const metadataPolicy = createMetadataRemovalSummary()
  const lines = [
    'BT',
    '/F1 24 Tf',
    '72 760 Td',
    `(${escapePdfText(image.name)}) Tj`,
    '0 -28 Td',
    `(${escapePdfText(`Output ${outputSettings.width} x ${outputSettings.height}`)}) Tj`,
    '0 -28 Td',
    `(${escapePdfText(`Export quality ${outputSettings.qualityMode}`)}) Tj`,
    '0 -28 Td',
    `(${escapePdfText(`Resize fit ${outputSettings.resizeFitMode}`)}) Tj`,
    '0 -28 Td',
    `(${escapePdfText(`Resize background ${outputSettings.resizeBackgroundMode}`)}) Tj`,
    '0 -28 Td',
    `(${escapePdfText(`Export metadata ${metadataPolicy.metadata}`)}) Tj`,
    '0 -28 Td',
    `(${escapePdfText(`Export EXIF ${metadataPolicy.exif}`)}) Tj`,
    '0 -28 Td',
    `(${escapePdfText(`Source ${image.width} x ${image.height}`)}) Tj`,
  ]

  if (imageTransform) {
    lines.push('0 -28 Td')
    lines.push(
      `(${escapePdfText(`Transform ${imageTransform.width} x ${imageTransform.height} at ${imageTransform.x}, ${imageTransform.y}`)}) Tj`,
    )
  }

  image.textLayers.filter((layer) => layer.visible).forEach((layer) => {
    lines.push('0 -28 Td')
    lines.push(
      `(${escapePdfText(
        `Text ${layer.text} @ ${layer.x}, ${layer.y} / ${layer.fontSize}px / ${layer.isVertical ? 'vertical' : 'horizontal'} / outline ${layer.strokeWidth} / shadow ${layer.shadowEnabled ? 'on' : 'off'}`,
      )}) Tj`,
    )
  })

  image.messageWindowLayers.forEach((layer) => {
    lines.push('0 -28 Td')
    lines.push(
      `(${escapePdfText(`Message window ${layer.speaker} / ${layer.body} @ ${layer.x}, ${layer.y} / ${layer.width}x${layer.height} / opacity ${layer.opacity.toFixed(1)} / frame ${layer.frameStyle}${layer.assetName ? ` / asset ${layer.assetName} / render 9-slice` : ' / render frame-only'}`)}) Tj`,
    )
  })

  image.bubbleLayers.filter((layer) => layer.visible).forEach((layer) => {
    lines.push('0 -28 Td')
    lines.push(
      `(${escapePdfText(`Bubble ${layer.text} @ ${layer.x}, ${layer.y} / ${layer.width}x${layer.height} / tail ${layer.tailDirection} / style ${layer.stylePreset} / fill ${layer.fillColor} / border ${layer.borderColor}`)}) Tj`,
    )
  })

  image.mosaicLayers.filter((layer) => layer.visible).forEach((layer) => {
    lines.push('0 -28 Td')
    lines.push(
      `(${escapePdfText(`Mosaic @ ${layer.x}, ${layer.y} / ${layer.width}x${layer.height} / intensity ${layer.intensity} / style ${layer.style}`)}) Tj`,
    )
  })

  image.overlayLayers.filter((layer) => layer.visible).forEach((layer) => {
    lines.push('0 -28 Td')
    lines.push(
      `(${escapePdfText(`Overlay @ ${layer.x}, ${layer.y} / ${layer.width}x${layer.height} / opacity ${layer.opacity.toFixed(1)} / area ${layer.areaPreset} / tint ${layer.color} / fill ${layer.fillMode}${layer.fillMode === 'gradient' ? ` / gradient ${layer.gradientFrom} to ${layer.gradientTo} / direction ${layer.gradientDirection}` : ''}`)}) Tj`,
    )
  })

  image.watermarkLayers.forEach((layer) => {
    lines.push('0 -28 Td')
    lines.push(
      `(${escapePdfText(`Watermark ${layer.mode === 'image' ? `[${layer.assetName ?? 'watermark.png'}]` : layer.text} / opacity ${layer.opacity.toFixed(1)} / angle ${layer.angle} / density ${layer.density} / mode ${layer.mode} / scale ${layer.scale.toFixed(1)} / tiled ${layer.tiled ? 'on' : 'off'}`)}) Tj`,
    )
  })

  lines.push('ET')

  const stream = lines.join('\n')
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${stream.length} >>
stream
${stream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000063 00000 n 
0000000122 00000 n 
0000000248 00000 n 
000000${String(281 + stream.length).padStart(10, '0')} 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
${320 + stream.length}
%%EOF`

  const blob = await sanitizeRenderedExportBlob(new Blob([pdf], { type: 'application/pdf' }), 'application/pdf')
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = createPdfExportName(image.name, outputSettings, pageIndex)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(objectUrl)
}
