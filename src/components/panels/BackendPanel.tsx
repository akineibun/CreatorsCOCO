import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import {
  downloadBackendModel,
  getBackendModelProgress,
  getBackendRuntimeConfig,
  getBackendStatus,
  runNsfwDetection,
  runSam3AutoMosaic,
  runSam3ManualSegment,
  subscribeToBackendModelProgress,
  updateBackendRuntimeConfig,
  detectFacesForBubble,
} from '../../lib/api/pythonClient'
import type { BackendRuntimeConfig, FaceDetectionResult } from '../../lib/api/pythonClient'
import {
  createEmptyBackendActionResults,
  createEmptyBackendReviewPageState,
  createEmptyBatchMosaicState,
  DEFAULT_SAM3_MANUAL_SEGMENT_POINTS,
  GLOBAL_BACKEND_REVIEW_PAGE_ID,
  parseBackendLayerSuggestion,
  useBackendStore,
} from '../../stores/backendStore'
import type {
  BackendActionHistoryEntry,
  BackendActionResultState,
  BackendCandidatePriority,
  BackendModelName,
  BackendReviewPageState,
} from '../../stores/backendStore'
import { selectActiveImage, useWorkspaceStore } from '../../stores/workspaceStore'

// ── localStorage keys ─────────────────────────────────────────────────────────

const BACKEND_SETTINGS_STORAGE_KEY = 'creators-coco.backend-settings'
const BACKEND_ACTION_HISTORY_STORAGE_KEY = 'creators-coco.backend-action-history'
const BACKEND_REVIEW_STATE_STORAGE_KEY = 'creators-coco.backend-review-state'

// ── Component ─────────────────────────────────────────────────────────────────

export function BackendPanel() {
  const { pages, activePageId, addBackendMosaicLayers, addBackendMosaicLayersToPage, addBackendOverlayLayers, addBubbleLayer } = useWorkspaceStore()
  const image = selectActiveImage({ pages, activePageId })

  const {
    backendStatus,
    backendStatusError,
    backendSam3ModelSize,
    backendAutoMosaicStrength,
    backendNsfwThreshold,
    backendDownloads,
    backendActions,
    backendManualPointPickingMode,
    backendManualSegmentPoints,
    selectedBackendManualSegmentPointIndex,
    backendActionHistory,
    backendReviewStateByPage,
    setBackendStatus,
    setBackendStatusError,
    setBackendSam3ModelSize,
    setBackendAutoMosaicStrength,
    setBackendNsfwThreshold,
    updateBackendDownloads,
    updateBackendActions,
    setBackendManualPointPickingMode,
    setBackendManualSegmentPoints,
    setSelectedBackendManualSegmentPointIndex,
    updateBackendActionHistory,
    updateBackendReviewStateByPage,
    setBackendStatusFromProgress,
    batchMosaicState,
    updateBatchMosaicState,
  } = useBackendStore()

  const backendPollTimeouts = useRef<Record<'sam3' | 'nudenet', ReturnType<typeof setTimeout> | null>>({
    sam3: null,
    nudenet: null,
  })
  const backendProgressSubscriptions = useRef<Record<'sam3' | 'nudenet', (() => void) | null>>({
    sam3: null,
    nudenet: null,
  })

  const batchAbortedRef = useRef(false)
  const [batchPageCheckboxes, setBatchPageCheckboxes] = useState<Record<string, boolean>>({})
  const [runtimeConfig, setRuntimeConfig] = useState<BackendRuntimeConfig | null>(null)
  const [runtimeConfigSaving, setRuntimeConfigSaving] = useState(false)

  // Auto bubble placement state
  const [autoBubbleLoading, setAutoBubbleLoading] = useState(false)
  const [autoBubbleError, setAutoBubbleError] = useState<string | null>(null)
  const [autoBubbleSuggestions, setAutoBubbleSuggestions] = useState<Array<{ x: number; y: number; width: number; height: number; label: string }>>([])
  const [autoBubbleSectionOpen, setAutoBubbleSectionOpen] = useState(false)

  const runAutoBubblePlacement = useCallback(async () => {
    if (!image?.sourceUrl) {
      setAutoBubbleError('画像が読み込まれていません')
      return
    }
    setAutoBubbleLoading(true)
    setAutoBubbleError(null)
    setAutoBubbleSuggestions([])
    try {
      // Convert image URL to base64 for API
      const response = await fetch(image.sourceUrl)
      const blob = await response.blob()
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      const result = await detectFacesForBubble(base64)
      const faces = result.faces as FaceDetectionResult[]
      // Calculate open areas avoiding faces
      const CANVAS_W = 1920
      const CANVAS_H = 1080
      const quadrants = [
        { label: '左上', x: 240, y: 180 },
        { label: '右上', x: CANVAS_W - 460, y: 180 },
        { label: '左下', x: 240, y: CANVAS_H - 300 },
        { label: '右下', x: CANVAS_W - 460, y: CANVAS_H - 300 },
        { label: '中央上', x: CANVAS_W / 2, y: 180 },
      ]
      const isNearFace = (cx: number, cy: number) =>
        faces.some((f) => {
          const fx = f.x + f.width / 2
          const fy = f.y + f.height / 2
          return Math.abs(cx - fx) < f.width / 2 + 50 && Math.abs(cy - fy) < f.height / 2 + 50
        })
      const suggestions = quadrants
        .filter((q) => !isNearFace(q.x, q.y))
        .slice(0, 3)
        .map((q) => ({ x: q.x, y: q.y, width: 220, height: 120, label: q.label }))
      if (suggestions.length === 0) {
        // fallback: pick corners away from all faces
        suggestions.push({ x: 240, y: 180, width: 220, height: 120, label: '左上（デフォルト）' })
      }
      setAutoBubbleSuggestions(suggestions)
    } catch {
      setAutoBubbleError('バックエンドに接続できませんでした。フォールバック配置を使用します。')
      setAutoBubbleSuggestions([
        { x: 240, y: 180, width: 220, height: 120, label: '左上' },
        { x: 1460, y: 180, width: 220, height: 120, label: '右上' },
      ])
    } finally {
      setAutoBubbleLoading(false)
    }
  }, [image])

  const runBatchMosaic = useCallback(async () => {
    const selectedPageIds = Object.entries(batchPageCheckboxes)
      .filter(([, checked]) => checked)
      .map(([id]) => id)
    if (selectedPageIds.length === 0) return

    batchAbortedRef.current = false
    updateBatchMosaicState(() => ({
      active: true,
      selectedPageIds,
      currentIndex: 0,
      total: selectedPageIds.length,
      results: Object.fromEntries(selectedPageIds.map((id) => [id, 'pending' as const])),
      aborted: false,
    }))

    for (let i = 0; i < selectedPageIds.length; i++) {
      if (batchAbortedRef.current) break
      const pageId = selectedPageIds[i]
      const page = pages.find((p) => p.id === pageId)
      if (!page?.sourceUrl) {
        updateBatchMosaicState((s) => ({ ...s, currentIndex: i + 1, results: { ...s.results, [pageId]: 'error' } }))
        continue
      }

      updateBatchMosaicState((s) => ({ ...s, currentIndex: i, results: { ...s.results, [pageId]: 'processing' } }))
      try {
        const mosaicStrengthMap = { light: 8, medium: 16, strong: 24 } as const
        const intensity = mosaicStrengthMap[backendAutoMosaicStrength]
        const detectRes = await runNsfwDetection(page.sourceUrl, Number.parseFloat(backendNsfwThreshold) || 0.7)
        if (batchAbortedRef.current) break
        const mosaicLayers = detectRes.detections.map((d, index) => {
          const bounds = parseBackendLayerSuggestion(d, index)
          return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, intensity, style: 'pixelate' as const, name: `Batch mosaic ${index + 1}` }
        })
        if (mosaicLayers.length > 0) {
          addBackendMosaicLayersToPage(pageId, mosaicLayers)
        }
        updateBatchMosaicState((s) => ({ ...s, currentIndex: i + 1, results: { ...s.results, [pageId]: 'done' } }))
      } catch {
        updateBatchMosaicState((s) => ({ ...s, currentIndex: i + 1, results: { ...s.results, [pageId]: 'error' } }))
      }
    }

    updateBatchMosaicState((s) => ({ ...s, active: false, aborted: batchAbortedRef.current }))
  }, [batchPageCheckboxes, pages, backendAutoMosaicStrength, backendNsfwThreshold, addBackendMosaicLayersToPage, updateBatchMosaicState])

  const backendReviewPageId = activePageId ?? GLOBAL_BACKEND_REVIEW_PAGE_ID
  const backendReviewPageState = backendReviewStateByPage[backendReviewPageId] ?? createEmptyBackendReviewPageState()
  const backendActionResults = backendReviewPageState.backendActionResults
  const focusedSam3ReviewCandidateIndex = backendReviewPageState.focusedSam3ReviewCandidateIndex
  const focusedNsfwReviewCandidateIndex = backendReviewPageState.focusedNsfwReviewCandidateIndex

  const updateActiveBackendReviewState = useCallback(
    (updater: (state: BackendReviewPageState) => BackendReviewPageState) => {
      updateBackendReviewStateByPage((current) => ({
        ...current,
        [backendReviewPageId]: updater(current[backendReviewPageId] ?? createEmptyBackendReviewPageState()),
      }))
    },
    [backendReviewPageId, updateBackendReviewStateByPage],
  )

  const updateActiveBackendActionResults = useCallback(
    (updater: (state: BackendActionResultState) => BackendActionResultState) => {
      updateActiveBackendReviewState((current) => ({
        ...current,
        backendActionResults: updater(current.backendActionResults),
      }))
    },
    [updateActiveBackendReviewState],
  )

  const setActiveFocusedSam3ReviewCandidateIndex = useCallback(
    (index: number | null) => {
      updateActiveBackendReviewState((current) => ({ ...current, focusedSam3ReviewCandidateIndex: index }))
    },
    [updateActiveBackendReviewState],
  )

  const setActiveFocusedNsfwReviewCandidateIndex = useCallback(
    (index: number | null) => {
      updateActiveBackendReviewState((current) => ({ ...current, focusedNsfwReviewCandidateIndex: index }))
    },
    [updateActiveBackendReviewState],
  )

  const getSam3CandidateRawLabel = (index: number) => backendActionResults.sam3AutoMosaicLabel[index]
  const getSam3CandidateCardLabel = (index: number) =>
    getSam3CandidateRawLabel(index)?.trim() || `SAM3 candidate ${index + 1}`
  const getSam3CandidateInputLabel = (index: number) => getSam3CandidateRawLabel(index) ?? `SAM3 candidate ${index + 1}`
  const getSam3CandidateLayerName = (index: number) =>
    getSam3CandidateRawLabel(index)?.trim() || `SAM3 mask ${index + 1}`
  const getSam3CandidateRawNote = (index: number) => backendActionResults.sam3AutoMosaicNote[index]
  const getSam3CandidateInputNote = (index: number) => getSam3CandidateRawNote(index) ?? ''
  const getSam3CandidateCardNote = (index: number) => getSam3CandidateRawNote(index)?.trim() || 'No note'
  const getSam3CandidatePriority = (index: number) => backendActionResults.sam3AutoMosaicPriority[index] ?? 'medium'

  const getNsfwCandidateRawLabel = (index: number) => backendActionResults.nsfwDetectionLabel[index]
  const getNsfwCandidateCardLabel = (index: number) =>
    getNsfwCandidateRawLabel(index)?.trim() || `NSFW candidate ${index + 1}`
  const getNsfwCandidateInputLabel = (index: number) => getNsfwCandidateRawLabel(index) ?? `NSFW candidate ${index + 1}`
  const getNsfwCandidateLayerName = (index: number) =>
    getNsfwCandidateRawLabel(index)?.trim() || `NSFW region ${index + 1}`
  const getNsfwCandidateRawNote = (index: number) => backendActionResults.nsfwDetectionNote[index]
  const getNsfwCandidateInputNote = (index: number) => getNsfwCandidateRawNote(index) ?? ''
  const getNsfwCandidateCardNote = (index: number) => getNsfwCandidateRawNote(index)?.trim() || 'No note'
  const getNsfwCandidatePriority = (index: number) => backendActionResults.nsfwDetectionPriority[index] ?? 'medium'

  const selectedBackendManualSegmentPoint =
    backendManualSegmentPoints[selectedBackendManualSegmentPointIndex] ??
    backendManualSegmentPoints[backendManualSegmentPoints.length - 1] ??
    null

  const getBackendModelLabel = (modelName: BackendModelName) => (modelName === 'sam3' ? 'SAM3' : 'NudeNet')

  const isBackendModelReady = (modelName: BackendModelName) =>
    modelName === 'sam3' ? Boolean(backendStatus?.sam3_loaded) : Boolean(backendStatus?.nudenet_loaded)

  const isBackendModelDownloading = (modelName: BackendModelName) => {
    const currentLabel = backendDownloads[modelName]
    return currentLabel?.startsWith('Queued') || currentLabel?.startsWith('Downloading')
  }

  const getBackendModelStatusDetail = (modelName: BackendModelName) => {
    const label = getBackendModelLabel(modelName)
    const status =
      modelName === 'sam3'
        ? backendStatus?.sam3_status ?? (backendStatus?.sam3_loaded ? 'completed' : 'idle')
        : backendStatus?.nudenet_status ?? (backendStatus?.nudenet_loaded ? 'completed' : 'idle')
    const progress =
      modelName === 'sam3'
        ? backendStatus?.sam3_progress ?? (backendStatus?.sam3_loaded ? 100 : 0)
        : backendStatus?.nudenet_progress ?? (backendStatus?.nudenet_loaded ? 100 : 0)
    return `${label} status: ${status} ${progress}%`
  }

  const getBackendModelButtonLabel = (modelName: BackendModelName) => {
    const label = getBackendModelLabel(modelName)
    if (isBackendModelReady(modelName)) return `${label} model ready`
    if (isBackendModelDownloading(modelName)) return `Downloading ${label} model...`
    return `Download ${label} model`
  }

  const hasActiveImage = Boolean(image)

  const pushBackendActionHistory = (type: BackendActionHistoryEntry['type'], label: string) => {
    updateBackendActionHistory((current) =>
      [{ id: crypto.randomUUID(), type, label }, ...current].slice(0, 5),
    )
  }

  const clearBackendModelProgressWatch = (modelName: BackendModelName) => {
    if (backendPollTimeouts.current[modelName]) {
      clearTimeout(backendPollTimeouts.current[modelName] as ReturnType<typeof setTimeout>)
      backendPollTimeouts.current[modelName] = null
    }
    if (backendProgressSubscriptions.current[modelName]) {
      backendProgressSubscriptions.current[modelName]?.()
      backendProgressSubscriptions.current[modelName] = null
    }
  }

  const applyBackendModelProgressUpdate = (
    modelName: BackendModelName,
    progress: { status: string; progress: number },
  ) => {
    const modelLabel = getBackendModelLabel(modelName)
    const progressLabel =
      progress.status === 'completed'
        ? `Completed ${modelLabel} ${progress.progress}%`
        : `Downloading ${modelLabel} ${progress.progress}%`
    updateBackendDownloads((current) => ({ ...current, [modelName]: progressLabel }))
    setBackendStatusFromProgress(modelName, progress)
    if (progress.status === 'completed') {
      clearBackendModelProgressWatch(modelName)
    }
  }

  const scheduleBackendModelProgressPoll = (modelName: BackendModelName) => {
    const modelLabel = getBackendModelLabel(modelName)
    const pollProgress = async () => {
      const progress = await getBackendModelProgress(modelName)
      applyBackendModelProgressUpdate(modelName, progress)
      if (progress.status === 'completed') return
      backendPollTimeouts.current[modelName] = setTimeout(() => { void pollProgress() }, 1000)
    }
    backendPollTimeouts.current[modelName] = setTimeout(() => { void pollProgress() }, 1000)
    updateBackendDownloads((current) => ({
      ...current,
      [modelName]: current[modelName] ?? `Queued ${modelLabel} 0%`,
    }))
  }

  const loadBackendStatus = async () => {
    try {
      const status = await getBackendStatus()
      setBackendStatus(status)
      setBackendStatusError(null)
    } catch {
      setBackendStatusError('Backend status unavailable')
    }
  }

  const startBackendModelDownload = async (modelName: BackendModelName) => {
    try {
      clearBackendModelProgressWatch(modelName)
      const result = await downloadBackendModel(modelName)
      const modelLabel = modelName === 'sam3' ? 'SAM3' : 'NudeNet'
      const statusLabel = result.status === 'queued' ? 'Queued' : 'Downloading'
      updateBackendDownloads((current) => ({
        ...current,
        [modelName]: `${statusLabel} ${modelLabel} ${result.progress}%`,
      }))
      setBackendStatus(
        backendStatus
          ? {
              ...backendStatus,
              sam3_status: modelName === 'sam3' ? result.status : backendStatus.sam3_status,
              sam3_progress: modelName === 'sam3' ? result.progress : backendStatus.sam3_progress,
              nudenet_status: modelName === 'nudenet' ? result.status : backendStatus.nudenet_status,
              nudenet_progress: modelName === 'nudenet' ? result.progress : backendStatus.nudenet_progress,
            }
          : backendStatus,
      )
      const unsubscribe = subscribeToBackendModelProgress(modelName, {
        onProgress: (progress) => { applyBackendModelProgressUpdate(modelName, progress) },
        onError: () => {
          if (backendProgressSubscriptions.current[modelName]) {
            backendProgressSubscriptions.current[modelName] = null
            scheduleBackendModelProgressPoll(modelName)
          }
        },
      })
      if (unsubscribe) {
        backendProgressSubscriptions.current[modelName] = unsubscribe
        return
      }
      scheduleBackendModelProgressPoll(modelName)
    } catch {
      updateBackendDownloads((current) => ({
        ...current,
        [modelName]: `Failed ${modelName === 'sam3' ? 'SAM3' : 'NudeNet'} download`,
      }))
    }
  }

  const runBackendSam3AutoMosaic = async (regionBbox?: { x: number; y: number; width: number; height: number } | null) => {
    if (!image) return
    updateBackendActions((current) => ({ ...current, sam3AutoMosaic: regionBbox ? 'Running SAM3 (specified region)...' : 'Running SAM3 auto mosaic...' }))
    try {
      const response = await runSam3AutoMosaic(image.sourceUrl ?? '', backendSam3ModelSize, backendAutoMosaicStrength, regionBbox)
      const resultLabel = `SAM3 auto mosaic ready with ${response.masks.length} mask${response.masks.length === 1 ? '' : 's'}`
      updateActiveBackendActionResults((current) => ({
        ...current,
        sam3AutoMosaic: response.masks,
        sam3AutoMosaicSelection: response.masks.map(() => true),
        sam3AutoMosaicLabel: response.masks.map((_, index) => `SAM3 mask ${index + 1}`),
        sam3AutoMosaicNote: response.masks.map(() => ''),
        sam3AutoMosaicPriority: response.masks.map(() => 'medium'),
        sam3AutoMosaicStyle: response.masks.map(() => 'pixelate'),
        sam3AutoMosaicIntensity: response.masks.map(() =>
          backendAutoMosaicStrength === 'light' ? 8 : backendAutoMosaicStrength === 'strong' ? 24 : 16,
        ),
      }))
      setActiveFocusedSam3ReviewCandidateIndex(response.masks.length > 0 ? 0 : null)
      updateBackendActions((current) => ({ ...current, sam3AutoMosaic: resultLabel }))
      pushBackendActionHistory('sam3-auto-mosaic', resultLabel)
    } catch {
      updateBackendActions((current) => ({ ...current, sam3AutoMosaic: 'SAM3 auto mosaic failed' }))
    }
  }

  const runBackendNsfwDetection = async () => {
    if (!image) return
    updateBackendActions((current) => ({ ...current, nsfwDetection: 'Running NSFW detection...' }))
    try {
      const response = await runNsfwDetection(image.sourceUrl ?? '', Number.parseFloat(backendNsfwThreshold) || 0.7)
      const resultLabel = `NSFW detection found ${response.detections.length} region${response.detections.length === 1 ? '' : 's'}`
      updateActiveBackendActionResults((current) => ({
        ...current,
        nsfwDetections: response.detections,
        nsfwDetectionSelection: response.detections.map(() => true),
        nsfwDetectionLabel: response.detections.map((_, index) => `NSFW region ${index + 1}`),
        nsfwDetectionNote: response.detections.map(() => ''),
        nsfwDetectionPriority: response.detections.map(() => 'medium'),
        nsfwDetectionColor: response.detections.map(() => '#ff4d6d'),
        nsfwDetectionOpacity: response.detections.map(() => 0.4),
      }))
      setActiveFocusedNsfwReviewCandidateIndex(response.detections.length > 0 ? 0 : null)
      updateBackendActions((current) => ({ ...current, nsfwDetection: resultLabel }))
      pushBackendActionHistory('nsfw-detection', resultLabel)
    } catch {
      updateBackendActions((current) => ({ ...current, nsfwDetection: 'NSFW detection failed' }))
    }
  }

  const runBackendSam3ManualSegment = async () => {
    if (!image) return
    updateBackendActions((current) => ({ ...current, sam3ManualSegment: 'Running SAM3 manual segment...' }))
    try {
      await runSam3ManualSegment(image.sourceUrl ?? '', backendSam3ModelSize, backendManualSegmentPoints)
      const resultLabel = `SAM3 manual segment ready with ${backendManualSegmentPoints.length} point${backendManualSegmentPoints.length === 1 ? '' : 's'}`
      updateActiveBackendActionResults((current) => ({ ...current, sam3ManualSegmentMaskReady: true }))
      updateBackendActions((current) => ({ ...current, sam3ManualSegment: resultLabel }))
      pushBackendActionHistory('sam3-manual-segment', resultLabel)
    } catch {
      updateBackendActions((current) => ({ ...current, sam3ManualSegment: 'SAM3 manual segment failed' }))
    }
  }

  const applyBackendSam3AutoMosaicToCanvas = () => {
    const suggestions = backendActionResults.sam3AutoMosaic
      .map((mask, index) => ({ mask, index }))
      .filter(({ index }) => backendActionResults.sam3AutoMosaicSelection[index] !== false)
      .map(({ mask, index }) => ({
        ...parseBackendLayerSuggestion(mask, index),
        intensity: backendActionResults.sam3AutoMosaicIntensity[index] ?? 16,
        style: backendActionResults.sam3AutoMosaicStyle[index] ?? 'pixelate',
        name: getSam3CandidateLayerName(index),
      }))
    if (suggestions.length === 0) return
    addBackendMosaicLayers(suggestions)
    updateBackendActions((current) => ({
      ...current,
      sam3AutoMosaic: `${current.sam3AutoMosaic ?? 'SAM3 auto mosaic ready'} applied to ${suggestions.length} mosaic layer${suggestions.length === 1 ? '' : 's'}`,
    }))
  }

  const applyBackendNsfwDetectionsToCanvas = () => {
    const mosaicStrengthMap = { light: 8, medium: 16, strong: 24 } as const
    const intensity = mosaicStrengthMap[backendAutoMosaicStrength]
    const suggestions = backendActionResults.nsfwDetections
      .map((detection, index) => ({ detection, index }))
      .filter(({ index }) => backendActionResults.nsfwDetectionSelection[index] !== false)
      .map(({ detection, index }) => ({
        ...parseBackendLayerSuggestion(detection, index),
        intensity,
        style: 'pixelate' as const,
        name: getNsfwCandidateLayerName(index),
      }))
    if (suggestions.length === 0) return
    addBackendMosaicLayers(suggestions)
    updateBackendActions((current) => ({
      ...current,
      nsfwDetection: `${current.nsfwDetection ?? 'NSFW detection ready'} → ${suggestions.length} モザイクレイヤーを適用`,
    }))
  }

  const applyBackendSam3ManualSegmentToCanvas = () => {
    const positivePoints = backendManualSegmentPoints.filter((point) => point.label === 1)
    const fallbackX = positivePoints.reduce((sum, point) => sum + point.x, 0) / Math.max(1, positivePoints.length)
    const fallbackY = positivePoints.reduce((sum, point) => sum + point.y, 0) / Math.max(1, positivePoints.length)
    addBackendMosaicLayers([{
      x: Number.isFinite(fallbackX) ? fallbackX : 960,
      y: Number.isFinite(fallbackY) ? fallbackY : 540,
      width: 240,
      height: 160,
      intensity: backendSam3ModelSize === 'large' ? 24 : 16,
      style: 'blur',
      name: 'SAM3 manual segment',
    }])
    updateBackendActions((current) => ({
      ...current,
      sam3ManualSegment: `${current.sam3ManualSegment ?? 'SAM3 manual segment ready'} applied to canvas`,
    }))
  }

  const toggleBackendSam3AutoMosaicSelection = (index: number) => {
    setActiveFocusedSam3ReviewCandidateIndex(index)
    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicSelection: current.sam3AutoMosaicSelection.map((selected, currentIndex) =>
        currentIndex === index ? !selected : selected,
      ),
    }))
  }

  const setAllBackendSam3AutoMosaicSelection = (selected: boolean) => {
    setActiveFocusedSam3ReviewCandidateIndex(
      selected && backendActionResults.sam3AutoMosaicSelection.length > 0 ? 0 : null,
    )
    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicSelection: current.sam3AutoMosaicSelection.map(() => selected),
    }))
  }

  const cycleFocusedBackendSam3AutoMosaicStyle = () => {
    if (focusedSam3ReviewCandidateIndex === null) return
    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicStyle: current.sam3AutoMosaicStyle.map((style, index) =>
        index === focusedSam3ReviewCandidateIndex
          ? style === 'pixelate' ? 'blur' : style === 'blur' ? 'noise' : 'pixelate'
          : style,
      ),
    }))
  }

  const increaseFocusedBackendSam3AutoMosaicIntensity = () => {
    if (focusedSam3ReviewCandidateIndex === null) return
    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicIntensity: current.sam3AutoMosaicIntensity.map((intensity, index) =>
        index === focusedSam3ReviewCandidateIndex ? Math.min(64, intensity + 8) : intensity,
      ),
    }))
  }

  const renameFocusedBackendSam3Candidate = (label: string) => {
    if (focusedSam3ReviewCandidateIndex === null) return
    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicLabel: current.sam3AutoMosaic.map((_, index) =>
        index === focusedSam3ReviewCandidateIndex
          ? label
          : (current.sam3AutoMosaicLabel[index] ?? `SAM3 mask ${index + 1}`),
      ),
    }))
  }

  const updateFocusedBackendSam3CandidateNote = (note: string) => {
    if (focusedSam3ReviewCandidateIndex === null) return
    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicNote: current.sam3AutoMosaic.map((_, index) =>
        index === focusedSam3ReviewCandidateIndex ? note : (current.sam3AutoMosaicNote[index] ?? ''),
      ),
    }))
  }

  const applyFocusedBackendSam3SettingsToSelected = () => {
    if (focusedSam3ReviewCandidateIndex === null) return
    updateActiveBackendActionResults((current) => {
      const focusedStyle = current.sam3AutoMosaicStyle[focusedSam3ReviewCandidateIndex] ?? 'pixelate'
      const focusedIntensity = current.sam3AutoMosaicIntensity[focusedSam3ReviewCandidateIndex] ?? 16
      const focusedNote = current.sam3AutoMosaicNote[focusedSam3ReviewCandidateIndex] ?? ''
      return {
        ...current,
        sam3AutoMosaicStyle: current.sam3AutoMosaicStyle.map((style, index) =>
          current.sam3AutoMosaicSelection[index] !== false ? focusedStyle : style,
        ),
        sam3AutoMosaicIntensity: current.sam3AutoMosaicIntensity.map((intensity, index) =>
          current.sam3AutoMosaicSelection[index] !== false ? focusedIntensity : intensity,
        ),
        sam3AutoMosaicNote: current.sam3AutoMosaic.map((_, index) =>
          current.sam3AutoMosaicSelection[index] !== false ? focusedNote : (current.sam3AutoMosaicNote[index] ?? ''),
        ),
      }
    })
  }

  const cycleFocusedBackendSam3Priority = () => {
    if (focusedSam3ReviewCandidateIndex === null) return
    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicPriority: current.sam3AutoMosaic.map((_, index) => {
        const currentPriority = current.sam3AutoMosaicPriority[index] ?? 'medium'
        if (index !== focusedSam3ReviewCandidateIndex) return currentPriority
        return currentPriority === 'low' ? 'medium' : currentPriority === 'medium' ? 'high' : 'low'
      }),
    }))
  }

  const selectBackendSam3CandidatesByPriority = (priority: BackendCandidatePriority) => {
    setActiveFocusedSam3ReviewCandidateIndex(
      backendActionResults.sam3AutoMosaic.findIndex((_, index) => getSam3CandidatePriority(index) === priority) >= 0
        ? backendActionResults.sam3AutoMosaic.findIndex((_, index) => getSam3CandidatePriority(index) === priority)
        : null,
    )
    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicSelection: current.sam3AutoMosaic.map(
        (_, index) => (current.sam3AutoMosaicPriority[index] ?? 'medium') === priority,
      ),
    }))
  }

  const toggleBackendNsfwDetectionSelection = (index: number) => {
    setActiveFocusedNsfwReviewCandidateIndex(index)
    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionSelection: current.nsfwDetectionSelection.map((selected, currentIndex) =>
        currentIndex === index ? !selected : selected,
      ),
    }))
  }

  const setAllBackendNsfwDetectionSelection = (selected: boolean) => {
    setActiveFocusedNsfwReviewCandidateIndex(
      selected && backendActionResults.nsfwDetectionSelection.length > 0 ? 0 : null,
    )
    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionSelection: current.nsfwDetectionSelection.map(() => selected),
    }))
  }

  const cycleFocusedBackendNsfwDetectionColor = () => {
    if (focusedNsfwReviewCandidateIndex === null) return
    const palette = ['#ff4d6d', '#ff9f1c', '#44ccff']
    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionColor: current.nsfwDetectionColor.map((color, index) =>
        index === focusedNsfwReviewCandidateIndex
          ? palette[(palette.indexOf(color) + 1 + palette.length) % palette.length] ?? palette[0]!
          : color,
      ),
    }))
  }

  const increaseFocusedBackendNsfwDetectionOpacity = () => {
    if (focusedNsfwReviewCandidateIndex === null) return
    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionOpacity: current.nsfwDetectionOpacity.map((opacity, index) =>
        index === focusedNsfwReviewCandidateIndex ? Math.min(1, Math.round((opacity + 0.1) * 10) / 10) : opacity,
      ),
    }))
  }

  const renameFocusedBackendNsfwCandidate = (label: string) => {
    if (focusedNsfwReviewCandidateIndex === null) return
    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionLabel: current.nsfwDetections.map((_, index) =>
        index === focusedNsfwReviewCandidateIndex
          ? label
          : (current.nsfwDetectionLabel[index] ?? `NSFW region ${index + 1}`),
      ),
    }))
  }

  const updateFocusedBackendNsfwCandidateNote = (note: string) => {
    if (focusedNsfwReviewCandidateIndex === null) return
    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionNote: current.nsfwDetections.map((_, index) =>
        index === focusedNsfwReviewCandidateIndex ? note : (current.nsfwDetectionNote[index] ?? ''),
      ),
    }))
  }

  const applyFocusedBackendNsfwSettingsToSelected = () => {
    if (focusedNsfwReviewCandidateIndex === null) return
    updateActiveBackendActionResults((current) => {
      const focusedColor = current.nsfwDetectionColor[focusedNsfwReviewCandidateIndex] ?? '#ff4d6d'
      const focusedOpacity = current.nsfwDetectionOpacity[focusedNsfwReviewCandidateIndex] ?? 0.4
      const focusedNote = current.nsfwDetectionNote[focusedNsfwReviewCandidateIndex] ?? ''
      return {
        ...current,
        nsfwDetectionColor: current.nsfwDetectionColor.map((color, index) =>
          current.nsfwDetectionSelection[index] !== false ? focusedColor : color,
        ),
        nsfwDetectionOpacity: current.nsfwDetectionOpacity.map((opacity, index) =>
          current.nsfwDetectionSelection[index] !== false ? focusedOpacity : opacity,
        ),
        nsfwDetectionNote: current.nsfwDetections.map((_, index) =>
          current.nsfwDetectionSelection[index] !== false ? focusedNote : (current.nsfwDetectionNote[index] ?? ''),
        ),
      }
    })
  }

  const cycleFocusedBackendNsfwPriority = () => {
    if (focusedNsfwReviewCandidateIndex === null) return
    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionPriority: current.nsfwDetections.map((_, index) => {
        const currentPriority = current.nsfwDetectionPriority[index] ?? 'medium'
        if (index !== focusedNsfwReviewCandidateIndex) return currentPriority
        return currentPriority === 'low' ? 'medium' : currentPriority === 'medium' ? 'high' : 'low'
      }),
    }))
  }

  const selectBackendNsfwCandidatesByPriority = (priority: BackendCandidatePriority) => {
    setActiveFocusedNsfwReviewCandidateIndex(
      backendActionResults.nsfwDetections.findIndex((_, index) => getNsfwCandidatePriority(index) === priority) >= 0
        ? backendActionResults.nsfwDetections.findIndex((_, index) => getNsfwCandidatePriority(index) === priority)
        : null,
    )
    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionSelection: current.nsfwDetections.map(
        (_, index) => (current.nsfwDetectionPriority[index] ?? 'medium') === priority,
      ),
    }))
  }

  const addBackendManualSegmentPoint = () => {
    setBackendManualSegmentPoints((current) => [...current, { x: 960, y: 540, label: 1 }])
    setSelectedBackendManualSegmentPointIndex(backendManualSegmentPoints.length)
  }

  const addNegativeBackendManualSegmentPoint = () => {
    setBackendManualSegmentPoints((current) => [...current, { x: 960, y: 540, label: 0 }])
    setSelectedBackendManualSegmentPointIndex(backendManualSegmentPoints.length)
  }

  const resetBackendManualSegmentPoints = () => {
    setBackendManualSegmentPoints(DEFAULT_SAM3_MANUAL_SEGMENT_POINTS)
    setSelectedBackendManualSegmentPointIndex(DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length - 1)
  }

  const toggleLastBackendManualSegmentPointLabel = () => {
    setBackendManualSegmentPoints((current) => {
      if (current.length === 0) return current
      const nextPoints = [...current]
      const lastPoint = nextPoints[nextPoints.length - 1]
      if (!lastPoint) return current
      nextPoints[nextPoints.length - 1] = { ...lastPoint, label: lastPoint.label === 1 ? 0 : 1 }
      return nextPoints
    })
  }

  const moveLastBackendManualSegmentPoint = () => {
    setBackendManualSegmentPoints((current) => {
      if (current.length === 0) return current
      const nextPoints = [...current]
      const lastPoint = nextPoints[nextPoints.length - 1]
      if (!lastPoint) return current
      nextPoints[nextPoints.length - 1] = { ...lastPoint, x: Math.min(1920, lastPoint.x + 64), y: Math.min(1080, lastPoint.y + 32) }
      return nextPoints
    })
  }

  const removeLastBackendManualSegmentPoint = () => {
    setBackendManualSegmentPoints((current) => {
      if (current.length <= DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length) return current
      return current.slice(0, -1)
    })
  }

  const toggleSelectedBackendManualSegmentPointLabel = () => {
    setBackendManualSegmentPoints((current) =>
      current.map((point, index) =>
        index === selectedBackendManualSegmentPointIndex
          ? { ...point, label: point.label === 1 ? 0 : 1 }
          : point,
      ),
    )
  }

  const moveSelectedBackendManualSegmentPoint = () => {
    setBackendManualSegmentPoints((current) =>
      current.map((point, index) =>
        index === selectedBackendManualSegmentPointIndex
          ? { ...point, x: Math.min(1920, point.x + 64), y: Math.min(1080, point.y + 32) }
          : point,
      ),
    )
  }

  const removeSelectedBackendManualSegmentPoint = () => {
    if (backendManualSegmentPoints.length <= DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length) return
    setBackendManualSegmentPoints((current) =>
      current.filter((_, index) => index !== selectedBackendManualSegmentPointIndex),
    )
    setSelectedBackendManualSegmentPointIndex((current) =>
      Math.max(0, Math.min(current - 1, backendManualSegmentPoints.length - 2)),
    )
  }

  const rerunBackendAction = async (entry: BackendActionHistoryEntry) => {
    if (!image) return
    if (entry.type === 'sam3-auto-mosaic') { await runBackendSam3AutoMosaic(); return }
    if (entry.type === 'nsfw-detection') { await runBackendNsfwDetection(); return }
    await runBackendSam3ManualSegment()
  }

  const rerunLastBackendAction = async () => {
    const lastAction = backendActionHistory[0]
    if (!lastAction || !image) return
    await rerunBackendAction(lastAction)
  }

  const clearBackendActionHistory = () => { updateBackendActionHistory(() => []) }

  // ── localStorage persistence ──────────────────────────────────────────────

  useEffect(() => {
    const stored = window.localStorage.getItem(BACKEND_SETTINGS_STORAGE_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as {
        sam3ModelSize?: 'base' | 'large'
        autoMosaicStrength?: 'light' | 'medium' | 'strong'
        nsfwThreshold?: string
        manualSegmentPoints?: Array<{ x: number; y: number; label: 0 | 1 }>
      }
      if (parsed.sam3ModelSize === 'large' || parsed.sam3ModelSize === 'base') setBackendSam3ModelSize(parsed.sam3ModelSize)
      if (parsed.autoMosaicStrength === 'light' || parsed.autoMosaicStrength === 'medium' || parsed.autoMosaicStrength === 'strong') setBackendAutoMosaicStrength(parsed.autoMosaicStrength)
      if (typeof parsed.nsfwThreshold === 'string') setBackendNsfwThreshold(parsed.nsfwThreshold)
      if (Array.isArray(parsed.manualSegmentPoints)) {
        const valid = parsed.manualSegmentPoints.filter(
          (p): p is { x: number; y: number; label: 0 | 1 } =>
            Boolean(p) && typeof p.x === 'number' && typeof p.y === 'number' && (p.label === 0 || p.label === 1),
        )
        if (valid.length >= DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length) setBackendManualSegmentPoints(valid)
      }
    } catch { window.localStorage.removeItem(BACKEND_SETTINGS_STORAGE_KEY) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    window.localStorage.setItem(BACKEND_SETTINGS_STORAGE_KEY, JSON.stringify({
      sam3ModelSize: backendSam3ModelSize,
      autoMosaicStrength: backendAutoMosaicStrength,
      nsfwThreshold: backendNsfwThreshold,
      manualSegmentPoints: backendManualSegmentPoints,
    }))
  }, [backendAutoMosaicStrength, backendManualSegmentPoints, backendNsfwThreshold, backendSam3ModelSize])

  useEffect(() => {
    const stored = window.localStorage.getItem(BACKEND_ACTION_HISTORY_STORAGE_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as BackendActionHistoryEntry[]
      if (Array.isArray(parsed)) {
        updateBackendActionHistory(() =>
          parsed.filter(
            (e): e is BackendActionHistoryEntry =>
              Boolean(e) && typeof e.id === 'string' && typeof e.label === 'string' &&
              (e.type === 'sam3-auto-mosaic' || e.type === 'nsfw-detection' || e.type === 'sam3-manual-segment'),
          ).slice(0, 5),
        )
      }
    } catch { window.localStorage.removeItem(BACKEND_ACTION_HISTORY_STORAGE_KEY) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    window.localStorage.setItem(BACKEND_ACTION_HISTORY_STORAGE_KEY, JSON.stringify(backendActionHistory))
  }, [backendActionHistory])

  useEffect(() => {
    const stored = window.localStorage.getItem(BACKEND_REVIEW_STATE_STORAGE_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as {
        pages?: Record<string, { backendActionResults?: Partial<BackendActionResultState>; focusedSam3ReviewCandidateIndex?: number | null; focusedNsfwReviewCandidateIndex?: number | null }>
        backendActionResults?: Partial<BackendActionResultState>
        focusedSam3ReviewCandidateIndex?: number | null
        focusedNsfwReviewCandidateIndex?: number | null
      }
      const normalizeResults = (raw: Partial<BackendActionResultState> | undefined): BackendActionResultState => {
        const f = createEmptyBackendActionResults()
        return {
          sam3AutoMosaic: Array.isArray(raw?.sam3AutoMosaic) ? raw.sam3AutoMosaic : f.sam3AutoMosaic,
          sam3AutoMosaicSelection: Array.isArray(raw?.sam3AutoMosaicSelection) ? raw.sam3AutoMosaicSelection : f.sam3AutoMosaicSelection,
          sam3AutoMosaicLabel: Array.isArray(raw?.sam3AutoMosaicLabel) ? raw.sam3AutoMosaicLabel.map((l) => typeof l === 'string' ? l : '') : f.sam3AutoMosaicLabel,
          sam3AutoMosaicNote: Array.isArray(raw?.sam3AutoMosaicNote) ? raw.sam3AutoMosaicNote.map((n) => typeof n === 'string' ? n : '') : f.sam3AutoMosaicNote,
          sam3AutoMosaicPriority: Array.isArray(raw?.sam3AutoMosaicPriority) ? raw.sam3AutoMosaicPriority.map((p) => p === 'low' || p === 'high' ? p : 'medium') : f.sam3AutoMosaicPriority,
          sam3AutoMosaicStyle: Array.isArray(raw?.sam3AutoMosaicStyle) ? raw.sam3AutoMosaicStyle : f.sam3AutoMosaicStyle,
          sam3AutoMosaicIntensity: Array.isArray(raw?.sam3AutoMosaicIntensity) ? raw.sam3AutoMosaicIntensity : f.sam3AutoMosaicIntensity,
          nsfwDetections: Array.isArray(raw?.nsfwDetections) ? raw.nsfwDetections : f.nsfwDetections,
          nsfwDetectionSelection: Array.isArray(raw?.nsfwDetectionSelection) ? raw.nsfwDetectionSelection : f.nsfwDetectionSelection,
          nsfwDetectionLabel: Array.isArray(raw?.nsfwDetectionLabel) ? raw.nsfwDetectionLabel.map((l) => typeof l === 'string' ? l : '') : f.nsfwDetectionLabel,
          nsfwDetectionNote: Array.isArray(raw?.nsfwDetectionNote) ? raw.nsfwDetectionNote.map((n) => typeof n === 'string' ? n : '') : f.nsfwDetectionNote,
          nsfwDetectionPriority: Array.isArray(raw?.nsfwDetectionPriority) ? raw.nsfwDetectionPriority.map((p) => p === 'low' || p === 'high' ? p : 'medium') : f.nsfwDetectionPriority,
          nsfwDetectionColor: Array.isArray(raw?.nsfwDetectionColor) ? raw.nsfwDetectionColor : f.nsfwDetectionColor,
          nsfwDetectionOpacity: Array.isArray(raw?.nsfwDetectionOpacity) ? raw.nsfwDetectionOpacity : f.nsfwDetectionOpacity,
          sam3ManualSegmentMaskReady: typeof raw?.sam3ManualSegmentMaskReady === 'boolean' ? raw.sam3ManualSegmentMaskReady : f.sam3ManualSegmentMaskReady,
        }
      }
      const normalizePage = (raw: { backendActionResults?: Partial<BackendActionResultState>; focusedSam3ReviewCandidateIndex?: number | null; focusedNsfwReviewCandidateIndex?: number | null }): BackendReviewPageState => ({
        backendActionResults: normalizeResults(raw.backendActionResults),
        focusedSam3ReviewCandidateIndex: typeof raw.focusedSam3ReviewCandidateIndex === 'number' || raw.focusedSam3ReviewCandidateIndex === null ? raw.focusedSam3ReviewCandidateIndex : null,
        focusedNsfwReviewCandidateIndex: typeof raw.focusedNsfwReviewCandidateIndex === 'number' || raw.focusedNsfwReviewCandidateIndex === null ? raw.focusedNsfwReviewCandidateIndex : null,
      })
      if (parsed.pages && typeof parsed.pages === 'object') {
        updateBackendReviewStateByPage(() => Object.fromEntries(Object.entries(parsed.pages!).map(([id, s]) => [id, normalizePage(s)])))
      } else {
        updateBackendReviewStateByPage(() => ({ [GLOBAL_BACKEND_REVIEW_PAGE_ID]: normalizePage(parsed) }))
      }
    } catch { window.localStorage.removeItem(BACKEND_REVIEW_STATE_STORAGE_KEY) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    window.localStorage.setItem(BACKEND_REVIEW_STATE_STORAGE_KEY, JSON.stringify({ pages: backendReviewStateByPage }))
  }, [backendReviewStateByPage])

  useEffect(() => { void loadBackendStatus() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for freehand lasso region selection from canvas
  useEffect(() => {
    const handler = (e: Event) => {
      const bbox = (e as CustomEvent<{ x: number; y: number; width: number; height: number }>).detail
      if (bbox && bbox.width > 4 && bbox.height > 4) {
        void runBackendSam3AutoMosaic(bbox)
      }
    }
    window.addEventListener('creatorscoco:backend-region-selected', handler)
    return () => window.removeEventListener('creatorscoco:backend-region-selected', handler)
  }, [image, backendSam3ModelSize, backendAutoMosaicStrength]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!backendStatus) return
    getBackendRuntimeConfig()
      .then(setRuntimeConfig)
      .catch(() => {/* ignore if not available */})
  }, [backendStatus])

  const saveRuntimeConfig = useCallback(async (
    sam3Pref: 'auto' | 'native' | 'heuristic',
    nudenetPref: 'auto' | 'native' | 'heuristic',
  ) => {
    setRuntimeConfigSaving(true)
    try {
      const updated = await updateBackendRuntimeConfig(sam3Pref, nudenetPref)
      setRuntimeConfig(updated)
    } catch {/* ignore */} finally {
      setRuntimeConfigSaving(false)
    }
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section aria-label="Backend status" className="sidebar-card">
      <div className="panel-title">Backend</div>

      {/* Status bar */}
      {backendStatusError ? (
        <div className="flex items-center gap-2 mb-3">
          <span className="error-text text-sm flex-1">{backendStatusError}</span>
          <Button size="sm" variant="outline" onClick={() => void loadBackendStatus()}>再試行</Button>
        </div>
      ) : backendStatus ? (
        <div className="flex items-center gap-2 mb-3 text-xs text-[rgba(243,239,230,0.66)]">
          <span className={backendStatus.sam3_loaded ? 'text-[#74c4ff]' : 'text-[rgba(243,239,230,0.44)]'}>SAM3 {backendStatus.sam3_loaded ? '●' : '○'}</span>
          <span className={backendStatus.nudenet_loaded ? 'text-[#74c4ff]' : 'text-[rgba(243,239,230,0.44)]'}>NudeNet {backendStatus.nudenet_loaded ? '●' : '○'}</span>
          <span className={backendStatus.gpu_available ? 'text-[#74c4ff]' : 'text-[rgba(243,239,230,0.44)]'}>GPU {backendStatus.gpu_available ? '●' : '○'}</span>
        </div>
      ) : (
        <div className="page-card empty mb-3"><strong>バックエンド接続中...</strong></div>
      )}

      {backendStatus && (
        <Tabs defaultValue="models">
          <TabsList className="w-full mb-3">
            <TabsTrigger value="models">モデル</TabsTrigger>
            <TabsTrigger value="sam3">SAM3</TabsTrigger>
            <TabsTrigger value="nsfw">NSFW</TabsTrigger>
            <TabsTrigger value="manual">手動</TabsTrigger>
            <TabsTrigger value="batch">バッチ</TabsTrigger>
          </TabsList>

          {/* ── Models tab ─────────────────────────────────────── */}
          <TabsContent value="models">
            <div className="page-list">
              <div className="page-card">
                <strong>{backendStatus.sam3_loaded ? 'SAM3 Ready' : 'SAM3 Loading'}</strong>
                <span>{getBackendModelStatusDetail('sam3')}</span>
              </div>
              <div className="page-card">
                <strong>{backendStatus.nudenet_loaded ? 'NudeNet Ready' : 'NudeNet Loading'}</strong>
                <span>{getBackendModelStatusDetail('nudenet')}</span>
              </div>
              <label className="text-layer-field">
                <span>SAM3 モデルサイズ</span>
                <select aria-label="SAM3 model size" value={backendSam3ModelSize} onChange={(e) => setBackendSam3ModelSize(e.target.value === 'large' ? 'large' : 'base')}>
                  <option value="base">base</option>
                  <option value="large">large</option>
                </select>
              </label>
              <label className="text-layer-field">
                <span>自動モザイク強度</span>
                <select aria-label="Auto mosaic strength" value={backendAutoMosaicStrength} onChange={(e) => { const v = e.target.value; setBackendAutoMosaicStrength(v === 'light' || v === 'strong' ? v : 'medium') }}>
                  <option value="light">light</option>
                  <option value="medium">medium</option>
                  <option value="strong">strong</option>
                </select>
              </label>
              <label className="text-layer-field">
                <span>NSFW 閾値</span>
                <input aria-label="NSFW threshold" type="number" min="0.1" max="0.99" step="0.01" value={backendNsfwThreshold} onChange={(e) => setBackendNsfwThreshold(e.target.value)} />
              </label>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => void startBackendModelDownload('sam3')} disabled={isBackendModelReady('sam3') || isBackendModelDownloading('sam3')}>
                  {getBackendModelButtonLabel('sam3')}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => void startBackendModelDownload('nudenet')} disabled={isBackendModelReady('nudenet') || isBackendModelDownloading('nudenet')}>
                  {getBackendModelButtonLabel('nudenet')}
                </Button>
              </div>
              {backendDownloads.sam3 && <div className="page-card"><strong>{backendDownloads.sam3}</strong></div>}
              {backendDownloads.nudenet && <div className="page-card"><strong>{backendDownloads.nudenet}</strong></div>}
              {runtimeConfig && (
                <div className="mt-2 pt-2 border-t border-[rgba(243,239,230,0.08)] grid gap-2">
                  <span className="text-xs text-[rgba(243,239,230,0.5)]">バックエンド設定</span>
                  <label className="text-layer-field">
                    <span>SAM3</span>
                    <select
                      aria-label="SAM3 backend preference"
                      value={runtimeConfig.sam3_backend_preference}
                      disabled={runtimeConfigSaving}
                      onChange={(e) => {
                        const v = e.target.value as 'auto' | 'native' | 'heuristic'
                        void saveRuntimeConfig(v, runtimeConfig.nudenet_backend_preference)
                      }}
                    >
                      <option value="auto">auto</option>
                      <option value="native">native (SAM3)</option>
                      <option value="heuristic">heuristic (高速)</option>
                    </select>
                  </label>
                  <label className="text-layer-field">
                    <span>NudeNet</span>
                    <select
                      aria-label="NudeNet backend preference"
                      value={runtimeConfig.nudenet_backend_preference}
                      disabled={runtimeConfigSaving}
                      onChange={(e) => {
                        const v = e.target.value as 'auto' | 'native' | 'heuristic'
                        void saveRuntimeConfig(runtimeConfig.sam3_backend_preference, v)
                      }}
                    >
                      <option value="auto">auto</option>
                      <option value="native">native (NudeNet)</option>
                      <option value="heuristic">heuristic (高速)</option>
                    </select>
                  </label>
                  <div className="page-card text-xs">
                    <span>{`SAM3: ${runtimeConfig.sam3_effective_backend} — ${runtimeConfig.sam3_recommendation}`}</span>
                    <span>{`NudeNet: ${runtimeConfig.nudenet_effective_backend} — ${runtimeConfig.nudenet_recommendation}`}</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── SAM3 tab ───────────────────────────────────────── */}
          <TabsContent value="sam3">
            <div className="page-list">
              <Button className="w-full" variant="default" size="sm" onClick={() => void runBackendSam3AutoMosaic()} disabled={!hasActiveImage}>
                SAM3 自動モザイク実行
              </Button>
              {backendActions.sam3AutoMosaic && <div className="page-card"><strong>{backendActions.sam3AutoMosaic}</strong></div>}
              {backendActionResults.sam3AutoMosaic.length > 0 && (
                <>
                  <div className="page-card" style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:4}}>
                    <strong>{`候補 ${backendActionResults.sam3AutoMosaic.length} 件 / ${backendActionResults.sam3AutoMosaicSelection.filter(Boolean).length} 件選択中`}</strong>
                    <Button size="sm" variant="destructive" onClick={() => updateActiveBackendActionResults(() => createEmptyBackendActionResults())}>
                      結果をクリア
                    </Button>
                  </div>
                  {focusedSam3ReviewCandidateIndex !== null && (
                    <div className="page-card">
                      <strong>{`注目: ${getSam3CandidateCardLabel(focusedSam3ReviewCandidateIndex)}`}</strong>
                      <span>{`優先度: ${getSam3CandidatePriority(focusedSam3ReviewCandidateIndex)}`}</span>
                      <span>{`スタイル: ${backendActionResults.sam3AutoMosaicStyle[focusedSam3ReviewCandidateIndex] ?? 'pixelate'}`}</span>
                      <span>{`強度: ${backendActionResults.sam3AutoMosaicIntensity[focusedSam3ReviewCandidateIndex] ?? 16}`}</span>
                    </div>
                  )}
                  {focusedSam3ReviewCandidateIndex !== null && (
                    <>
                      <label className="text-layer-field">
                        <span>ラベル</span>
                        <input aria-label="SAM3 candidate label" type="text" value={getSam3CandidateInputLabel(focusedSam3ReviewCandidateIndex)} onChange={(e) => renameFocusedBackendSam3Candidate(e.target.value)} />
                      </label>
                      <label className="text-layer-field">
                        <span>メモ</span>
                        <input aria-label="SAM3 candidate note" type="text" value={getSam3CandidateInputNote(focusedSam3ReviewCandidateIndex)} onChange={(e) => updateFocusedBackendSam3CandidateNote(e.target.value)} />
                      </label>
                    </>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="active" className="flex-1" onClick={() => setAllBackendSam3AutoMosaicSelection(true)}>☑ 全選択</Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => setAllBackendSam3AutoMosaicSelection(false)}>☐ 全解除</Button>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" className="flex-1" onClick={cycleFocusedBackendSam3AutoMosaicStyle} disabled={focusedSam3ReviewCandidateIndex === null}>スタイル</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={cycleFocusedBackendSam3Priority} disabled={focusedSam3ReviewCandidateIndex === null}>優先度</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => selectBackendSam3CandidatesByPriority('high')}>高優先のみ</Button>
                  </div>
                  {backendActionResults.sam3AutoMosaic.map((mask, index) => {
                    const bounds = parseBackendLayerSuggestion(mask, index)
                    const selected = backendActionResults.sam3AutoMosaicSelection[index] !== false
                    return (
                      <button key={`sam3-candidate-${index}`} type="button" className="page-card page-button" onClick={() => toggleBackendSam3AutoMosaicSelection(index)} aria-pressed={selected} aria-label={`Toggle SAM3 candidate ${index + 1}`}>
                        <strong>{`${getSam3CandidateCardLabel(index)} ${selected ? '✓' : '—'}`}</strong>
                        <span>{`優先度: ${getSam3CandidatePriority(index)} | ${backendActionResults.sam3AutoMosaicStyle[index] ?? 'pixelate'} x${backendActionResults.sam3AutoMosaicIntensity[index] ?? 16}`}</span>
                        <span>{`${Math.round(bounds.width)} × ${Math.round(bounds.height)} @ ${Math.round(bounds.x)}, ${Math.round(bounds.y)}`}</span>
                      </button>
                    )
                  })}
                  <Button className="w-full" variant="default" size="sm" onClick={applyBackendSam3AutoMosaicToCanvas} disabled={!hasActiveImage || backendActionResults.sam3AutoMosaicSelection.every((s) => !s)}>
                    キャンバスに適用
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          {/* ── NSFW tab ───────────────────────────────────────── */}
          <TabsContent value="nsfw">
            <div className="page-list">
              <Button className="w-full" variant="default" size="sm" onClick={() => void runBackendNsfwDetection()} disabled={!hasActiveImage}>
                NSFW 検出実行
              </Button>
              {backendActions.nsfwDetection && <div className="page-card"><strong>{backendActions.nsfwDetection}</strong></div>}
              {backendActionResults.nsfwDetections.length > 0 && (
                <>
                  <div className="page-card" style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:4}}>
                    <strong>{`検出 ${backendActionResults.nsfwDetections.length} 件 / ${backendActionResults.nsfwDetectionSelection.filter(Boolean).length} 件選択中`}</strong>
                    <Button size="sm" variant="destructive" onClick={() => updateActiveBackendActionResults(() => createEmptyBackendActionResults())}>
                      結果をクリア
                    </Button>
                  </div>
                  {focusedNsfwReviewCandidateIndex !== null && (
                    <div className="page-card">
                      <strong>{`注目: ${getNsfwCandidateCardLabel(focusedNsfwReviewCandidateIndex)}`}</strong>
                      <span>{`優先度: ${getNsfwCandidatePriority(focusedNsfwReviewCandidateIndex)}`}</span>
                    </div>
                  )}
                  {focusedNsfwReviewCandidateIndex !== null && (
                    <>
                      <label className="text-layer-field">
                        <span>ラベル</span>
                        <input aria-label="NSFW candidate label" type="text" value={getNsfwCandidateInputLabel(focusedNsfwReviewCandidateIndex)} onChange={(e) => renameFocusedBackendNsfwCandidate(e.target.value)} />
                      </label>
                      <label className="text-layer-field">
                        <span>メモ</span>
                        <input aria-label="NSFW candidate note" type="text" value={getNsfwCandidateInputNote(focusedNsfwReviewCandidateIndex)} onChange={(e) => updateFocusedBackendNsfwCandidateNote(e.target.value)} />
                      </label>
                    </>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="active" className="flex-1" onClick={() => setAllBackendNsfwDetectionSelection(true)}>☑ 全選択</Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => setAllBackendNsfwDetectionSelection(false)}>☐ 全解除</Button>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" className="flex-1" onClick={cycleFocusedBackendNsfwPriority} disabled={focusedNsfwReviewCandidateIndex === null}>優先度</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => selectBackendNsfwCandidatesByPriority('high')}>高優先のみ</Button>
                  </div>
                  {backendActionResults.nsfwDetections.map((detection, index) => {
                    const bounds = parseBackendLayerSuggestion(detection, index)
                    const selected = backendActionResults.nsfwDetectionSelection[index] !== false
                    return (
                      <button key={`nsfw-candidate-${index}`} type="button" className="page-card page-button" onClick={() => toggleBackendNsfwDetectionSelection(index)} aria-pressed={selected} aria-label={`Toggle NSFW candidate ${index + 1}`}>
                        <strong>{`${getNsfwCandidateCardLabel(index)} ${selected ? '✓' : '—'}`}</strong>
                        <span>{`優先度: ${getNsfwCandidatePriority(index)} | 不透明度: ${(backendActionResults.nsfwDetectionOpacity[index] ?? 0.4).toFixed(1)}`}</span>
                        <span>{`${Math.round(bounds.width)} × ${Math.round(bounds.height)} @ ${Math.round(bounds.x)}, ${Math.round(bounds.y)}`}</span>
                      </button>
                    )
                  })}
                  <Button className="w-full" variant="default" size="sm" onClick={applyBackendNsfwDetectionsToCanvas} disabled={!hasActiveImage || backendActionResults.nsfwDetectionSelection.every((s) => !s)}>
                    モザイクとしてキャンバスに適用
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          {/* ── Manual tab ─────────────────────────────────────── */}
          <TabsContent value="manual">
            <div className="page-list">
              <div className="page-card text-xs">
                <strong>{`ポイント数: ${backendManualSegmentPoints.length}`}</strong>
                <span>{`選択中: ${selectedBackendManualSegmentPointIndex + 1} / ${backendManualSegmentPoints.length}`}</span>
                <span>{`選択ラベル: ${selectedBackendManualSegmentPoint?.label === 0 ? 'ネガティブ' : 'ポジティブ'}`}</span>
                <span>{`ピッキング: ${backendManualPointPickingMode === 'off' ? 'オフ' : backendManualPointPickingMode === 'positive' ? 'ポジティブ' : 'ネガティブ'}`}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant={backendManualPointPickingMode === 'positive' ? 'active' : 'outline'} className="flex-1"
                  onClick={() => setBackendManualPointPickingMode(backendManualPointPickingMode === 'positive' ? 'off' : 'positive')} disabled={!hasActiveImage}>
                  + ポジ
                </Button>
                <Button size="sm" variant={backendManualPointPickingMode === 'negative' ? 'active' : 'outline'} className="flex-1"
                  onClick={() => setBackendManualPointPickingMode(backendManualPointPickingMode === 'negative' ? 'off' : 'negative')} disabled={!hasActiveImage}>
                  − ネガ
                </Button>
              </div>
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="outline" className="flex-1" onClick={addBackendManualSegmentPoint} disabled={!hasActiveImage}>追加</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={addNegativeBackendManualSegmentPoint} disabled={!hasActiveImage}>ネガ追加</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={removeLastBackendManualSegmentPoint} disabled={!hasActiveImage || backendManualSegmentPoints.length <= DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length}>削除</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={resetBackendManualSegmentPoints} disabled={!hasActiveImage}>リセット</Button>
              </div>
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="outline" className="flex-1" onClick={toggleSelectedBackendManualSegmentPointLabel} disabled={!hasActiveImage || selectedBackendManualSegmentPoint === null}>ラベル切替</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedBackendManualSegmentPoint} disabled={!hasActiveImage || selectedBackendManualSegmentPoint === null}>移動</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={removeSelectedBackendManualSegmentPoint} disabled={!hasActiveImage || selectedBackendManualSegmentPoint === null || backendManualSegmentPoints.length <= DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length}>選択削除</Button>
              </div>
              <Button className="w-full" variant="default" size="sm" onClick={() => void runBackendSam3ManualSegment()} disabled={!hasActiveImage}>
                SAM3 手動セグメント実行
              </Button>
              {backendActions.sam3ManualSegment && <div className="page-card"><strong>{backendActions.sam3ManualSegment}</strong></div>}
              {backendActionResults.sam3ManualSegmentMaskReady && (
                <>
                  <div className="page-card">
                    <strong>手動セグメント結果</strong>
                    <span>{`${backendManualSegmentPoints.filter((p) => p.label === 1).length} ポジ / ${backendManualSegmentPoints.filter((p) => p.label === 0).length} ネガ`}</span>
                  </div>
                  <Button className="w-full" variant="default" size="sm" onClick={applyBackendSam3ManualSegmentToCanvas} disabled={!hasActiveImage}>
                    キャンバスに適用
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          {/* ── Batch tab ────────────────────────────────────────── */}
          <TabsContent value="batch">
            <div className="page-list">
              <div className="page-card text-xs">
                <strong>一括NudeNet→モザイク</strong>
                <span>選択ページに自動検出＋モザイクを一括適用します。</span>
              </div>
              <div className="flex gap-2 mb-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setBatchPageCheckboxes(Object.fromEntries(pages.map((p) => [p.id, true])))} disabled={batchMosaicState.active}>全選択</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setBatchPageCheckboxes({})} disabled={batchMosaicState.active}>全解除</Button>
              </div>
              <div className="grid gap-1 max-h-48 overflow-y-auto">
                {pages.map((page, index) => {
                  const result = batchMosaicState.results[page.id]
                  const statusIcon = result === 'done' ? '✓' : result === 'error' ? '✗' : result === 'processing' ? '…' : ''
                  return (
                    <label key={page.id} className="flex items-center gap-2 text-xs px-2 py-1 rounded cursor-pointer hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={batchPageCheckboxes[page.id] ?? false}
                        onChange={(e) => setBatchPageCheckboxes((prev) => ({ ...prev, [page.id]: e.target.checked }))}
                        disabled={batchMosaicState.active}
                      />
                      <span className="flex-1 truncate">{`${index + 1}. ${page.name}`}</span>
                      {statusIcon && <span>{statusIcon}</span>}
                    </label>
                  )
                })}
              </div>
              {batchMosaicState.active && (
                <div className="page-card text-xs">
                  <strong>{`処理中: ${batchMosaicState.currentIndex} / ${batchMosaicState.total}ページ`}</strong>
                </div>
              )}
              {!batchMosaicState.active && batchMosaicState.total > 0 && (
                <div className="page-card text-xs">
                  <strong>{batchMosaicState.aborted ? 'キャンセル済み' : `完了: ${Object.values(batchMosaicState.results).filter((r) => r === 'done').length} / ${batchMosaicState.total}ページ`}</strong>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1"
                  onClick={() => void runBatchMosaic()}
                  disabled={batchMosaicState.active || Object.values(batchPageCheckboxes).every((v) => !v)}
                >
                  一括実行
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { batchAbortedRef.current = true }}
                  disabled={!batchMosaicState.active}
                >
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateBatchMosaicState(() => createEmptyBatchMosaicState())}
                  disabled={batchMosaicState.active}
                >
                  リセット
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Action history */}
      {backendActionHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[rgba(243,239,230,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <span className="panel-title" style={{ marginBottom: 0 }}>履歴</span>
            <Button size="sm" variant="ghost" onClick={clearBackendActionHistory}>クリア</Button>
          </div>
          <div className="page-list">
            {backendActionHistory.map((entry) => (
              <div key={entry.id} className="page-card">
                <span className="text-xs">{entry.label}</span>
                <button type="button" className="page-button text-xs" onClick={() => void rerunBackendAction(entry)} disabled={!hasActiveImage}>再実行</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto bubble placement section */}
      <div className="sidebar-card" style={{marginTop: '8px'}}>
        <button
          type="button"
          className="panel-title"
          style={{width:'100%',textAlign:'left',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}
          onClick={() => setAutoBubbleSectionOpen((v) => !v)}
        >
          <span>フキダシ自動配置</span>
          <span style={{fontSize:'0.75em',opacity:0.6}}>{autoBubbleSectionOpen ? '▲' : '▼'}</span>
        </button>
        {autoBubbleSectionOpen && (
          <div style={{padding:'8px 0'}}>
            <Button
              onClick={() => void runAutoBubblePlacement()}
              disabled={autoBubbleLoading || !image}
              size="sm"
              style={{width:'100%',marginBottom:'8px'}}
            >
              {autoBubbleLoading ? '検出中...' : '顔検出でフキダシ配置'}
            </Button>
            {autoBubbleError && (
              <div style={{fontSize:'0.75em',color:'#ffaa66',marginBottom:'8px'}}>{autoBubbleError}</div>
            )}
            {autoBubbleSuggestions.length > 0 && (
              <div>
                <div style={{fontSize:'0.75em',opacity:0.7,marginBottom:'4px'}}>配置候補:</div>
                {autoBubbleSuggestions.map((s, i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'4px'}}>
                    <span style={{fontSize:'0.8em'}}>{s.label}</span>
                    <Button
                      size="sm"
                      onClick={() => addBubbleLayer({ x: s.x, y: s.y, width: s.width, height: s.height })}
                    >
                      適用
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
