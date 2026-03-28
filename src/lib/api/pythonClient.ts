export type BackendStatus = {
  sam3_loaded: boolean
  nudenet_loaded: boolean
  gpu_available: boolean
  sam3_status?: string
  sam3_progress?: number
  nudenet_status?: string
  nudenet_progress?: number
  packaged_runtime?: boolean
  python_version?: string
  sam3_backend?: string
  nudenet_backend?: string
  sam3_native_available?: boolean
  nudenet_native_available?: boolean
  sam3_checkpoint_path?: string | null
  sam3_config_path?: string | null
  sam3_checkpoint_ready?: boolean
  sam3_native_reason?: string | null
  nudenet_native_reason?: string | null
  sam3_backend_preference?: 'auto' | 'native' | 'heuristic'
  nudenet_backend_preference?: 'auto' | 'native' | 'heuristic'
  sam3_recommendation?: string
  nudenet_recommendation?: string
  sam3_error_message?: string | null
  nudenet_error_message?: string | null
}

export type BackendRuntimeConfig = {
  sam3_backend_preference: 'auto' | 'native' | 'heuristic'
  nudenet_backend_preference: 'auto' | 'native' | 'heuristic'
  sam3_native_available: boolean
  nudenet_native_available: boolean
  sam3_checkpoint_path?: string | null
  sam3_config_path?: string | null
  sam3_checkpoint_ready?: boolean
  sam3_native_reason?: string | null
  nudenet_native_reason?: string | null
  sam3_effective_backend: string
  nudenet_effective_backend: string
  sam3_recommendation: string
  nudenet_recommendation: string
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

export const getBackendRuntimeConfig = async (): Promise<BackendRuntimeConfig> => {
  const response = await fetch(`${getBackendBaseUrl()}/api/model/runtime-config`)
  if (!response.ok) {
    throw new Error(`Backend runtime config request failed: ${response.status}`)
  }

  return (await response.json()) as BackendRuntimeConfig
}

export const updateBackendRuntimeConfig = async (
  sam3BackendPreference: 'auto' | 'native' | 'heuristic',
  nudenetBackendPreference: 'auto' | 'native' | 'heuristic',
  sam3CheckpointPath?: string | null,
  sam3ConfigPath?: string | null,
): Promise<BackendRuntimeConfig> => {
  const response = await fetch(`${getBackendBaseUrl()}/api/model/runtime-config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sam3_backend_preference: sam3BackendPreference,
      nudenet_backend_preference: nudenetBackendPreference,
      sam3_checkpoint_path: sam3CheckpointPath ?? null,
      sam3_config_path: sam3ConfigPath ?? null,
    }),
  })

  if (!response.ok) {
    throw new Error(`Backend runtime config update failed: ${response.status}`)
  }

  return (await response.json()) as BackendRuntimeConfig
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
  regionBbox?: { x: number; y: number; width: number; height: number } | null,
): Promise<Sam3AutoMosaicResponse> => {
  const detections = regionBbox ? [regionBbox] : []
  const response = await fetch(`${getBackendBaseUrl()}/api/sam3/auto-mosaic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_base64: imageBase64,
      detections,
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

export type FaceDetectionResult = {
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

export type DetectFacesResponse = {
  faces: FaceDetectionResult[]
  status: string
}

export const detectFacesForBubble = async (
  imageBase64: string,
): Promise<DetectFacesResponse> => {
  const response = await fetch(`${getBackendBaseUrl()}/sam3/detect-faces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_base64: imageBase64 }),
  })

  if (!response.ok) {
    throw new Error(`Face detection request failed: ${response.status}`)
  }

  return (await response.json()) as DetectFacesResponse
}
