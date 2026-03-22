import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CanvasImage, OutputSettings } from '../../stores/workspaceStore'
import { exportPageAsPdf } from './pdfExporter'
import { exportPageAsPng } from './pngExporter'
import { exportPagesAsZip } from './zipExporter'

const outputSettings: OutputSettings = {
  presetId: 'hd-landscape',
  label: 'HD Landscape',
  width: 1920,
  height: 1080,
  format: 'png',
  fileNamePrefix: 'creators-coco',
  startNumber: 1,
  numberPadding: 2,
}

const sampleImage: CanvasImage = {
  id: 'page-1',
  name: 'scene-01.png',
  width: 1920,
  height: 1080,
  textLayers: [],
  messageWindowLayers: [
    {
      id: 'message-1',
      speaker: 'Narrator',
      body: 'Export this line',
      x: 640,
      y: 820,
      width: 640,
      height: 220,
      opacity: 0.9,
    },
  ],
  bubbleLayers: [],
  mosaicLayers: [],
  overlayLayers: [],
  watermarkLayers: [
    {
      id: 'watermark-1',
      text: 'Continue on Patreon',
      opacity: 0.4,
      color: '#ffe1a8',
      repeated: true,
      angle: -16,
      density: 2,
      preset: 'patreon',
      mode: 'image',
      assetName: 'patreon-stamp.png',
      x: 960,
      y: 540,
      scale: 1.2,
      tiled: true,
    },
  ],
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('exporters', () => {
  it('renders message windows and watermarks in PNG export drawing calls', async () => {
    const fillText = vi.fn()
    const fillRect = vi.fn()
    const strokeRect = vi.fn()
    const save = vi.fn()
    const restore = vi.fn()
    const translate = vi.fn()
    const rotate = vi.fn()
    const canvasContext = {
      fillStyle: '',
      strokeStyle: '',
      globalAlpha: 1,
      font: '',
      textAlign: 'left',
      lineWidth: 0,
      lineJoin: 'round',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      fillRect,
      strokeRect,
      fillText,
      strokeText: vi.fn(),
      save,
      restore,
      translate,
      rotate,
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    }
    const originalCreateElement = document.createElement.bind(document)

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        const canvas = originalCreateElement('canvas') as HTMLCanvasElement
        canvas.getContext = vi.fn(() => canvasContext) as typeof canvas.getContext
        canvas.toBlob = vi.fn((callback: BlobCallback) => callback(new Blob(['png-binary'], { type: 'image/png' })))
        return canvas
      }

      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.click = vi.fn()
        return link
      }

      return originalCreateElement(tagName)
    })

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:png-export'),
      revokeObjectURL: vi.fn(),
    })

    await exportPageAsPng(sampleImage, null, outputSettings)

    expect(fillText).toHaveBeenCalledWith('Narrator', 640, 812)
    expect(fillText).toHaveBeenCalledWith('Export this line', 640, 848)
    expect(fillText).toHaveBeenCalledWith('[patreon-stamp.png]', 0, 0)
    expect(save).toHaveBeenCalled()
    expect(restore).toHaveBeenCalled()
  })

  it('includes message windows and watermarks in PDF export metadata', async () => {
    const originalCreateElement = document.createElement.bind(document)
    let exportedBlob: Blob | null = null

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.click = vi.fn()
        return link
      }

      return originalCreateElement(tagName)
    })

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        exportedBlob = blob
        return 'blob:pdf-export'
      }),
      revokeObjectURL: vi.fn(),
    })

    await exportPageAsPdf(sampleImage, null, outputSettings)

    const pdfText = await exportedBlob?.text()
    expect(pdfText).toContain('Message window Narrator / Export this line')
    expect(pdfText).toContain('Watermark [patreon-stamp.png]')
  })

  it('includes message windows and watermarks in ZIP export entries', async () => {
    let exportedBlob: Blob | null = null
    const originalCreateElement = document.createElement.bind(document)

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.click = vi.fn()
        return link
      }

      return originalCreateElement(tagName)
    })

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        exportedBlob = blob
        return 'blob:zip-export'
      }),
      revokeObjectURL: vi.fn(),
    })

    await exportPagesAsZip([sampleImage], outputSettings)

    const zip = await JSZip.loadAsync(exportedBlob as Blob)
    const entry = await zip.file('01-creators-coco-01.txt')?.async('string')

    expect(entry).toContain('messageWindowLayers=1')
    expect(entry).toContain('messageWindow1=Narrator|Export this line|640,820,640,220,opacity:0.9')
    expect(entry).toContain('watermark1=[patreon-stamp.png],opacity:0.4,angle:-16,density:2,mode:image,scale:1.2,tiled:on')
  })
})
