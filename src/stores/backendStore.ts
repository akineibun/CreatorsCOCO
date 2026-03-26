import { create } from 'zustand'
import type { Sam3SegmentPoint } from '../lib/api/pythonClient'

// ── Constants ──────────────────────────────────────────────────────────────────

export const GLOBAL_BACKEND_REVIEW_PAGE_ID = '__workspace__'

export const DEFAULT_SAM3_MANUAL_SEGMENT_POINTS: Sam3SegmentPoint[] = [
  { x: 640, y: 360, label: 1 },
  { x: 1280, y: 720, label: 1 },
]

// ── Types ──────────────────────────────────────────────────────────────────────

export type BackendStatusState = {
  sam3_loaded: boolean
  nudenet_loaded: boolean
  gpu_available: boolean
  sam3_status?: string
  sam3_progress?: number
  nudenet_status?: string
  nudenet_progress?: number
}

export type BackendDownloadState = {
  sam3: string | null
  nudenet: string | null
}

export type BackendModelName = 'sam3' | 'nudenet'

export type BackendActionState = {
  sam3AutoMosaic: string | null
  nsfwDetection: string | null
  sam3ManualSegment: string | null
}

export type BackendCandidatePriority = 'low' | 'medium' | 'high'

export type BackendActionResultState = {
  sam3AutoMosaic: Array<Record<string, unknown>>
  sam3AutoMosaicSelection: boolean[]
  sam3AutoMosaicLabel: string[]
  sam3AutoMosaicNote: string[]
  sam3AutoMosaicPriority: BackendCandidatePriority[]
  sam3AutoMosaicStyle: Array<'pixelate' | 'blur' | 'noise'>
  sam3AutoMosaicIntensity: number[]
  nsfwDetections: Array<Record<string, unknown>>
  nsfwDetectionSelection: boolean[]
  nsfwDetectionLabel: string[]
  nsfwDetectionNote: string[]
  nsfwDetectionPriority: BackendCandidatePriority[]
  nsfwDetectionColor: string[]
  nsfwDetectionOpacity: number[]
  sam3ManualSegmentMaskReady: boolean
}

export type BackendReviewPageState = {
  backendActionResults: BackendActionResultState
  focusedSam3ReviewCandidateIndex: number | null
  focusedNsfwReviewCandidateIndex: number | null
}

export type BackendActionHistoryEntry = {
  id: string
  type: 'sam3-auto-mosaic' | 'nsfw-detection' | 'sam3-manual-segment'
  label: string
}

export type BackendManualPointPickingMode = 'off' | 'positive' | 'negative'

export type BackendManualPointDragState = {
  index: number
  startX: number
  startY: number
  currentX: number
  currentY: number
}

// ── Factory helpers ────────────────────────────────────────────────────────────

export const createEmptyBackendActionResults = (): BackendActionResultState => ({
  sam3AutoMosaic: [],
  sam3AutoMosaicSelection: [],
  sam3AutoMosaicLabel: [],
  sam3AutoMosaicNote: [],
  sam3AutoMosaicPriority: [],
  sam3AutoMosaicStyle: [],
  sam3AutoMosaicIntensity: [],
  nsfwDetections: [],
  nsfwDetectionSelection: [],
  nsfwDetectionLabel: [],
  nsfwDetectionNote: [],
  nsfwDetectionPriority: [],
  nsfwDetectionColor: [],
  nsfwDetectionOpacity: [],
  sam3ManualSegmentMaskReady: false,
})

export const createEmptyBackendReviewPageState = (): BackendReviewPageState => ({
  backendActionResults: createEmptyBackendActionResults(),
  focusedSam3ReviewCandidateIndex: null,
  focusedNsfwReviewCandidateIndex: null,
})

// ── Utility: parse raw mask/detection record into canvas bounds ────────────────

export type BackendLayerSuggestion = {
  x: number
  y: number
  width: number
  height: number
}

export const parseBackendLayerSuggestion = (
  value: Record<string, unknown> | null | undefined,
  fallbackIndex: number,
): BackendLayerSuggestion => {
  const centerX = 420 + fallbackIndex * 160
  const centerY = 260 + fallbackIndex * 120

  const x = typeof value?.x === 'number' ? value.x : typeof value?.center_x === 'number' ? value.center_x : centerX
  const y = typeof value?.y === 'number' ? value.y : typeof value?.center_y === 'number' ? value.center_y : centerY
  const width =
    typeof value?.width === 'number'
      ? value.width
      : typeof value?.w === 'number'
        ? value.w
        : typeof value?.box_width === 'number'
          ? value.box_width
          : 180
  const height =
    typeof value?.height === 'number'
      ? value.height
      : typeof value?.h === 'number'
        ? value.h
        : typeof value?.box_height === 'number'
          ? value.box_height
          : 120

  return { x, y, width, height }
}

// ── Batch mosaic types ─────────────────────────────────────────────────────────

export type BatchMosaicPageResult = 'pending' | 'processing' | 'done' | 'error'

export type BatchMosaicState = {
  active: boolean
  selectedPageIds: string[]
  currentIndex: number
  total: number
  results: Record<string, BatchMosaicPageResult>
  aborted: boolean
}

export const createEmptyBatchMosaicState = (): BatchMosaicState => ({
  active: false,
  selectedPageIds: [],
  currentIndex: 0,
  total: 0,
  results: {},
  aborted: false,
})

// ── Store interface ────────────────────────────────────────────────────────────

type BackendStoreState = {
  backendStatus: BackendStatusState | null
  backendStatusError: string | null
  backendSam3ModelSize: 'base' | 'large'
  backendAutoMosaicStrength: 'light' | 'medium' | 'strong'
  backendNsfwThreshold: string
  backendDownloads: BackendDownloadState
  backendActions: BackendActionState
  backendManualPointPickingMode: BackendManualPointPickingMode
  backendManualSegmentPoints: Sam3SegmentPoint[]
  selectedBackendManualSegmentPointIndex: number
  backendManualPointDragState: BackendManualPointDragState | null
  backendActionHistory: BackendActionHistoryEntry[]
  backendReviewStateByPage: Record<string, BackendReviewPageState>
  batchMosaicState: BatchMosaicState
}

type BackendStoreActions = {
  setBackendStatus: (status: BackendStatusState | null) => void
  setBackendStatusError: (error: string | null) => void
  setBackendSam3ModelSize: (size: 'base' | 'large') => void
  setBackendAutoMosaicStrength: (strength: 'light' | 'medium' | 'strong') => void
  setBackendNsfwThreshold: (threshold: string) => void
  updateBackendDownloads: (updater: (current: BackendDownloadState) => BackendDownloadState) => void
  updateBackendActions: (updater: (current: BackendActionState) => BackendActionState) => void
  setBackendManualPointPickingMode: (mode: BackendManualPointPickingMode) => void
  setBackendManualSegmentPoints: (points: Sam3SegmentPoint[] | ((current: Sam3SegmentPoint[]) => Sam3SegmentPoint[])) => void
  setSelectedBackendManualSegmentPointIndex: (index: number | ((current: number) => number)) => void
  setBackendManualPointDragState: (state: BackendManualPointDragState | null) => void
  updateBackendActionHistory: (updater: (current: BackendActionHistoryEntry[]) => BackendActionHistoryEntry[]) => void
  updateBackendReviewStateByPage: (updater: (current: Record<string, BackendReviewPageState>) => Record<string, BackendReviewPageState>) => void
  setBackendStatusFromProgress: (modelName: BackendModelName, progress: { status: string; progress: number }) => void
  updateBatchMosaicState: (updater: (current: BatchMosaicState) => BatchMosaicState) => void
}

export type BackendStore = BackendStoreState & BackendStoreActions

// ── Store implementation ───────────────────────────────────────────────────────

export const useBackendStore = create<BackendStore>((set) => ({
  backendStatus: null,
  backendStatusError: null,
  backendSam3ModelSize: 'base',
  backendAutoMosaicStrength: 'medium',
  backendNsfwThreshold: '0.70',
  backendDownloads: { sam3: null, nudenet: null },
  backendActions: { sam3AutoMosaic: null, nsfwDetection: null, sam3ManualSegment: null },
  backendManualPointPickingMode: 'off',
  backendManualSegmentPoints: DEFAULT_SAM3_MANUAL_SEGMENT_POINTS,
  selectedBackendManualSegmentPointIndex: DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length - 1,
  backendManualPointDragState: null,
  backendActionHistory: [],
  backendReviewStateByPage: {},
  batchMosaicState: createEmptyBatchMosaicState(),

  setBackendStatus: (status) => set({ backendStatus: status }),
  setBackendStatusError: (error) => set({ backendStatusError: error }),
  setBackendSam3ModelSize: (size) => set({ backendSam3ModelSize: size }),
  setBackendAutoMosaicStrength: (strength) => set({ backendAutoMosaicStrength: strength }),
  setBackendNsfwThreshold: (threshold) => set({ backendNsfwThreshold: threshold }),
  updateBackendDownloads: (updater) =>
    set((state) => ({ backendDownloads: updater(state.backendDownloads) })),
  updateBackendActions: (updater) =>
    set((state) => ({ backendActions: updater(state.backendActions) })),
  setBackendManualPointPickingMode: (mode) => set({ backendManualPointPickingMode: mode }),
  setBackendManualSegmentPoints: (points) =>
    set((state) => ({
      backendManualSegmentPoints:
        typeof points === 'function' ? points(state.backendManualSegmentPoints) : points,
    })),
  setSelectedBackendManualSegmentPointIndex: (index) =>
    set((state) => ({
      selectedBackendManualSegmentPointIndex:
        typeof index === 'function' ? index(state.selectedBackendManualSegmentPointIndex) : index,
    })),
  setBackendManualPointDragState: (dragState) => set({ backendManualPointDragState: dragState }),
  updateBackendActionHistory: (updater) =>
    set((state) => ({ backendActionHistory: updater(state.backendActionHistory) })),
  updateBackendReviewStateByPage: (updater) =>
    set((state) => ({ backendReviewStateByPage: updater(state.backendReviewStateByPage) })),
  setBackendStatusFromProgress: (modelName, progress) =>
    set((state) => ({
      backendStatus: state.backendStatus
        ? {
            ...state.backendStatus,
            sam3_loaded: modelName === 'sam3' ? progress.status === 'completed' : state.backendStatus.sam3_loaded,
            sam3_status: modelName === 'sam3' ? progress.status : state.backendStatus.sam3_status,
            sam3_progress: modelName === 'sam3' ? progress.progress : state.backendStatus.sam3_progress,
            nudenet_loaded: modelName === 'nudenet' ? progress.status === 'completed' : state.backendStatus.nudenet_loaded,
            nudenet_status: modelName === 'nudenet' ? progress.status : state.backendStatus.nudenet_status,
            nudenet_progress: modelName === 'nudenet' ? progress.progress : state.backendStatus.nudenet_progress,
          }
        : state.backendStatus,
    })),
  updateBatchMosaicState: (updater) =>
    set((state) => ({ batchMosaicState: updater(state.batchMosaicState) })),
}))
