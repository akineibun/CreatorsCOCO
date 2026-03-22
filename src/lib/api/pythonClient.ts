export type BackendStatus = {
  sam3_loaded: boolean
  nudenet_loaded: boolean
  gpu_available: boolean
  sam3_status?: string
  sam3_progress?: number
  nudenet_status?: string
  nudenet_progress?: number
}

export type ModelDownloadResponse = {
  model_name: string
  status: string
  progress: number
}

type BackendModelProgressSubscription = {
  onProgress: (progress: ModelDownloadResponse) => void
  onError?: () => void
}

export type Sam3AutoMosaicResponse = {
  result_image_base64: string
  masks: Array<Record<string, unknown>>
  status: string
}

export type NsfwDetectionResponse = {
  detections: Array<Record<string, unknown>>
  status: string
}

export type Sam3SegmentResponse = {
  mask_base64: string
  status: string
  bbox: Record<string, unknown>
  points_used: number
}

export type Sam3SegmentPoint = {
  x: number
  y: number
  label: 1 | 0
}

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8765'
const getBackendBaseUrl = () =>
  ((window as { creatorsCoco?: { backendUrl?: string } }).creatorsCoco?.backendUrl ?? DEFAULT_BACKEND_URL)

export const getBackendStatus = async (): Promise<BackendStatus> => {
  const response = await fetch(`${getBackendBaseUrl()}/api/status`)
  if (!response.ok) {
    throw new Error(`Backend status request failed: ${response.status}`)
  }

  return (await response.json()) as BackendStatus
}

export const downloadBackendModel = async (
  modelName: 'sam3' | 'nudenet',
): Promise<ModelDownloadResponse> => {
  const response = await fetch(`${getBackendBaseUrl()}/api/model/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model_name: modelName }),
  })

  if (!response.ok) {
    throw new Error(`Backend model download request failed: ${response.status}`)
  }

  return (await response.json()) as ModelDownloadResponse
}

export const getBackendModelProgress = async (
  modelName: 'sam3' | 'nudenet',
): Promise<ModelDownloadResponse> => {
  const response = await fetch(`${getBackendBaseUrl()}/api/model/progress/${modelName}`)
  if (!response.ok) {
    throw new Error(`Backend model progress request failed: ${response.status}`)
  }

  return (await response.json()) as ModelDownloadResponse
}

export const subscribeToBackendModelProgress = (
  modelName: 'sam3' | 'nudenet',
  { onProgress, onError }: BackendModelProgressSubscription,
): (() => void) | null => {
  if (typeof window.EventSource !== 'function') {
    return null
  }

  const eventSource = new window.EventSource(`${getBackendBaseUrl()}/api/model/progress/stream/${modelName}`)

  eventSource.onmessage = (event) => {
    try {
      onProgress(JSON.parse(event.data) as ModelDownloadResponse)
    } catch {
      onError?.()
      eventSource.close()
    }
  }

  eventSource.onerror = () => {
    onError?.()
    eventSource.close()
  }

  return () => {
    eventSource.close()
  }
}

export const runSam3AutoMosaic = async (
  imageBase64: string,
  modelSize: 'base' | 'large',
  mosaicStrength: 'light' | 'medium' | 'strong',
): Promise<Sam3AutoMosaicResponse> => {
  const response = await fetch(`${getBackendBaseUrl()}/api/sam3/auto-mosaic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_base64: imageBase64,
      detections: [],
      mosaic_type: 'pixelate',
      mosaic_strength: mosaicStrength,
      model_size: modelSize,
    }),
  })

  if (!response.ok) {
    throw new Error(`SAM3 auto mosaic request failed: ${response.status}`)
  }

  return (await response.json()) as Sam3AutoMosaicResponse
}

export const runNsfwDetection = async (
  imageBase64: string,
  threshold: number,
): Promise<NsfwDetectionResponse> => {
  const response = await fetch(`${getBackendBaseUrl()}/api/nsfw/detect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_base64: imageBase64,
      threshold,
    }),
  })

  if (!response.ok) {
    throw new Error(`NSFW detection request failed: ${response.status}`)
  }

  return (await response.json()) as NsfwDetectionResponse
}

export const runSam3ManualSegment = async (
  imageBase64: string,
  modelSize: 'base' | 'large',
  points: Sam3SegmentPoint[],
): Promise<Sam3SegmentResponse> => {
  const response = await fetch(`${getBackendBaseUrl()}/api/sam3/segment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_base64: imageBase64,
      points,
      model_size: modelSize,
    }),
  })

  if (!response.ok) {
    throw new Error(`SAM3 segment request failed: ${response.status}`)
  }

  return (await response.json()) as Sam3SegmentResponse
}
