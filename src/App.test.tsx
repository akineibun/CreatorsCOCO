import { act } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JSZip from 'jszip'
import { vi } from 'vitest'
import App from './App'
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  PERFORMANCE_METRICS_STORAGE_KEY,
  PROJECT_STORAGE_KEY,
  RECENT_PROJECTS_STORAGE_KEY,
  resetWorkspaceStore,
  useWorkspaceStore,
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
    expect(screen.getByText('Getting started')).toBeInTheDocument()
    expect(screen.getByText('Choose image か Load sample image で画像を開くと、中央キャンバスで編集できます。')).toBeInTheDocument()
  })

  it('renders an actual image preview after choosing an image file', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: false,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const objectUrl = 'blob:uploaded-preview'
    const createObjectURL = vi.fn(() => objectUrl)
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    })

    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['image-data'], 'uploaded.png', { type: 'image/png' }))

    expect(await screen.findByAltText('Canvas image preview: uploaded.png')).toHaveAttribute(
      'src',
      'data:image/png;base64,aW1hZ2UtZGF0YQ==',
    )

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads backend model status into the sidebar', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: false,
        gpu_available: true,
        sam3_status: 'completed',
        sam3_progress: 100,
        nudenet_status: 'downloading',
        nudenet_progress: 75,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByText('SAM3 Ready')).toBeInTheDocument()
    expect(screen.getByText('NudeNet Loading')).toBeInTheDocument()
    expect(screen.getByText('GPU Available')).toBeInTheDocument()
    expect(screen.getByText('SAM3 status: completed 100%')).toBeInTheDocument()
    expect(screen.getByText('NudeNet status: downloading 75%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SAM3 model ready' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Download NudeNet model' })).toBeEnabled()
  })

  it('shows backend status errors and retries the health check', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sam3_loaded: false,
          nudenet_loaded: true,
          gpu_available: false,
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    expect(await screen.findByText('Backend connection unavailable')).toBeInTheDocument()
    expect(screen.getByText('Target http://127.0.0.1:8765')).toBeInTheDocument()
    expect(
      screen.getByText('Portable build may take a few seconds to unpack and launch the backend.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry backend status' }))

    expect(await screen.findByText('SAM3 Loading')).toBeInTheDocument()
    expect(screen.getByText('NudeNet Ready')).toBeInTheDocument()
    expect(screen.getByText('GPU Unavailable')).toBeInTheDocument()
  })

  it('starts a SAM3 model download and shows progress in the backend panel', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: false,
            nudenet_loaded: false,
            gpu_available: true,
          }),
        }
      }

      expect(url.endsWith('/api/model/download')).toBe(true)
      expect(init?.method).toBe('POST')

      return {
        ok: true,
        json: async () => ({
          model_name: 'sam3',
          status: 'downloading',
          progress: 55,
        }),
      }
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Download SAM3 model' }))

    expect(await screen.findByText('Downloading SAM3 55%')).toBeInTheDocument()
  })

  it('starts a NudeNet model download and shows progress in the backend panel', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: false,
            nudenet_loaded: false,
            gpu_available: true,
          }),
        }
      }

      expect(url.endsWith('/api/model/download')).toBe(true)
      expect(init?.method).toBe('POST')

      return {
        ok: true,
        json: async () => ({
          model_name: 'nudenet',
          status: 'queued',
          progress: 0,
        }),
      }
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Download NudeNet model' }))

    expect(await screen.findByText('Queued NudeNet 0%')).toBeInTheDocument()
  })

  it('polls backend model progress until SAM3 becomes ready', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: false,
            nudenet_loaded: false,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/model/download')) {
        expect(init?.method).toBe('POST')
        return {
          ok: true,
          json: async () => ({
            model_name: 'sam3',
            status: 'queued',
            progress: 0,
          }),
        }
      }

      if (url.endsWith('/api/model/progress/sam3')) {
        const callCount = fetchMock.mock.calls.filter(([value]) =>
          String(value).endsWith('/api/model/progress/sam3'),
        ).length

        return {
          ok: true,
          json: async () =>
            callCount === 1
              ? { model_name: 'sam3', status: 'downloading', progress: 50 }
              : { model_name: 'sam3', status: 'completed', progress: 100 },
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)

    try {
      await act(async () => {
        render(<App />)
        await Promise.resolve()
      })

      expect(screen.getByText('SAM3 Loading')).toBeInTheDocument()
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Download SAM3 model' }))
        await Promise.resolve()
      })
      expect(screen.getByText('Queued SAM3 0%')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
        await Promise.resolve()
      })
      expect(screen.getByText('Downloading SAM3 50%')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
        await Promise.resolve()
      })
      expect(screen.getByText('SAM3 Ready')).toBeInTheDocument()
      expect(screen.getByText('SAM3 status: completed 100%')).toBeInTheDocument()
      expect(screen.getByText('Completed SAM3 100%')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'SAM3 model ready' })).toBeDisabled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('subscribes to backend model progress over SSE until SAM3 becomes ready', async () => {
    type EventSourceInstance = {
      url: string
      onmessage: ((event: MessageEvent<string>) => void) | null
      onerror: ((event: Event) => void) | null
      close: ReturnType<typeof vi.fn>
    }

    const eventSourceInstances: EventSourceInstance[] = []

    class MockEventSource {
      url: string
      onmessage: ((event: MessageEvent<string>) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      close = vi.fn()

      constructor(url: string) {
        this.url = url
        eventSourceInstances.push(this)
      }
    }

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: false,
            nudenet_loaded: false,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/model/download')) {
        expect(init?.method).toBe('POST')
        return {
          ok: true,
          json: async () => ({
            model_name: 'sam3',
            status: 'queued',
            progress: 0,
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Download SAM3 model' }))

    expect(eventSourceInstances).toHaveLength(1)
    expect(eventSourceInstances[0]?.url).toContain('/api/model/progress/stream/sam3')

    act(() => {
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify({ model_name: 'sam3', status: 'downloading', progress: 50 }),
      } as MessageEvent<string>)
    })

    expect(await screen.findByText('Downloading SAM3 50%')).toBeInTheDocument()

    act(() => {
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify({ model_name: 'sam3', status: 'completed', progress: 100 }),
      } as MessageEvent<string>)
    })

    expect(await screen.findByText('SAM3 Ready')).toBeInTheDocument()
    expect(screen.getByText('Completed SAM3 100%')).toBeInTheDocument()
    expect(eventSourceInstances[0]?.close).toHaveBeenCalled()

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('disables backend analysis actions until an image is loaded', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: false,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Run NSFW detection' })).toBeDisabled()
  })

  it('runs SAM3 auto mosaic from the backend panel for the active image', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        expect(init?.method).toBe('POST')

        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [{ id: 'mask-1' }, { id: 'mask-2' }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))

    expect((await screen.findAllByText('SAM3 auto mosaic ready with 2 masks')).length).toBeGreaterThan(0)
  })

  it('runs NSFW detection from the backend panel for the active image', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        expect(init?.method).toBe('POST')

        return {
          ok: true,
          json: async () => ({
            detections: [{ label: 'explicit' }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run NSFW detection' }))

    expect((await screen.findAllByText('NSFW detection found 1 region')).length).toBeGreaterThan(0)
  })

  it('disables manual SAM3 segment until an image is loaded', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: false,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByRole('button', { name: 'Run SAM3 manual segment' })).toBeDisabled()
  })

  it('runs SAM3 manual segment from the backend panel for the active image', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/segment')) {
        expect(init?.method).toBe('POST')
        expect(init?.body).toContain('"points":[{"x":640,"y":360,"label":1},{"x":1280,"y":720,"label":1}]')

        return {
          ok: true,
          json: async () => ({
            mask_base64: 'encoded-mask',
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 manual segment' }))

    expect((await screen.findAllByText('SAM3 manual segment ready with 2 points')).length).toBeGreaterThan(0)
  })

  it('adds manual SAM3 segment points from the backend panel', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/segment')) {
        expect(init?.method).toBe('POST')
        expect(init?.body).toContain(
          '"points":[{"x":640,"y":360,"label":1},{"x":1280,"y":720,"label":1},{"x":960,"y":540,"label":1}]',
        )

        return {
          ok: true,
          json: async () => ({
            mask_base64: 'encoded-mask',
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add manual segment point' }))

    expect(screen.getByText('Manual segment points: 3')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Run SAM3 manual segment' }))

    expect((await screen.findAllByText('SAM3 manual segment ready with 3 points')).length).toBeGreaterThan(0)
  })

  it('clears manual SAM3 segment points back to the default pair', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add manual segment point' }))
    expect(screen.getByText('Manual segment points: 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset manual segment points' }))

    expect(screen.getByText('Manual segment points: 2')).toBeInTheDocument()
  })

  it('toggles the last manual segment point to a negative label', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/segment')) {
        expect(init?.method).toBe('POST')
        expect(init?.body).toContain('"points":[{"x":640,"y":360,"label":1},{"x":1280,"y":720,"label":0}]')

        return {
          ok: true,
          json: async () => ({
            mask_base64: 'encoded-mask',
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Toggle last manual point label' }))

    expect(screen.getByText('Last manual point label: negative')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Run SAM3 manual segment' }))

    expect((await screen.findAllByText('SAM3 manual segment ready with 2 points')).length).toBeGreaterThan(0)
  })

  it('moves the last manual segment point before running the request', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/segment')) {
        expect(init?.method).toBe('POST')
        expect(init?.body).toContain('"points":[{"x":640,"y":360,"label":1},{"x":1344,"y":752,"label":1}]')

        return {
          ok: true,
          json: async () => ({
            mask_base64: 'encoded-mask',
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Move last manual point' }))

    expect(screen.getByText('Last manual point: 1344, 752')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Run SAM3 manual segment' }))

    expect((await screen.findAllByText('SAM3 manual segment ready with 2 points')).length).toBeGreaterThan(0)
  })

  it('removes the last manual segment point before running the request', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/segment')) {
        expect(init?.method).toBe('POST')
        expect(init?.body).toContain('"points":[{"x":640,"y":360,"label":1},{"x":1280,"y":720,"label":1}]')

        return {
          ok: true,
          json: async () => ({
            mask_base64: 'encoded-mask',
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add manual segment point' }))
    expect(screen.getByText('Manual segment points: 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove last manual point' }))

    expect(screen.getByText('Manual segment points: 2')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Run SAM3 manual segment' }))

    expect((await screen.findAllByText('SAM3 manual segment ready with 2 points')).length).toBeGreaterThan(0)
  })

  it('adds a negative manual segment point from the backend panel', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/segment')) {
        expect(init?.method).toBe('POST')
        expect(init?.body).toContain(
          '"points":[{"x":640,"y":360,"label":1},{"x":1280,"y":720,"label":1},{"x":960,"y":540,"label":0}]',
        )

        return {
          ok: true,
          json: async () => ({
            mask_base64: 'encoded-mask',
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add negative manual segment point' }))

    expect(screen.getByText('Manual segment points: 3')).toBeInTheDocument()
    expect(screen.getByText('Last manual point label: negative')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Run SAM3 manual segment' }))

    expect((await screen.findAllByText('SAM3 manual segment ready with 3 points')).length).toBeGreaterThan(0)
  })

  it('adds a manual segment point by clicking the canvas in picking mode', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Enable positive point picking' }))

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

    fireEvent.mouseDown(canvasFrame, { clientX: 360, clientY: 202 })
    fireEvent.mouseUp(canvasFrame, { clientX: 360, clientY: 202 })

    expect(screen.getByText('Manual segment points: 3')).toBeInTheDocument()
    expect(screen.getByText('Last manual point: 960, 539')).toBeInTheDocument()
    expect(screen.getByText('Manual point picking: off')).toBeInTheDocument()
  })

  it('adds a negative manual segment point by clicking the canvas in picking mode', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Enable negative point picking' }))

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

    fireEvent.mouseDown(canvasFrame, { clientX: 180, clientY: 101 })
    fireEvent.mouseUp(canvasFrame, { clientX: 180, clientY: 101 })

    expect(screen.getByText('Manual segment points: 3')).toBeInTheDocument()
    expect(screen.getByText('Last manual point label: negative')).toBeInTheDocument()
    expect(screen.getByText('Last manual point: 480, 269')).toBeInTheDocument()
    expect(screen.getByText('Manual point picking: off')).toBeInTheDocument()
  })

  it('cancels manual point picking before a canvas click', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Enable positive point picking' }))

    expect(screen.getByText('Manual point picking: positive')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel manual point picking' }))

    expect(screen.getByText('Manual point picking: off')).toBeInTheDocument()
    expect(screen.getByText('Manual segment points: 2')).toBeInTheDocument()
  })

  it('shows manual segment points on the canvas and lets you select one', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))

    expect(screen.getByRole('button', { name: 'Select manual segment point 1: positive' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select manual segment point 2: positive' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Select manual segment point 1: positive' }))

    expect(screen.getByText('Selected manual point: 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Selected manual point label: positive')).toBeInTheDocument()
    expect(screen.getByText(/^Selected manual point coordinates:/)).toBeInTheDocument()
  })

  it('drags a selected manual segment point on the canvas', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))

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

    const pointButton = screen.getByRole('button', { name: 'Select manual segment point 1: positive' })

    fireEvent.mouseDown(pointButton, { clientX: 240, clientY: 135 })
    fireEvent.mouseMove(canvasFrame, { clientX: 300, clientY: 180 })
    fireEvent.mouseUp(canvasFrame, { clientX: 300, clientY: 180 })

    expect(screen.getByText('Selected manual point: 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Selected manual point coordinates: 800, 480')).toBeInTheDocument()
  })

  it('removes the selected manual segment point when more than two points exist', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add manual segment point' }))
    await user.click(screen.getByRole('button', { name: 'Select manual segment point 3: positive' }))

    expect(screen.getByText('Selected manual point: 3 of 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove selected manual point' }))

    expect(screen.getByText('Manual segment points: 2')).toBeInTheDocument()
    expect(screen.getByText('Selected manual point: 2 of 2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select manual segment point 3: positive' })).not.toBeInTheDocument()
  })

  it('changes the SAM3 model size in the backend panel', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.selectOptions(await screen.findByRole('combobox', { name: 'SAM3 model size' }), 'large')

    expect(screen.getByText('SAM3 model size: large')).toBeInTheDocument()
  })

  it('uses the selected SAM3 model size for auto mosaic requests', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        expect(init?.method).toBe('POST')
        expect(init?.body).toContain('"model_size":"large"')

        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [{ id: 'mask-1' }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'SAM3 model size' }), 'large')
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))

    expect((await screen.findAllByText('SAM3 auto mosaic ready with 1 mask')).length).toBeGreaterThan(0)
  })

  it('uses the selected SAM3 model size for manual segment requests', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/segment')) {
        expect(init?.method).toBe('POST')
        expect(init?.body).toContain('"model_size":"large"')

        return {
          ok: true,
          json: async () => ({
            mask_base64: 'encoded-mask',
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'SAM3 model size' }), 'large')
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 manual segment' }))

    expect((await screen.findAllByText('SAM3 manual segment ready with 2 points')).length).toBeGreaterThan(0)
  })

  it('changes backend analysis settings in the panel', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Auto mosaic strength' }), 'strong')
    await user.clear(screen.getByRole('spinbutton', { name: 'NSFW threshold' }))
    await user.type(screen.getByRole('spinbutton', { name: 'NSFW threshold' }), '0.82')

    expect(screen.getByText('Auto mosaic strength: strong')).toBeInTheDocument()
    expect(screen.getByDisplayValue('0.82')).toBeInTheDocument()
  })

  it('uses backend analysis settings for SAM3 auto mosaic requests', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        expect(init?.method).toBe('POST')
        expect(init?.body).toContain('"model_size":"large"')
        expect(init?.body).toContain('"mosaic_strength":"strong"')

        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [{ id: 'mask-1' }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'SAM3 model size' }), 'large')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Auto mosaic strength' }), 'strong')
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))

    expect((await screen.findAllByText('SAM3 auto mosaic ready with 1 mask')).length).toBeGreaterThan(0)
  })

  it('uses backend analysis settings for NSFW detection requests and records action history', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        expect(init?.method).toBe('POST')
        expect(init?.body).toContain('"threshold":0.82')

        return {
          ok: true,
          json: async () => ({
            detections: [{ label: 'explicit' }, { label: 'suggestive' }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.clear(screen.getByRole('spinbutton', { name: 'NSFW threshold' }))
    await user.type(screen.getByRole('spinbutton', { name: 'NSFW threshold' }), '0.82')
    await user.click(await screen.findByRole('button', { name: 'Run NSFW detection' }))

    expect((await screen.findAllByText('NSFW detection found 2 regions')).length).toBeGreaterThan(0)
    expect(screen.getByText('Recent backend actions')).toBeInTheDocument()
    expect(screen.getAllByText('NSFW detection found 2 regions').length).toBeGreaterThan(1)
  })

  it('restores backend analysis settings from localStorage', async () => {
    window.localStorage.setItem(
      'creators-coco.backend-settings',
      JSON.stringify({
        sam3ModelSize: 'large',
        autoMosaicStrength: 'strong',
        nsfwThreshold: '0.82',
        sam3BackendPreference: 'native',
        nudenetBackendPreference: 'heuristic',
        manualSegmentPoints: [
          { x: 640, y: 360, label: 1 },
          { x: 1280, y: 720, label: 1 },
          { x: 960, y: 540, label: 0 },
        ],
      }),
    )
    window.localStorage.setItem(
      'creators-coco.performance-thresholds',
      JSON.stringify({
        backendStatus: 2100,
        nsfwDetection: 4200,
      }),
    )

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
        sam3_backend_preference: 'native',
        nudenet_backend_preference: 'heuristic',
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<App />)

    expect((await screen.findAllByText('SAM3 model size: large')).length).toBeGreaterThan(0)
    expect(screen.getByText('Auto mosaic strength: strong')).toBeInTheDocument()
    expect(screen.getByDisplayValue('0.82')).toBeInTheDocument()
    expect(screen.getByText('Manual segment points: 3')).toBeInTheDocument()
    expect(screen.getByText('Last manual point label: negative')).toBeInTheDocument()
    expect(screen.getByText('Last manual point: 960, 540')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Help' }))
    expect(screen.getAllByText('SAM3 strategy native').length).toBeGreaterThan(0)
    expect(screen.getAllByText('NudeNet strategy heuristic').length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue('2100')).toBeInTheDocument()
    expect(screen.getByDisplayValue('4200')).toBeInTheDocument()
  })

  it('applies backend strategy preferences from the Help dialog', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
            sam3_backend_preference: 'auto',
            nudenet_backend_preference: 'auto',
          }),
        }
      }

      if (url.endsWith('/api/model/runtime-config')) {
        if ((init?.method ?? 'GET') === 'POST') {
          expect(init?.body).toContain('"sam3_backend_preference":"native"')
          expect(init?.body).toContain('"nudenet_backend_preference":"heuristic"')
          expect(init?.body).toContain('"sam3_checkpoint_path":"D:\\\\models\\\\sam3.pt"')
          expect(init?.body).toContain('"sam3_config_path":"D:\\\\models\\\\sam3.yaml"')
        }

        return {
          ok: true,
          json: async () => ({
            sam3_backend_preference: 'native',
            nudenet_backend_preference: 'heuristic',
            sam3_native_available: false,
            nudenet_native_available: true,
            sam3_checkpoint_path: 'D:\\models\\sam3.pt',
            sam3_config_path: 'D:\\models\\sam3.yaml',
            sam3_checkpoint_ready: false,
            sam3_native_reason: 'SAM3 checkpoint not found: D:\\models\\sam3.pt',
            nudenet_native_reason: null,
            sam3_effective_backend: 'heuristic',
            nudenet_effective_backend: 'heuristic',
            sam3_recommendation: 'SAM3 checkpoint path is invalid. Update it from Help or fix the file path: D:\\models\\sam3.pt',
            nudenet_recommendation: 'Native backend is available for this model.',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Help' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'SAM3 backend strategy' }), 'native')
    await user.selectOptions(screen.getByRole('combobox', { name: 'NudeNet backend strategy' }), 'heuristic')
    await user.clear(screen.getByRole('textbox', { name: 'SAM3 checkpoint path' }))
    await user.type(screen.getByRole('textbox', { name: 'SAM3 checkpoint path' }), 'D:\\models\\sam3.pt')
    await user.clear(screen.getByRole('textbox', { name: 'SAM3 config path' }))
    await user.type(screen.getByRole('textbox', { name: 'SAM3 config path' }), 'D:\\models\\sam3.yaml')
    await user.click(screen.getAllByRole('button', { name: 'Apply backend strategy' })[0]!)

    expect(
      (await screen.findAllByText('Runtime strategy synced: SAM3 heuristic, NudeNet heuristic')).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('SAM3 checkpoint missing').length).toBeGreaterThan(0)
  })

  it('exports a backend runtime profile from the Help dialog', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
        sam3_backend: 'heuristic',
        nudenet_backend: 'native',
        sam3_native_available: false,
        nudenet_native_available: true,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    let exportedBlob: Blob | null = null
    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob
      return 'blob:runtime-profile'
    })
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

      return originalCreateElement(tagName)
    })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Help' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'SAM3 backend strategy' }), 'native')
    await user.clear(screen.getByRole('textbox', { name: 'SAM3 checkpoint path' }))
    await user.type(screen.getByRole('textbox', { name: 'SAM3 checkpoint path' }), 'D:\\models\\sam3.pt')
    await user.click(screen.getByRole('button', { name: 'Export backend runtime profile' }))

    expect(createObjectURL).toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:runtime-profile')
    expect(exportedBlob).not.toBeNull()

    const profileText = await exportedBlob!.text()
    expect(profileText).toContain('"sam3BackendPreference": "native"')
    expect(profileText).toContain('"sam3CheckpointPath": "D:\\\\models\\\\sam3.pt"')
    expect(profileText).toContain('"CREATORS_COCO_SAM3_CHECKPOINT": "D:\\\\models\\\\sam3.pt"')

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('exports a SAM3 setup script from the Help dialog', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    let exportedBlob: Blob | null = null
    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob
      return 'blob:sam3-setup-script'
    })
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

      return originalCreateElement(tagName)
    })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Help' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'SAM3 backend strategy' }), 'native')
    await user.selectOptions(screen.getByRole('combobox', { name: 'NudeNet backend strategy' }), 'heuristic')
    await user.clear(screen.getByRole('textbox', { name: 'SAM3 checkpoint path' }))
    await user.type(screen.getByRole('textbox', { name: 'SAM3 checkpoint path' }), 'D:\\models\\sam3.pt')
    await user.clear(screen.getByRole('textbox', { name: 'SAM3 config path' }))
    await user.type(screen.getByRole('textbox', { name: 'SAM3 config path' }), 'D:\\models\\sam3.yaml')
    await user.click(screen.getByRole('button', { name: 'Export SAM3 setup script' }))

    expect(createObjectURL).toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:sam3-setup-script')
    expect(exportedBlob).not.toBeNull()

    const scriptText = await exportedBlob!.text()
    expect(scriptText).toContain('$env:CREATORS_COCO_SAM3_BACKEND = "native"')
    expect(scriptText).toContain('$env:CREATORS_COCO_NUDENET_BACKEND = "heuristic"')
    expect(scriptText).toContain('$env:CREATORS_COCO_SAM3_CHECKPOINT = "D:\\models\\sam3.pt"')
    expect(scriptText).toContain('$env:CREATORS_COCO_SAM3_CONFIG = "D:\\models\\sam3.yaml"')

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('imports a backend runtime profile from the Help dialog', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/model/runtime-config')) {
        if ((init?.method ?? 'GET') === 'POST') {
          expect(init?.body).toContain('"sam3_backend_preference":"native"')
          expect(init?.body).toContain('"nudenet_backend_preference":"auto"')
          expect(init?.body).toContain('"sam3_checkpoint_path":"D:\\\\models\\\\sam3.pt"')
          expect(init?.body).toContain('"sam3_config_path":"D:\\\\models\\\\sam3.yaml"')
        }

        return {
          ok: true,
          json: async () => ({
            sam3_backend_preference: 'native',
            nudenet_backend_preference: 'auto',
            sam3_native_available: false,
            nudenet_native_available: true,
            sam3_checkpoint_path: 'D:\\models\\sam3.pt',
            sam3_config_path: 'D:\\models\\sam3.yaml',
            sam3_checkpoint_ready: false,
            sam3_native_reason: 'SAM3 checkpoint not found: D:\\models\\sam3.pt',
            nudenet_native_reason: null,
            sam3_effective_backend: 'heuristic',
            nudenet_effective_backend: 'native',
            sam3_recommendation: 'SAM3 checkpoint path is invalid. Update it from Help or fix the file path: D:\\models\\sam3.pt',
            nudenet_recommendation: 'Native backend is available for this model.',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Help' }))
    const input = screen.getByLabelText('Import backend runtime profile')
    await user.upload(
      input,
      new File(
        [
          JSON.stringify({
            sam3BackendPreference: 'native',
            nudenetBackendPreference: 'auto',
            sam3CheckpointPath: 'D:\\models\\sam3.pt',
            sam3ConfigPath: 'D:\\models\\sam3.yaml',
          }),
        ],
        'runtime-profile.json',
        { type: 'application/json' },
      ),
    )

    expect(await screen.findByDisplayValue('D:\\models\\sam3.pt')).toBeInTheDocument()
    expect(screen.getByDisplayValue('D:\\models\\sam3.yaml')).toBeInTheDocument()
    expect(screen.getAllByText('Runtime profile imported: SAM3 heuristic, NudeNet native').length).toBeGreaterThan(0)
  })

  it('imports a backend runtime profile from a portable handoff zip', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/model/runtime-config')) {
        if ((init?.method ?? 'GET') === 'POST') {
          expect(init?.body).toContain('"sam3_backend_preference":"native"')
          expect(init?.body).toContain('"nudenet_backend_preference":"heuristic"')
          expect(init?.body).toContain('"sam3_checkpoint_path":"D:\\\\models\\\\sam3.pt"')
          expect(init?.body).toContain('"sam3_config_path":"D:\\\\models\\\\sam3.yaml"')
        }

        return {
          ok: true,
          json: async () => ({
            sam3_backend_preference: 'native',
            nudenet_backend_preference: 'heuristic',
            sam3_native_available: false,
            nudenet_native_available: true,
            sam3_checkpoint_path: 'D:\\models\\sam3.pt',
            sam3_config_path: 'D:\\models\\sam3.yaml',
            sam3_checkpoint_ready: false,
            sam3_native_reason: 'SAM3 checkpoint not found: D:\\models\\sam3.pt',
            nudenet_native_reason: null,
            sam3_effective_backend: 'heuristic',
            nudenet_effective_backend: 'heuristic',
            sam3_recommendation: 'SAM3 checkpoint path is invalid. Update it from Help or fix the file path: D:\\models\\sam3.pt',
            nudenet_recommendation: 'Native backend is available for this model.',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    const zip = new JSZip()
    zip.file(
      'runtime-profile.json',
      JSON.stringify({
        sam3BackendPreference: 'native',
        nudenetBackendPreference: 'heuristic',
        sam3CheckpointPath: 'D:\\models\\sam3.pt',
        sam3ConfigPath: 'D:\\models\\sam3.yaml',
      }),
    )
    zip.file(
      'diagnostics.json',
      JSON.stringify({
        performanceThresholds: {
          backendStatus: 2222,
          sam3AutoMosaic: 7777,
        },
      }),
    )
    zip.file(
      'portable-smoke-summary.json',
      JSON.stringify({
        portableSmokeChecklist: [
          {
            id: 'backend-panel',
            label: 'Backend panel and status',
            status: 'passed',
            note: 'imported from tester',
          },
        ],
        trialReadinessCheckpoints: {
          backendConnectedAt: '2026-03-23T00:00:00.000Z',
          sampleLoadedAt: '2026-03-23T00:10:00.000Z',
        },
      }),
    )
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Help' }))
    const input = screen.getByLabelText('Import backend runtime profile')
    await user.upload(
      input,
      new File([zipBuffer], 'portable-handoff.zip', { type: 'application/zip' }),
    )

    expect(await screen.findByDisplayValue('D:\\models\\sam3.pt')).toBeInTheDocument()
    expect(screen.getByDisplayValue('D:\\models\\sam3.yaml')).toBeInTheDocument()
    expect(
      screen.getAllByText('Runtime profile imported: SAM3 heuristic, NudeNet heuristic with handoff data').length,
    ).toBeGreaterThan(0)
    expect(screen.getByDisplayValue('2222')).toBeInTheDocument()
    expect(screen.getByText('Backend panel and status passed')).toBeInTheDocument()
    expect(screen.getByDisplayValue('imported from tester')).toBeInTheDocument()
    expect(screen.getByText('Backend connected complete')).toBeInTheDocument()
    expect(screen.getByText('Imported handoff history')).toBeInTheDocument()
    expect(screen.getByText('portable-handoff.zip zip')).toBeInTheDocument()
    expect(screen.getByText('Included handoff smoke/diagnostic data')).toBeInTheDocument()
  })

  it('imports a portable smoke report from the Help dialog', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
        packaged_runtime: true,
        python_version: '3.12.11',
        sam3_backend: 'heuristic',
        nudenet_backend: 'native',
        sam3_native_available: false,
        nudenet_native_available: true,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Help' }))
    const input = screen.getByLabelText('Import portable smoke report')
    await user.upload(
      input,
      new File(
        [
          JSON.stringify({
            generatedAt: '2026-03-23T13:10:27.199Z',
            portableExePath: 'C:\\Temp\\CreatorsCOCO 1.0.0.exe',
            smokeRoot: 'C:\\Temp\\CreatorsCOCO-smoke',
            startupTimeoutSeconds: 40,
            statusUrl: 'http://127.0.0.1:8765/api/status',
            statusOk: true,
            statusError: '処理がタイムアウトになりました。',
            backendStatus: {
              packaged_runtime: true,
              python_version: '3.12.11',
              sam3_backend: 'heuristic',
              nudenet_backend: 'native',
            },
          }),
        ],
        'portable-smoke-report.json',
        { type: 'application/json' },
      ),
    )

    expect(
      (
        await screen.findAllByText(
          'Portable smoke report imported: backend status reached from portable-smoke-report.json',
        )
      ).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('portable-smoke-report.json ok')).toBeInTheDocument()
    expect(screen.getByText('Backend panel and status passed')).toBeInTheDocument()
    expect(screen.getByText('Runtime labels and capabilities passed')).toBeInTheDocument()
    expect(
      screen.getByDisplayValue('Python 3.12.11 / SAM3 heuristic / NudeNet native'),
    ).toBeInTheDocument()
    expect(screen.getByText('Imported smoke report ready')).toBeInTheDocument()
  })

  it('shows trial readiness checkpoints in the Help dialog after core actions', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: false,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        return {
          ok: true,
          json: async () => ({
            detections: [{ label: 'explicit' }],
            status: 'ok',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))
    await user.click(screen.getByRole('button', { name: 'Run NSFW detection' }))
    await user.click(screen.getByRole('button', { name: 'Help' }))

    expect(screen.getByText('Trial readiness')).toBeInTheDocument()
    expect(screen.getByText('Backend connected complete')).toBeInTheDocument()
    expect(screen.getByText('Sample loaded complete')).toBeInTheDocument()
    expect(screen.getByText('Project saved complete')).toBeInTheDocument()
    expect(screen.getByText('NSFW reviewed complete')).toBeInTheDocument()
  })

  it('tracks export and restore checkpoints in trial readiness', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: false,
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:trial-export')
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

    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))
    await user.click(screen.getByRole('button', { name: 'Export PNG' }))
    await user.click(screen.getByRole('button', { name: 'Help' }))

    expect(screen.getByText('Portable trial ready')).toBeInTheDocument()
    expect(screen.getByText('Export completed complete')).toBeInTheDocument()

    unmount()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Help' }))
    expect(screen.getByText('Project restored complete')).toBeInTheDocument()

    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('persists portable smoke checklist progress in the Help dialog', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
        packaged_runtime: true,
        python_version: '3.14.3',
        sam3_backend: 'heuristic',
        nudenet_backend: 'native',
        sam3_native_available: false,
        nudenet_native_available: true,
        sam3_recommendation: 'SAM3 native is unavailable here. Use Python 3.12 plus the optional native install script for the best chance of loading checkpoints.',
        nudenet_recommendation: 'Native backend is available for this model.',
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Help' }))
    await user.click(screen.getByRole('button', { name: 'Cycle smoke step: Backend panel and status' }))
    await user.type(screen.getByLabelText('Backend panel and status note'), 'portable exe on tester PC')

    expect(screen.getByText('Portable smoke checklist')).toBeInTheDocument()
    expect(screen.getByText('Backend panel and status passed')).toBeInTheDocument()
    expect(screen.getByDisplayValue('portable exe on tester PC')).toBeInTheDocument()
    expect(screen.getByText('Portable smoke checklist pending')).toBeInTheDocument()

    cleanup()
    resetWorkspaceStore()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Help' }))
    expect(screen.getByText('Backend panel and status passed')).toBeInTheDocument()
    expect(screen.getByDisplayValue('portable exe on tester PC')).toBeInTheDocument()
  })

  it('syncs the portable smoke checklist from current app state', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
            packaged_runtime: true,
            python_version: '3.14.3',
            sam3_backend: 'heuristic',
            nudenet_backend: 'native',
            sam3_native_available: false,
            nudenet_native_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        return {
          ok: true,
          json: async () => ({
            detections: [{ label: 'explicit' }],
            status: 'ok',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:smoke-sync')
    const revokeObjectURL = vi.fn()
    const anchorClick = vi.fn()
    const originalCreateElement = document.createElement.bind(document)

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

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))
    await user.click(screen.getByRole('button', { name: 'Run NSFW detection' }))
    await user.click(screen.getByRole('button', { name: 'Export PNG' }))
    await user.click(screen.getByRole('button', { name: 'Help' }))
    await user.click(screen.getByRole('button', { name: 'Sync portable smoke checklist' }))

    expect(screen.getByText('Backend panel and status passed')).toBeInTheDocument()
    expect(screen.getByText('Runtime labels and capabilities passed')).toBeInTheDocument()
    expect(screen.getByText('Sample load and review flow passed')).toBeInTheDocument()
    expect(screen.getByText('Save restore and export flow passed')).toBeInTheDocument()

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('exports a diagnostics report from the Help dialog', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
        packaged_runtime: true,
        python_version: '3.14.3',
        sam3_backend: 'heuristic',
        nudenet_backend: 'native',
        sam3_native_available: false,
        nudenet_native_available: true,
        sam3_checkpoint_path: 'D:\\models\\sam3.pt',
        sam3_config_path: 'D:\\models\\sam3.yaml',
        sam3_checkpoint_ready: false,
        sam3_native_reason: "No module named 'sam3'",
        nudenet_native_reason: null,
        sam3_recommendation:
          'SAM3 native is unavailable here. Use Python 3.12 plus the optional native install script for the best chance of loading checkpoints.',
        nudenet_recommendation: 'Native backend is available for this model.',
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    let exportedBlob: Blob | null = null
    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob
      return 'blob:diagnostics-report'
    })
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

      return originalCreateElement(tagName)
    })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Help' }))
    await user.click(screen.getByRole('button', { name: 'Export diagnostics report' }))

    expect(createObjectURL).toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:diagnostics-report')
    expect(exportedBlob).not.toBeNull()

    const reportText = await exportedBlob!.text()
    expect(reportText).toContain('"appVersion": "1.0.0"')
    expect(reportText).toContain('"python_version": "3.14.3"')
    expect(reportText).toContain('"portableSmokeChecklist"')

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('exports a portable handoff bundle from the Help dialog', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
        packaged_runtime: true,
        python_version: '3.14.3',
        sam3_backend: 'heuristic',
        nudenet_backend: 'native',
        sam3_native_available: false,
        nudenet_native_available: true,
        sam3_checkpoint_path: 'D:\\models\\sam3.pt',
        sam3_config_path: 'D:\\models\\sam3.yaml',
        sam3_checkpoint_ready: false,
        sam3_native_reason: "No module named 'sam3'",
        nudenet_native_reason: null,
        sam3_recommendation:
          'SAM3 native is unavailable here. Use Python 3.12 plus the optional native install script for the best chance of loading checkpoints.',
        nudenet_recommendation: 'Native backend is available for this model.',
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    let exportedBlob: Blob | null = null
    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob
      return 'blob:portable-handoff'
    })
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

      return originalCreateElement(tagName)
    })

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Help' }))
    await user.click(screen.getByRole('button', { name: 'Export portable handoff bundle' }))

    expect(createObjectURL).toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:portable-handoff')
    expect(exportedBlob).not.toBeNull()

    const zip = await JSZip.loadAsync(await exportedBlob!.arrayBuffer())
    const diagnosticsText = await zip.file('diagnostics.json')!.async('string')
    const profileText = await zip.file('runtime-profile.json')!.async('string')
    const smokeText = await zip.file('portable-smoke-summary.json')!.async('string')
    const readmeText = await zip.file('README.txt')!.async('string')

    expect(diagnosticsText).toContain('"python_version": "3.14.3"')
    expect(profileText).toContain('"sam3CheckpointPath": "D:\\\\models\\\\sam3.pt"')
    expect(smokeText).toContain('"portableSmokeChecklist"')
    expect(readmeText).toContain('CreatorsCOCO portable handoff bundle')

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('restores backend review state from localStorage', async () => {
    window.localStorage.setItem(
      'creators-coco.backend-review-state',
      JSON.stringify({
        backendActionResults: {
          sam3AutoMosaic: [{ x: 300, y: 220, width: 180, height: 120 }],
          sam3AutoMosaicSelection: [true],
          sam3AutoMosaicLabel: ['Face mask'],
          sam3AutoMosaicNote: ['Hide only the face'],
          sam3AutoMosaicStyle: ['noise'],
          sam3AutoMosaicIntensity: [24],
          nsfwDetections: [{ x: 520, y: 320, width: 240, height: 180 }],
          nsfwDetectionSelection: [false],
          nsfwDetectionLabel: ['Sensitive crop'],
          nsfwDetectionNote: ['Keep the title readable'],
          nsfwDetectionColor: ['#ff9f1c'],
          nsfwDetectionOpacity: [0.5],
          sam3ManualSegmentMaskReady: true,
        },
        focusedSam3ReviewCandidateIndex: 0,
        focusedNsfwReviewCandidateIndex: 0,
      }),
    )

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByText('Focused SAM3 candidate: 1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Face mask')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Hide only the face')).toBeInTheDocument()
    expect(screen.getAllByText('Style noise').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Intensity 24').length).toBeGreaterThan(0)
    expect(screen.getByText('Focused NSFW candidate: 1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Sensitive crop')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Keep the title readable')).toBeInTheDocument()
    expect(screen.getAllByText('Color #ff9f1c').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Opacity 0.5').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Apply manual segment to canvas' })).toBeInTheDocument()
  })

  it('keeps backend review candidates separated per page when switching the active page', async () => {
    let sam3BatchRequestCount = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [{ x: 300, y: 220, width: 180, height: 120 }],
            status: 'stub',
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        return {
          ok: true,
          json: async () => ({
            detections: [{ x: 520, y: 320, width: 240, height: 180 }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))
    const sam3LabelInput = screen.getByLabelText('Focused SAM3 candidate label')
    await user.clear(sam3LabelInput)
    await user.type(sam3LabelInput, 'Page one face')

    expect(screen.getByDisplayValue('Page one face')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Page two region')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Duplicate active page' }))
    await user.click(screen.getByRole('button', { name: 'Open page 02: sample-page-01-copy.webp' }))
    await user.click(await screen.findByRole('button', { name: 'Run NSFW detection' }))
    const nsfwLabelInput = screen.getByLabelText('Focused NSFW candidate label')
    await user.clear(nsfwLabelInput)
    await user.type(nsfwLabelInput, 'Page two region')

    expect(screen.getByDisplayValue('Page two region')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Page one face')).not.toBeInTheDocument()
    expect(screen.getByText('Focused NSFW candidate: 1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open page 01: sample-page-01.webp' }))

    expect(screen.getByDisplayValue('Page one face')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Page two region')).not.toBeInTheDocument()
  })

  it('restores recent backend actions from localStorage', async () => {
    window.localStorage.setItem(
      'creators-coco.backend-action-history',
      JSON.stringify([{ id: 'action-1', type: 'sam3-auto-mosaic', label: 'SAM3 auto mosaic ready with 3 masks' }]),
    )

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByText('Recent backend actions')).toBeInTheDocument()
    expect((await screen.findAllByText('SAM3 auto mosaic ready with 3 masks')).length).toBeGreaterThan(0)
  })

  it('reruns the last backend action from history', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        expect(init?.method).toBe('POST')
        return {
          ok: true,
          json: async () => ({
            detections: [{ label: 'explicit' }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    window.localStorage.setItem(
      'creators-coco.backend-action-history',
      JSON.stringify([{ id: 'action-1', type: 'nsfw-detection', label: 'NSFW detection found 2 regions' }]),
    )

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Run last backend action again' }))

    expect((await screen.findAllByText('NSFW detection found 1 region')).length).toBeGreaterThan(0)
  })

  it('clears backend action history', async () => {
    window.localStorage.setItem(
      'creators-coco.backend-action-history',
      JSON.stringify([{ id: 'action-1', type: 'sam3-manual-segment', label: 'SAM3 manual segment ready with 2 points' }]),
    )

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Clear backend action history' }))

    expect(screen.getByText('No backend actions yet')).toBeInTheDocument()
  })

  it('reruns a specific backend action from history', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/segment')) {
        expect(init?.method).toBe('POST')
        return {
          ok: true,
          json: async () => ({
            mask_base64: 'encoded-mask',
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    window.localStorage.setItem(
      'creators-coco.backend-action-history',
      JSON.stringify([
        { id: 'action-1', type: 'nsfw-detection', label: 'NSFW detection found 2 regions' },
        { id: 'action-2', type: 'sam3-manual-segment', label: 'SAM3 manual segment ready with 2 points' },
      ]),
    )

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Run backend action again: SAM3 manual segment ready with 2 points' }))

    expect((await screen.findAllByText('SAM3 manual segment ready with 2 points')).length).toBeGreaterThan(1)
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

  it('adds an image pasted from the clipboard', async () => {
    render(<App />)

    const file = new File(['paste'], 'clipboard-scene.png', { type: 'image/png' })

    fireEvent.paste(window, {
      clipboardData: {
        files: [file],
      },
    })

    expect(screen.getByText('1 page loaded')).toBeInTheDocument()
    expect(screen.getAllByText('clipboard-scene.png')).toHaveLength(2)
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

    expect(await screen.findByText('Exported scene-01.png as PNG')).toBeInTheDocument()
    expect(createObjectURL).toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:exported-page')

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

  it('updates the resize background mode from export settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Resize background Black' }))

    expect(screen.getByText('Resize background Black')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resize background Black' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('updates the resize fit mode from export settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Resize fit Cover' }))

    expect(screen.getByText('Resize fit Cover')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resize fit Cover' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('updates the export quality mode from export settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Export quality Platform' }))

    expect(screen.getByText('Export quality Platform preset')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export quality Platform' })).toHaveAttribute('aria-pressed', 'true')
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
    await user.click(screen.getByRole('button', { name: 'Export quality Medium' }))
    await user.click(screen.getByRole('button', { name: 'Resize fit Stretch' }))
    await user.click(screen.getByRole('button', { name: 'Resize background Blurred art' }))
    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    const savedProject = window.localStorage.getItem(PROJECT_STORAGE_KEY)
    expect(savedProject).toContain('"presetId":"story-1080x1920"')
    expect(savedProject).toContain('"width":1080')
    expect(savedProject).toContain('"height":1920')
    expect(savedProject).toContain('"qualityMode":"medium"')
    expect(savedProject).toContain('"resizeFitMode":"stretch"')
    expect(savedProject).toContain('"resizeBackgroundMode":"blurred-art"')
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
          qualityMode: 'platform',
          resizeFitMode: 'cover',
          resizeBackgroundMode: 'black',
        },
        lastSavedAt: '2026-03-22T03:00:00.000Z',
      }),
    )

    render(<App />)

    expect(screen.getByText('1080 x 1920 PNG')).toBeInTheDocument()
    expect(screen.getByText('Output preset Story 1080x1920')).toBeInTheDocument()
    expect(screen.getByText('Export quality Platform preset')).toBeInTheDocument()
    expect(screen.getByText('Resize fit Cover')).toBeInTheDocument()
    expect(screen.getByText('Resize background Black')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preset Story 1080x1920' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Export quality Platform' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Resize fit Cover' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Resize background Black' })).toHaveAttribute('aria-pressed', 'true')
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
    expect(screen.getByLabelText('Resize preview frame')).toBeInTheDocument()
    expect(screen.getByText('Contained with margins')).toBeInTheDocument()
    expect(screen.getByText('EXIF and metadata removed')).toBeInTheDocument()
    expect(screen.getByText('Export quality High')).toBeInTheDocument()
  })

  it('updates the resize preview when fit mode changes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    expect(screen.getByText('Contained with margins')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Resize fit Cover' }))
    expect(screen.getByText('Center cropped to fill')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Resize fit Stretch' }))
    expect(screen.getByText('Stretched to fill')).toBeInTheDocument()
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

  it('persists loaded image source data for blurred resize backgrounds after saving', async () => {
    class MockFileReader {
      result: string | ArrayBuffer | null = null
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null
      onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null

      readAsDataURL(file: Blob) {
        this.result = `data:${file.type};base64,ZmFrZS1pbWFnZQ==`
        this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>)
      }
    }

    vi.stubGlobal('FileReader', MockFileReader as unknown as typeof FileReader)
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Resize background Blurred art' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    const savedProject = window.localStorage.getItem(PROJECT_STORAGE_KEY)
    expect(savedProject).toContain('"resizeBackgroundMode":"blurred-art"')
    expect(savedProject).toContain('"sourceUrl":"data:image/png;base64,ZmFrZS1pbWFnZQ=="')

    vi.unstubAllGlobals()
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

  it('updates text layout and gradient fill settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.clear(screen.getByLabelText('Selected text content'))
    await user.type(screen.getByLabelText('Selected text content'), 'Wrapped gradient text sample')
    await user.click(screen.getByRole('button', { name: 'Increase line height' }))
    await user.click(screen.getByRole('button', { name: 'Increase letter spacing' }))
    await user.click(screen.getByRole('button', { name: 'Narrow text wrap' }))
    await user.click(screen.getByRole('button', { name: 'Toggle gradient fill' }))
    fireEvent.change(screen.getByLabelText('Selected text gradient from'), {
      target: { value: '#ff3366' },
    })
    fireEvent.change(screen.getByLabelText('Selected text gradient to'), {
      target: { value: '#ffd166' },
    })

    expect(screen.getByText('Fill Gradient #ff3366 to #ffd166')).toBeInTheDocument()
    expect(screen.getByText('Line height 1.3 / Letter spacing 1px / Wrap 320px')).toBeInTheDocument()
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

  it('changes and randomizes the selected bubble shape variant', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.click(screen.getByRole('button', { name: 'Shape spiky' }))

    expect(screen.getByText('Shape Spiky / Variant 1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Randomize bubble shape' }))

    expect(screen.getByText('Shape Spiky / Variant 2')).toBeInTheDocument()
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

  it('cycles the selected mosaic style', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add mosaic layer' }))
    await user.click(screen.getByRole('button', { name: 'Cycle mosaic style' }))

    expect(screen.getByText('Mosaic style blur')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cycle mosaic style' }))

    expect(screen.getByText('Mosaic style noise')).toBeInTheDocument()
  })

  it('applies mosaic style and intensity presets from one-tap buttons', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add mosaic layer' }))
    await user.click(screen.getByRole('button', { name: 'Mosaic blur' }))
    await user.click(screen.getByRole('button', { name: 'Mosaic intensity Large' }))

    expect(screen.getByText('Mosaic style blur')).toBeInTheDocument()
    expect(screen.getByText('Mosaic intensity 24')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mosaic noise' }))
    await user.click(screen.getByRole('button', { name: 'Mosaic intensity Small' }))

    expect(screen.getByText('Mosaic style noise')).toBeInTheDocument()
    expect(screen.getByText('Mosaic intensity 8')).toBeInTheDocument()
  })

  it('duplicates and reorders the selected mosaic layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add mosaic layer' }))
    await user.click(screen.getByRole('button', { name: 'Duplicate mosaic layer' }))
    await user.click(screen.getByRole('button', { name: 'Send mosaic backward' }))

    expect(screen.getByText('Order 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mosaic layer pixelate 12 (1)' })).toBeInTheDocument()
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

  it('toggles the selected overlay to a gradient fill and updates gradient colors', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Toggle overlay gradient' }))
    fireEvent.change(screen.getByLabelText('Selected overlay gradient from'), {
      target: {
        value: '#44ccff',
      },
    })
    fireEvent.change(screen.getByLabelText('Selected overlay gradient to'), {
      target: {
        value: '#112233',
      },
    })

    expect(screen.getByText('Overlay fill Gradient #44ccff to #112233')).toBeInTheDocument()
  })

  it('cycles overlay area presets', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Cycle overlay area' }))

    expect(screen.getByText('Overlay area full')).toBeInTheDocument()
    expect(screen.getByText('Position 960, 540')).toBeInTheDocument()
    expect(screen.getByText('Size 1920 x 1080')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cycle overlay area' }))

    expect(screen.getByText('Overlay area top-half')).toBeInTheDocument()
    expect(screen.getByText('Position 960, 270')).toBeInTheDocument()
    expect(screen.getByText('Size 1920 x 540')).toBeInTheDocument()
  })

  it('applies overlay area presets from one-tap buttons', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Overlay center band' }))

    expect(screen.getByText('Overlay area center-band')).toBeInTheDocument()
    expect(screen.getByText('Position 960, 540')).toBeInTheDocument()
    expect(screen.getByText('Size 1920 x 320')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overlay bottom half' }))

    expect(screen.getByText('Overlay area bottom-half')).toBeInTheDocument()
    expect(screen.getByText('Position 960, 810')).toBeInTheDocument()
    expect(screen.getByText('Size 1920 x 540')).toBeInTheDocument()
  })

  it('cycles overlay gradient direction', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Toggle overlay gradient' }))
    await user.click(screen.getByRole('button', { name: 'Cycle overlay gradient direction' }))

    expect(screen.getByText('Gradient direction vertical')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cycle overlay gradient direction' }))

    expect(screen.getByText('Gradient direction horizontal')).toBeInTheDocument()
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

  it('toggles visibility and lock for message window and watermark layers', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    act(() => {
      const page = useWorkspaceStore.getState().pages[0]
      useWorkspaceStore.getState().selectMessageWindowLayer(page.messageWindowLayers[0]!.id)
      useWorkspaceStore.getState().toggleSelectedLayerVisibility()
      useWorkspaceStore.getState().toggleSelectedLayerLock()
    })

    let page = useWorkspaceStore.getState().pages[0]
    expect(page.messageWindowLayers[0]?.visible).toBe(false)
    expect(page.messageWindowLayers[0]?.locked).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Add watermark layer' }))
    act(() => {
      const currentPage = useWorkspaceStore.getState().pages[0]
      useWorkspaceStore.getState().selectWatermarkLayer(currentPage.watermarkLayers[0]!.id)
      useWorkspaceStore.getState().toggleSelectedLayerVisibility()
      useWorkspaceStore.getState().toggleSelectedLayerLock()
    })

    page = useWorkspaceStore.getState().pages[0]
    expect(page.watermarkLayers[0]?.visible).toBe(false)
    expect(page.watermarkLayers[0]?.locked).toBe(true)
  })

  it('duplicates message window and watermark layers with the shared duplicate action', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    act(() => {
      const page = useWorkspaceStore.getState().pages[0]
      useWorkspaceStore.getState().selectMessageWindowLayer(page.messageWindowLayers[0]!.id)
      useWorkspaceStore.getState().duplicateSelectedLayer()
    })
    await user.click(screen.getByRole('button', { name: 'Add watermark layer' }))
    act(() => {
      const currentPage = useWorkspaceStore.getState().pages[0]
      useWorkspaceStore.getState().selectWatermarkLayer(currentPage.watermarkLayers[0]!.id)
      useWorkspaceStore.getState().duplicateSelectedLayer()
    })

    const page = useWorkspaceStore.getState().pages[0]

    expect(page.messageWindowLayers).toHaveLength(2)
    expect(page.watermarkLayers).toHaveLength(2)
    expect(page.messageWindowLayers[1]?.speaker).toContain('copy')
  })

  it('applies common alignment and size matching actions to message window layers', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    act(() => {
      let store = useWorkspaceStore.getState()
      store.addMessageWindowLayer()
      let page = useWorkspaceStore.getState().pages[0]
      const firstId = page.messageWindowLayers[0]!.id
      store.selectMessageWindowLayer(firstId)
      store.resizeSelectedMessageWindowLayer(160, 80)
      store.duplicateSelectedLayer()
      page = useWorkspaceStore.getState().pages[0]
      const secondId = page.messageWindowLayers[1]!.id
      store = useWorkspaceStore.getState()
      store.selectMessageWindowLayer(secondId)
      store.moveSelectedMessageWindowLayer(320, 120)
      store.resizeSelectedMessageWindowLayer(-80, -40)
      store.setSelectedLayerIds([firstId, secondId])
      store.alignSelectedLayersCenter('horizontal')
      store.matchSelectedLayerSize('width')
    })

    const page = useWorkspaceStore.getState().pages[0]
    expect(page.messageWindowLayers[0]?.x).toBe(960)
    expect(page.messageWindowLayers[1]?.x).toBe(960)
    expect(page.messageWindowLayers[0]?.width).toBe(page.messageWindowLayers[1]?.width)
  })

  it('applies common center and z-order actions to watermark layers', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    act(() => {
      let store = useWorkspaceStore.getState()
      store.addWatermarkLayer()
      let page = useWorkspaceStore.getState().pages[0]
      const firstId = page.watermarkLayers[0]!.id
      store.selectWatermarkLayer(firstId)
      store.changeSelectedWatermarkScale(0.2)
      store.centerSelectedLayer()
      store.duplicateSelectedLayer()
      page = useWorkspaceStore.getState().pages[0]
      const secondId = page.watermarkLayers[1]!.id
      store = useWorkspaceStore.getState()
      store.selectWatermarkLayer(firstId)
      store.moveSelectedLayerForward()
      store.selectWatermarkLayer(secondId)
      store.moveSelectedLayerBackward()
    })

    const page = useWorkspaceStore.getState().pages[0]
    expect(page.watermarkLayers).toHaveLength(2)
    expect(page.watermarkLayers[0]?.x).toBe(984)
    expect(page.watermarkLayers[0]?.y).toBe(564)
    expect(page.watermarkLayers[1]?.x).toBe(960)
    expect(page.watermarkLayers[1]?.y).toBe(540)
  })

  it('duplicates grouped message window and watermark layers together through the shared action', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    act(() => {
      let store = useWorkspaceStore.getState()
      store.addMessageWindowLayer()
      store.addWatermarkLayer()
      let page = useWorkspaceStore.getState().pages[0]
      const messageId = page.messageWindowLayers[0]!.id
      const watermarkId = page.watermarkLayers[0]!.id
      store.setSelectedLayerIds([messageId, watermarkId])
      store.groupSelectedLayers()
      store.selectMessageWindowLayer(messageId)
      store.duplicateSelectedLayer()
      page = useWorkspaceStore.getState().pages[0]
      expect(page.messageWindowLayers).toHaveLength(2)
      expect(page.watermarkLayers).toHaveLength(2)
      expect(page.messageWindowLayers[1]?.groupId).toBeTruthy()
      expect(page.watermarkLayers[1]?.groupId).toBe(page.messageWindowLayers[1]?.groupId)
    })
  })

  it('shows order details for message window and watermark layers in the inspector', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    act(() => {
      let store = useWorkspaceStore.getState()
      store.addMessageWindowLayer()
      let page = useWorkspaceStore.getState().pages[0]
      store.selectMessageWindowLayer(page.messageWindowLayers[0]!.id)
      store.duplicateSelectedLayer()
      page = useWorkspaceStore.getState().pages[0]
      store = useWorkspaceStore.getState()
      store.selectMessageWindowLayer(page.messageWindowLayers[1]!.id)
    })
    expect(screen.getByText('Order 2 of 2')).toBeInTheDocument()

    act(() => {
      let store = useWorkspaceStore.getState()
      store.addWatermarkLayer()
      let page = useWorkspaceStore.getState().pages[0]
      store.selectWatermarkLayer(page.watermarkLayers[0]!.id)
      store.duplicateSelectedLayer()
      page = useWorkspaceStore.getState().pages[0]
      store = useWorkspaceStore.getState()
      store.selectWatermarkLayer(page.watermarkLayers[1]!.id)
    })
    expect(screen.getByText('Order 2 of 2')).toBeInTheDocument()
  })

  it('selects visible message window layers from the active page', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    await user.click(screen.getByRole('button', { name: 'Select message window layers' }))

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
    expect(screen.getByText('Window 2')).toBeInTheDocument()
  })

  it('selects visible watermark layers from the active page', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add watermark layer' }))
    await user.click(screen.getByRole('button', { name: 'Add watermark layer' }))
    await user.click(screen.getByRole('button', { name: 'Select watermark layers' }))

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
    expect(screen.getByText('Watermark 2')).toBeInTheDocument()
  })

  it('shows a mixed multi-selection summary in the inspector', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    act(() => {
      const page = useWorkspaceStore.getState().pages[0]
      useWorkspaceStore.getState().setSelectedLayerIds([page.textLayers[0]!.id, page.messageWindowLayers[0]!.id])
    })

    expect(screen.getByText('2 layers selected')).toBeInTheDocument()
    expect(screen.getByText('Text 1 / Window 1')).toBeInTheDocument()
    expect(screen.getByText('Shared actions Move / Align / Group / Visibility / Lock / Order')).toBeInTheDocument()
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

  it('adds a message window layer and shows it in the inspector', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))

    expect(screen.getByText('Message window layer')).toBeInTheDocument()
    expect(screen.getByText('Window opacity 0.9')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Message window layer: Speaker' })).toBeInTheDocument()
  })

  it('edits and moves the selected message window layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    await user.clear(screen.getByLabelText('Selected message speaker'))
    await user.type(screen.getByLabelText('Selected message speaker'), 'Akari')
    await user.clear(screen.getByLabelText('Selected message body'))
    await user.type(screen.getByLabelText('Selected message body'), 'This is the next scene.')
    await user.click(screen.getByRole('button', { name: 'Move message window right' }))
    await user.click(screen.getByRole('button', { name: 'Move message window up' }))

    expect(screen.getByText('Position 720, 728')).toBeInTheDocument()
    expect(screen.getByText('Window: Akari')).toBeInTheDocument()
    expect(screen.getByText('Body This is the next scene.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Message window layer: Akari' })).toBeInTheDocument()
  })

  it('saves a message window preset and reapplies it to another layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    await user.clear(screen.getByLabelText('Selected message speaker'))
    await user.type(screen.getByLabelText('Selected message speaker'), 'Rin')
    await user.clear(screen.getByLabelText('Selected message body'))
    await user.type(screen.getByLabelText('Selected message body'), 'Preset line')
    await user.click(screen.getByRole('button', { name: 'Increase message window width' }))
    await user.click(screen.getByRole('button', { name: 'Save message preset' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    await user.click(screen.getAllByRole('button', { name: 'Apply message preset: Rin' })[0])

    expect(screen.getByText('Window: Rin')).toBeInTheDocument()
    expect(screen.getByText('Body Preset line')).toBeInTheDocument()
    expect(screen.getByText('Size 640 x 220')).toBeInTheDocument()
  })

  it('cycles a message window frame style and loads a window asset', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    await user.click(screen.getByRole('button', { name: 'Cycle message window frame' }))
    const input = screen.getByLabelText('Open message window asset')
    await user.upload(input, new File(['frame'], 'vn-window.png', { type: 'image/png' }))

    expect(screen.getByText('Frame soft / Asset vn-window.png')).toBeInTheDocument()
    expect(screen.getByText('Render 9-slice asset')).toBeInTheDocument()
    expect(screen.getByText('9-slice asset')).toBeInTheDocument()
  })

  it('restores message window frame style and asset after saving and reopening', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    await user.click(screen.getByRole('button', { name: 'Cycle message window frame' }))
    const input = screen.getByLabelText('Open message window asset')
    await user.upload(input, new File(['frame'], 'story-box.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    unmount()
    render(<App />)

    expect(screen.getByText('Frame soft / Asset story-box.png')).toBeInTheDocument()
    expect(screen.getByText('Render 9-slice asset')).toBeInTheDocument()
  })

  it('saves the current page as a template and lists it in the sidebar', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.clear(screen.getByLabelText('Selected text content'))
    await user.type(screen.getByLabelText('Selected text content'), 'Template text')
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    await user.clear(screen.getByLabelText('Selected message speaker'))
    await user.type(screen.getByLabelText('Selected message speaker'), 'Narrator')
    await user.click(screen.getByRole('button', { name: 'Save page as template' }))

    expect(screen.getByRole('button', { name: 'Apply template: sample-page-01.webp layout' })).toBeInTheDocument()
    expect(screen.getByText('2 layers')).toBeInTheDocument()
    expect(screen.getByText('Preview Text Template text')).toBeInTheDocument()
    expect(screen.getByText('Preview Window Narrator')).toBeInTheDocument()
  })

  it('applies a saved template to another page', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.clear(screen.getByLabelText('Selected text content'))
    await user.type(screen.getByLabelText('Selected text content'), 'Template text')
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    await user.clear(screen.getByLabelText('Selected message speaker'))
    await user.type(screen.getByLabelText('Selected message speaker'), 'Narrator')
    await user.click(screen.getByRole('button', { name: 'Save page as template' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))
    await user.click(screen.getByRole('button', { name: 'Apply template: scene-01.png layout' }))

    expect(screen.getByRole('button', { name: 'Layer text: Template text (1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Message window layer: Narrator' })).toBeInTheDocument()
    expect(screen.getByText('Window: Narrator')).toBeInTheDocument()
  })

  it('duplicates the active page with its current layers', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.clear(screen.getByLabelText('Selected text content'))
    await user.type(screen.getByLabelText('Selected text content'), 'Duplicate me')
    await user.click(screen.getByRole('button', { name: 'Duplicate active page' }))

    expect(screen.getByText('2 pages loaded')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open page 02: sample-page-01-copy.webp' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layer text: Duplicate me (1)' })).toBeInTheDocument()
  })

  it('duplicates the active page into multiple batch variants', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.clear(screen.getByLabelText('Duplicate page variant batch'))
    await user.type(screen.getByLabelText('Duplicate page variant batch'), 'Alpha{enter}Beta{enter}Gamma')
    await user.click(screen.getByRole('button', { name: 'Duplicate page as batch variants' }))

    expect(screen.getByText('4 pages loaded')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open page 02: sample-page-01-variant-1.webp' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open page 04: sample-page-01-variant-3.webp' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layer text: Gamma (1)' })).toBeInTheDocument()
  })

  it('assigns variant labels to duplicated text swap and batch variant pages', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.clear(screen.getByLabelText('Duplicate page text swap'))
    await user.type(screen.getByLabelText('Duplicate page text swap'), 'Variant line')
    await user.click(screen.getByRole('button', { name: 'Duplicate page with text swap' }))

    expect(screen.getAllByText('Variant Variant line').length).toBeGreaterThan(0)
    expect(screen.getByText(/^Source page-sample$/)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Duplicate page variant batch'))
    await user.type(screen.getByLabelText('Duplicate page variant batch'), 'Alpha{enter}Beta')
    await user.click(screen.getByRole('button', { name: 'Duplicate page as batch variants' }))

    expect(screen.getByRole('button', { name: 'Open page 04: sample-page-01-copy-variant-2.webp' })).toBeInTheDocument()
    expect(screen.getAllByText('Variant Beta').length).toBeGreaterThan(0)
  })

  it('restores saved templates and message presets after reopening the app', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    await user.clear(screen.getByLabelText('Selected message speaker'))
    await user.type(screen.getByLabelText('Selected message speaker'), 'Restored')
    await user.click(screen.getByRole('button', { name: 'Save message preset' }))
    await user.click(screen.getByRole('button', { name: 'Save page as template' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    unmount()
    render(<App />)

    expect(screen.getAllByRole('button', { name: 'Apply message preset: Restored' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Apply template: sample-page-01.webp layout' })).toBeInTheDocument()
  })

  it('renames duplicates and deletes message presets from the preset library', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    await user.clear(screen.getByLabelText('Selected message speaker'))
    await user.type(screen.getByLabelText('Selected message speaker'), 'Library')
    await user.click(screen.getByRole('button', { name: 'Save message preset' }))

    const presetNameInput = screen.getByLabelText('Message preset name: Library')
    await user.clear(presetNameInput)
    await user.type(presetNameInput, 'Story box')
    await user.click(screen.getByRole('button', { name: 'Duplicate message preset: Story box' }))

    expect(screen.getAllByRole('button', { name: 'Apply message preset: Story box' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Apply message preset: Story box copy' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Preview Speaker Library').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Delete message preset: Story box' }))
    expect(screen.queryByRole('button', { name: 'Apply message preset: Story box' })).not.toBeInTheDocument()
  })

  it('saves reapplies and manages text presets from the preset library', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.clear(screen.getByLabelText('Selected text content'))
    await user.type(screen.getByLabelText('Selected text content'), 'Preset line')
    await user.click(screen.getByRole('button', { name: 'Increase text size' }))
    await user.click(screen.getByRole('button', { name: 'Toggle text shadow' }))
    await user.click(screen.getByRole('button', { name: 'Save text preset' }))

    const textPresetNameInput = screen.getByLabelText('Text preset name: Preset line')
    await user.clear(textPresetNameInput)
    await user.type(textPresetNameInput, 'Hero text')
    await user.click(screen.getByRole('button', { name: 'Duplicate text preset: Hero text' }))

    expect(screen.getAllByRole('button', { name: 'Apply text preset: Hero text' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Apply text preset: Hero text copy' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Preview Text Preset line').length).toBeGreaterThan(0)

    await user.clear(screen.getByLabelText('Selected text content'))
    await user.type(screen.getByLabelText('Selected text content'), 'Other line')
    await user.click(screen.getAllByRole('button', { name: 'Apply text preset: Hero text' })[0])

    expect(screen.getByDisplayValue('Preset line')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete text preset: Hero text' }))
    expect(screen.queryByRole('button', { name: 'Apply text preset: Hero text' })).not.toBeInTheDocument()
  })

  it('saves reapplies restores and manages watermark presets from the preset library', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add watermark layer' }))
    await user.clear(screen.getByLabelText('Selected watermark text'))
    await user.type(screen.getByLabelText('Selected watermark text'), 'Supporters club')
    await user.click(screen.getByRole('button', { name: 'Increase watermark opacity' }))
    await user.click(screen.getByRole('button', { name: 'Rotate watermark more' }))
    await user.click(screen.getByRole('button', { name: 'Increase watermark density' }))
    await user.click(screen.getByRole('button', { name: 'Toggle watermark tile layout' }))
    await user.click(screen.getByRole('button', { name: 'Save watermark preset' }))

    const watermarkPresetNameInput = screen.getByLabelText('Watermark preset name: Supporters club')
    await user.clear(watermarkPresetNameInput)
    await user.type(watermarkPresetNameInput, 'Support stamp')
    await user.click(screen.getByRole('button', { name: 'Duplicate watermark preset: Support stamp' }))

    expect(screen.getAllByRole('button', { name: 'Apply watermark preset: Support stamp' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Apply watermark preset: Support stamp copy' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Preview Watermark Supporters club').length).toBeGreaterThan(0)

    await user.clear(screen.getByLabelText('Selected watermark text'))
    await user.type(screen.getByLabelText('Selected watermark text'), 'Other watermark')
    await user.click(screen.getAllByRole('button', { name: 'Apply watermark preset: Support stamp' })[0])

    expect(screen.getByDisplayValue('Supporters club')).toBeInTheDocument()
    expect(screen.getByText('Watermark opacity 0.4')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save now' }))
    unmount()
    render(<App />)

    expect(screen.getAllByRole('button', { name: 'Apply watermark preset: Support stamp' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Apply watermark preset: Support stamp copy' }).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Delete watermark preset: Support stamp' }))
    expect(screen.queryByRole('button', { name: 'Apply watermark preset: Support stamp' })).not.toBeInTheDocument()
  })

  it('saves reapplies and manages bubble presets from the preset library', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.clear(screen.getByLabelText('Selected bubble content'))
    await user.type(screen.getByLabelText('Selected bubble content'), 'Alert bubble')
    await user.click(screen.getByRole('button', { name: 'Style thought' }))
    await user.click(screen.getByRole('button', { name: 'Shape cloud' }))
    await user.click(screen.getByRole('button', { name: 'Tail bottom' }))
    await user.click(screen.getByRole('button', { name: 'Save bubble preset' }))

    const bubblePresetNameInput = screen.getByLabelText('Bubble preset name: Alert bubble')
    await user.clear(bubblePresetNameInput)
    await user.type(bubblePresetNameInput, 'Alert style')
    await user.click(screen.getByRole('button', { name: 'Duplicate bubble preset: Alert style' }))

    expect(screen.getAllByRole('button', { name: 'Apply bubble preset: Alert style' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Apply bubble preset: Alert style copy' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Preview Bubble Alert bubble').length).toBeGreaterThan(0)

    await user.clear(screen.getByLabelText('Selected bubble content'))
    await user.type(screen.getByLabelText('Selected bubble content'), 'Other bubble')
    await user.click(screen.getByRole('button', { name: 'Style speech' }))
    await user.click(screen.getAllByRole('button', { name: 'Apply bubble preset: Alert style' })[0])

    expect(screen.getByDisplayValue('Alert bubble')).toBeInTheDocument()
    expect(screen.getByText('Style Thought')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete bubble preset: Alert style' }))
    expect(screen.queryByRole('button', { name: 'Apply bubble preset: Alert style' })).not.toBeInTheDocument()
  })

  it('saves reapplies and manages overlay presets from the preset library', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Overlay center band' }))
    await user.click(screen.getByRole('button', { name: 'Toggle overlay gradient' }))
    await user.click(screen.getByRole('button', { name: 'Cycle overlay gradient direction' }))
    await user.click(screen.getByRole('button', { name: 'Increase overlay opacity' }))
    await user.click(screen.getByRole('button', { name: 'Save overlay preset' }))

    const overlayPresetNameInput = screen.getByLabelText('Overlay preset name: Overlay center-band')
    await user.clear(overlayPresetNameInput)
    await user.type(overlayPresetNameInput, 'Band shade')
    await user.click(screen.getByRole('button', { name: 'Duplicate overlay preset: Band shade' }))

    expect(screen.getAllByRole('button', { name: 'Apply overlay preset: Band shade' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Apply overlay preset: Band shade copy' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Preview Area center-band').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Overlay full' }))
    await user.click(screen.getAllByRole('button', { name: 'Apply overlay preset: Band shade' })[0])

    expect(screen.getByText('Overlay area center-band')).toBeInTheDocument()
    expect(screen.getByText('Overlay fill Gradient #ffcc44 to #ff6b6b')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete overlay preset: Band shade' }))
    expect(screen.queryByRole('button', { name: 'Apply overlay preset: Band shade' })).not.toBeInTheDocument()
  })

  it('saves reapplies and manages mosaic presets from the preset library', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add mosaic layer' }))
    await user.click(screen.getByRole('button', { name: 'Mosaic noise' }))
    await user.click(screen.getByRole('button', { name: 'Mosaic intensity Large' }))
    await user.click(screen.getByRole('button', { name: 'Increase mosaic width' }))
    await user.click(screen.getByRole('button', { name: 'Save mosaic preset' }))

    const mosaicPresetNameInput = screen.getByLabelText('Mosaic preset name: noise 24')
    await user.clear(mosaicPresetNameInput)
    await user.type(mosaicPresetNameInput, 'Strong blur block')
    await user.click(screen.getByRole('button', { name: 'Duplicate mosaic preset: Strong blur block' }))

    expect(screen.getAllByRole('button', { name: 'Apply mosaic preset: Strong blur block' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Apply mosaic preset: Strong blur block copy' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Preview Style noise').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Mosaic pixelate' }))
    await user.click(screen.getAllByRole('button', { name: 'Apply mosaic preset: Strong blur block' })[0])

    expect(screen.getByText('Mosaic style noise')).toBeInTheDocument()
    expect(screen.getByText('Mosaic intensity 24')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete mosaic preset: Strong blur block' }))
    expect(screen.queryByRole('button', { name: 'Apply mosaic preset: Strong blur block' })).not.toBeInTheDocument()
  })

  it('filters the preset library by category and search query', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.clear(screen.getByLabelText('Selected text content'))
    await user.type(screen.getByLabelText('Selected text content'), 'Hero caption')
    await user.click(screen.getByRole('button', { name: 'Save text preset' }))

    await user.click(screen.getByRole('button', { name: 'Add message window layer' }))
    await user.clear(screen.getByLabelText('Selected message speaker'))
    await user.type(screen.getByLabelText('Selected message speaker'), 'Narrator box')
    await user.click(screen.getByRole('button', { name: 'Save message preset' }))

    await user.click(screen.getByRole('button', { name: 'Add bubble layer' }))
    await user.clear(screen.getByLabelText('Selected bubble content'))
    await user.type(screen.getByLabelText('Selected bubble content'), 'Cloud callout')
    await user.click(screen.getByRole('button', { name: 'Save bubble preset' }))

    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.click(screen.getByRole('button', { name: 'Overlay center band' }))
    await user.click(screen.getByRole('button', { name: 'Save overlay preset' }))

    await user.click(screen.getByRole('button', { name: 'Add mosaic layer' }))
    await user.click(screen.getByRole('button', { name: 'Mosaic blur' }))
    await user.click(screen.getByRole('button', { name: 'Save mosaic preset' }))

    await user.click(screen.getByRole('button', { name: 'Save page as template' }))
    await user.click(screen.getByRole('button', { name: 'Save page as reusable asset' }))

    await user.click(screen.getByRole('button', { name: 'Show text presets' }))
    expect(screen.getAllByRole('button', { name: 'Apply text preset: Hero caption' }).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Message preset preview: Narrator box')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show bubble presets' }))
    expect(screen.getAllByRole('button', { name: 'Apply bubble preset: Cloud callout' }).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Overlay preset preview: Overlay center-band')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show mosaic presets' }))
    expect(screen.getAllByRole('button', { name: 'Apply mosaic preset: blur 12' }).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Bubble preset preview: Cloud callout')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show all presets' }))
    await user.clear(screen.getByLabelText('Preset library search'))
    await user.type(screen.getByLabelText('Preset library search'), 'Narrator')

    expect(screen.getAllByRole('button', { name: 'Apply message preset: Narrator box' }).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Text preset preview: Hero caption')).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('Preset library search'))
    await user.type(screen.getByLabelText('Preset library search'), 'center-band')

    expect(screen.getAllByRole('button', { name: 'Apply overlay preset: Overlay center-band' }).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Bubble preset preview: Cloud callout')).not.toBeInTheDocument()
  })

  it('applies SAM3 auto mosaic results to canvas mosaic layers', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        expect(init?.method).toBe('POST')
        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [
              { x: 300, y: 220, width: 180, height: 120 },
              { x: 840, y: 460, width: 220, height: 160 },
            ],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))
    await user.click(await screen.findByRole('button', { name: 'Apply SAM3 auto mosaic to canvas' }))

    expect(screen.getByRole('button', { name: 'Mosaic layer SAM3 mask 1 (1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mosaic layer SAM3 mask 2 (2)' })).toBeInTheDocument()
    expect(screen.getAllByText('SAM3 auto mosaic ready with 2 masks applied to 2 mosaic layers').length).toBeGreaterThan(0)
  })

  it('lets you review and skip individual SAM3 auto mosaic candidates before applying', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [
              { x: 300, y: 220, width: 180, height: 120 },
              { x: 840, y: 460, width: 220, height: 160 },
            ],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))
    expect(screen.getByText('SAM3 review candidates: 2')).toBeInTheDocument()
    expect(screen.getByText('2 selected for apply')).toBeInTheDocument()
    expect(screen.getByText('Focused SAM3 candidate: 1')).toBeInTheDocument()
    expect(screen.getByLabelText('SAM3 review preview 1: selected focused')).toBeInTheDocument()
    expect(screen.getByLabelText('SAM3 review preview 2: selected')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Toggle SAM3 candidate 2' }))
    expect(screen.getByText('1 selected for apply')).toBeInTheDocument()
    expect(screen.getByText('Focused SAM3 candidate: 2')).toBeInTheDocument()
    expect(screen.getByLabelText('SAM3 review preview 2: skipped focused')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apply SAM3 auto mosaic to canvas' }))

    expect(screen.getByRole('button', { name: 'Mosaic layer SAM3 mask 1 (1)' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mosaic layer SAM3 mask 2 (2)' })).not.toBeInTheDocument()
    expect(screen.getAllByText('SAM3 auto mosaic ready with 2 masks applied to 1 mosaic layer').length).toBeGreaterThan(0)
  })

  it('can clear and restore all SAM3 review candidates at once', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [
              { x: 300, y: 220, width: 180, height: 120 },
              { x: 840, y: 460, width: 220, height: 160 },
            ],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))

    await user.click(screen.getByRole('button', { name: 'Clear SAM3 candidates' }))
    expect(screen.getByText('0 selected for apply')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply SAM3 auto mosaic to canvas' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Select all SAM3 candidates' }))
    expect(screen.getByText('2 selected for apply')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply SAM3 auto mosaic to canvas' })).toBeEnabled()
  })

  it('focuses a SAM3 review preview when clicked on the canvas', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [
              { x: 300, y: 220, width: 180, height: 120 },
              { x: 840, y: 460, width: 220, height: 160 },
            ],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))
    await user.click(screen.getByLabelText('SAM3 review preview 2: selected'))

    expect(screen.getByText('Focused SAM3 candidate: 2')).toBeInTheDocument()
    expect(screen.getByLabelText('SAM3 review preview 2: selected focused')).toBeInTheDocument()
  })

  it('cycles the focused SAM3 candidate style before applying', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [{ x: 300, y: 220, width: 180, height: 120 }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))

    expect(screen.getAllByText('Style pixelate').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Cycle focused SAM3 style' }))

    expect(screen.getAllByText('Style blur').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('SAM3 review preview 1: selected focused')).toHaveAttribute('data-style', 'blur')

    await user.click(screen.getByRole('button', { name: 'Apply SAM3 auto mosaic to canvas' }))
    expect(screen.getByText('Mosaic style blur')).toBeInTheDocument()
  })

  it('increases the focused SAM3 candidate intensity before applying', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [{ x: 300, y: 220, width: 180, height: 120 }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))

    expect(screen.getAllByText('Intensity 16').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Increase focused SAM3 intensity' }))

    expect(screen.getAllByText('Intensity 24').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('SAM3 review preview 1: selected focused')).toHaveAttribute('data-intensity', '24')

    await user.click(screen.getByRole('button', { name: 'Apply SAM3 auto mosaic to canvas' }))
    expect(screen.getByText('Mosaic intensity 24')).toBeInTheDocument()
  })

  it('renames the focused SAM3 candidate before applying', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [{ x: 300, y: 220, width: 180, height: 120 }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))
    const sam3LabelInput = screen.getByLabelText('Focused SAM3 candidate label')
    await user.clear(sam3LabelInput)
    await user.type(sam3LabelInput, 'Eyes mosaic')

    expect(sam3LabelInput).toHaveValue('Eyes mosaic')
    expect(screen.getByText('Eyes mosaic selected')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Apply SAM3 auto mosaic to canvas' }))
    expect(screen.getByRole('button', { name: 'Mosaic layer Eyes mosaic (1)' })).toBeInTheDocument()
  })

  it('copies the focused SAM3 review settings to other selected candidates', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [
              { x: 300, y: 220, width: 180, height: 120 },
              { x: 840, y: 460, width: 220, height: 160 },
            ],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))
    await user.click(screen.getByLabelText('SAM3 review preview 2: selected'))
    await user.click(screen.getByRole('button', { name: 'Cycle focused SAM3 style' }))
    await user.click(screen.getByRole('button', { name: 'Increase focused SAM3 intensity' }))
    const sam3NoteInput = screen.getByLabelText('Focused SAM3 candidate note')
    await user.clear(sam3NoteInput)
    await user.type(sam3NoteInput, 'Use blur for both')

    await user.click(screen.getByRole('button', { name: 'Apply focused SAM3 settings to selected' }))

    expect(screen.getByLabelText('SAM3 review preview 1: selected')).toHaveAttribute('data-style', 'blur')
    expect(screen.getByLabelText('SAM3 review preview 1: selected')).toHaveAttribute('data-intensity', '24')
    expect(screen.getAllByText('Note Use blur for both').length).toBeGreaterThan(0)
  })

  it('filters SAM3 review selection to high priority candidates', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: [
              { x: 300, y: 220, width: 180, height: 120 },
              { x: 840, y: 460, width: 220, height: 160 },
            ],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic' }))
    await user.click(screen.getByLabelText('SAM3 review preview 2: selected'))
    await user.click(screen.getByRole('button', { name: 'Cycle focused SAM3 priority' }))

    expect(screen.getAllByText('Priority high').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Select high priority SAM3 candidates' }))

    expect(screen.getByText('1 selected for apply')).toBeInTheDocument()
    expect(screen.getByLabelText('SAM3 review preview 1: skipped')).toBeInTheDocument()
    expect(screen.getByLabelText('SAM3 review preview 2: selected focused')).toBeInTheDocument()
  })

  it('applies NSFW detections to canvas overlay layers', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        expect(init?.method).toBe('POST')
        return {
          ok: true,
          json: async () => ({
            detections: [{ x: 520, y: 320, width: 240, height: 180 }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run NSFW detection' }))
    await user.click(await screen.findByRole('button', { name: 'Apply NSFW detections to canvas' }))

    expect(screen.getByRole('button', { name: 'Overlay layer NSFW region 1 (1)' })).toBeInTheDocument()
    expect(screen.getAllByText('NSFW detection found 1 region applied to 1 overlay layer').length).toBeGreaterThan(0)
  })

  it('lets you review and skip individual NSFW detections before applying', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        return {
          ok: true,
          json: async () => ({
            detections: [
              { x: 520, y: 320, width: 240, height: 180 },
              { x: 860, y: 480, width: 180, height: 140 },
            ],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run NSFW detection' }))
    expect(screen.getByText('NSFW review candidates: 2')).toBeInTheDocument()
    expect(screen.getByText('2 selected for apply')).toBeInTheDocument()
    expect(screen.getByText('Focused NSFW candidate: 1')).toBeInTheDocument()
    expect(screen.getByLabelText('NSFW review preview 1: selected focused')).toBeInTheDocument()
    expect(screen.getByLabelText('NSFW review preview 2: selected')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Toggle NSFW candidate 1' }))
    expect(screen.getByText('1 selected for apply')).toBeInTheDocument()
    expect(screen.getByText('Focused NSFW candidate: 1')).toBeInTheDocument()
    expect(screen.getByLabelText('NSFW review preview 1: skipped focused')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apply NSFW detections to canvas' }))

    expect(screen.queryByRole('button', { name: 'Overlay layer NSFW region 1 (1)' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overlay layer NSFW region 2 (1)' })).toBeInTheDocument()
    expect(screen.getAllByText('NSFW detection found 2 regions applied to 1 overlay layer').length).toBeGreaterThan(0)
  })

  it('can clear and restore all NSFW review candidates at once', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        return {
          ok: true,
          json: async () => ({
            detections: [
              { x: 520, y: 320, width: 240, height: 180 },
              { x: 860, y: 480, width: 180, height: 140 },
            ],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run NSFW detection' }))

    await user.click(screen.getByRole('button', { name: 'Clear NSFW candidates' }))
    expect(screen.getByText('0 selected for apply')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply NSFW detections to canvas' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Select all NSFW candidates' }))
    expect(screen.getByText('2 selected for apply')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply NSFW detections to canvas' })).toBeEnabled()
  })

  it('focuses an NSFW review preview when clicked on the canvas', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        return {
          ok: true,
          json: async () => ({
            detections: [
              { x: 520, y: 320, width: 240, height: 180 },
              { x: 860, y: 480, width: 180, height: 140 },
            ],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run NSFW detection' }))
    await user.click(screen.getByLabelText('NSFW review preview 2: selected'))

    expect(screen.getByText('Focused NSFW candidate: 2')).toBeInTheDocument()
    expect(screen.getByLabelText('NSFW review preview 2: selected focused')).toBeInTheDocument()
  })

  it('cycles the focused NSFW candidate color before applying', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        return {
          ok: true,
          json: async () => ({
            detections: [{ x: 520, y: 320, width: 240, height: 180 }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run NSFW detection' }))

    expect(screen.getAllByText('Color #ff4d6d').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Cycle focused NSFW color' }))

    expect(screen.getAllByText('Color #ff9f1c').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('NSFW review preview 1: selected focused')).toHaveAttribute('data-color', '#ff9f1c')

    await user.click(screen.getByRole('button', { name: 'Apply NSFW detections to canvas' }))
    expect(screen.getByText('Overlay fill Gradient #ff9f1c to #111111')).toBeInTheDocument()
  })

  it('increases the focused NSFW candidate opacity before applying', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        return {
          ok: true,
          json: async () => ({
            detections: [{ x: 520, y: 320, width: 240, height: 180 }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run NSFW detection' }))

    expect(screen.getAllByText('Opacity 0.4').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Increase focused NSFW opacity' }))

    expect(screen.getAllByText('Opacity 0.5').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('NSFW review preview 1: selected focused')).toHaveAttribute('data-opacity', '0.5')

    await user.click(screen.getByRole('button', { name: 'Apply NSFW detections to canvas' }))
    expect(screen.getByText('Overlay opacity 0.5')).toBeInTheDocument()
  })

  it('renames the focused NSFW candidate before applying', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        return {
          ok: true,
          json: async () => ({
            detections: [{ x: 520, y: 320, width: 240, height: 180 }],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run NSFW detection' }))
    const nsfwLabelInput = screen.getByLabelText('Focused NSFW candidate label')
    await user.clear(nsfwLabelInput)
    await user.type(nsfwLabelInput, 'Cover warning')

    expect(nsfwLabelInput).toHaveValue('Cover warning')
    expect(screen.getByText('Cover warning selected')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Apply NSFW detections to canvas' }))
    expect(screen.getByRole('button', { name: 'Overlay layer Cover warning (1)' })).toBeInTheDocument()
  })

  it('copies the focused NSFW review settings to other selected candidates', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        return {
          ok: true,
          json: async () => ({
            detections: [
              { x: 520, y: 320, width: 240, height: 180 },
              { x: 860, y: 480, width: 180, height: 140 },
            ],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run NSFW detection' }))
    await user.click(screen.getByLabelText('NSFW review preview 2: selected'))
    await user.click(screen.getByRole('button', { name: 'Cycle focused NSFW color' }))
    await user.click(screen.getByRole('button', { name: 'Increase focused NSFW opacity' }))
    const nsfwNoteInput = screen.getByLabelText('Focused NSFW candidate note')
    await user.clear(nsfwNoteInput)
    await user.type(nsfwNoteInput, 'Mirror this warning')

    await user.click(screen.getByRole('button', { name: 'Apply focused NSFW settings to selected' }))

    expect(screen.getByLabelText('NSFW review preview 1: selected')).toHaveAttribute('data-color', '#ff9f1c')
    expect(screen.getByLabelText('NSFW review preview 1: selected')).toHaveAttribute('data-opacity', '0.5')
    expect(screen.getAllByText('Note Mirror this warning').length).toBeGreaterThan(0)
  })

  it('filters NSFW review selection to high priority candidates', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        return {
          ok: true,
          json: async () => ({
            detections: [
              { x: 520, y: 320, width: 240, height: 180 },
              { x: 860, y: 480, width: 180, height: 140 },
            ],
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run NSFW detection' }))
    await user.click(screen.getByLabelText('NSFW review preview 2: selected'))
    await user.click(screen.getByRole('button', { name: 'Cycle focused NSFW priority' }))

    expect(screen.getAllByText('Priority high').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Select high priority NSFW candidates' }))

    expect(screen.getByText('1 selected for apply')).toBeInTheDocument()
    expect(screen.getByLabelText('NSFW review preview 1: skipped')).toBeInTheDocument()
    expect(screen.getByLabelText('NSFW review preview 2: selected focused')).toBeInTheDocument()
  })

  it('applies manual SAM3 segment results to canvas mosaic layers', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/segment')) {
        expect(init?.method).toBe('POST')
        return {
          ok: true,
          json: async () => ({
            mask_base64: 'encoded-mask',
            status: 'stub',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(await screen.findByRole('button', { name: 'Run SAM3 manual segment' }))
    expect(screen.getByText('SAM3 manual segment review ready')).toBeInTheDocument()
    expect(screen.getByText('2 positive / 0 negative points')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Apply manual segment to canvas' }))

    expect(screen.getByRole('button', { name: 'Mosaic layer SAM3 manual segment (1)' })).toBeInTheDocument()
    expect(screen.getAllByText('SAM3 manual segment ready with 2 points applied to canvas').length).toBeGreaterThan(0)
  })

  it('applies a saved template to all loaded pages', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Open image file')
    await user.upload(input, new File(['one'], 'scene-01.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.clear(screen.getByLabelText('Selected text content'))
    await user.type(screen.getByLabelText('Selected text content'), 'Batch text')
    await user.click(screen.getByRole('button', { name: 'Save page as template' }))
    await user.upload(input, new File(['two'], 'scene-02.webp', { type: 'image/webp' }))
    await user.click(screen.getByRole('button', { name: 'Apply template to all pages: scene-01.png layout' }))
    await user.click(screen.getByRole('button', { name: 'Open page 01: scene-01.png' }))

    expect(screen.getAllByRole('button', { name: 'Layer text: Batch text (1)' })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Open page 02: scene-02.webp' }))
    expect(screen.getByRole('button', { name: 'Layer text: Batch text (1)' })).toBeInTheDocument()
  })

  it('duplicates the active page and swaps the first text layer content', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.clear(screen.getByLabelText('Selected text content'))
    await user.type(screen.getByLabelText('Selected text content'), 'Original line')
    await user.clear(screen.getByLabelText('Duplicate page text swap'))
    await user.type(screen.getByLabelText('Duplicate page text swap'), 'Variant line')
    await user.click(screen.getByRole('button', { name: 'Duplicate page with text swap' }))

    expect(screen.getByRole('button', { name: 'Open page 02: sample-page-01-copy.webp' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Layer text: Variant line (1)' })).toBeInTheDocument()
  })

  it('edits the active page variant label and shows it in the page list and inspector', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Duplicate active page' }))
    const variantInput = screen.getByLabelText('Active page variant label')
    await user.clear(variantInput)
    await user.type(variantInput, 'Promo alt')

    expect(variantInput).toHaveValue('Promo alt')
    expect(screen.getAllByText((content) => content.includes('Promo alt')).length).toBeGreaterThan(0)
    expect(screen.getByText(/^Source page-sample$/)).toBeInTheDocument()
  })

  it('renames duplicates and deletes a saved template', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Save page as template' }))
    const templateNameInput = screen.getByDisplayValue('sample-page-01.webp layout')
    await user.clear(templateNameInput)
    await user.type(templateNameInput, 'Story layout')
    await user.click(screen.getByRole('button', { name: 'Duplicate template: Story layout' }))

    expect(screen.getByRole('button', { name: 'Apply template: Story layout' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply template: Story layout copy' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete template: Story layout' }))
    expect(screen.queryByRole('button', { name: 'Apply template: Story layout' })).not.toBeInTheDocument()
  })

  it('saves the current page as a reusable asset and applies it as an image watermark layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.clear(screen.getByLabelText('Selected text content'))
    await user.type(screen.getByLabelText('Selected text content'), 'Asset line')
    await user.click(screen.getByRole('button', { name: 'Save page as reusable asset' }))

    expect(screen.getByText('Preview Text Asset line')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apply reusable asset: sample-page-01.webp asset' }))

    expect(screen.getByText('Mode Image')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Watermark layer: sample-page-01.webp asset' })).toBeInTheDocument()
  })

  it('renames duplicates deletes and restores reusable assets after reopening', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add text layer' }))
    await user.clear(screen.getByLabelText('Selected text content'))
    await user.type(screen.getByLabelText('Selected text content'), 'Reusable line')
    await user.click(screen.getByRole('button', { name: 'Save page as reusable asset' }))

    const assetNameInput = screen.getByDisplayValue('sample-page-01.webp asset')
    await user.clear(assetNameInput)
    await user.type(assetNameInput, 'Promo layout')
    await user.click(screen.getByRole('button', { name: 'Duplicate reusable asset: Promo layout' }))

    expect(screen.getByRole('button', { name: 'Apply reusable asset: Promo layout' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply reusable asset: Promo layout copy' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete reusable asset: Promo layout' }))
    expect(screen.queryByRole('button', { name: 'Apply reusable asset: Promo layout' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save now' }))
    unmount()
    render(<App />)

    expect(screen.getByRole('button', { name: 'Apply reusable asset: Promo layout copy' })).toBeInTheDocument()
    expect(screen.getByText('Preview Text Reusable line')).toBeInTheDocument()
  })

  it('renames the selected layer and reflects it in the inspector and layer panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add overlay layer' }))
    await user.clear(screen.getByLabelText('Selected layer name'))
    await user.type(screen.getByLabelText('Selected layer name'), 'HeroShade')

    expect(screen.getByRole('button', { name: 'Overlay layer HeroShade (1)' })).toBeInTheDocument()
  })

  it('adds and edits a watermark layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add watermark layer' }))
    await user.clear(screen.getByLabelText('Selected watermark text'))
    await user.type(screen.getByLabelText('Selected watermark text'), 'Patreon preview')
    await user.click(screen.getByRole('button', { name: 'Increase watermark opacity' }))
    await user.click(screen.getByRole('button', { name: 'Toggle watermark pattern' }))

    expect(screen.getByText('Watermark opacity 0.4')).toBeInTheDocument()
    expect(screen.getByText('Pattern Repeated')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Watermark layer: Patreon preview' })).toBeInTheDocument()
  })

  it('restores watermark layers after saving and reopening', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add watermark layer' }))
    await user.clear(screen.getByLabelText('Selected watermark text'))
    await user.type(screen.getByLabelText('Selected watermark text'), 'Discord bonus')
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    unmount()
    render(<App />)

    expect(screen.getByRole('button', { name: 'Watermark layer: Discord bonus' })).toBeInTheDocument()
  })

  it('applies a Patreon CTA watermark preset to the selected watermark layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add watermark layer' }))
    await user.click(screen.getByRole('button', { name: 'Apply Patreon CTA watermark' }))

    expect(screen.getByText('Pattern Repeated')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Watermark layer: Continue on Patreon' })).toBeInTheDocument()
  })

  it('adjusts watermark angle and density from the inspector controls', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add watermark layer' }))
    await user.click(screen.getByRole('button', { name: 'Rotate watermark more' }))
    await user.click(screen.getByRole('button', { name: 'Increase watermark density' }))

    expect(screen.getByText('Angle -8 deg')).toBeInTheDocument()
    expect(screen.getByText('Density 2x')).toBeInTheDocument()
  })

  it('restores watermark angle and density after saving and reopening', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Add watermark layer' }))
    await user.click(screen.getByRole('button', { name: 'Rotate watermark more' }))
    await user.click(screen.getByRole('button', { name: 'Increase watermark density' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    unmount()
    render(<App />)

    expect(screen.getByText('Angle -8 deg')).toBeInTheDocument()
    expect(screen.getByText('Density 2x')).toBeInTheDocument()
  })

  it('loads a PNG watermark asset as an image watermark layer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    const input = screen.getByLabelText('Open watermark image')
    await user.upload(input, new File(['stamp'], 'patreon-stamp.png', { type: 'image/png' }))

    expect(screen.getByText('Mode Image')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Watermark layer: patreon-stamp.png' })).toBeInTheDocument()
  })

  it('restores image watermark layers after saving and reopening', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    const input = screen.getByLabelText('Open watermark image')
    await user.upload(input, new File(['stamp'], 'discord-stamp.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    unmount()
    render(<App />)

    expect(screen.getByRole('button', { name: 'Watermark layer: discord-stamp.png' })).toBeInTheDocument()
    expect(screen.getByText('Mode Image')).toBeInTheDocument()
  })

  it('writes the current schema version into saved project storage', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    const storedProject = window.localStorage.getItem(PROJECT_STORAGE_KEY)
    expect(storedProject).not.toBeNull()

    const parsedProject = JSON.parse(storedProject ?? '{}') as { schemaVersion?: number; pages?: unknown[] }
    expect(parsedProject.schemaVersion).toBe(CURRENT_PROJECT_SCHEMA_VERSION)
    expect(Array.isArray(parsedProject.pages)).toBe(true)
  })

  it('migrates legacy saved projects to the current schema version on restore', async () => {
    window.localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({
        id: 'legacy-project',
        name: 'Legacy project',
        pages: [
          {
            id: 'legacy-page',
            name: 'legacy-scene.png',
            width: 1920,
            height: 1080,
            textLayers: [],
            messageWindowLayers: [],
            bubbleLayers: [],
            mosaicLayers: [],
            overlayLayers: [],
            watermarkLayers: [],
          },
        ],
        activePageId: 'legacy-page',
        selectedLayerId: null,
        imageTransform: null,
        outputSettings: {
          presetId: 'hd-landscape',
          fileNamePrefix: 'legacy-export',
          startNumber: 3,
          numberPadding: 4,
        },
        lastSavedAt: '2026-03-20T10:00:00.000Z',
      }),
    )

    render(<App />)

    expect(await screen.findByRole('button', { name: 'Open page 01: legacy-scene.png' })).toBeInTheDocument()

    const migratedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? '{}') as {
      schemaVersion?: number
      outputSettings?: { resizeFitMode?: string; resizeBackgroundMode?: string; qualityMode?: string }
    }

    expect(migratedProject.schemaVersion).toBe(CURRENT_PROJECT_SCHEMA_VERSION)
    expect(migratedProject.outputSettings?.resizeFitMode).toBe('contain')
    expect(migratedProject.outputSettings?.resizeBackgroundMode).toBe('white')
    expect(migratedProject.outputSettings?.qualityMode).toBe('high')
  })

  it('migrates an explicit schemaVersion 0 project through the current migration path', async () => {
    window.localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 0,
        id: 'legacy-v0-project',
        name: 'Legacy v0 project',
        pages: [
          {
            id: 'legacy-v0-page',
            name: 'legacy-v0-scene.png',
            width: 1920,
            height: 1080,
            textLayers: [],
            messageWindowLayers: [],
            bubbleLayers: [],
            mosaicLayers: [],
            overlayLayers: [],
            watermarkLayers: [],
          },
        ],
        activePageId: 'legacy-v0-page',
        outputSettings: {
          presetId: 'custom',
          width: 1200,
          height: 1600,
          fileNamePrefix: 'legacy-v0',
          startNumber: 9,
          numberPadding: 3,
        },
      }),
    )

    render(<App />)

    expect(await screen.findByRole('button', { name: 'Open page 01: legacy-v0-scene.png' })).toBeInTheDocument()

    const migratedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? '{}') as {
      schemaVersion?: number
      outputSettings?: { width?: number; height?: number; resizeFitMode?: string; resizeBackgroundMode?: string }
    }

    expect(migratedProject.schemaVersion).toBe(CURRENT_PROJECT_SCHEMA_VERSION)
    expect(migratedProject.outputSettings?.width).toBe(1200)
    expect(migratedProject.outputSettings?.height).toBe(1600)
    expect(migratedProject.outputSettings?.resizeFitMode).toBe('contain')
    expect(migratedProject.outputSettings?.resizeBackgroundMode).toBe('white')
  })

  it('shows schema and migration policy details in the Help dialog', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sam3_loaded: true,
        nudenet_loaded: true,
        gpu_available: true,
        packaged_runtime: true,
        python_version: '3.14.3',
        sam3_backend: 'heuristic',
        nudenet_backend: 'native',
        sam3_native_available: false,
        nudenet_native_available: true,
        sam3_native_reason: "No module named 'sam3'",
        nudenet_native_reason: null,
        sam3_recommendation:
          'SAM3 native is unavailable here. Use Python 3.12 plus the optional native install script for the best chance of loading checkpoints.',
        nudenet_recommendation: 'Native backend is available for this model.',
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Help' }))

    expect(screen.getByText(`Schema v${CURRENT_PROJECT_SCHEMA_VERSION}`)).toBeInTheDocument()
    expect(screen.getByText('Migration path v0 -> v1')).toBeInTheDocument()
    expect(screen.getByText('Storage key creators-coco.project')).toBeInTheDocument()
    expect(screen.getAllByText('Backend runtime Portable packaged Python 3.14.3').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SAM3 heuristic / native unavailable').length).toBeGreaterThan(0)
    expect(screen.getAllByText('NudeNet native / native available').length).toBeGreaterThan(0)
    expect(document.body.textContent).toContain('Native backend readiness')
    expect(document.body.textContent).toContain('Environment keys CREATORS_COCO_SAM3_CHECKPOINT / CREATORS_COCO_SAM3_CONFIG')
    expect(document.body.textContent).toContain('SAM3 native is unavailable here.')
    expect(document.body.textContent).toContain('Native backend is available for this model.')
  })

  it('records recent performance metrics and restores them in the Help dialog', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))
    await user.click(screen.getByRole('button', { name: 'Help' }))

    expect(screen.getByText('Recent performance')).toBeInTheDocument()
    expect(screen.getAllByText(/Save project/).length).toBeGreaterThan(0)

    cleanup()
    resetWorkspaceStore()
    window.localStorage.setItem(
      PERFORMANCE_METRICS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'metric-1',
          action: 'NSFW detection',
          durationMs: 812,
          thresholdMs: 600,
          level: 'warn',
          recordedAt: '2026-03-23T02:40:00.000Z',
        },
      ]),
    )

    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Help' }))

    expect(screen.getByText('NSFW detection 812ms')).toBeInTheDocument()
    expect(screen.getByText(/812ms/)).toBeInTheDocument()
    expect(screen.getByText('Slow')).toBeInTheDocument()
  })

  it('recalculates SAM3 review candidates and resets edited focused values', async () => {
    let sam3RequestCount = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        sam3RequestCount += 1
        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks:
              sam3RequestCount === 1
                ? [{ x: 520, y: 320, width: 240, height: 180 }]
                : [{ x: 760, y: 420, width: 180, height: 140 }],
            status: 'ok',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Run SAM3 auto mosaic' }))
    await user.clear(screen.getByLabelText('Focused SAM3 candidate label'))
    await user.type(screen.getByLabelText('Focused SAM3 candidate label'), 'Edited mask')
    await user.click(screen.getByRole('button', { name: 'Cycle focused SAM3 style' }))
    await user.click(screen.getByRole('button', { name: 'Increase focused SAM3 intensity' }))

    expect(screen.getByText('Edited mask selected')).toBeInTheDocument()
    expect(screen.getAllByText('Style blur').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Intensity 24').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Recalculate SAM3 candidates' }))

    expect((await screen.findAllByText('SAM3 review candidates recalculated')).length).toBeGreaterThan(0)
    expect(screen.getByText('SAM3 mask 1 selected')).toBeInTheDocument()
    expect(screen.getAllByText('Style pixelate').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Intensity 16').length).toBeGreaterThan(0)
    expect(screen.getByText('180 x 140 at 760, 420')).toBeInTheDocument()
  })

  it('reverts the focused NSFW review candidate back to backend defaults', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/nsfw/detect')) {
        return {
          ok: true,
          json: async () => ({
            detections: [{ x: 520, y: 320, width: 240, height: 180 }],
            status: 'ok',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Run NSFW detection' }))
    await user.clear(screen.getByLabelText('Focused NSFW candidate label'))
    await user.type(screen.getByLabelText('Focused NSFW candidate label'), 'Edited warning')
    await user.click(screen.getByRole('button', { name: 'Cycle focused NSFW color' }))
    await user.click(screen.getByRole('button', { name: 'Increase focused NSFW opacity' }))

    expect(screen.getByText('Edited warning selected')).toBeInTheDocument()
    expect(screen.getAllByText('Color #ff9f1c').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Opacity 0.5').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Revert focused NSFW edits' }))

    expect((await screen.findAllByText('Focused NSFW review candidate reverted')).length).toBeGreaterThan(0)
    expect(screen.getByText('NSFW region 1 selected')).toBeInTheDocument()
    expect(screen.getAllByText('Color #ff4d6d').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Opacity 0.4').length).toBeGreaterThan(0)
  })

  it('runs SAM3 auto mosaic for all pages and applies batch mosaic layers per page', async () => {
    let sam3BatchRequestCount = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            sam3_loaded: true,
            nudenet_loaded: true,
            gpu_available: true,
          }),
        }
      }

      if (url.endsWith('/api/sam3/auto-mosaic')) {
        sam3BatchRequestCount += 1
        const body = JSON.parse(String(init?.body ?? '{}')) as { image_base64?: string }
        const isSecondPage = sam3BatchRequestCount === 2 && typeof body.image_base64 === 'string'
        return {
          ok: true,
          json: async () => ({
            result_image_base64: '',
            masks: isSecondPage
              ? [{ x: 860, y: 480, width: 180, height: 140 }]
              : [{ x: 520, y: 320, width: 240, height: 180 }],
            status: 'ok',
          }),
        }
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample image' }))
    await user.click(screen.getByRole('button', { name: 'Duplicate active page' }))
    expect(await screen.findByRole('button', { name: 'Open page 02: sample-page-01-copy.webp' })).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Run SAM3 auto mosaic for all pages' }))
    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([value]) => String(value).endsWith('/api/sam3/auto-mosaic'))).toHaveLength(2)
    })

    await user.click(screen.getByRole('button', { name: 'Open page 01: sample-page-01.webp' }))
    expect(screen.getByRole('button', { name: 'Mosaic layer sample-page-01.webp SAM3 mask 1 (1)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open page 02: sample-page-01-copy.webp' }))
    expect(screen.getByRole('button', { name: 'Mosaic layer sample-page-01-copy.webp SAM3 mask 1 (1)' })).toBeInTheDocument()
  })

  it('moves and scales an image watermark asset', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    const input = screen.getByLabelText('Open watermark image')
    await user.upload(input, new File(['stamp'], 'asset-stamp.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Move watermark right' }))
    await user.click(screen.getByRole('button', { name: 'Move watermark down' }))
    await user.click(screen.getByRole('button', { name: 'Increase watermark scale' }))

    expect(screen.getByText('Position 1056, 604')).toBeInTheDocument()
    expect(screen.getAllByText('Scale 1.2x')).toHaveLength(2)
  })

  it('toggles watermark tile layout and restores it after saving', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Load sample image' }))
    const input = screen.getByLabelText('Open watermark image')
    await user.upload(input, new File(['stamp'], 'tile-stamp.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Toggle watermark tile layout' }))
    await user.click(screen.getByRole('button', { name: 'Save now' }))

    unmount()
    render(<App />)

    expect(screen.getByText('Layout Tiled')).toBeInTheDocument()
  })
})
