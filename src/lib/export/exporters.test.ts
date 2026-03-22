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
  resizeBackgroundMode: 'white',
  resizeFitMode: 'contain',
  qualityMode: 'high',
}

const sampleImage: CanvasImage = {
  id: 'page-1',
  name: 'scene-01.png',
  width: 1920,
  height: 1080,
  sourceUrl: null,
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
      frameStyle: 'classic',
      assetName: null,
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

    let exportedBlob: Blob | null = null
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        exportedBlob = blob
        return 'blob:png-export'
      }),
      revokeObjectURL: vi.fn(),
    })

    await exportPageAsPng(sampleImage, null, outputSettings)

    expect(fillText).toHaveBeenCalledWith('Narrator', 640, 812)
    expect(fillText).toHaveBeenCalledWith('Export this line', 640, 848)
    expect(fillText).toHaveBeenCalledWith('Quality high', 960, 628)
    expect(fillText).toHaveBeenCalledWith('[patreon-stamp.png]', 0, 0)
    expect(save).toHaveBeenCalled()
    expect(restore).toHaveBeenCalled()
    expect(exportedBlob).toBeInstanceOf(Blob)
    expect(exportedBlob?.type).toBe('image/png')
  })

  it('renders a black resize background and blurred art source when selected', async () => {
    const fillRectStyles: string[] = []
    const fillRect = vi.fn(function (this: { fillStyle: string }) {
      fillRectStyles.push(this.fillStyle)
    })
    const drawImage = vi.fn()
    const save = vi.fn()
    const restore = vi.fn()
    const canvasContext = {
      fillStyle: '',
      filter: 'none',
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
      drawImage,
      fillText: vi.fn(),
      strokeText: vi.fn(),
      strokeRect: vi.fn(),
      save,
      restore,
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    }
    const originalCreateElement = document.createElement.bind(document)

    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image)

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

    await exportPageAsPng(
      {
        ...sampleImage,
        sourceUrl: 'blob:scene-01',
      },
      null,
      {
        ...outputSettings,
        width: 1080,
        height: 1920,
        resizeBackgroundMode: 'blurred-art',
      },
    )

    expect(save).toHaveBeenCalled()
    expect(drawImage).toHaveBeenCalled()
    expect(fillRectStyles).toContain('rgba(12, 12, 16, 0.22)')

    await exportPageAsPng(
      sampleImage,
      null,
      {
        ...outputSettings,
        resizeBackgroundMode: 'black',
      },
    )

    expect(fillRect).toHaveBeenCalled()
    expect(fillRectStyles).toContain('#000000')
    expect(restore).toHaveBeenCalled()
  })

  it('uses cover and stretch fit modes in export drawing', async () => {
    const drawImage = vi.fn()
    const canvasContext = {
      fillStyle: '',
      filter: 'none',
      globalAlpha: 1,
      font: '',
      textAlign: 'left',
      lineWidth: 0,
      lineJoin: 'round',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      fillRect: vi.fn(),
      drawImage,
      fillText: vi.fn(),
      strokeText: vi.fn(),
      strokeRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    }
    const originalCreateElement = document.createElement.bind(document)

    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image)

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

    await exportPageAsPng(
      {
        ...sampleImage,
        width: 1000,
        height: 500,
        sourceUrl: 'blob:scene-cover',
      },
      null,
      {
        ...outputSettings,
        width: 1080,
        height: 1920,
        resizeFitMode: 'cover',
      },
    )

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), -1380, 0, 3840, 1920)

    drawImage.mockClear()

    await exportPageAsPng(
      {
        ...sampleImage,
        width: 1000,
        height: 500,
        sourceUrl: 'blob:scene-stretch',
      },
      null,
      {
        ...outputSettings,
        width: 1080,
        height: 1920,
        resizeFitMode: 'stretch',
      },
    )

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1080, 1920)
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
    expect(pdfText).toContain('Export quality high')
    expect(pdfText).toContain('Resize fit contain')
    expect(pdfText).toContain('Export metadata removed')
    expect(pdfText).toContain('Export EXIF removed')
    expect(pdfText).toContain('Message window Narrator / Export this line')
    expect(pdfText).toContain('render frame-only')
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

    expect(entry).toContain('quality=high')
    expect(entry).toContain('resizeFit=contain')
    expect(entry).toContain('resizeBackground=white')
    expect(entry).toContain('metadata=removed')
    expect(entry).toContain('exif=removed')
    expect(entry).toContain('messageWindowLayers=1')
    expect(entry).toContain('messageWindow1=Narrator|Export this line|640,820,640,220,opacity:0.9,frame:classic,asset:none,render:frame-only')
    expect(entry).toContain('watermark1=[patreon-stamp.png],opacity:0.4,angle:-16,density:2,mode:image,scale:1.2,tiled:on')
  })

  it('includes bubble shape variants in PNG, PDF, and ZIP exports', async () => {
    const fillText = vi.fn()
    let pdfBlob: Blob | null = null
    let zipBlob: Blob | null = null
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
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText,
      strokeText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
    }
    const bubblePage: CanvasImage = {
      ...sampleImage,
      bubbleLayers: [
        {
          id: 'bubble-1',
          text: 'Alert',
          x: 420,
          y: 300,
          width: 260,
          height: 150,
          tailDirection: 'right',
          stylePreset: 'speech',
          bubbleShape: 'spiky',
          shapeSeed: 1,
          fillColor: '#ffffff',
          borderColor: '#241b15',
          visible: true,
          locked: false,
        },
      ],
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
      createObjectURL: vi.fn((blob: Blob) => {
        if (blob.type === 'application/pdf') {
          pdfBlob = blob
          return 'blob:pdf-export'
        }
        if (blob.type === 'application/zip') {
          zipBlob = blob
          return 'blob:zip-export'
        }
        return 'blob:png-export'
      }),
      revokeObjectURL: vi.fn(),
    })

    await exportPageAsPng(bubblePage, null, outputSettings)
    await exportPageAsPdf(bubblePage, null, outputSettings)
    await exportPagesAsZip([bubblePage], outputSettings)

    expect(fillText).toHaveBeenCalledWith('Spiky v2', 420, 365)

    const pdfText = await pdfBlob?.text()
    expect(pdfText).toContain('shape spiky / variant 2')

    const zip = await JSZip.loadAsync(zipBlob as Blob)
    const entry = await zip.file('01-creators-coco-01.txt')?.async('string')
    expect(entry).toContain('shape:spiky,variant:2')
  })

  it('renders wrapped gradient text settings in PNG export', async () => {
    const addColorStop = vi.fn()
    const createLinearGradient = vi.fn(() => ({
      addColorStop,
    }))
    const fillText = vi.fn()
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
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText,
      strokeText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      createLinearGradient,
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

    await exportPageAsPng(
      {
        ...sampleImage,
        textLayers: [
          {
            id: 'text-gradient',
            text: 'Wrapped gradient sample text',
            x: 120,
            y: 120,
            fontSize: 32,
            color: '#ffffff',
            lineHeight: 1.3,
            letterSpacing: 2,
            maxWidth: 120,
            fillMode: 'gradient',
            gradientFrom: '#ff3366',
            gradientTo: '#ffd166',
            isVertical: false,
            strokeWidth: 0,
            strokeColor: '#241b15',
            shadowEnabled: false,
            visible: true,
            locked: false,
          },
        ],
      },
      null,
      outputSettings,
    )

    expect(createLinearGradient).toHaveBeenCalled()
    expect(addColorStop).toHaveBeenCalledWith(0, '#ff3366')
    expect(addColorStop).toHaveBeenCalledWith(1, '#ffd166')
    expect(fillText.mock.calls.length).toBeGreaterThan(3)
  })

  it('renders a 9-slice message window asset in PNG export drawing calls', async () => {
    const fillRect = vi.fn()
    const strokeRect = vi.fn()
    const fillText = vi.fn()
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
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
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

    await exportPageAsPng(
      {
        ...sampleImage,
        messageWindowLayers: [
          {
            ...sampleImage.messageWindowLayers[0],
            assetName: 'vn-window.png',
            frameStyle: 'soft',
          },
        ],
      },
      null,
      outputSettings,
    )

    expect(fillRect.mock.calls.length).toBeGreaterThan(5)
    expect(strokeRect.mock.calls.length).toBeGreaterThan(1)
    expect(fillText).toHaveBeenCalledWith('[vn-window.png]', 640, 912)
    expect(fillText).toHaveBeenCalledWith('9-slice asset', 640, 888)
  })

  it('renders mosaic styles and overlay gradients in PNG export', async () => {
    const addColorStop = vi.fn()
    const createLinearGradient = vi.fn(() => ({
      addColorStop,
    }))
    const fillText = vi.fn()
    const fillRect = vi.fn()
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
      strokeRect: vi.fn(),
      fillText,
      strokeText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      createLinearGradient,
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

    await exportPageAsPng(
      {
        ...sampleImage,
        mosaicLayers: [
          {
            id: 'mosaic-1',
            x: 320,
            y: 220,
            width: 180,
            height: 120,
            intensity: 12,
            style: 'noise',
            visible: true,
            locked: false,
          },
        ],
        overlayLayers: [
          {
            id: 'overlay-1',
            x: 180,
            y: 120,
            width: 320,
            height: 180,
            areaPreset: 'custom',
            color: '#ffcc44',
            fillMode: 'gradient',
            gradientFrom: '#44ccff',
            gradientTo: '#112233',
            gradientDirection: 'diagonal',
            opacity: 0.4,
            visible: true,
            locked: false,
          },
        ],
      },
      null,
      outputSettings,
    )

    expect(createLinearGradient).toHaveBeenCalled()
    expect(addColorStop).toHaveBeenCalledWith(0, '#44ccff')
    expect(addColorStop).toHaveBeenCalledWith(1, '#112233')
    expect(fillText).toHaveBeenCalledWith('Noise 12', 320, 226)
    expect(fillText).toHaveBeenCalledWith('Overlay 0.4 custom diagonal', 180, 126)
    expect(fillRect).toHaveBeenCalled()
  })

  it('renders overlay preset bounds and vertical gradients in PNG export', async () => {
    const addColorStop = vi.fn()
    const createLinearGradient = vi.fn(() => ({
      addColorStop,
    }))
    const fillText = vi.fn()
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
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText,
      strokeText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      createLinearGradient,
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

    await exportPageAsPng(
      {
        ...sampleImage,
        overlayLayers: [
          {
            id: 'overlay-full',
            x: 960,
            y: 270,
            width: 1920,
            height: 540,
            areaPreset: 'top-half',
            color: '#ffcc44',
            fillMode: 'gradient',
            gradientFrom: '#44ccff',
            gradientTo: '#112233',
            gradientDirection: 'vertical',
            opacity: 0.4,
            visible: true,
            locked: false,
          },
        ],
      },
      null,
      outputSettings,
    )

    expect(createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 540)
    expect(fillText).toHaveBeenCalledWith('Overlay 0.4 top-half vertical', 960, 276)
    expect(addColorStop).toHaveBeenCalledWith(0, '#44ccff')
    expect(addColorStop).toHaveBeenCalledWith(1, '#112233')
  })

  it('renders stronger visual differences across mosaic styles in PNG export', async () => {
    const fillRect = vi.fn()
    const strokeRect = vi.fn()
    const fillText = vi.fn()
    const save = vi.fn()
    const restore = vi.fn()
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
      filter: 'none',
      fillRect,
      strokeRect,
      fillText,
      strokeText: vi.fn(),
      save,
      restore,
      translate: vi.fn(),
      rotate: vi.fn(),
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

    await exportPageAsPng(
      {
        ...sampleImage,
        mosaicLayers: [
          {
            id: 'mosaic-pixelate',
            x: 320,
            y: 220,
            width: 180,
            height: 120,
            intensity: 12,
            style: 'pixelate',
            visible: true,
            locked: false,
          },
          {
            id: 'mosaic-blur',
            x: 640,
            y: 220,
            width: 180,
            height: 120,
            intensity: 16,
            style: 'blur',
            visible: true,
            locked: false,
          },
          {
            id: 'mosaic-noise',
            x: 960,
            y: 220,
            width: 180,
            height: 120,
            intensity: 12,
            style: 'noise',
            visible: true,
            locked: false,
          },
        ],
      },
      null,
      outputSettings,
    )

    expect(fillRect.mock.calls.length).toBeGreaterThan(20)
    expect(save).toHaveBeenCalled()
    expect(restore).toHaveBeenCalled()
    expect(fillText).toHaveBeenCalledWith('Mosaic 12', 320, 226)
    expect(fillText).toHaveBeenCalledWith('Blur 16', 640, 226)
    expect(fillText).toHaveBeenCalledWith('Noise 12', 960, 226)
    expect(strokeRect.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('includes mosaic styles and overlay gradients in PDF and ZIP metadata', async () => {
    let pdfBlob: Blob | null = null
    let zipBlob: Blob | null = null
    const originalCreateElement = document.createElement.bind(document)
    let objectUrlCallCount = 0

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
        objectUrlCallCount += 1
        if (objectUrlCallCount === 1) {
          pdfBlob = blob
          return 'blob:pdf-export'
        }

        zipBlob = blob
        return 'blob:zip-export'
      }),
      revokeObjectURL: vi.fn(),
    })

    const pageWithEffects: CanvasImage = {
      ...sampleImage,
      mosaicLayers: [
        {
          id: 'mosaic-1',
          x: 320,
          y: 220,
          width: 180,
          height: 120,
          intensity: 12,
          style: 'blur',
          visible: true,
          locked: false,
        },
      ],
      overlayLayers: [
        {
          id: 'overlay-1',
          x: 180,
          y: 120,
          width: 320,
          height: 180,
          areaPreset: 'custom',
          color: '#ffcc44',
          fillMode: 'gradient',
          gradientFrom: '#44ccff',
          gradientTo: '#112233',
          gradientDirection: 'diagonal',
          opacity: 0.4,
          visible: true,
          locked: false,
        },
      ],
    }

    await exportPageAsPdf(pageWithEffects, null, outputSettings)
    await exportPagesAsZip([pageWithEffects], outputSettings)

    const pdfText = await pdfBlob?.text()
    expect(pdfText).toContain('Mosaic @ 320, 220 / 180x120 / intensity 12 / style blur')
    expect(pdfText).toContain(
      'Overlay @ 180, 120 / 320x180 / opacity 0.4 / area custom / tint #ffcc44 / fill gradient / gradient #44ccff to #112233 / direction diagonal',
    )

    const zip = await JSZip.loadAsync(zipBlob as Blob)
    const entry = await zip.file('01-creators-coco-01.txt')?.async('string')
    expect(entry).toContain('mosaic1=320,220,180,120,intensity:12,style:blur')
    expect(entry).toContain(
      'overlay1=180,120,320,180,opacity:0.4,area:custom,color:#ffcc44,fill:gradient,gradient:#44ccff->#112233,direction:diagonal',
    )
  })
})
