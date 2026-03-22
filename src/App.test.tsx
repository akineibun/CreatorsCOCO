import { act } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from './App'
import {
  PROJECT_STORAGE_KEY,
  RECENT_PROJECTS_STORAGE_KEY,
  resetWorkspaceStore,
} from './stores/workspaceStore'

describe('App shell', () => {
  beforeEach(() => {
    resetWorkspaceStore()
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the phase 1 workspace layout', () => {
    render(<App />)

    expect(screen.getByRole('banner', { name: 'Main menu' })).toBeInTheDocument()
    expect(screen.getByRole('toolbar', { name: 'Tool palette' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'Canvas workspace' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Page list' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Property inspector' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Layer panel' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo', { name: 'Status bar' })).toBeInTheDocument()
  })

  it('switches the active tool from the tool palette', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Text' }))

    expect(screen.getByRole('button', { name: 'Text' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('text')).toBeInTheDocument()
  })

  it('starts with an empty canvas state before an image is loaded', () => {
    render(<App />)

    expect(screen.getByText('Drop or choose an image to begin')).toBeInTheDocument()
    expect(screen.getByText(/No image loaded/)).toBeInTheDocument()
    expect(screen.getByText('Zoom 100%')).toBeInTheDocument()
  })

  it('loads a sample image into the canvas and updates status details', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))

    expect(screen.getAllByText('sample-page-01.webp')).toHaveLength(2)
    expect(screen.getByText('Image ready for canvas placement')).toBeInTheDocument()
    expect(screen.getByText('Image 3840 x 2160')).toBeInTheDocument()
    expect(screen.getByText('1 image layer')).toBeInTheDocument()
  })

  it('supports zoom in and zoom out from the canvas controls', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByText('Zoom 125%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Zoom out' }))
    await user.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(screen.getByText('Zoom 75%')).toBeInTheDocument()
  })

  it('selects the base image layer and shows its transform details', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Select base image layer' }))

    expect(screen.getByText('Selection')).toBeInTheDocument()
    expect(screen.getByText('Base image')).toBeInTheDocument()
    expect(screen.getByText('Position 0, 0')).toBeInTheDocument()
    expect(screen.getByText('Size 960 x 540')).toBeInTheDocument()
  })

  it('moves and resizes the selected image from canvas controls', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Select base image layer' }))
    await user.click(screen.getByRole('button', { name: 'Move right' }))
    await user.click(screen.getByRole('button', { name: 'Move down' }))
    await user.click(screen.getByRole('button', { name: 'Scale up' }))

    expect(screen.getByText('Position 32, 32')).toBeInTheDocument()
    expect(screen.getByText('Size 1080 x 608')).toBeInTheDocument()
    expect(screen.getByText('Selected base image')).toBeInTheDocument()
  })

  it('loads a supported image file from the file picker', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    const file = new File(['fake-image'], 'scene-01.png', { type: 'image/png' })

    await user.upload(input, file)

    expect(screen.getAllByText('scene-01.png')).toHaveLength(2)
    expect(screen.getByText('Image ready for canvas placement')).toBeInTheDocument()
    expect(screen.getByText('Image 1920 x 1080')).toBeInTheDocument()
  })

  it('rejects unsupported file types and keeps the canvas empty', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    const file = new File(['plain-text'], 'notes.txt', { type: 'text/plain' })

    await user.upload(input, file)

    expect(screen.getAllByText('Unsupported file type: notes.txt')).toHaveLength(2)
    expect(screen.getByText(/No image loaded/)).toBeInTheDocument()
    expect(screen.getByText('Drop or choose an image to begin')).toBeInTheDocument()
  })

  it('adds each loaded image as a page in the page list', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    const firstFile = new File(['one'], 'scene-01.png', { type: 'image/png' })
    const secondFile = new File(['two'], 'scene-02.webp', { type: 'image/webp' })

    await user.upload(input, firstFile)
    await user.upload(input, secondFile)

    expect(screen.getByText('2 pages loaded')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open page 01: scene-01.png' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open page 02: scene-02.webp' })).toBeInTheDocument()
    expect(screen.getAllByText('scene-02.webp')).toHaveLength(2)
  })

  it('switches the active page when a page thumbnail is selected', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))

    await user.click(screen.getByRole('button', { name: 'Open page 01: scene-01.png' }))

    expect(screen.getAllByText('scene-01.png')).toHaveLength(2)
    expect(screen.getByText('Image 1920 x 1080')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open page 01: scene-01.png' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('adds images dropped on the canvas drop zone', async () => {
    render(<App />)

    const dropZone = screen.getByRole('button', { name: 'Canvas drop zone' })
    const file = new File(['drop'], 'drop-01.jpg', { type: 'image/jpeg' })

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    })

    expect(screen.getByText('1 page loaded')).toBeInTheDocument()
    expect(screen.getAllByText('drop-01.jpg')).toHaveLength(2)
  })

  it('deletes the active page and falls back to the previous page', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))

    await user.click(screen.getByRole('button', { name: 'Delete active page' }))

    expect(screen.getByText('1 page loaded')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open page 02: scene-02.webp' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open page 01: scene-01.png' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('reorders pages by moving the active page upward', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))

    await user.click(screen.getByRole('button', { name: 'Move active page up' }))

    expect(screen.getByRole('button', { name: 'Open page 01: scene-02.webp' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Open page 02: scene-01.png' })).toBeInTheDocument()
  })

  it('undoes and redoes page additions', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('1 page loaded')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open page 02: scene-02.webp' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Redo' }))
    expect(screen.getByText('2 pages loaded')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open page 02: scene-02.webp' })).toBeInTheDocument()
  })

  it('undoes page reorder operations', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))

    await user.click(screen.getByRole('button', { name: 'Move active page up' }))
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByRole('button', { name: 'Open page 01: scene-01.png' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open page 02: scene-02.webp' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('marks the project dirty after page changes and saves it on demand', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))

    expect(screen.getByText('Autosave pending')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save now' }))

    expect(screen.getByText(/Saved at /)).toBeInTheDocument()
    expect(screen.queryByText('Autosave pending')).not.toBeInTheDocument()
  })

  it('autosaves dirty changes after the interval elapses', async () => {
    vi.useFakeTimers()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    fireEvent.change(input, {
      target: {
        files: [new File(['one'], 'scene-01.png', { type: 'image/png' })],
      },
    })

    expect(screen.getByText('Autosave pending')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(300000)
    })

    expect(screen.getByText(/Saved at /)).toBeInTheDocument()
  })

  it('supports Ctrl+S, Ctrl+Z, and Ctrl+Y shortcuts', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(screen.getByText('1 page loaded')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(screen.getByText('2 pages loaded')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(screen.getByText(/Saved at /)).toBeInTheDocument()
  })

  it('persists the saved project snapshot to local storage', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))
    await user.click(screen.getByRole('button', { name: 'Select base image layer' }))
    await user.click(screen.getByRole('button', { name: 'Move right' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    const savedProject = window.localStorage.getItem(PROJECT_STORAGE_KEY)
    expect(savedProject).not.toBeNull()
    expect(savedProject).toContain('scene-01.png')
    expect(savedProject).toContain('scene-02.webp')
    expect(savedProject).toContain('"activePageId"')
  })

  it('restores the last saved project on app mount', () => {
    window.localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({
        id: 'project-restored',
        name: 'restored-scene project',
        pages: [
          {
            id: 'page-restored',
            name: 'restored-scene.png',
            width: 1920,
            height: 1080,
          },
        ],
        activePageId: 'page-restored',
        selectedLayerId: 'base-image',
        imageTransform: {
          x: 32,
          y: 64,
          width: 960,
          height: 540,
        },
        lastSavedAt: '2026-03-22T03:00:00.000Z',
      }),
    )
    window.localStorage.setItem(
      RECENT_PROJECTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'project-restored',
          name: 'restored-scene project',
          pageCount: 1,
          lastSavedAt: '2026-03-22T03:00:00.000Z',
        },
      ]),
    )

    render(<App />)

    expect(screen.getAllByText('restored-scene.png')).toHaveLength(2)
    expect(screen.getByText('Position 32, 64')).toBeInTheDocument()
    expect(screen.getByText('Saved at 12:00:00')).toBeInTheDocument()
    expect(screen.queryByText('Drop or choose an image to begin')).not.toBeInTheDocument()
  })

  it('shows the recent project list after saving', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    expect(screen.getByText('Recent projects')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open recent project: scene-01.png project' })).toBeInTheDocument()
    expect(screen.getByText('1 pages')).toBeInTheDocument()
  })

  it('reopens the recent project snapshot', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({
        id: 'project-restored',
        name: 'restored-scene project',
        pages: [
          {
            id: 'page-restored',
            name: 'restored-scene.png',
            width: 1920,
            height: 1080,
          },
        ],
        activePageId: 'page-restored',
        selectedLayerId: 'base-image',
        imageTransform: {
          x: 32,
          y: 64,
          width: 960,
          height: 540,
        },
        lastSavedAt: '2026-03-22T03:00:00.000Z',
      }),
    )
    window.localStorage.setItem(
      RECENT_PROJECTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'project-restored',
          name: 'restored-scene project',
          pageCount: 1,
          lastSavedAt: '2026-03-22T03:00:00.000Z',
        },
      ]),
    )

    render(<App />)

    expect(await screen.findAllByText('restored-scene.png')).toHaveLength(2)

    const deleteButton = screen.getByRole('button', { name: 'Delete active page' })
    await user.click(deleteButton)
    expect(screen.getByText(/No image loaded/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open recent project: restored-scene project' }))

    expect(screen.getAllByText('restored-scene.png')).toHaveLength(2)
    expect(screen.getByText('Position 32, 64')).toBeInTheDocument()
  })

  it('exports the active page as a png', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:exported-page')
    const revokeObjectURL = vi.fn()
    const anchorClick = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        const canvas = originalCreateElement('canvas') as HTMLCanvasElement
        canvas.getContext = vi.fn(() => ({
          fillStyle: '',
          fillRect: vi.fn(),
          drawImage: vi.fn(),
          fillText: vi.fn(),
          font: '',
          textAlign: 'left',
        })) as typeof canvas.getContext
        canvas.toBlob = vi.fn((callback: BlobCallback) => {
          callback(new Blob(['png-binary'], { type: 'image/png' }))
        })
        return canvas
      }

      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.click = anchorClick
        return link
      }

      return originalCreateElement(tagName)
    })

    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Export PNG' }))

    expect(createObjectURL).toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:exported-page')
    expect(screen.getByText('Exported scene-01.png as PNG')).toBeInTheDocument()

    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('updates the export output size from presets', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Preset Square 1080' }))

    expect(screen.getByText('1080 x 1080 PNG')).toBeInTheDocument()
    expect(screen.getByText('Output preset Square 1080')).toBeInTheDocument()
  })

  it('exports all pages as a zip and the active page as a pdf', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:export-bundle')
    const revokeObjectURL = vi.fn()
    const anchorClick = vi.fn()
    const originalCreateElement = document.createElement.bind(document)

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.click = anchorClick
        return link
      }

      if (tagName === 'canvas') {
        const canvas = originalCreateElement('canvas') as HTMLCanvasElement
        canvas.getContext = vi.fn(() => ({
          fillStyle: '',
          fillRect: vi.fn(),
          fillText: vi.fn(),
          font: '',
          textAlign: 'left',
        })) as typeof canvas.getContext
        canvas.toBlob = vi.fn((callback: BlobCallback) => {
          callback(new Blob(['png-binary'], { type: 'image/png' }))
        })
        return canvas
      }

      return originalCreateElement(tagName)
    })

    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))

    await user.click(screen.getByRole('button', { name: 'Export ZIP' }))
    expect(await screen.findByText('Exported 2 pages as ZIP')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Export PDF' }))
    expect(await screen.findByText('Exported scene-02.webp as PDF')).toBeInTheDocument()

    expect(createObjectURL).toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('persists the selected output preset when saving the project', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Preset Story 1080x1920' }))
    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    const savedProject = window.localStorage.getItem(PROJECT_STORAGE_KEY)
    expect(savedProject).toContain('"presetId":"story-1080x1920"')
    expect(savedProject).toContain('"width":1080')
    expect(savedProject).toContain('"height":1920')
  })

  it('restores the saved output preset on app mount', () => {
    window.localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({
        id: 'project-output',
        name: 'output-project',
        pages: [
          {
            id: 'page-output',
            name: 'output-scene.png',
            width: 1920,
            height: 1080,
          },
        ],
        activePageId: 'page-output',
        selectedLayerId: null,
        imageTransform: null,
        outputSettings: {
          presetId: 'story-1080x1920',
          label: 'Story 1080x1920',
          width: 1080,
          height: 1920,
          format: 'png',
        },
        lastSavedAt: '2026-03-22T03:00:00.000Z',
      }),
    )

    render(<App />)

    expect(screen.getByText('1080 x 1920 PNG')).toBeInTheDocument()
    expect(screen.getByText('Output preset Story 1080x1920')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preset Story 1080x1920' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('updates output size from custom width and height inputs', async () => {
    const user = userEvent.setup()
    render(<App />)

    const widthInput = screen.getByLabelText('Output width')
    const heightInput = screen.getByLabelText('Output height')

    await user.clear(widthInput)
    await user.type(widthInput, '1600')
    fireEvent.blur(widthInput)
    await user.clear(heightInput)
    await user.type(heightInput, '900')
    fireEvent.blur(heightInput)

    expect(screen.getByText(/1600 x 900 PNG/)).toBeInTheDocument()
    expect(screen.getByText('Output preset Custom 1600x900')).toBeInTheDocument()
  })

  it('persists custom output size values when saving and restoring', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.clear(screen.getByLabelText('Output width'))
    await user.type(screen.getByLabelText('Output width'), '2048')
    fireEvent.blur(screen.getByLabelText('Output width'))
    await user.clear(screen.getByLabelText('Output height'))
    await user.type(screen.getByLabelText('Output height'), '2048')
    fireEvent.blur(screen.getByLabelText('Output height'))
    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    resetWorkspaceStore()
    cleanup()
    render(<App />)

    expect(await screen.findByText(/2048 x 2048 PNG/)).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('2048')).toHaveLength(2)
  })

  it('updates and restores the export filename prefix', async () => {
    const user = userEvent.setup()
    render(<App />)

    const prefixInput = screen.getByLabelText('Export filename prefix')
    await user.clear(prefixInput)
    await user.type(prefixInput, 'booth-release')
    fireEvent.blur(prefixInput)
    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    const savedProject = window.localStorage.getItem(PROJECT_STORAGE_KEY)
    expect(savedProject).toContain('"fileNamePrefix":"booth-release"')

    resetWorkspaceStore()
    cleanup()
    render(<App />)

    expect(await screen.findByDisplayValue('booth-release')).toBeInTheDocument()
    expect(screen.getByText('Export prefix booth-release')).toBeInTheDocument()
  })

  it('uses the export filename prefix for png, zip, and pdf downloads', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:prefixed-export')
    const revokeObjectURL = vi.fn()
    const downloadNames: string[] = []
    const originalCreateElement = document.createElement.bind(document)

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        Object.defineProperty(link, 'download', {
          configurable: true,
          get() {
            return link.getAttribute('download') ?? ''
          },
          set(value: string) {
            link.setAttribute('download', value)
          },
        })
        link.click = vi.fn(() => {
          downloadNames.push(link.download)
        })
        return link
      }

      if (tagName === 'canvas') {
        const canvas = originalCreateElement('canvas') as HTMLCanvasElement
        canvas.getContext = vi.fn(() => ({
          fillStyle: '',
          fillRect: vi.fn(),
          fillText: vi.fn(),
          font: '',
          textAlign: 'left',
        })) as typeof canvas.getContext
        canvas.toBlob = vi.fn((callback: BlobCallback) => {
          callback(new Blob(['png-binary'], { type: 'image/png' }))
        })
        return canvas
      }

      return originalCreateElement(tagName)
    })

    render(<App />)

    await user.clear(screen.getByLabelText('Export filename prefix'))
    await user.type(screen.getByLabelText('Export filename prefix'), 'cg_pack')
    fireEvent.blur(screen.getByLabelText('Export filename prefix'))

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))

    await user.click(screen.getByRole('button', { name: 'Export PNG' }))
    await user.click(screen.getByRole('button', { name: 'Export ZIP' }))
    await user.click(screen.getByRole('button', { name: 'Export PDF' }))

    expect(downloadNames).toContain('cg_pack-02.png')
    expect(downloadNames).toContain('cg_pack-export-01-02.zip')
    expect(downloadNames).toContain('cg_pack-02.pdf')

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('updates export numbering settings and restores them after save', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.clear(screen.getByLabelText('Export start number'))
    await user.type(screen.getByLabelText('Export start number'), '7')
    fireEvent.blur(screen.getByLabelText('Export start number'))
    await user.clear(screen.getByLabelText('Export number padding'))
    await user.type(screen.getByLabelText('Export number padding'), '4')
    fireEvent.blur(screen.getByLabelText('Export number padding'))
    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    const savedProject = window.localStorage.getItem(PROJECT_STORAGE_KEY)
    expect(savedProject).toContain('"startNumber":7')
    expect(savedProject).toContain('"numberPadding":4')

    resetWorkspaceStore()
    cleanup()
    render(<App />)

    expect(await screen.findByDisplayValue('7')).toBeInTheDocument()
    expect(screen.getByDisplayValue('4')).toBeInTheDocument()
    expect(screen.getByText('Export numbering 7 / pad 4')).toBeInTheDocument()
  })

  it('uses prefix and numbering rules for exported file names', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:numbered-export')
    const revokeObjectURL = vi.fn()
    const downloadNames: string[] = []
    const originalCreateElement = document.createElement.bind(document)

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        Object.defineProperty(link, 'download', {
          configurable: true,
          get() {
            return link.getAttribute('download') ?? ''
          },
          set(value: string) {
            link.setAttribute('download', value)
          },
        })
        link.click = vi.fn(() => {
          downloadNames.push(link.download)
        })
        return link
      }

      if (tagName === 'canvas') {
        const canvas = originalCreateElement('canvas') as HTMLCanvasElement
        canvas.getContext = vi.fn(() => ({
          fillStyle: '',
          fillRect: vi.fn(),
          fillText: vi.fn(),
          font: '',
          textAlign: 'left',
        })) as typeof canvas.getContext
        canvas.toBlob = vi.fn((callback: BlobCallback) => {
          callback(new Blob(['png-binary'], { type: 'image/png' }))
        })
        return canvas
      }

      return originalCreateElement(tagName)
    })

    render(<App />)

    await user.clear(screen.getByLabelText('Export filename prefix'))
    await user.type(screen.getByLabelText('Export filename prefix'), 'release')
    fireEvent.blur(screen.getByLabelText('Export filename prefix'))
    await user.clear(screen.getByLabelText('Export start number'))
    await user.type(screen.getByLabelText('Export start number'), '7')
    fireEvent.blur(screen.getByLabelText('Export start number'))
    await user.clear(screen.getByLabelText('Export number padding'))
    await user.type(screen.getByLabelText('Export number padding'), '4')
    fireEvent.blur(screen.getByLabelText('Export number padding'))

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))

    await user.click(screen.getByRole('button', { name: 'Export PNG' }))
    await user.click(screen.getByRole('button', { name: 'Export ZIP' }))
    await user.click(screen.getByRole('button', { name: 'Export PDF' }))

    expect(downloadNames).toContain('release-0008.png')
    expect(downloadNames).toContain('release-export-0007-0008.zip')
    expect(downloadNames).toContain('release-0008.pdf')

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows an export preview for the active page and zip bundle', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.clear(screen.getByLabelText('Export filename prefix'))
    await user.type(screen.getByLabelText('Export filename prefix'), 'preview')
    fireEvent.blur(screen.getByLabelText('Export filename prefix'))
    await user.clear(screen.getByLabelText('Export start number'))
    await user.type(screen.getByLabelText('Export start number'), '12')
    fireEvent.blur(screen.getByLabelText('Export start number'))
    await user.clear(screen.getByLabelText('Export number padding'))
    await user.type(screen.getByLabelText('Export number padding'), '3')
    fireEvent.blur(screen.getByLabelText('Export number padding'))

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))

    expect(screen.getByText('PNG preview-013.png')).toBeInTheDocument()
    expect(screen.getByText('PDF preview-013.pdf')).toBeInTheDocument()
    expect(screen.getByText('ZIP preview-export-012-013.zip')).toBeInTheDocument()
  })

  it('shows zip entry previews for every page with numbering applied', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.clear(screen.getByLabelText('Export filename prefix'))
    await user.type(screen.getByLabelText('Export filename prefix'), 'bundle')
    fireEvent.blur(screen.getByLabelText('Export filename prefix'))
    await user.clear(screen.getByLabelText('Export start number'))
    await user.type(screen.getByLabelText('Export start number'), '21')
    fireEvent.blur(screen.getByLabelText('Export start number'))
    await user.clear(screen.getByLabelText('Export number padding'))
    await user.type(screen.getByLabelText('Export number padding'), '3')
    fireEvent.blur(screen.getByLabelText('Export number padding'))

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))

    expect(screen.getByText('01-bundle-021.txt')).toBeInTheDocument()
    expect(screen.getByText('02-bundle-022.txt')).toBeInTheDocument()
  })

  it('records recent export activity in the sidebar', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:history-export')
    const revokeObjectURL = vi.fn()
    const originalCreateElement = document.createElement.bind(document)

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.click = vi.fn()
        return link
      }

      if (tagName === 'canvas') {
        const canvas = originalCreateElement('canvas') as HTMLCanvasElement
        canvas.getContext = vi.fn(() => ({
          fillStyle: '',
          fillRect: vi.fn(),
          fillText: vi.fn(),
          font: '',
          textAlign: 'left',
        })) as typeof canvas.getContext
        canvas.toBlob = vi.fn((callback: BlobCallback) => {
          callback(new Blob(['png-binary'], { type: 'image/png' }))
        })
        return canvas
      }

      return originalCreateElement(tagName)
    })

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Export PNG' }))
    await user.click(screen.getByRole('button', { name: 'Export PDF' }))

    expect(await screen.findByText('PNG sample-page-01.webp')).toBeInTheDocument()
    expect(screen.getByText('PDF sample-page-01.webp')).toBeInTheDocument()

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('persists recent export activity across app reloads', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:history-persist')
    const revokeObjectURL = vi.fn()
    const originalCreateElement = document.createElement.bind(document)

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.click = vi.fn()
        return link
      }

      if (tagName === 'canvas') {
        const canvas = originalCreateElement('canvas') as HTMLCanvasElement
        canvas.getContext = vi.fn(() => ({
          fillStyle: '',
          fillRect: vi.fn(),
          fillText: vi.fn(),
          font: '',
          textAlign: 'left',
        })) as typeof canvas.getContext
        canvas.toBlob = vi.fn((callback: BlobCallback) => {
          callback(new Blob(['png-binary'], { type: 'image/png' }))
        })
        return canvas
      }

      return originalCreateElement(tagName)
    })

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Export PNG' }))

    resetWorkspaceStore()
    cleanup()
    render(<App />)

    expect(await screen.findByText('PNG sample-page-01.webp')).toBeInTheDocument()

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('updates the project name and persists it when saving', async () => {
    const user = userEvent.setup()
    render(<App />)

    const projectNameInput = screen.getByLabelText('Project name')
    await user.clear(projectNameInput)
    await user.type(projectNameInput, 'Booth release draft')
    fireEvent.blur(projectNameInput)
    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    expect(screen.getByDisplayValue('Booth release draft')).toBeInTheDocument()
    expect(screen.getAllByText('Booth release draft').length).toBeGreaterThan(0)

    const savedProject = window.localStorage.getItem(PROJECT_STORAGE_KEY)
    expect(savedProject).toContain('"name":"Booth release draft"')
  })

  it('restores the saved project name on app mount', () => {
    window.localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({
        id: 'project-named',
        name: 'Patreon batch 01',
        pages: [
          {
            id: 'page-named',
            name: 'named-scene.png',
            width: 1920,
            height: 1080,
          },
        ],
        activePageId: 'page-named',
        selectedLayerId: null,
        imageTransform: null,
        outputSettings: {
          presetId: 'hd-landscape',
          label: 'HD Landscape',
          width: 1920,
          height: 1080,
          format: 'png',
          fileNamePrefix: 'creators-coco',
          startNumber: 1,
          numberPadding: 2,
        },
        lastSavedAt: '2026-03-22T03:00:00.000Z',
      }),
    )

    render(<App />)

    expect(screen.getByDisplayValue('Patreon batch 01')).toBeInTheDocument()
    expect(screen.getAllByText('Patreon batch 01').length).toBeGreaterThan(0)
  })

  it('adds a text layer to the active page and selects it', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))

    expect(screen.getByDisplayValue('New text')).toBeInTheDocument()
    expect(screen.getByText('Text layer')).toBeInTheDocument()
    expect(screen.getByText('Position 120, 120')).toBeInTheDocument()
    expect(screen.getByText('Text: New text')).toBeInTheDocument()
  })

  it('edits the selected text layer content and size', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))

    const textInput = screen.getByLabelText('Selected text content')
    await user.clear(textInput)
    await user.type(textInput, 'Sale now')

    await user.click(screen.getByRole('button', { name: 'Increase text size' }))

    expect(screen.getByDisplayValue('Sale now')).toBeInTheDocument()
    expect(screen.getByText('Font 34 px')).toBeInTheDocument()
    expect(screen.getByText('Text: Sale now')).toBeInTheDocument()
  })

  it('moves the selected text layer from text controls', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Move text right' }))
    await user.click(screen.getByRole('button', { name: 'Move text down' }))

    expect(screen.getByText('Position 152, 152')).toBeInTheDocument()
  })

  it('deletes the selected text layer and clears the selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Delete text layer' }))

    expect(screen.queryByDisplayValue('New text')).not.toBeInTheDocument()
    expect(screen.getByText('None')).toBeInTheDocument()
    expect(screen.getByText('Text overlay')).toBeInTheDocument()
  })

  it('updates the selected text layer color', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    fireEvent.change(screen.getByLabelText('Selected text color'), {
      target: {
        value: '#ff0066',
      },
    })

    expect(screen.getByText('Color #ff0066')).toBeInTheDocument()
  })

  it('reorders text layers within the active page', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))

    const firstInput = screen.getByLabelText('Selected text content')
    await user.clear(firstInput)
    await user.type(firstInput, 'First')

    await user.click(screen.getByRole('button', { name: 'Add text layer' }))

    const secondInput = screen.getByLabelText('Selected text content')
    await user.clear(secondInput)
    await user.type(secondInput, 'Second')

    await user.click(screen.getByRole('button', { name: 'Send text backward' }))

    expect(screen.getByText('Order 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layer text: First (2)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layer text: Second (1)' })).toBeInTheDocument()
  })

  it('toggles the selected text layer into vertical mode', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Toggle vertical text' }))

    expect(screen.getByText('Direction Vertical')).toBeInTheDocument()
  })

  it('increases the selected text layer outline width', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Increase outline' }))

    expect(screen.getByText('Outline 1 px')).toBeInTheDocument()
  })

  it('toggles the selected text layer shadow', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Toggle text shadow' }))

    expect(screen.getByText('Shadow On')).toBeInTheDocument()
  })

  it('adds a bubble layer to the active page and selects it', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))

    expect(screen.getByDisplayValue('New bubble')).toBeInTheDocument()
    expect(screen.getByText('Bubble layer')).toBeInTheDocument()
    expect(screen.getByText('Position 240, 180')).toBeInTheDocument()
    expect(screen.getByText('Bubble: New bubble')).toBeInTheDocument()
  })

  it('edits and moves the selected bubble layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))

    const bubbleInput = screen.getByLabelText('Selected bubble content')
    await user.clear(bubbleInput)
    await user.type(bubbleInput, 'Look here')
    await user.click(screen.getByRole('button', { name: 'Move bubble right' }))
    await user.click(screen.getByRole('button', { name: 'Move bubble down' }))

    expect(screen.getByDisplayValue('Look here')).toBeInTheDocument()
    expect(screen.getByText('Position 272, 212')).toBeInTheDocument()
    expect(screen.getByText('Bubble: Look here')).toBeInTheDocument()
  })

  it('deletes the selected bubble layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Delete bubble layer' }))

    expect(screen.queryByDisplayValue('New bubble')).not.toBeInTheDocument()
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('resizes the selected bubble layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Increase bubble width' }))
    await user.click(screen.getByRole('button', { name: 'Increase bubble height' }))

    expect(screen.getByText('Size 252 x 152')).toBeInTheDocument()
  })

  it('changes the selected bubble tail direction', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Tail right' }))

    expect(screen.getByText('Tail Right')).toBeInTheDocument()
  })

  it('changes the selected bubble style preset', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Style thought' }))

    expect(screen.getByText('Style Thought')).toBeInTheDocument()
  })

  it('duplicates the selected bubble layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Duplicate bubble layer' }))

    expect(screen.getByText('Order 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bubble layer: New bubble copy' })).toBeInTheDocument()
  })

  it('reorders bubble layers within the active page', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.clear(screen.getByLabelText('Selected bubble content'))
    await user.type(screen.getByLabelText('Selected bubble content'), 'First bubble')

    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.clear(screen.getByLabelText('Selected bubble content'))
    await user.type(screen.getByLabelText('Selected bubble content'), 'Second bubble')

    await user.click(screen.getByRole('button', { name: 'Send bubble backward' }))

    expect(screen.getByText('Order 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bubble layer: First bubble' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bubble layer: Second bubble' })).toBeInTheDocument()
  })

  it('updates the selected bubble colors', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    fireEvent.change(screen.getByLabelText('Selected bubble fill color'), {
      target: {
        value: '#ffe066',
      },
    })
    fireEvent.change(screen.getByLabelText('Selected bubble border color'), {
      target: {
        value: '#ff3366',
      },
    })

    expect(screen.getByText('Fill #ffe066')).toBeInTheDocument()
    expect(screen.getByText('Border #ff3366')).toBeInTheDocument()
  })

  it('adds a mosaic layer to the active page and selects it', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add mosaic layer' }))

    expect(screen.getByText('Mosaic layer')).toBeInTheDocument()
    expect(screen.getByText('Position 320, 220')).toBeInTheDocument()
    expect(screen.getByText('Size 180 x 120')).toBeInTheDocument()
    expect(screen.getByText('Mosaic intensity 12')).toBeInTheDocument()
  })

  it('moves and resizes the selected mosaic layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add mosaic layer' }))
    await user.click(screen.getByRole('button', { name: 'Move mosaic right' }))
    await user.click(screen.getByRole('button', { name: 'Increase mosaic width' }))

    expect(screen.getByText('Position 352, 220')).toBeInTheDocument()
    expect(screen.getByText('Size 212 x 120')).toBeInTheDocument()
  })

  it('changes the selected mosaic intensity', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add mosaic layer' }))
    await user.click(screen.getByRole('button', { name: 'Increase mosaic intensity' }))

    expect(screen.getByText('Mosaic intensity 16')).toBeInTheDocument()
  })

  it('duplicates and reorders the selected mosaic layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add mosaic layer' }))
    await user.click(screen.getByRole('button', { name: 'Duplicate mosaic layer' }))
    await user.click(screen.getByRole('button', { name: 'Send mosaic backward' }))

    expect(screen.getByText('Order 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mosaic layer 12 (1)' })).toBeInTheDocument()
  })

  it('deletes the selected mosaic layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add mosaic layer' }))
    await user.click(screen.getByRole('button', { name: 'Delete mosaic layer' }))

    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('adds an overlay layer and selects it', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))

    expect(screen.getByText('Overlay layer')).toBeInTheDocument()
    expect(screen.getByText('Position 180, 120')).toBeInTheDocument()
    expect(screen.getByText('Overlay opacity 0.4')).toBeInTheDocument()
  })

  it('moves and changes opacity for the selected overlay layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Move overlay right' }))
    await user.click(screen.getByRole('button', { name: 'Increase overlay opacity' }))

    expect(screen.getByText('Position 212, 120')).toBeInTheDocument()
    expect(screen.getByText('Overlay opacity 0.5')).toBeInTheDocument()
  })

  it('changes the selected overlay tint color', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    fireEvent.change(screen.getByLabelText('Selected overlay color'), {
      target: {
        value: '#44ccff',
      },
    })

    expect(screen.getByText('Tint #44ccff')).toBeInTheDocument()
  })

  it('duplicates and reorders the selected overlay layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Duplicate overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Send overlay backward' }))

    expect(screen.getByText('Order 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' })).toBeInTheDocument()
  })

  it('deletes the selected overlay layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Delete overlay layer' }))

    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('toggles visibility for the selected text layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer visibility' }))

    expect(screen.getByText('Visibility Hidden')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select text layer: New text' })).not.toBeInTheDocument()
  })

  it('toggles visibility for the selected bubble layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer visibility' }))

    expect(screen.getByText('Visibility Hidden')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select bubble layer: New bubble' })).not.toBeInTheDocument()
  })

  it('toggles visibility for the selected overlay layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer visibility' }))

    expect(screen.getByText('Visibility Hidden')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select overlay layer 0.4' })).not.toBeInTheDocument()
  })

  it('locks the selected text layer and prevents text edits', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer lock' }))
    await user.click(screen.getByRole('button', { name: 'Move text right' }))

    expect(screen.getByText('Lock Locked')).toBeInTheDocument()
    expect(screen.getByText('Position 120, 120')).toBeInTheDocument()
  })

  it('locks the selected bubble layer and prevents movement', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer lock' }))
    await user.click(screen.getByRole('button', { name: 'Move bubble right' }))

    expect(screen.getByText('Lock Locked')).toBeInTheDocument()
    expect(screen.getByText('Position 240, 180')).toBeInTheDocument()
  })

  it('locks the selected overlay layer and prevents opacity changes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer lock' }))
    await user.click(screen.getByRole('button', { name: 'Increase overlay opacity' }))

    expect(screen.getByText('Lock Locked')).toBeInTheDocument()
    expect(screen.getByText('Overlay opacity 0.4')).toBeInTheDocument()
  })

  it('duplicates the selected text layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Duplicate selected layer' }))

    expect(screen.getByText('Order 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layer text: New text copy (2)' })).toBeInTheDocument()
  })

  it('centers the selected bubble layer on the canvas', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Center selected layer' }))

    expect(screen.getByText('Position 960, 540')).toBeInTheDocument()
  })

  it('centers the selected overlay layer on the canvas', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Center selected layer' }))

    expect(screen.getByText('Position 960, 540')).toBeInTheDocument()
  })

  it('aligns the selected text layer to the left edge of the canvas', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Align selected layer left' }))

    expect(screen.getByText('Position 0, 120')).toBeInTheDocument()
  })

  it('aligns the selected bubble layer to the right edge of the canvas', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Align selected layer right' }))

    expect(screen.getByText('Position 1920, 180')).toBeInTheDocument()
  })

  it('aligns the selected overlay layer to the bottom edge of the canvas', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Align selected layer bottom' }))

    expect(screen.getByText('Position 180, 1080')).toBeInTheDocument()
  })

  it('deletes the selected layer from the common action button', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Delete selected layer' }))

    expect(screen.getByText('None')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('New bubble')).not.toBeInTheDocument()
  })

  it('moves the selected layer backward and forward from common actions', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Duplicate selected layer' }))
    await user.click(screen.getByRole('button', { name: 'Move selected layer backward' }))

    expect(screen.getByText('Order 1 of 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Move selected layer forward' }))

    expect(screen.getByText('Order 2 of 2')).toBeInTheDocument()
  })

  it('nudges the selected text layer with arrow keys', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })

    expect(screen.getByText('Position 152, 152')).toBeInTheDocument()
  })

  it('selects all visible layers on the active page', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
  })

  it('aligns all selected layers to the left edge', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Align selected layer left' }))

    expect(screen.getByText(/Position 0, /)).toBeInTheDocument()
  })

  it('clears the current layer selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Clear layer selection' }))

    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('centers all selected layers together', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Center selected layer' }))

    expect(screen.getByText(/2 layers selected/)).toBeInTheDocument()
    expect(screen.getByText(/Position 960, 540/)).toBeInTheDocument()
  })

  it('duplicates all selected layers together', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Duplicate selected layer' }))

    expect(screen.getByText('4 layers selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layer text: New text copy grouped (2)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bubble layer: New bubble copy [Group]' })).toBeInTheDocument()
  })

  it('deletes all selected layers together', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Delete selected layer' }))

    expect(screen.getByText('None')).toBeInTheDocument()
    expect(screen.getByText('Text overlay')).toBeInTheDocument()
  })

  it('toggles visibility for all selected layers together', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer visibility' }))

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select text layer: New text' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select overlay layer 0.4' })).not.toBeInTheDocument()
  })

  it('toggles lock for all selected layers together', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer lock' }))
    await user.click(screen.getByRole('button', { name: 'Center selected layer' }))

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
    expect(screen.queryByText('Position 960, 540')).not.toBeInTheDocument()
  })

  it('moves all selected layers backward together', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Move selected layer backward' }))

    expect(screen.getByText('3 layers selected')).toBeInTheDocument()
  })

  it('nudges all selected layers together with arrow keys', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })

    await user.click(screen.getByRole('button', { name: 'Layer text: New text (1)' }))
    expect(screen.getByText('Position 152, 152')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    expect(screen.getByText('Position 212, 152')).toBeInTheDocument()
  })

  it('keeps locked layers stationary during multi-select nudge', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer lock' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))

    fireEvent.keyDown(window, { key: 'ArrowRight' })

    await user.click(screen.getByRole('button', { name: 'Layer text: New text (1)' }))
    expect(screen.getByText('Position 152, 120')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    expect(screen.getByText('Position 180, 120')).toBeInTheDocument()
  })

  it('inverts the current layer selection on the active page', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    await user.click(screen.getByRole('button', { name: 'Invert layer selection' }))

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
  })

  it('selects only text layers from the active page', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select text layers' }))
    await user.click(screen.getByRole('button', { name: 'Align selected layer left' }))

    expect(screen.getByText('Text layer')).toBeInTheDocument()
    expect(screen.getByText('Position 0, 120')).toBeInTheDocument()
  })

  it('distributes selected layers horizontally across the canvas', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Distribute selected layers horizontally' }))

    await user.click(screen.getByRole('button', { name: 'Layer text: New text (1)' }))
    expect(screen.getByText('Position 0, 120')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bubble layer: New bubble' }))
    expect(screen.getByText('Position 1920, 180')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    expect(screen.getByText('Position 960, 120')).toBeInTheDocument()
  })

  it('distributes selected layers vertically across the canvas', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Distribute selected layers vertically' }))

    await user.click(screen.getByRole('button', { name: 'Layer text: New text (1)' }))
    expect(screen.getByText('Position 120, 0')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bubble layer: New bubble' }))
    expect(screen.getByText('Position 240, 1080')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    expect(screen.getByText('Position 180, 540')).toBeInTheDocument()
  })

  it('keeps locked layers fixed during horizontal distribution', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Bubble layer: New bubble' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer lock' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Distribute selected layers horizontally' }))

    await user.click(screen.getByRole('button', { name: 'Layer text: New text (1)' }))
    expect(screen.getByText('Position 120, 120')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bubble layer: New bubble' }))
    expect(screen.getByText('Position 240, 180')).toBeInTheDocument()
  })

  it('aligns selected layers to the horizontal center line', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Align selected layers center horizontally' }))

    await user.click(screen.getByRole('button', { name: 'Layer text: New text (1)' }))
    expect(screen.getByText('Position 960, 120')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    expect(screen.getByText('Position 960, 120')).toBeInTheDocument()
  })

  it('aligns selected layers to the vertical center line', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Align selected layers center vertically' }))

    await user.click(screen.getByRole('button', { name: 'Bubble layer: New bubble' }))
    expect(screen.getByText('Position 240, 540')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    expect(screen.getByText('Position 180, 540')).toBeInTheDocument()
  })

  it('matches selected layer widths from the primary selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Increase bubble width' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Select bubble layers' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Match selected layer widths' }))

    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    expect(screen.getByText('Size 252 x 180')).toBeInTheDocument()
  })

  it('keeps locked resizable layers unchanged during height matching', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Increase bubble height' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer lock' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Match selected layer heights' }))

    await user.click(screen.getByRole('button', { name: 'Bubble layer: New bubble' }))
    expect(screen.getByText('Size 220 x 152')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    expect(screen.getByText('Size 320 x 180')).toBeInTheDocument()
  })

  it('adds a layer to the current selection with ctrl-click in the layer panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))

    fireEvent.click(screen.getByRole('button', { name: 'Layer text: New text (1)' }), { ctrlKey: true })

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
  })

  it('removes a selected layer from the selection with ctrl-click', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))

    fireEvent.click(screen.getByRole('button', { name: 'Layer text: New text (1)' }), { ctrlKey: true })

    expect(screen.getByText('Bubble layer')).toBeInTheDocument()
  })

  it('adds a canvas chip to the selection with ctrl-click', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))

    fireEvent.click(screen.getByRole('button', { name: 'Select text layer: New text' }), { ctrlKey: true })

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
  })

  it('supports meta-click for additive selection on mac style shortcuts', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))

    fireEvent.click(screen.getByRole('button', { name: 'Bubble layer: New bubble' }), { metaKey: true })

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
  })

  it('selects multiple layers with a marquee drag on the canvas', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))

    const canvasFrame = screen.getByLabelText('Canvas frame')
    vi.spyOn(canvasFrame, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 720,
      height: 405,
      right: 720,
      bottom: 405,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(canvasFrame, { clientX: 20, clientY: 20 })
    fireEvent.mouseMove(canvasFrame, { clientX: 130, clientY: 100 })
    fireEvent.mouseUp(canvasFrame, { clientX: 130, clientY: 100 })

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
  })

  it('supports reverse-direction marquee selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))

    const canvasFrame = screen.getByLabelText('Canvas frame')
    vi.spyOn(canvasFrame, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 720,
      height: 405,
      right: 720,
      bottom: 405,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(canvasFrame, { clientX: 130, clientY: 100 })
    fireEvent.mouseMove(canvasFrame, { clientX: 20, clientY: 20 })
    fireEvent.mouseUp(canvasFrame, { clientX: 20, clientY: 20 })

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
  })

  it('adds marquee-selected layers to the current selection with ctrl-drag', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))

    const canvasFrame = screen.getByLabelText('Canvas frame')
    vi.spyOn(canvasFrame, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 720,
      height: 405,
      right: 720,
      bottom: 405,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(canvasFrame, { clientX: 20, clientY: 20, ctrlKey: true })
    fireEvent.mouseMove(canvasFrame, { clientX: 130, clientY: 100, ctrlKey: true })
    fireEvent.mouseUp(canvasFrame, { clientX: 130, clientY: 100, ctrlKey: true })

    expect(screen.getByText('3 layers selected')).toBeInTheDocument()
  })

  it('shows a selection bounds overlay for the current multi-selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))

    expect(screen.getByLabelText('Selection bounds')).toBeInTheDocument()
    expect(screen.getByText('Selection bounds 368 x 208')).toBeInTheDocument()
  })

  it('drags all selected layers together on the canvas', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))

    const canvasFrame = screen.getByLabelText('Canvas frame')
    vi.spyOn(canvasFrame, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 720,
      height: 405,
      right: 720,
      bottom: 405,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Select text layer: New text' }), {
      clientX: 45,
      clientY: 45,
    })
    fireEvent.mouseMove(canvasFrame, { clientX: 57, clientY: 57 })
    fireEvent.mouseUp(canvasFrame, { clientX: 57, clientY: 57 })

    await user.click(screen.getByRole('button', { name: 'Layer text: New text (1)' }))
    expect(screen.getByText('Position 152, 152')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    expect(screen.getByText('Position 212, 152')).toBeInTheDocument()
  })

  it('resizes a selected overlay layer from the selection bounds handle', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))

    const canvasFrame = screen.getByLabelText('Canvas frame')
    vi.spyOn(canvasFrame, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 720,
      height: 405,
      right: 720,
      bottom: 405,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize selected layers' }), {
      clientX: 188,
      clientY: 113,
    })
    fireEvent.mouseMove(canvasFrame, { clientX: 200, clientY: 125 })
    fireEvent.mouseUp(canvasFrame, { clientX: 200, clientY: 125 })

    expect(screen.getByText('Size 352 x 212')).toBeInTheDocument()
  })

  it('keeps the selection resize aspect ratio when shift-dragging a corner handle', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))

    const canvasFrame = screen.getByLabelText('Canvas frame')
    vi.spyOn(canvasFrame, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 720,
      height: 405,
      right: 720,
      bottom: 405,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize selected layers' }), {
      clientX: 188,
      clientY: 113,
      shiftKey: true,
    })
    fireEvent.mouseMove(canvasFrame, { clientX: 224, clientY: 122, shiftKey: true })
    fireEvent.mouseUp(canvasFrame, { clientX: 224, clientY: 122, shiftKey: true })

    expect(screen.getByText('Size 416 x 234')).toBeInTheDocument()
  })

  it('resizes all selected resizable layers together from the selection bounds handle', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))

    const canvasFrame = screen.getByLabelText('Canvas frame')
    vi.spyOn(canvasFrame, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 720,
      height: 405,
      right: 720,
      bottom: 405,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize selected layers' }), {
      clientX: 188,
      clientY: 113,
    })
    fireEvent.mouseMove(canvasFrame, { clientX: 200, clientY: 125 })
    fireEvent.mouseUp(canvasFrame, { clientX: 200, clientY: 125 })

    await user.click(screen.getByRole('button', { name: 'Bubble layer: New bubble' }))
    expect(screen.getByText('Size 252 x 152')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    expect(screen.getByText('Size 352 x 212')).toBeInTheDocument()
  })

  it('resizes a selected overlay layer inward from the top-left handle', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))

    const canvasFrame = screen.getByLabelText('Canvas frame')
    vi.spyOn(canvasFrame, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 720,
      height: 405,
      right: 720,
      bottom: 405,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize selected layers top left' }), {
      clientX: 68,
      clientY: 45,
    })
    fireEvent.mouseMove(canvasFrame, { clientX: 80, clientY: 57 })
    fireEvent.mouseUp(canvasFrame, { clientX: 80, clientY: 57 })

    expect(screen.getByText('Position 212, 152')).toBeInTheDocument()
    expect(screen.getByText('Size 288 x 148')).toBeInTheDocument()
  })

  it('resizes all selected resizable layers from the left handle and shifts their x positions', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))

    const canvasFrame = screen.getByLabelText('Canvas frame')
    vi.spyOn(canvasFrame, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 720,
      height: 405,
      right: 720,
      bottom: 405,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize selected layers left' }), {
      clientX: 68,
      clientY: 79,
    })
    fireEvent.mouseMove(canvasFrame, { clientX: 80, clientY: 79 })
    fireEvent.mouseUp(canvasFrame, { clientX: 80, clientY: 79 })

    await user.click(screen.getByRole('button', { name: 'Bubble layer: New bubble' }))
    expect(screen.getByText('Position 272, 180')).toBeInTheDocument()
    expect(screen.getByText('Size 188 x 120')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 (1)' }))
    expect(screen.getByText('Position 212, 120')).toBeInTheDocument()
    expect(screen.getByText('Size 288 x 180')).toBeInTheDocument()
  })

  it('resizes a selected bubble layer from the top handle and shifts its y position', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))

    const canvasFrame = screen.getByLabelText('Canvas frame')
    vi.spyOn(canvasFrame, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 720,
      height: 405,
      right: 720,
      bottom: 405,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize selected layers top' }), {
      clientX: 131,
      clientY: 68,
    })
    fireEvent.mouseMove(canvasFrame, { clientX: 131, clientY: 80 })
    fireEvent.mouseUp(canvasFrame, { clientX: 131, clientY: 80 })

    expect(screen.getByText('Position 240, 212')).toBeInTheDocument()
    expect(screen.getByText('Size 220 x 88')).toBeInTheDocument()
  })

  it('groups the current multi-selection and shows grouped metadata', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Group selected layers' }))

    expect(screen.getByText('Group 2 layers')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layer text: New text grouped (1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overlay layer 0.4 grouped (1)' })).toBeInTheDocument()
  })

  it('reselects every layer in the active group from a single grouped layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Group selected layers' }))
    await user.click(screen.getByRole('button', { name: 'Clear layer selection' }))
    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 grouped (1)' }))
    await user.click(screen.getByRole('button', { name: 'Select grouped layers' }))

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
  })

  it('ungroups the selected layers and removes grouped metadata', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Group selected layers' }))
    await user.click(screen.getByRole('button', { name: 'Ungroup selected layers' }))

    expect(screen.queryByText('Group 2 layers')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Layer text: New text grouped (1)' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layer text: New text (1)' })).toBeInTheDocument()
  })

  it('toggles visibility for the whole active group from a single grouped layer selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Group selected layers' }))
    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 grouped (1)' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer visibility' }))

    expect(screen.queryByRole('button', { name: 'Select text layer: New text' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select overlay layer 0.4' })).not.toBeInTheDocument()
  })

  it('toggles lock for the whole active group from a single grouped layer selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Group selected layers' }))
    await user.click(screen.getByRole('button', { name: 'Layer text: New text grouped (1)' }))
    await user.click(screen.getByRole('button', { name: 'Toggle selected layer lock' }))
    await user.click(screen.getByRole('button', { name: 'Center selected layer' }))

    expect(screen.queryByText('Position 960, 540')).not.toBeInTheDocument()
  })

  it('deletes the whole active group from a single grouped layer selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Group selected layers' }))
    await user.click(screen.getByRole('button', { name: 'Layer text: New text grouped (1)' }))
    await user.click(screen.getByRole('button', { name: 'Delete selected layer' }))

    expect(screen.getByText('None')).toBeInTheDocument()
    expect(screen.getByText('Text overlay')).toBeInTheDocument()
  })

  it('duplicates the whole active group from a single grouped layer selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Select all visible layers' }))
    await user.click(screen.getByRole('button', { name: 'Group selected layers' }))
    await user.click(screen.getByRole('button', { name: 'Overlay layer 0.4 grouped (1)' }))
    await user.click(screen.getByRole('button', { name: 'Duplicate selected layer' }))

    expect(screen.getByText('4 layers selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layer text: New text copy grouped (2)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overlay layer 0.4 grouped (2)' })).toBeInTheDocument()
  })

  it('moves the whole active text group forward from a single grouped layer selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Select text layers' }))
    await user.click(screen.getByRole('button', { name: 'Group selected layers' }))
    await user.click(screen.getByRole('button', { name: 'Clear layer selection' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Layer text: New text grouped (1)' }))
    await user.click(screen.getByRole('button', { name: 'Move selected layer forward' }))

    expect(screen.queryByRole('button', { name: 'Layer text: New text grouped (1)' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layer text: New text (1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layer text: New text grouped (3)' })).toBeInTheDocument()
  })
})
