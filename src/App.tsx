import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, MouseEvent as ReactMouseEvent } from 'react'
import JSZip from 'jszip'
import {
  downloadBackendModel,
  getBackendRuntimeConfig,
  getBackendModelProgress,
  getBackendStatus,
  runNsfwDetection,
  runSam3AutoMosaic,
  runSam3ManualSegment,
  type Sam3SegmentPoint,
  subscribeToBackendModelProgress,
  updateBackendRuntimeConfig,
} from './lib/api/pythonClient'
import {
  createPdfExportName,
  createPngExportName,
  createZipEntryName,
  createZipExportName,
} from './lib/export/fileNames'
import { getBubbleClipPath, getBubbleShapeLabel, getBubbleShapeVariantNumber } from './lib/bubbleShapes'
import { EXPORT_METADATA_POLICY_LABEL } from './lib/export/metadata'
import { exportPageAsPdf } from './lib/export/pdfExporter'
import { exportPageAsPng } from './lib/export/pngExporter'
import { exportPagesAsZip } from './lib/export/zipExporter'
import type { ResizeHandle } from './stores/workspaceStore'
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  PERFORMANCE_METRICS_STORAGE_KEY,
  PROJECT_SCHEMA_MIGRATIONS,
  PROJECT_STORAGE_KEY,
  outputPresets,
  selectActiveImage,
  toolLabels,
  useWorkspaceStore,
} from './stores/workspaceStore'

const EXPORT_HISTORY_STORAGE_KEY = 'creators-coco.export-history'
const BACKEND_SETTINGS_STORAGE_KEY = 'creators-coco.backend-settings'
const BACKEND_ACTION_HISTORY_STORAGE_KEY = 'creators-coco.backend-action-history'
const BACKEND_REVIEW_STATE_STORAGE_KEY = 'creators-coco.backend-review-state'
const GLOBAL_BACKEND_REVIEW_PAGE_ID = '__workspace__'
const PERFORMANCE_THRESHOLD_SETTINGS_STORAGE_KEY = 'creators-coco.performance-thresholds'
const TRIAL_CHECKPOINTS_STORAGE_KEY = 'creators-coco.trial-checkpoints'
const PORTABLE_SMOKE_CHECKLIST_STORAGE_KEY = 'creators-coco.portable-smoke-checklist'
const IMPORTED_HANDOFF_HISTORY_STORAGE_KEY = 'creators-coco.imported-handoff-history'
const IMPORTED_PORTABLE_SMOKE_REPORT_STORAGE_KEY = 'creators-coco.imported-portable-smoke-report'

const getTemplatePreviewLines = (template: {
  textLayers: Array<{ text: string }>
  messageWindowLayers: Array<{ speaker: string }>
  bubbleLayers: Array<{ text: string }>
  mosaicLayers: Array<{ style: string }>
  overlayLayers: Array<{ fillMode: string }>
  watermarkLayers: Array<{ assetName: string | null; text: string }>
}) =>
  [
    template.textLayers[0]?.text ? `Text ${template.textLayers[0].text}` : null,
    template.messageWindowLayers[0]?.speaker ? `Window ${template.messageWindowLayers[0].speaker}` : null,
    template.bubbleLayers[0]?.text ? `Bubble ${template.bubbleLayers[0].text}` : null,
    template.mosaicLayers[0]?.style ? `Mosaic ${template.mosaicLayers[0].style}` : null,
    template.overlayLayers[0]?.fillMode ? `Overlay ${template.overlayLayers[0].fillMode}` : null,
    template.watermarkLayers[0] ? `Watermark ${template.watermarkLayers[0].assetName ?? template.watermarkLayers[0].text}` : null,
  ].filter(Boolean) as string[]

const getMessagePresetPreviewLines = (preset: {
  speaker: string
  body: string
  frameStyle: string
  assetName: string | null
}) =>
  [
    preset.speaker ? `Speaker ${preset.speaker}` : null,
    preset.body ? `Body ${preset.body}` : null,
    `Frame ${preset.frameStyle}`,
    preset.assetName ? `Asset ${preset.assetName}` : null,
  ].filter(Boolean) as string[]

const getTextPresetPreviewLines = (preset: {
  text: string
  fontSize: number
  fillMode: string
  isVertical: boolean
  shadowEnabled: boolean
}) =>
  [
    preset.text ? `Text ${preset.text}` : null,
    `Size ${preset.fontSize}px`,
    `Fill ${preset.fillMode}`,
    `Direction ${preset.isVertical ? 'vertical' : 'horizontal'}`,
    `Shadow ${preset.shadowEnabled ? 'on' : 'off'}`,
  ].filter(Boolean) as string[]

const getWatermarkPresetPreviewLines = (preset: {
  text: string
  assetName: string | null
  opacity: number
  angle: number
  density: number
  tiled: boolean
}) =>
  [
    preset.assetName ? `Asset ${preset.assetName}` : preset.text ? `Watermark ${preset.text}` : null,
    `Opacity ${preset.opacity.toFixed(1)}`,
    `Angle ${preset.angle} deg`,
    `Density ${preset.density}x`,
    `Layout ${preset.tiled ? 'tiled' : 'single'}`,
  ].filter(Boolean) as string[]

const getBubblePresetPreviewLines = (preset: {
  text: string
  stylePreset: string
  bubbleShape: string
  tailDirection: string
}) =>
  [
    preset.text ? `Bubble ${preset.text}` : null,
    `Style ${preset.stylePreset}`,
    `Shape ${preset.bubbleShape}`,
    `Tail ${preset.tailDirection}`,
  ].filter(Boolean) as string[]

const getOverlayPresetPreviewLines = (preset: {
  areaPreset: string
  fillMode: string
  gradientDirection: string
  opacity: number
}) =>
  [
    `Area ${preset.areaPreset}`,
    `Fill ${preset.fillMode}`,
    `Direction ${preset.gradientDirection}`,
    `Opacity ${preset.opacity.toFixed(1)}`,
  ].filter(Boolean) as string[]

const getMosaicPresetPreviewLines = (preset: {
  style: string
  intensity: number
  width: number
  height: number
}) =>
  [
    `Style ${preset.style}`,
    `Intensity ${preset.intensity}`,
    `Size ${preset.width} x ${preset.height}`,
  ].filter(Boolean) as string[]

type BackendLayerSuggestion = {
  x: number
  y: number
  width: number
  height: number
}

const parseBackendLayerSuggestion = (
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

  return {
    x,
    y,
    width,
    height,
  }
}

const getBackendMaskPreviewUrl = (value: Record<string, unknown> | null | undefined) => {
  const maskBase64 = typeof value?.mask_base64 === 'string' ? value.mask_base64 : null
  return maskBase64 ? `data:image/png;base64,${maskBase64}` : null
}

const getPageBackendImageSource = (page: { sourceUrl?: string | null; src?: string | null }) => page.src ?? page.sourceUrl ?? ''

type ExportHistoryEntry = {
  format: 'PNG' | 'PDF' | 'ZIP'
  label: string
}

type PerformanceMetricLevel = 'ok' | 'warn'

type PerformanceMetricEntry = {
  id: string
  action: string
  durationMs: number
  thresholdMs: number
  level: PerformanceMetricLevel
  recordedAt: string
}

type BackendStatusState = {
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
  sam3_backend_preference?: BackendPreference
  nudenet_backend_preference?: BackendPreference
  sam3_recommendation?: string
  nudenet_recommendation?: string
  sam3_error_message?: string | null
  nudenet_error_message?: string | null
}

type BackendDownloadState = {
  sam3: string | null
  nudenet: string | null
}

type BackendModelName = 'sam3' | 'nudenet'

type BackendActionState = {
  sam3AutoMosaic: string | null
  nsfwDetection: string | null
  sam3ManualSegment: string | null
  sam3Batch: string | null
}

type BackendCandidatePriority = 'low' | 'medium' | 'high'

type Sam3ReviewBaseline = {
  masks: Array<Record<string, unknown>>
  labels: string[]
  notes: string[]
  priority: BackendCandidatePriority[]
  style: Array<'pixelate' | 'blur' | 'noise'>
  intensity: number[]
}

type NsfwReviewBaseline = {
  detections: Array<Record<string, unknown>>
  labels: string[]
  notes: string[]
  priority: BackendCandidatePriority[]
  color: string[]
  opacity: number[]
}

type BackendActionResultState = {
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
  sam3ManualSegmentMask: Record<string, unknown> | null
  sam3AutoMosaicBaseline: Sam3ReviewBaseline | null
  nsfwDetectionBaseline: NsfwReviewBaseline | null
}

type BackendReviewPageState = {
  backendActionResults: BackendActionResultState
  focusedSam3ReviewCandidateIndex: number | null
  focusedNsfwReviewCandidateIndex: number | null
}

type BackendActionHistoryEntry = {
  id: string
  type: 'sam3-auto-mosaic' | 'nsfw-detection' | 'sam3-manual-segment'
  label: string
}

type BackendPreference = 'auto' | 'native' | 'heuristic'

type PerformanceThresholds = {
  backendStatus: number
  loadSampleImage: number
  saveProject: number
  pngExport: number
  pdfExport: number
  zipExport: number
  sam3AutoMosaic: number
  nsfwDetection: number
  sam3ManualSegment: number
}

type TrialReadinessCheckpoints = {
  backendConnectedAt: string | null
  sampleLoadedAt: string | null
  projectSavedAt: string | null
  projectRestoredAt: string | null
  exportCompletedAt: string | null
  sam3ReviewedAt: string | null
  nsfwReviewedAt: string | null
}

type PortableSmokeStepStatus = 'pending' | 'passed' | 'failed'

type PortableSmokeChecklistItem = {
  id: string
  label: string
  status: PortableSmokeStepStatus
  note: string
}

type ImportedHandoffHistoryEntry = {
  id: string
  filename: string
  importedAt: string
  source: 'json' | 'zip'
  includedHandoffData: boolean
}

type ImportedPortableSmokeReport = {
  filename: string
  importedAt: string
  generatedAt: string | null
  portableExePath: string | null
  smokeRoot: string | null
  startupTimeoutSeconds: number | null
  statusUrl: string | null
  statusOk: boolean
  statusError: string | null
  backendStatus: BackendStatusState | null
}

const DEFAULT_PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  backendStatus: 1500,
  loadSampleImage: 200,
  saveProject: 250,
  pngExport: 2500,
  pdfExport: 3500,
  zipExport: 4500,
  sam3AutoMosaic: 5000,
  nsfwDetection: 3000,
  sam3ManualSegment: 4000,
}

const EMPTY_TRIAL_READINESS_CHECKPOINTS: TrialReadinessCheckpoints = {
  backendConnectedAt: null,
  sampleLoadedAt: null,
  projectSavedAt: null,
  projectRestoredAt: null,
  exportCompletedAt: null,
  sam3ReviewedAt: null,
  nsfwReviewedAt: null,
}

const DEFAULT_PORTABLE_SMOKE_CHECKLIST: PortableSmokeChecklistItem[] = [
  { id: 'backend-panel', label: 'Backend panel and status', status: 'pending', note: '' },
  { id: 'runtime-labels', label: 'Runtime labels and capabilities', status: 'pending', note: '' },
  { id: 'sample-review', label: 'Sample load and review flow', status: 'pending', note: '' },
  { id: 'save-restore-export', label: 'Save restore and export flow', status: 'pending', note: '' },
]

type MarqueeSelection = {
  startX: number
  startY: number
  currentX: number
  currentY: number
  additive: boolean
}

type LayerDragState = {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

type LayerResizeState = {
  startX: number
  startY: number
  currentX: number
  currentY: number
  handle: ResizeHandle
  preserveAspectRatio: boolean
}

type BackendManualPointPickingMode = 'off' | 'positive' | 'negative'

type BackendManualPointDragState = {
  index: number
  startX: number
  startY: number
  currentX: number
  currentY: number
}

type ExportPreviewLayout = {
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
  cropLabel: string
}

const DEFAULT_SAM3_MANUAL_SEGMENT_POINTS: Sam3SegmentPoint[] = [
  { x: 640, y: 360, label: 1 },
  { x: 1280, y: 720, label: 1 },
]

const createEmptyBackendActionResults = (): BackendActionResultState => ({
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
  sam3ManualSegmentMask: null,
  sam3AutoMosaicBaseline: null,
  nsfwDetectionBaseline: null,
})

const createEmptyBackendReviewPageState = (): BackendReviewPageState => ({
  backendActionResults: createEmptyBackendActionResults(),
  focusedSam3ReviewCandidateIndex: null,
  focusedNsfwReviewCandidateIndex: null,
})

const DakiniWordmark = () => (
  <div className="dakini-mark" aria-label="Dakini brand mark">
    <svg viewBox="0 0 96 96" role="img" aria-hidden="true">
      <rect x="12" y="16" width="72" height="52" rx="4" />
      <path d="M16 22 L48 49 L80 22" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      <path d="M16 64 L37 46" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M80 64 L59 46" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M18 75 H24 C28 75 30 77 30 82 C30 87 28 89 24 89 H18 Z" />
      <path d="M35 75 H41 C46 75 49 78 49 82 C49 86 46 89 41 89 H35 Z M41 80 H39 V84 H41 C42.5 84 43.5 83.3 43.5 82 C43.5 80.7 42.5 80 41 80 Z" />
      <path d="M54 75 H60 V80 L65 75 H72 L65 82 L72 89 H65 L60 84 V89 H54 Z" />
      <path d="M75 75 H81 L87 84 V75 H92 V89 H86 L80 80 V89 H75 Z" />
    </svg>
    <div className="dakini-credit">
      <strong>Provided by Dakini_tencho</strong>
      <span>Dakini creative tools</span>
    </div>
  </div>
)

const getRendererBackendUrl = () =>
  ((window as { creatorsCoco?: { backendUrl?: string } }).creatorsCoco?.backendUrl ?? 'http://127.0.0.1:8765')

const getRendererAppVersion = () =>
  ((window as { creatorsCoco?: { appVersion?: string } }).creatorsCoco?.appVersion ?? '1.0.0')

const downloadJsonBlob = (blob: Blob, filename: string) => {
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(objectUrl)
}

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

const formatMetricDuration = (durationMs: number) => `${Math.max(0, Math.round(durationMs))}ms`

const formatMetricRecordedAt = (recordedAt: string) => {
  const parsed = new Date(recordedAt)
  if (Number.isNaN(parsed.getTime())) {
    return recordedAt
  }

  return parsed.toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const readStoredPerformanceMetrics = (): PerformanceMetricEntry[] => {
  if (typeof window === 'undefined') {
    return []
  }

  const storedMetrics = window.localStorage.getItem(PERFORMANCE_METRICS_STORAGE_KEY)
  if (!storedMetrics) {
    return []
  }

  try {
    const parsedMetrics = JSON.parse(storedMetrics) as PerformanceMetricEntry[]
    return Array.isArray(parsedMetrics) ? parsedMetrics.slice(0, 10) : []
  } catch {
    window.localStorage.removeItem(PERFORMANCE_METRICS_STORAGE_KEY)
    return []
  }
}

const readStoredPerformanceThresholds = (): PerformanceThresholds => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PERFORMANCE_THRESHOLDS }
  }

  const storedThresholds = window.localStorage.getItem(PERFORMANCE_THRESHOLD_SETTINGS_STORAGE_KEY)
  if (!storedThresholds) {
    return { ...DEFAULT_PERFORMANCE_THRESHOLDS }
  }

  try {
    const parsedThresholds = JSON.parse(storedThresholds) as Partial<PerformanceThresholds>
    return {
      backendStatus:
        typeof parsedThresholds.backendStatus === 'number'
          ? parsedThresholds.backendStatus
          : DEFAULT_PERFORMANCE_THRESHOLDS.backendStatus,
      loadSampleImage:
        typeof parsedThresholds.loadSampleImage === 'number'
          ? parsedThresholds.loadSampleImage
          : DEFAULT_PERFORMANCE_THRESHOLDS.loadSampleImage,
      saveProject:
        typeof parsedThresholds.saveProject === 'number'
          ? parsedThresholds.saveProject
          : DEFAULT_PERFORMANCE_THRESHOLDS.saveProject,
      pngExport:
        typeof parsedThresholds.pngExport === 'number'
          ? parsedThresholds.pngExport
          : DEFAULT_PERFORMANCE_THRESHOLDS.pngExport,
      pdfExport:
        typeof parsedThresholds.pdfExport === 'number'
          ? parsedThresholds.pdfExport
          : DEFAULT_PERFORMANCE_THRESHOLDS.pdfExport,
      zipExport:
        typeof parsedThresholds.zipExport === 'number'
          ? parsedThresholds.zipExport
          : DEFAULT_PERFORMANCE_THRESHOLDS.zipExport,
      sam3AutoMosaic:
        typeof parsedThresholds.sam3AutoMosaic === 'number'
          ? parsedThresholds.sam3AutoMosaic
          : DEFAULT_PERFORMANCE_THRESHOLDS.sam3AutoMosaic,
      nsfwDetection:
        typeof parsedThresholds.nsfwDetection === 'number'
          ? parsedThresholds.nsfwDetection
          : DEFAULT_PERFORMANCE_THRESHOLDS.nsfwDetection,
      sam3ManualSegment:
        typeof parsedThresholds.sam3ManualSegment === 'number'
          ? parsedThresholds.sam3ManualSegment
          : DEFAULT_PERFORMANCE_THRESHOLDS.sam3ManualSegment,
    }
  } catch {
    window.localStorage.removeItem(PERFORMANCE_THRESHOLD_SETTINGS_STORAGE_KEY)
    return { ...DEFAULT_PERFORMANCE_THRESHOLDS }
  }
}

const readStoredTrialReadinessCheckpoints = (): TrialReadinessCheckpoints => {
  if (typeof window === 'undefined') {
    return { ...EMPTY_TRIAL_READINESS_CHECKPOINTS }
  }

  const storedCheckpoints = window.localStorage.getItem(TRIAL_CHECKPOINTS_STORAGE_KEY)
  if (!storedCheckpoints) {
    return { ...EMPTY_TRIAL_READINESS_CHECKPOINTS }
  }

  try {
    const parsedCheckpoints = JSON.parse(storedCheckpoints) as Partial<TrialReadinessCheckpoints>
    return {
      backendConnectedAt:
        typeof parsedCheckpoints.backendConnectedAt === 'string' ? parsedCheckpoints.backendConnectedAt : null,
      sampleLoadedAt: typeof parsedCheckpoints.sampleLoadedAt === 'string' ? parsedCheckpoints.sampleLoadedAt : null,
      projectSavedAt: typeof parsedCheckpoints.projectSavedAt === 'string' ? parsedCheckpoints.projectSavedAt : null,
      projectRestoredAt:
        typeof parsedCheckpoints.projectRestoredAt === 'string' ? parsedCheckpoints.projectRestoredAt : null,
      exportCompletedAt:
        typeof parsedCheckpoints.exportCompletedAt === 'string' ? parsedCheckpoints.exportCompletedAt : null,
      sam3ReviewedAt: typeof parsedCheckpoints.sam3ReviewedAt === 'string' ? parsedCheckpoints.sam3ReviewedAt : null,
      nsfwReviewedAt: typeof parsedCheckpoints.nsfwReviewedAt === 'string' ? parsedCheckpoints.nsfwReviewedAt : null,
    }
  } catch {
    window.localStorage.removeItem(TRIAL_CHECKPOINTS_STORAGE_KEY)
    return { ...EMPTY_TRIAL_READINESS_CHECKPOINTS }
  }
}

const readStoredPortableSmokeChecklist = (): PortableSmokeChecklistItem[] => {
  if (typeof window === 'undefined') {
    return DEFAULT_PORTABLE_SMOKE_CHECKLIST.map((item) => ({ ...item }))
  }

  const storedChecklist = window.localStorage.getItem(PORTABLE_SMOKE_CHECKLIST_STORAGE_KEY)
  if (!storedChecklist) {
    return DEFAULT_PORTABLE_SMOKE_CHECKLIST.map((item) => ({ ...item }))
  }

  try {
    const parsedChecklist = JSON.parse(storedChecklist) as Array<Partial<PortableSmokeChecklistItem>>
    return DEFAULT_PORTABLE_SMOKE_CHECKLIST.map((item) => {
      const storedItem = parsedChecklist.find((candidate) => candidate.id === item.id)
      return {
        ...item,
        status:
          storedItem?.status === 'passed' || storedItem?.status === 'failed' || storedItem?.status === 'pending'
            ? storedItem.status
            : item.status,
        note: typeof storedItem?.note === 'string' ? storedItem.note : item.note,
      }
    })
  } catch {
    window.localStorage.removeItem(PORTABLE_SMOKE_CHECKLIST_STORAGE_KEY)
    return DEFAULT_PORTABLE_SMOKE_CHECKLIST.map((item) => ({ ...item }))
  }
}

const readStoredImportedHandoffHistory = (): ImportedHandoffHistoryEntry[] => {
  if (typeof window === 'undefined') {
    return []
  }

  const storedHistory = window.localStorage.getItem(IMPORTED_HANDOFF_HISTORY_STORAGE_KEY)
  if (!storedHistory) {
    return []
  }

  try {
    const parsedHistory = JSON.parse(storedHistory) as ImportedHandoffHistoryEntry[]
    return Array.isArray(parsedHistory) ? parsedHistory.slice(0, 5) : []
  } catch {
    window.localStorage.removeItem(IMPORTED_HANDOFF_HISTORY_STORAGE_KEY)
    return []
  }
}

const readStoredImportedPortableSmokeReport = (): ImportedPortableSmokeReport | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const storedReport = window.localStorage.getItem(IMPORTED_PORTABLE_SMOKE_REPORT_STORAGE_KEY)
  if (!storedReport) {
    return null
  }

  try {
    const parsedReport = JSON.parse(storedReport) as Partial<ImportedPortableSmokeReport>
    return {
      filename: typeof parsedReport.filename === 'string' ? parsedReport.filename : 'portable-smoke-report.json',
      importedAt: typeof parsedReport.importedAt === 'string' ? parsedReport.importedAt : new Date().toISOString(),
      generatedAt: typeof parsedReport.generatedAt === 'string' ? parsedReport.generatedAt : null,
      portableExePath: typeof parsedReport.portableExePath === 'string' ? parsedReport.portableExePath : null,
      smokeRoot: typeof parsedReport.smokeRoot === 'string' ? parsedReport.smokeRoot : null,
      startupTimeoutSeconds:
        typeof parsedReport.startupTimeoutSeconds === 'number' ? parsedReport.startupTimeoutSeconds : null,
      statusUrl: typeof parsedReport.statusUrl === 'string' ? parsedReport.statusUrl : null,
      statusOk: parsedReport.statusOk === true,
      statusError: typeof parsedReport.statusError === 'string' ? parsedReport.statusError : null,
      backendStatus:
        parsedReport.backendStatus && typeof parsedReport.backendStatus === 'object'
          ? (parsedReport.backendStatus as BackendStatusState)
          : null,
    }
  } catch {
    window.localStorage.removeItem(IMPORTED_PORTABLE_SMOKE_REPORT_STORAGE_KEY)
    return null
  }
}

const getExportPreviewLayout = (
  image: { width: number; height: number } | null,
  outputSettings: { width: number; height: number; resizeFitMode: 'contain' | 'cover' | 'stretch' },
): ExportPreviewLayout | null => {
  if (!image) {
    return null
  }

  if (outputSettings.resizeFitMode === 'stretch') {
    return {
      xPercent: 0,
      yPercent: 0,
      widthPercent: 100,
      heightPercent: 100,
      cropLabel: 'Stretched to fill',
    }
  }

  const scale =
    outputSettings.resizeFitMode === 'cover'
      ? Math.max(outputSettings.width / image.width, outputSettings.height / image.height)
      : Math.min(outputSettings.width / image.width, outputSettings.height / image.height)
  const width = image.width * scale
  const height = image.height * scale

  return {
    xPercent: ((outputSettings.width - width) / 2 / outputSettings.width) * 100,
    yPercent: ((outputSettings.height - height) / 2 / outputSettings.height) * 100,
    widthPercent: (width / outputSettings.width) * 100,
    heightPercent: (height / outputSettings.height) * 100,
    cropLabel: outputSettings.resizeFitMode === 'cover' ? 'Center cropped to fill' : 'Contained with margins',
  }
}

function App() {
  const [exportMessage, setExportMessage] = useState('Export idle')
  const [recentExports, setRecentExports] = useState<ExportHistoryEntry[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetricEntry[]>(readStoredPerformanceMetrics)
  const [performanceThresholds, setPerformanceThresholds] = useState<PerformanceThresholds>(
    readStoredPerformanceThresholds,
  )
  const [trialReadinessCheckpoints, setTrialReadinessCheckpoints] = useState<TrialReadinessCheckpoints>(
    readStoredTrialReadinessCheckpoints,
  )
  const [portableSmokeChecklist, setPortableSmokeChecklist] = useState<PortableSmokeChecklistItem[]>(
    readStoredPortableSmokeChecklist,
  )
  const [importedHandoffHistory, setImportedHandoffHistory] = useState<ImportedHandoffHistoryEntry[]>(
    readStoredImportedHandoffHistory,
  )
  const [importedPortableSmokeReport, setImportedPortableSmokeReport] = useState<ImportedPortableSmokeReport | null>(
    readStoredImportedPortableSmokeReport,
  )
  const [backendStatus, setBackendStatus] = useState<BackendStatusState | null>(null)
  const [backendStatusError, setBackendStatusError] = useState<string | null>(null)
  const [backendSam3ModelSize, setBackendSam3ModelSize] = useState<'base' | 'large'>('base')
  const [backendAutoMosaicStrength, setBackendAutoMosaicStrength] = useState<'light' | 'medium' | 'strong'>('medium')
  const [backendNsfwThreshold, setBackendNsfwThreshold] = useState('0.70')
  const [sam3BackendPreference, setSam3BackendPreference] = useState<BackendPreference>('auto')
  const [nudenetBackendPreference, setNudenetBackendPreference] = useState<BackendPreference>('auto')
  const [sam3CheckpointPath, setSam3CheckpointPath] = useState('')
  const [sam3ConfigPath, setSam3ConfigPath] = useState('')
  const [backendRuntimeConfigMessage, setBackendRuntimeConfigMessage] = useState<string | null>(null)
  const [backendDownloads, setBackendDownloads] = useState<BackendDownloadState>({
    sam3: null,
    nudenet: null,
  })
  const [backendActions, setBackendActions] = useState<BackendActionState>({
    sam3AutoMosaic: null,
    nsfwDetection: null,
    sam3ManualSegment: null,
    sam3Batch: null,
  })
  const [backendManualPointPickingMode, setBackendManualPointPickingMode] =
    useState<BackendManualPointPickingMode>('off')
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [backendManualSegmentPoints, setBackendManualSegmentPoints] = useState<Sam3SegmentPoint[]>(
    DEFAULT_SAM3_MANUAL_SEGMENT_POINTS,
  )
  const [selectedBackendManualSegmentPointIndex, setSelectedBackendManualSegmentPointIndex] = useState(
    DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length - 1,
  )
  const [backendManualPointDragState, setBackendManualPointDragState] = useState<BackendManualPointDragState | null>(
    null,
  )
  const [backendActionHistory, setBackendActionHistory] = useState<BackendActionHistoryEntry[]>([])
  const [backendReviewStateByPage, setBackendReviewStateByPage] = useState<Record<string, BackendReviewPageState>>({})
  const backendPollTimeouts = useRef<Record<'sam3' | 'nudenet', ReturnType<typeof setTimeout> | null>>({
    sam3: null,
    nudenet: null,
  })
  const backendProgressSubscriptions = useRef<Record<'sam3' | 'nudenet', (() => void) | null>>({
    sam3: null,
    nudenet: null,
  })
  const [projectNameDraft, setProjectNameDraft] = useState('Untitled project')
  const [widthDraft, setWidthDraft] = useState('1920')
  const [heightDraft, setHeightDraft] = useState('1080')
  const [prefixDraft, setPrefixDraft] = useState('creators-coco')
  const [startNumberDraft, setStartNumberDraft] = useState('1')
  const [numberPaddingDraft, setNumberPaddingDraft] = useState('2')
  const [duplicatePageTextDraft, setDuplicatePageTextDraft] = useState('Variant line')
  const [variantBatchDraft, setVariantBatchDraft] = useState('Variant A\nVariant B')
  const [presetLibraryFilter, setPresetLibraryFilter] = useState<'all' | 'text' | 'message' | 'watermark' | 'bubble' | 'overlay' | 'mosaic' | 'template' | 'asset'>('all')
  const [presetLibrarySearch, setPresetLibrarySearch] = useState('')
  const [marqueeSelection, setMarqueeSelection] = useState<MarqueeSelection | null>(null)
  const [layerDragState, setLayerDragState] = useState<LayerDragState | null>(null)
  const [layerResizeState, setLayerResizeState] = useState<LayerResizeState | null>(null)
  const {
    activeTool,
    zoomPercent,
    pages,
    activePageId,
    loadError,
    selectedLayerId,
    selectedLayerIds,
    imageTransform,
    outputSettings,
    isDirty,
    lastSavedAt,
    projectName,
    recentProjects,
    templates,
    reusableAssets,
    textStylePresets,
    mosaicStylePresets,
    undoStack,
    redoStack,
    saveNow,
    restoreSavedProject,
    openRecentProject,
    setActiveTool,
    setProjectName,
    selectAllVisibleLayers,
    selectVisibleLayersByType,
    invertLayerSelection,
    selectGroupedLayers,
    setSelectedLayerIds,
    clearLayerSelection,
    setOutputPreset,
    setCustomOutputWidth,
    setCustomOutputHeight,
    setResizeBackgroundMode,
    setResizeFitMode,
    setExportQualityMode,
    setFileNamePrefix,
    setStartNumber,
    setNumberPadding,
    loadSampleImage,
    loadImageFile,
    loadImageFiles,
    selectPage,
    duplicateActivePage,
    duplicateActivePageWithTextSwap,
    duplicateActivePageWithTextVariants,
    setActivePageVariantLabel,
    saveCurrentPageAsTemplate,
    saveCurrentPageAsReusableAsset,
    applyTemplateToActivePage,
    applyTemplateToAllPages,
    addTextLayer,
    addWatermarkLayer,
    loadWatermarkImageFile,
    addBubbleLayer,
    selectTextLayer,
    selectBubbleLayer,
    updateSelectedTextLayerText,
    moveSelectedTextLayer,
    changeSelectedTextLayerFontSize,
    setSelectedTextLayerColor,
    changeSelectedTextLayerLineHeight,
    changeSelectedTextLayerLetterSpacing,
    changeSelectedTextLayerMaxWidth,
    toggleSelectedTextLayerFillMode,
    setSelectedTextLayerGradientFrom,
    setSelectedTextLayerGradientTo,
    deleteSelectedTextLayer,
    moveSelectedTextLayerBackward,
    moveSelectedTextLayerForward,
    toggleSelectedTextLayerVertical,
    changeSelectedTextLayerOutlineWidth,
    toggleSelectedTextLayerShadow,
    saveSelectedTextStylePreset,
    applyTextStylePreset,
    renameTextStylePreset,
    duplicateTextStylePreset,
    deleteTextStylePreset,
    messageWindowPresets,
    watermarkStylePresets,
    bubbleStylePresets,
    overlayStylePresets,
    addMessageWindowLayer,
    selectMessageWindowLayer,
    updateSelectedMessageWindowSpeaker,
    updateSelectedMessageWindowBody,
    moveSelectedMessageWindowLayer,
    resizeSelectedMessageWindowLayer,
    cycleSelectedMessageWindowFrameStyle,
    loadSelectedMessageWindowAsset,
    saveSelectedMessageWindowPreset,
    applyMessageWindowPreset,
    renameMessageWindowPreset,
    duplicateMessageWindowPreset,
    deleteMessageWindowPreset,
    selectWatermarkLayer,
    updateSelectedWatermarkText,
    changeSelectedWatermarkOpacity,
    toggleSelectedWatermarkPattern,
    setSelectedWatermarkPreset,
    changeSelectedWatermarkAngle,
    changeSelectedWatermarkDensity,
    moveSelectedWatermarkLayer,
    changeSelectedWatermarkScale,
    toggleSelectedWatermarkTileLayout,
    saveSelectedWatermarkStylePreset,
    applyWatermarkStylePreset,
    renameWatermarkStylePreset,
    duplicateWatermarkStylePreset,
    deleteWatermarkStylePreset,
    updateSelectedBubbleLayerText,
    moveSelectedBubbleLayer,
    deleteSelectedBubbleLayer,
    resizeSelectedBubbleLayer,
    setSelectedBubbleTailDirection,
    setSelectedBubbleStylePreset,
    setSelectedBubbleShape,
    randomizeSelectedBubbleShape,
    saveSelectedBubbleStylePreset,
    applyBubbleStylePreset,
    renameBubbleStylePreset,
    duplicateBubbleStylePreset,
    deleteBubbleStylePreset,
    duplicateSelectedBubbleLayer,
    moveSelectedBubbleLayerBackward,
    moveSelectedBubbleLayerForward,
    setSelectedBubbleFillColor,
    setSelectedBubbleBorderColor,
    addMosaicLayer,
    selectMosaicLayer,
    moveSelectedMosaicLayer,
    resizeSelectedMosaicLayer,
    changeSelectedMosaicIntensity,
    setSelectedMosaicIntensity,
    setSelectedMosaicStyle,
    cycleSelectedMosaicStyle,
    saveSelectedMosaicStylePreset,
    applyMosaicStylePreset,
    renameMosaicStylePreset,
    duplicateMosaicStylePreset,
    deleteMosaicStylePreset,
    duplicateSelectedMosaicLayer,
    moveSelectedMosaicLayerBackward,
    moveSelectedMosaicLayerForward,
    deleteSelectedMosaicLayer,
    addOverlayLayer,
    selectOverlayLayer,
    moveSelectedOverlayLayer,
    changeSelectedOverlayOpacity,
    setSelectedOverlayColor,
    setSelectedOverlayAreaPreset,
    cycleSelectedOverlayAreaPreset,
    toggleSelectedOverlayFillMode,
    setSelectedOverlayGradientFrom,
    setSelectedOverlayGradientTo,
    cycleSelectedOverlayGradientDirection,
    saveSelectedOverlayStylePreset,
    applyOverlayStylePreset,
    renameOverlayStylePreset,
    duplicateOverlayStylePreset,
    deleteOverlayStylePreset,
    duplicateSelectedOverlayLayer,
    moveSelectedOverlayLayerBackward,
    moveSelectedOverlayLayerForward,
    deleteSelectedOverlayLayer,
    addBackendMosaicLayers,
    addBackendMosaicLayersToPage,
    addBackendOverlayLayers,
    addBackendOverlayLayersToPage,
    toggleSelectedLayerVisibility,
    toggleSelectedLayerLock,
    groupSelectedLayers,
    ungroupSelectedLayers,
    duplicateSelectedLayer,
    centerSelectedLayer,
    alignSelectedLayer,
    alignSelectedLayersCenter,
    distributeSelectedLayers,
    matchSelectedLayerSize,
    moveSelectedLayersByDelta,
    resizeSelectedLayersByDelta,
    deleteSelectedLayer,
    renameSelectedLayer,
    moveSelectedLayerBackward,
    moveSelectedLayerForward,
    nudgeSelectedLayer,
    deleteActivePage,
    moveActivePageUp,
    moveActivePageDown,
    renameTemplate,
    duplicateTemplate,
    deleteTemplate,
    renameReusableAsset,
    duplicateReusableAsset,
    deleteReusableAsset,
    applyReusableAssetToActivePage,
    undo,
    redo,
    selectBaseImageLayer,
    moveSelection,
    scaleSelection,
    zoomIn,
    zoomOut,
  } = useWorkspaceStore()
  const backendReviewPageId = activePageId ?? GLOBAL_BACKEND_REVIEW_PAGE_ID
  const backendReviewPageState = backendReviewStateByPage[backendReviewPageId] ?? createEmptyBackendReviewPageState()
  const backendActionResults = backendReviewPageState.backendActionResults
  const focusedSam3ReviewCandidateIndex = backendReviewPageState.focusedSam3ReviewCandidateIndex
  const focusedNsfwReviewCandidateIndex = backendReviewPageState.focusedNsfwReviewCandidateIndex
  const updateActiveBackendReviewState = useCallback(
    (updater: (state: BackendReviewPageState) => BackendReviewPageState) => {
      setBackendReviewStateByPage((current) => ({
        ...current,
        [backendReviewPageId]: updater(current[backendReviewPageId] ?? createEmptyBackendReviewPageState()),
      }))
    },
    [backendReviewPageId],
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
      updateActiveBackendReviewState((current) => ({
        ...current,
        focusedSam3ReviewCandidateIndex: index,
      }))
    },
    [updateActiveBackendReviewState],
  )
  const setActiveFocusedNsfwReviewCandidateIndex = useCallback(
    (index: number | null) => {
      updateActiveBackendReviewState((current) => ({
        ...current,
        focusedNsfwReviewCandidateIndex: index,
      }))
    },
    [updateActiveBackendReviewState],
  )
  const image = selectActiveImage({ pages, activePageId })
  const activeTextLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? image.textLayers.find((layer) => layer.id === selectedLayerId) ?? null
      : null
  const activeBubbleLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? image.bubbleLayers.find((layer) => layer.id === selectedLayerId) ?? null
      : null
  const activeMessageWindowLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? image.messageWindowLayers.find((layer) => layer.id === selectedLayerId) ?? null
      : null
  const activeMosaicLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? image.mosaicLayers.find((layer) => layer.id === selectedLayerId) ?? null
      : null
  const activeOverlayLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? image.overlayLayers.find((layer) => layer.id === selectedLayerId) ?? null
      : null
  const activeWatermarkLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? image.watermarkLayers.find((layer) => layer.id === selectedLayerId) ?? null
      : null
  const activeNamedLayer =
    activeTextLayer ?? activeMessageWindowLayer ?? activeBubbleLayer ?? activeMosaicLayer ?? activeOverlayLayer ?? activeWatermarkLayer
  const getTextLayerLabel = (layer: any) => layer.name?.trim() || layer.text
  const getBubbleLayerLabel = (layer: any) => layer.name?.trim() || layer.text
  const getMessageWindowLayerLabel = (layer: any) => layer.name?.trim() || layer.speaker
  const getMosaicLayerLabel = (layer: any) => layer.name?.trim() || `${layer.style} ${layer.intensity}`
  const getOverlayLayerLabel = (layer: any) => layer.name?.trim() || layer.opacity.toFixed(1)
  const getWatermarkLayerLabel = (layer: any) => layer.name?.trim() || layer.assetName || layer.text
  const activeBubbleShape = activeBubbleLayer?.bubbleShape ?? 'round'
  const activeBubbleShapeVariant = getBubbleShapeVariantNumber(activeBubbleLayer?.shapeSeed ?? 0)
  const selectedBackendManualSegmentPoint =
    backendManualSegmentPoints[selectedBackendManualSegmentPointIndex] ??
    backendManualSegmentPoints[backendManualSegmentPoints.length - 1] ??
    null
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
  const previewBackendManualSegmentPoints = backendManualSegmentPoints.map((point, index) =>
    backendManualPointDragState && backendManualPointDragState.index === index
      ? {
          ...point,
          x: backendManualPointDragState.currentX,
          y: backendManualPointDragState.currentY,
        }
      : point,
  )
  const previewSam3ReviewCandidates = backendActionResults.sam3AutoMosaic.map((mask, index) => ({
    ...parseBackendLayerSuggestion(mask, index),
    index,
    selected: backendActionResults.sam3AutoMosaicSelection[index] !== false,
    focused: focusedSam3ReviewCandidateIndex === index,
    label: getSam3CandidateCardLabel(index),
    note: getSam3CandidateCardNote(index),
    priority: getSam3CandidatePriority(index),
    style: backendActionResults.sam3AutoMosaicStyle[index] ?? 'pixelate',
    intensity: backendActionResults.sam3AutoMosaicIntensity[index] ?? 16,
    maskPreviewUrl: getBackendMaskPreviewUrl(mask),
  }))
  const previewNsfwReviewCandidates = backendActionResults.nsfwDetections.map((detection, index) => ({
    ...parseBackendLayerSuggestion(detection, index),
    index,
    selected: backendActionResults.nsfwDetectionSelection[index] !== false,
    focused: focusedNsfwReviewCandidateIndex === index,
    label: getNsfwCandidateCardLabel(index),
    note: getNsfwCandidateCardNote(index),
    priority: getNsfwCandidatePriority(index),
    color: backendActionResults.nsfwDetectionColor[index] ?? '#ff4d6d',
    opacity: backendActionResults.nsfwDetectionOpacity[index] ?? 0.4,
    maskPreviewUrl: getBackendMaskPreviewUrl(detection),
  }))
  const manualSegmentMaskPreviewUrl = getBackendMaskPreviewUrl(backendActionResults.sam3ManualSegmentMask)
  const backendBaseUrl = getRendererBackendUrl()
  const appVersion = getRendererAppVersion()
  const manualSegmentMaskBounds = backendActionResults.sam3ManualSegmentMask
    ? parseBackendLayerSuggestion(backendActionResults.sam3ManualSegmentMask, 0)
    : null
  const activeLayerGroupId =
    activeTextLayer?.groupId ??
    activeMessageWindowLayer?.groupId ??
    activeBubbleLayer?.groupId ??
    activeMosaicLayer?.groupId ??
    activeOverlayLayer?.groupId ??
    activeWatermarkLayer?.groupId ??
    null
  const activeLayerGroupCount =
    image && activeLayerGroupId
      ? [
          ...image.textLayers.filter((layer) => layer.groupId === activeLayerGroupId),
          ...image.messageWindowLayers.filter((layer) => layer.groupId === activeLayerGroupId),
          ...image.bubbleLayers.filter((layer) => layer.groupId === activeLayerGroupId),
          ...image.mosaicLayers.filter((layer) => layer.groupId === activeLayerGroupId),
          ...image.overlayLayers.filter((layer) => layer.groupId === activeLayerGroupId),
          ...image.watermarkLayers.filter((layer) => layer.groupId === activeLayerGroupId),
        ].length
      : 0
  const pageCount = pages.length
  const activePageIndex = activePageId ? Math.max(0, pages.findIndex((page) => page.id === activePageId)) : 0
  const activePageVariantLabel = image?.variantLabel?.trim() ?? ''
  const activePageVariantSourceLabel =
    image?.variantSourcePageId && image.variantSourcePageId !== image.id ? image.variantSourcePageId : null
  const presetSearchQuery = presetLibrarySearch.trim().toLowerCase()
  const matchesPresetSearch = (...values: Array<string | null | undefined>) =>
    presetSearchQuery.length === 0 || values.some((value) => value?.toLowerCase().includes(presetSearchQuery))
  const pngPreviewName = image ? createPngExportName(image.name, outputSettings, activePageIndex) : 'No active page'
  const pdfPreviewName = image ? createPdfExportName(image.name, outputSettings, activePageIndex) : 'No active page'
  const zipPreviewName = pageCount > 0 ? createZipExportName(outputSettings, pageCount) : 'No pages loaded'
  const zipEntryPreviewNames = pages.map((page, index) => createZipEntryName(page.name, outputSettings, index))
  const exportPreviewLayout = getExportPreviewLayout(image, outputSettings)
  const activeTextLayerOrder =
    image && activeTextLayer
      ? image.textLayers.findIndex((layer) => layer.id === activeTextLayer.id) + 1
      : 0
  const selectedLayerCount = selectedLayerIds.filter((id) => id !== 'base-image').length
  const selectedLayerSummary = image
    ? {
        text: image.textLayers.filter((layer) => selectedLayerIds.includes(layer.id)).length,
        messageWindow: image.messageWindowLayers.filter((layer) => selectedLayerIds.includes(layer.id)).length,
        bubble: image.bubbleLayers.filter((layer) => selectedLayerIds.includes(layer.id)).length,
        mosaic: image.mosaicLayers.filter((layer) => selectedLayerIds.includes(layer.id)).length,
        overlay: image.overlayLayers.filter((layer) => selectedLayerIds.includes(layer.id)).length,
        watermark: image.watermarkLayers.filter((layer) => selectedLayerIds.includes(layer.id)).length,
      }
    : null
  const selectedLayerTypeLabel =
    selectedLayerSummary && selectedLayerCount > 1
      ? [
          selectedLayerSummary.text ? `Text ${selectedLayerSummary.text}` : null,
          selectedLayerSummary.messageWindow ? `Window ${selectedLayerSummary.messageWindow}` : null,
          selectedLayerSummary.bubble ? `Bubble ${selectedLayerSummary.bubble}` : null,
          selectedLayerSummary.mosaic ? `Mosaic ${selectedLayerSummary.mosaic}` : null,
          selectedLayerSummary.overlay ? `Overlay ${selectedLayerSummary.overlay}` : null,
          selectedLayerSummary.watermark ? `Watermark ${selectedLayerSummary.watermark}` : null,
        ]
          .filter(Boolean)
          .join(' / ')
      : null
  const multiSelectionActionLabel =
    selectedLayerCount > 1
      ? 'Shared actions Move / Align / Group / Visibility / Lock / Order'
      : null
  const visibilityLabel =
    activeTextLayer
      ? `Visibility ${activeTextLayer.visible ? 'Visible' : 'Hidden'}`
      : activeBubbleLayer
        ? `Visibility ${activeBubbleLayer.visible ? 'Visible' : 'Hidden'}`
        : activeMosaicLayer
          ? `Visibility ${activeMosaicLayer.visible ? 'Visible' : 'Hidden'}`
          : activeOverlayLayer
            ? `Visibility ${activeOverlayLayer.visible ? 'Visible' : 'Hidden'}`
            : 'Visibility -'
  const lockLabel =
    activeTextLayer
      ? `Lock ${activeTextLayer.locked ? 'Locked' : 'Unlocked'}`
      : activeBubbleLayer
        ? `Lock ${activeBubbleLayer.locked ? 'Locked' : 'Unlocked'}`
        : activeMosaicLayer
          ? `Lock ${activeMosaicLayer.locked ? 'Locked' : 'Unlocked'}`
          : activeOverlayLayer
            ? `Lock ${activeOverlayLayer.locked ? 'Locked' : 'Unlocked'}`
            : 'Lock -'

  const selectionLabel =
    selectedLayerId === 'base-image'
      ? 'Base image'
      : activeTextLayer
        ? 'Text layer'
        : activeMessageWindowLayer
          ? 'Message window layer'
        : activeBubbleLayer
          ? 'Bubble layer'
        : activeMosaicLayer
          ? 'Mosaic layer'
        : activeOverlayLayer
          ? 'Overlay layer'
        : activeWatermarkLayer
          ? 'Watermark layer'
          : 'None'
  const editorHintMessage = !image
    ? 'Choose image か Load sample image で画像を開くと、中央キャンバスで編集できます。'
    : selectedLayerCount > 1
      ? `${selectedLayerCount} selected layers are active. Right-side Inspector and Layers show the current editable selection.`
      : selectedLayerId
        ? `${selectionLabel} is selected. Edit it from the canvas or the right-side Inspector and Layers panels.`
        : 'Add text layer などでレイヤーを追加すると、中央キャンバスと右側の Layers / Inspector に反映されます。'
  const positionLabel =
    selectedLayerId === 'base-image' && imageTransform
      ? `Position ${imageTransform.x}, ${imageTransform.y}`
      : activeTextLayer
        ? `Position ${activeTextLayer.x}, ${activeTextLayer.y}`
        : activeMessageWindowLayer
          ? `Position ${activeMessageWindowLayer.x}, ${activeMessageWindowLayer.y}`
        : activeBubbleLayer
          ? `Position ${activeBubbleLayer.x}, ${activeBubbleLayer.y}`
        : activeMosaicLayer
          ? `Position ${activeMosaicLayer.x}, ${activeMosaicLayer.y}`
        : activeOverlayLayer
          ? `Position ${activeOverlayLayer.x}, ${activeOverlayLayer.y}`
        : activeWatermarkLayer
          ? `Position ${activeWatermarkLayer.x}, ${activeWatermarkLayer.y}`
        : 'Position -'
  const sizeLabel =
    selectedLayerId === 'base-image' && imageTransform
      ? `Size ${imageTransform.width} x ${imageTransform.height}`
      : activeTextLayer
        ? `Font ${activeTextLayer.fontSize} px`
        : activeMessageWindowLayer
          ? `Size ${activeMessageWindowLayer.width} x ${activeMessageWindowLayer.height}`
        : activeBubbleLayer
          ? `Size ${activeBubbleLayer.width} x ${activeBubbleLayer.height}`
        : activeMosaicLayer
          ? `Size ${activeMosaicLayer.width} x ${activeMosaicLayer.height}`
        : activeOverlayLayer
          ? `Size ${activeOverlayLayer.width} x ${activeOverlayLayer.height}`
        : activeWatermarkLayer
          ? `Scale ${activeWatermarkLayer.scale.toFixed(1)}x`
        : 'Size -'
  const saveStatusLabel = isDirty
    ? 'Autosave pending'
    : lastSavedAt
      ? `Saved at ${new Date(lastSavedAt).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}`
      : 'Not saved yet'
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
  const getBackendRuntimeLabel = () =>
    `Backend runtime ${backendStatus?.packaged_runtime ? 'Portable packaged' : 'Development'} Python ${
      backendStatus?.python_version ?? 'unknown'
    }`
  const getBackendCapabilityLabel = (modelName: BackendModelName) => {
    const backend = modelName === 'sam3' ? backendStatus?.sam3_backend : backendStatus?.nudenet_backend
    const nativeAvailable =
      modelName === 'sam3' ? backendStatus?.sam3_native_available : backendStatus?.nudenet_native_available
    const label = modelName === 'sam3' ? 'SAM3' : 'NudeNet'
    return `${label} ${backend ?? 'heuristic'} / native ${nativeAvailable ? 'available' : 'unavailable'}`
  }
  const getBackendPreferenceLabel = (modelName: BackendModelName) => {
    const preference = modelName === 'sam3' ? sam3BackendPreference : nudenetBackendPreference
    const label = modelName === 'sam3' ? 'SAM3' : 'NudeNet'
    return `${label} strategy ${preference}`
  }
  const getSam3CheckpointLabel = () => {
    if (backendStatus?.sam3_checkpoint_ready) {
      return 'SAM3 checkpoint ready'
    }
    if (sam3CheckpointPath.trim().length > 0 || backendStatus?.sam3_checkpoint_path) {
      return 'SAM3 checkpoint missing'
    }
    return 'SAM3 checkpoint not configured'
  }
  const getSam3CheckpointPathLabel = () =>
    `SAM3 checkpoint path ${sam3CheckpointPath.trim() || backendStatus?.sam3_checkpoint_path || 'not set'}`
  const getSam3ConfigPathLabel = () =>
    `SAM3 config path ${sam3ConfigPath.trim() || backendStatus?.sam3_config_path || 'not set'}`
  const getBackendModelButtonLabel = (modelName: BackendModelName) => {
    const label = getBackendModelLabel(modelName)
    if (isBackendModelReady(modelName)) {
      return `${label} model ready`
    }

    if (isBackendModelDownloading(modelName)) {
      return `Downloading ${label} model...`
    }

    return `Download ${label} model`
  }
  const hasActiveImage = Boolean(image)
  const pushBackendActionHistory = (
    type: BackendActionHistoryEntry['type'],
    label: string,
  ) => {
    setBackendActionHistory((current) => [{ id: crypto.randomUUID(), type, label }, ...current].slice(0, 5))
  }

  const pushExportHistory = (entry: ExportHistoryEntry) => {
    setRecentExports((current) => [entry, ...current].slice(0, 5))
  }

  const pushPerformanceMetric = useCallback((action: string, durationMs: number, thresholdMs: number) => {
    const normalizedDuration = Math.max(0, Math.round(durationMs))
    setPerformanceMetrics((current) => [
      {
        id: crypto.randomUUID(),
        action,
        durationMs: normalizedDuration,
        thresholdMs,
        level: normalizedDuration > thresholdMs ? 'warn' : 'ok',
        recordedAt: new Date().toISOString(),
      },
      ...current,
    ].slice(0, 10))
  }, [])

  const measureSyncAction = useCallback(<T,>(action: string, thresholdMs: number, callback: () => T): T => {
    const startedAt = Date.now()
    const result = callback()
    pushPerformanceMetric(action, Date.now() - startedAt, thresholdMs)
    return result
  }, [pushPerformanceMetric])

  const measureAsyncAction = useCallback(async <T,>(
    action: string,
    thresholdMs: number,
    callback: () => Promise<T>,
  ): Promise<T> => {
    const startedAt = Date.now()
    try {
      return await callback()
    } finally {
      pushPerformanceMetric(action, Date.now() - startedAt, thresholdMs)
    }
  }, [pushPerformanceMetric])

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
    progress: {
      status: string
      progress: number
    },
  ) => {
    const modelLabel = getBackendModelLabel(modelName)
    const progressLabel =
      progress.status === 'completed'
        ? `Completed ${modelLabel} ${progress.progress}%`
        : `Downloading ${modelLabel} ${progress.progress}%`

    setBackendDownloads((current) => ({
      ...current,
      [modelName]: progressLabel,
    }))
    setBackendStatus((current) =>
      current
        ? {
            ...current,
            sam3_loaded: modelName === 'sam3' ? progress.status === 'completed' : current.sam3_loaded,
            sam3_status: modelName === 'sam3' ? progress.status : current.sam3_status,
            sam3_progress: modelName === 'sam3' ? progress.progress : current.sam3_progress,
            nudenet_loaded: modelName === 'nudenet' ? progress.status === 'completed' : current.nudenet_loaded,
            nudenet_status: modelName === 'nudenet' ? progress.status : current.nudenet_status,
            nudenet_progress: modelName === 'nudenet' ? progress.progress : current.nudenet_progress,
          }
        : current,
    )

    if (progress.status === 'completed') {
      clearBackendModelProgressWatch(modelName)
    }
  }

  const scheduleBackendModelProgressPoll = (modelName: BackendModelName) => {
    const modelLabel = getBackendModelLabel(modelName)

    const pollProgress = async () => {
      const progress = await getBackendModelProgress(modelName)
      applyBackendModelProgressUpdate(modelName, progress)

      if (progress.status === 'completed') {
        return
      }

      backendPollTimeouts.current[modelName] = setTimeout(() => {
        void pollProgress()
      }, 1000)
    }

    backendPollTimeouts.current[modelName] = setTimeout(() => {
      void pollProgress()
    }, 1000)

    setBackendDownloads((current) => ({
      ...current,
      [modelName]: current[modelName] ?? `Queued ${modelLabel} 0%`,
    }))
  }

  const loadBackendStatus = async () => {
    await measureAsyncAction('Backend status', performanceThresholds.backendStatus, async () => {
      try {
        const status = await getBackendStatus()
        setBackendStatus(status)
        setBackendStatusError(null)
        setTrialReadinessCheckpoints((current) => ({
          ...current,
          backendConnectedAt: current.backendConnectedAt ?? new Date().toISOString(),
        }))
        if (
          status.sam3_backend_preference === 'auto' ||
          status.sam3_backend_preference === 'native' ||
          status.sam3_backend_preference === 'heuristic'
        ) {
          setSam3BackendPreference(status.sam3_backend_preference)
        }
        setSam3CheckpointPath(typeof status.sam3_checkpoint_path === 'string' ? status.sam3_checkpoint_path : '')
        setSam3ConfigPath(typeof status.sam3_config_path === 'string' ? status.sam3_config_path : '')
        if (
          status.nudenet_backend_preference === 'auto' ||
          status.nudenet_backend_preference === 'native' ||
          status.nudenet_backend_preference === 'heuristic'
        ) {
          setNudenetBackendPreference(status.nudenet_backend_preference)
        }
      } catch {
        setBackendStatusError('Backend connection unavailable')
      }
    })
  }

  const startBackendModelDownload = async (modelName: BackendModelName) => {
    try {
      clearBackendModelProgressWatch(modelName)

      const result = await downloadBackendModel(modelName)
      const modelLabel = modelName === 'sam3' ? 'SAM3' : 'NudeNet'
      const statusLabel = result.status === 'queued' ? 'Queued' : 'Downloading'

      setBackendDownloads((current) => ({
        ...current,
        [modelName]: `${statusLabel} ${modelLabel} ${result.progress}%`,
      }))
      setBackendStatus((current) =>
        current
          ? {
              ...current,
              sam3_status: modelName === 'sam3' ? result.status : current.sam3_status,
              sam3_progress: modelName === 'sam3' ? result.progress : current.sam3_progress,
              nudenet_status: modelName === 'nudenet' ? result.status : current.nudenet_status,
              nudenet_progress: modelName === 'nudenet' ? result.progress : current.nudenet_progress,
            }
            : current,
        )
      const unsubscribe = subscribeToBackendModelProgress(modelName, {
        onProgress: (progress) => {
          applyBackendModelProgressUpdate(modelName, progress)
        },
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
      setBackendDownloads((current) => ({
        ...current,
        [modelName]: `Failed ${modelName === 'sam3' ? 'SAM3' : 'NudeNet'} download`,
      }))
    }
  }

  const syncBackendRuntimePreferences = useCallback(async () => {
    try {
      const config = await updateBackendRuntimeConfig(
        sam3BackendPreference,
        nudenetBackendPreference,
        sam3CheckpointPath,
        sam3ConfigPath,
      )
      setBackendRuntimeConfigMessage(
        `Runtime strategy synced: SAM3 ${config.sam3_effective_backend}, NudeNet ${config.nudenet_effective_backend}`,
      )
      setSam3CheckpointPath(config.sam3_checkpoint_path ?? '')
      setSam3ConfigPath(config.sam3_config_path ?? '')
      setBackendStatus((current) =>
        current
          ? {
              ...current,
              sam3_backend: config.sam3_effective_backend,
              nudenet_backend: config.nudenet_effective_backend,
              sam3_native_available: config.sam3_native_available,
              nudenet_native_available: config.nudenet_native_available,
              sam3_checkpoint_path: config.sam3_checkpoint_path,
              sam3_config_path: config.sam3_config_path,
              sam3_checkpoint_ready: config.sam3_checkpoint_ready,
              sam3_native_reason: config.sam3_native_reason,
              nudenet_native_reason: config.nudenet_native_reason,
              sam3_backend_preference: config.sam3_backend_preference,
              nudenet_backend_preference: config.nudenet_backend_preference,
              sam3_recommendation: config.sam3_recommendation,
              nudenet_recommendation: config.nudenet_recommendation,
            }
          : current,
      )
    } catch {
      setBackendRuntimeConfigMessage('Runtime strategy sync failed')
    }
  }, [nudenetBackendPreference, sam3BackendPreference, sam3CheckpointPath, sam3ConfigPath])

  const refreshBackendRuntimePreferences = useCallback(async () => {
    try {
      const config = await getBackendRuntimeConfig()
      setSam3BackendPreference(config.sam3_backend_preference)
      setNudenetBackendPreference(config.nudenet_backend_preference)
      setSam3CheckpointPath(config.sam3_checkpoint_path ?? '')
      setSam3ConfigPath(config.sam3_config_path ?? '')
      setBackendStatus((current) =>
        current
          ? {
              ...current,
              sam3_backend: config.sam3_effective_backend,
              nudenet_backend: config.nudenet_effective_backend,
              sam3_native_available: config.sam3_native_available,
              nudenet_native_available: config.nudenet_native_available,
              sam3_checkpoint_path: config.sam3_checkpoint_path,
              sam3_config_path: config.sam3_config_path,
              sam3_checkpoint_ready: config.sam3_checkpoint_ready,
              sam3_native_reason: config.sam3_native_reason,
              nudenet_native_reason: config.nudenet_native_reason,
              sam3_backend_preference: config.sam3_backend_preference,
              nudenet_backend_preference: config.nudenet_backend_preference,
              sam3_recommendation: config.sam3_recommendation,
              nudenet_recommendation: config.nudenet_recommendation,
            }
          : current,
      )
    } catch {
      setBackendRuntimeConfigMessage('Runtime config unavailable')
    }
  }, [])

  const runBackendSam3AutoMosaic = async () => {
    if (!image) {
      return
    }

    setBackendActions((current) => ({
      ...current,
      sam3AutoMosaic: 'Running SAM3 auto mosaic...',
    }))

    try {
      const response = await measureAsyncAction('SAM3 auto mosaic', performanceThresholds.sam3AutoMosaic, () =>
        runSam3AutoMosaic(getPageBackendImageSource(image), backendSam3ModelSize, backendAutoMosaicStrength),
      )
      const baseline: Sam3ReviewBaseline = {
        masks: response.masks,
        labels: response.masks.map((_, index) => `SAM3 mask ${index + 1}`),
        notes: response.masks.map(() => ''),
        priority: response.masks.map(() => 'medium'),
        style: response.masks.map(() => 'pixelate'),
        intensity: response.masks.map(() =>
          backendAutoMosaicStrength === 'light' ? 8 : backendAutoMosaicStrength === 'strong' ? 24 : 16,
        ),
      }
      const resultLabel = `SAM3 auto mosaic ready with ${response.masks.length} mask${response.masks.length === 1 ? '' : 's'}`
      updateActiveBackendActionResults((current) => ({
        ...current,
        sam3AutoMosaic: baseline.masks,
        sam3AutoMosaicSelection: baseline.masks.map(() => true),
        sam3AutoMosaicLabel: baseline.labels,
        sam3AutoMosaicNote: baseline.notes,
        sam3AutoMosaicPriority: baseline.priority,
        sam3AutoMosaicStyle: baseline.style,
        sam3AutoMosaicIntensity: baseline.intensity,
        sam3AutoMosaicBaseline: baseline,
      }))
      setActiveFocusedSam3ReviewCandidateIndex(response.masks.length > 0 ? 0 : null)
      setBackendActions((current) => ({
        ...current,
        sam3AutoMosaic: resultLabel,
      }))
      setTrialReadinessCheckpoints((current) => ({
        ...current,
        sam3ReviewedAt: new Date().toISOString(),
      }))
      pushBackendActionHistory('sam3-auto-mosaic', resultLabel)
    } catch {
      setBackendActions((current) => ({
        ...current,
        sam3AutoMosaic: 'SAM3 auto mosaic failed',
      }))
    }
  }

  const runBackendNsfwDetection = async () => {
    if (!image) {
      return
    }

    setBackendActions((current) => ({
      ...current,
      nsfwDetection: 'Running NSFW detection...',
    }))

    try {
      const response = await measureAsyncAction('NSFW detection', performanceThresholds.nsfwDetection, () =>
        runNsfwDetection(getPageBackendImageSource(image), Number.parseFloat(backendNsfwThreshold) || 0.7),
      )
      const baseline: NsfwReviewBaseline = {
        detections: response.detections,
        labels: response.detections.map((_, index) => `NSFW region ${index + 1}`),
        notes: response.detections.map(() => ''),
        priority: response.detections.map(() => 'medium'),
        color: response.detections.map(() => '#ff4d6d'),
        opacity: response.detections.map(() => 0.4),
      }
      const resultLabel = `NSFW detection found ${response.detections.length} region${response.detections.length === 1 ? '' : 's'}`
      updateActiveBackendActionResults((current) => ({
        ...current,
        nsfwDetections: baseline.detections,
        nsfwDetectionSelection: baseline.detections.map(() => true),
        nsfwDetectionLabel: baseline.labels,
        nsfwDetectionNote: baseline.notes,
        nsfwDetectionPriority: baseline.priority,
        nsfwDetectionColor: baseline.color,
        nsfwDetectionOpacity: baseline.opacity,
        nsfwDetectionBaseline: baseline,
      }))
      setActiveFocusedNsfwReviewCandidateIndex(response.detections.length > 0 ? 0 : null)
      setBackendActions((current) => ({
        ...current,
        nsfwDetection: resultLabel,
      }))
      setTrialReadinessCheckpoints((current) => ({
        ...current,
        nsfwReviewedAt: new Date().toISOString(),
      }))
      pushBackendActionHistory('nsfw-detection', resultLabel)
    } catch {
      setBackendActions((current) => ({
        ...current,
        nsfwDetection: 'NSFW detection failed',
      }))
    }
  }

  const runBackendSam3ManualSegment = async () => {
    if (!image) {
      return
    }

    setBackendActions((current) => ({
      ...current,
      sam3ManualSegment: 'Running SAM3 manual segment...',
    }))

    try {
      const response = await measureAsyncAction(
        'SAM3 manual segment',
        performanceThresholds.sam3ManualSegment,
        () => runSam3ManualSegment(getPageBackendImageSource(image), backendSam3ModelSize, backendManualSegmentPoints),
      )
      const resultLabel = `SAM3 manual segment ready with ${backendManualSegmentPoints.length} point${
        backendManualSegmentPoints.length === 1 ? '' : 's'
      }`
      updateActiveBackendActionResults((current) => ({
        ...current,
        sam3ManualSegmentMaskReady: true,
        sam3ManualSegmentMask: response.bbox,
      }))
      setBackendActions((current) => ({
        ...current,
        sam3ManualSegment: resultLabel,
      }))
      pushBackendActionHistory('sam3-manual-segment', resultLabel)
    } catch {
      setBackendActions((current) => ({
        ...current,
        sam3ManualSegment: 'SAM3 manual segment failed',
      }))
    }
  }

  const applyBackendSam3AutoMosaicToCanvas = () => {
    const suggestions = backendActionResults.sam3AutoMosaic
      .map((mask, index) => ({ mask, index }))
      .filter(({ index }) => backendActionResults.sam3AutoMosaicSelection[index] !== false)
      .map(({ mask, index }) => {
        const bounds = parseBackendLayerSuggestion(mask, index)
        return {
          ...bounds,
          intensity: backendActionResults.sam3AutoMosaicIntensity[index] ?? 16,
          style: backendActionResults.sam3AutoMosaicStyle[index] ?? 'pixelate',
          name: getSam3CandidateLayerName(index),
        }
      })

    if (suggestions.length === 0) {
      return
    }

    addBackendMosaicLayers(suggestions)
    setBackendActions((current) => ({
      ...current,
      sam3AutoMosaic: `${current.sam3AutoMosaic ?? 'SAM3 auto mosaic ready'} applied to ${suggestions.length} mosaic layer${suggestions.length === 1 ? '' : 's'}`,
    }))
  }

  const applyBackendNsfwDetectionsToCanvas = () => {
    const suggestions = backendActionResults.nsfwDetections
      .map((detection, index) => ({ detection, index }))
      .filter(({ index }) => backendActionResults.nsfwDetectionSelection[index] !== false)
      .map(({ detection, index }) => {
        const bounds = parseBackendLayerSuggestion(detection, index)
        const color = backendActionResults.nsfwDetectionColor[index] ?? '#ff4d6d'
        return {
          ...bounds,
          color,
          opacity: backendActionResults.nsfwDetectionOpacity[index] ?? 0.4,
          fillMode: 'gradient' as const,
          gradientFrom: color,
          gradientTo: '#111111',
          gradientDirection: 'vertical' as const,
          name: getNsfwCandidateLayerName(index),
        }
      })

    if (suggestions.length === 0) {
      return
    }

    addBackendOverlayLayers(suggestions)
    setBackendActions((current) => ({
      ...current,
      nsfwDetection: `${current.nsfwDetection ?? 'NSFW detection ready'} applied to ${suggestions.length} overlay layer${suggestions.length === 1 ? '' : 's'}`,
    }))
  }

  const applyBackendSam3ManualSegmentToCanvas = () => {
    const manualBounds = backendActionResults.sam3ManualSegmentMask
      ? parseBackendLayerSuggestion(backendActionResults.sam3ManualSegmentMask, 0)
      : null
    const positivePoints = backendManualSegmentPoints.filter((point) => point.label === 1)
    const fallbackX = positivePoints.reduce((sum, point) => sum + point.x, 0) / Math.max(1, positivePoints.length)
    const fallbackY = positivePoints.reduce((sum, point) => sum + point.y, 0) / Math.max(1, positivePoints.length)

    addBackendMosaicLayers([
      {
        x: manualBounds?.x ?? (Number.isFinite(fallbackX) ? fallbackX : 960),
        y: manualBounds?.y ?? (Number.isFinite(fallbackY) ? fallbackY : 540),
        width: manualBounds?.width ?? 240,
        height: manualBounds?.height ?? 160,
        intensity: backendSam3ModelSize === 'large' ? 24 : 16,
        style: 'blur',
        name: 'SAM3 manual segment',
      },
    ])
    setBackendActions((current) => ({
      ...current,
      sam3ManualSegment: `${current.sam3ManualSegment ?? 'SAM3 manual segment ready'} applied to canvas`,
    }))
  }

  const recalculateActiveBackendSam3Review = async () => {
    if (!image) {
      return
    }

    await runBackendSam3AutoMosaic()
    setBackendActions((current) => ({
      ...current,
      sam3AutoMosaic: 'SAM3 review candidates recalculated',
    }))
  }

  const revertFocusedBackendSam3Candidate = () => {
    if (focusedSam3ReviewCandidateIndex === null) {
      return
    }

    updateActiveBackendActionResults((current) => {
      const baseline = current.sam3AutoMosaicBaseline
      if (!baseline) {
        return current
      }

      return {
        ...current,
        sam3AutoMosaic: current.sam3AutoMosaic.map((entry, index) =>
          index === focusedSam3ReviewCandidateIndex ? baseline.masks[index] ?? entry : entry,
        ),
        sam3AutoMosaicLabel: current.sam3AutoMosaicLabel.map((entry, index) =>
          index === focusedSam3ReviewCandidateIndex ? baseline.labels[index] ?? entry : entry,
        ),
        sam3AutoMosaicNote: current.sam3AutoMosaicNote.map((entry, index) =>
          index === focusedSam3ReviewCandidateIndex ? baseline.notes[index] ?? entry : entry,
        ),
        sam3AutoMosaicPriority: current.sam3AutoMosaicPriority.map((entry, index) =>
          index === focusedSam3ReviewCandidateIndex ? baseline.priority[index] ?? entry : entry,
        ),
        sam3AutoMosaicStyle: current.sam3AutoMosaicStyle.map((entry, index) =>
          index === focusedSam3ReviewCandidateIndex ? baseline.style[index] ?? entry : entry,
        ),
        sam3AutoMosaicIntensity: current.sam3AutoMosaicIntensity.map((entry, index) =>
          index === focusedSam3ReviewCandidateIndex ? baseline.intensity[index] ?? entry : entry,
        ),
      }
    })
    setBackendActions((current) => ({
      ...current,
      sam3AutoMosaic: 'Focused SAM3 review candidate reverted',
    }))
  }

  const recalculateActiveBackendNsfwReview = async () => {
    if (!image) {
      return
    }

    await runBackendNsfwDetection()
    setBackendActions((current) => ({
      ...current,
      nsfwDetection: 'NSFW review candidates recalculated',
    }))
  }

  const revertFocusedBackendNsfwCandidate = () => {
    if (focusedNsfwReviewCandidateIndex === null) {
      return
    }

    updateActiveBackendActionResults((current) => {
      const baseline = current.nsfwDetectionBaseline
      if (!baseline) {
        return current
      }

      return {
        ...current,
        nsfwDetections: current.nsfwDetections.map((entry, index) =>
          index === focusedNsfwReviewCandidateIndex ? baseline.detections[index] ?? entry : entry,
        ),
        nsfwDetectionLabel: current.nsfwDetectionLabel.map((entry, index) =>
          index === focusedNsfwReviewCandidateIndex ? baseline.labels[index] ?? entry : entry,
        ),
        nsfwDetectionNote: current.nsfwDetectionNote.map((entry, index) =>
          index === focusedNsfwReviewCandidateIndex ? baseline.notes[index] ?? entry : entry,
        ),
        nsfwDetectionPriority: current.nsfwDetectionPriority.map((entry, index) =>
          index === focusedNsfwReviewCandidateIndex ? baseline.priority[index] ?? entry : entry,
        ),
        nsfwDetectionColor: current.nsfwDetectionColor.map((entry, index) =>
          index === focusedNsfwReviewCandidateIndex ? baseline.color[index] ?? entry : entry,
        ),
        nsfwDetectionOpacity: current.nsfwDetectionOpacity.map((entry, index) =>
          index === focusedNsfwReviewCandidateIndex ? baseline.opacity[index] ?? entry : entry,
        ),
      }
    })
    setBackendActions((current) => ({
      ...current,
      nsfwDetection: 'Focused NSFW review candidate reverted',
    }))
  }

  const runBackendSam3AutoMosaicForAllPages = async () => {
    const projectPages = useWorkspaceStore.getState().pages

    if (projectPages.length === 0) {
      return
    }

    setBackendActions((current) => ({
      ...current,
      sam3Batch: `Running SAM3 batch for ${projectPages.length} page${projectPages.length === 1 ? '' : 's'}...`,
    }))

    let processedPages = 0
    let appliedLayers = 0
    const pageLayerMap = new Map<
      string,
      Array<{
        x: number
        y: number
        width: number
        height: number
        intensity: number
        style: 'pixelate'
        name: string
      }>
    >()

    try {
      for (const page of projectPages) {
        const response = await runSam3AutoMosaic(
          getPageBackendImageSource(page),
          backendSam3ModelSize,
          backendAutoMosaicStrength,
        )
        const suggestions = response.masks.map((mask, index) => {
          const bounds = parseBackendLayerSuggestion(mask, index)
          return {
            ...bounds,
            intensity: backendAutoMosaicStrength === 'light' ? 8 : backendAutoMosaicStrength === 'strong' ? 24 : 16,
            style: 'pixelate' as const,
            name: `${page.name} SAM3 mask ${index + 1}`,
          }
        })

        if (suggestions.length > 0) {
          pageLayerMap.set(page.id, suggestions)
          appliedLayers += suggestions.length
        }

        processedPages += 1
      }

      if (pageLayerMap.size > 0) {
        useWorkspaceStore.setState((current) => ({
          ...current,
          isDirty: true,
          loadError: null,
          pages: current.pages.map((page) => {
            const suggestions = pageLayerMap.get(page.id)
            if (!suggestions || suggestions.length === 0) {
              return page
            }

            return {
              ...page,
              mosaicLayers: [
                ...page.mosaicLayers,
                ...suggestions.map((layer, index) => ({
                  id: `mosaic-batch-${page.id}-${index}-${Date.now()}`,
                  name: layer.name,
                  groupId: null,
                  x: layer.x,
                  y: layer.y,
                  width: layer.width,
                  height: layer.height,
                  intensity: layer.intensity,
                  style: layer.style,
                  visible: true,
                  locked: false,
                })),
              ],
            }
          }),
        }))
      }

      setBackendActions((current) => ({
        ...current,
        sam3Batch: `SAM3 batch applied to ${processedPages} page${processedPages === 1 ? '' : 's'} with ${appliedLayers} mosaic layer${appliedLayers === 1 ? '' : 's'}`,
      }))
    } catch {
      setBackendActions((current) => ({
        ...current,
        sam3Batch: 'SAM3 batch run failed',
      }))
    }
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
    setActiveFocusedSam3ReviewCandidateIndex(selected && backendActionResults.sam3AutoMosaicSelection.length > 0 ? 0 : null)
    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicSelection: current.sam3AutoMosaicSelection.map(() => selected),
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
    setActiveFocusedNsfwReviewCandidateIndex(selected && backendActionResults.nsfwDetectionSelection.length > 0 ? 0 : null)
    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionSelection: current.nsfwDetectionSelection.map(() => selected),
    }))
  }

  const cycleFocusedBackendSam3AutoMosaicStyle = () => {
    if (focusedSam3ReviewCandidateIndex === null) {
      return
    }

    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicStyle: current.sam3AutoMosaicStyle.map((style, index) =>
        index === focusedSam3ReviewCandidateIndex
          ? style === 'pixelate'
            ? 'blur'
            : style === 'blur'
              ? 'noise'
              : 'pixelate'
          : style,
      ),
    }))
  }

  const increaseFocusedBackendSam3AutoMosaicIntensity = () => {
    if (focusedSam3ReviewCandidateIndex === null) {
      return
    }

    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicIntensity: current.sam3AutoMosaicIntensity.map((intensity, index) =>
        index === focusedSam3ReviewCandidateIndex ? Math.min(64, intensity + 8) : intensity,
      ),
    }))
  }

  const cycleFocusedBackendNsfwDetectionColor = () => {
    if (focusedNsfwReviewCandidateIndex === null) {
      return
    }

    const palette = ['#ff4d6d', '#ff9f1c', '#44ccff']
    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionColor: current.nsfwDetectionColor.map((color, index) =>
        index === focusedNsfwReviewCandidateIndex
          ? palette[(palette.indexOf(color) + 1 + palette.length) % palette.length] ?? palette[0]
          : color,
      ),
    }))
  }

  const increaseFocusedBackendNsfwDetectionOpacity = () => {
    if (focusedNsfwReviewCandidateIndex === null) {
      return
    }

    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionOpacity: current.nsfwDetectionOpacity.map((opacity, index) =>
        index === focusedNsfwReviewCandidateIndex ? Math.min(1, Math.round((opacity + 0.1) * 10) / 10) : opacity,
      ),
    }))
  }

  const renameFocusedBackendSam3Candidate = (label: string) => {
    if (focusedSam3ReviewCandidateIndex === null) {
      return
    }

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
    if (focusedSam3ReviewCandidateIndex === null) {
      return
    }

    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicNote: current.sam3AutoMosaic.map((_, index) =>
        index === focusedSam3ReviewCandidateIndex ? note : (current.sam3AutoMosaicNote[index] ?? ''),
      ),
    }))
  }

  const applyFocusedBackendSam3SettingsToSelected = () => {
    if (focusedSam3ReviewCandidateIndex === null) {
      return
    }

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
    if (focusedSam3ReviewCandidateIndex === null) {
      return
    }

    updateActiveBackendActionResults((current) => ({
      ...current,
      sam3AutoMosaicPriority: current.sam3AutoMosaic.map((_, index) => {
        const currentPriority = current.sam3AutoMosaicPriority[index] ?? 'medium'
        if (index !== focusedSam3ReviewCandidateIndex) {
          return currentPriority
        }

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

  const renameFocusedBackendNsfwCandidate = (label: string) => {
    if (focusedNsfwReviewCandidateIndex === null) {
      return
    }

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
    if (focusedNsfwReviewCandidateIndex === null) {
      return
    }

    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionNote: current.nsfwDetections.map((_, index) =>
        index === focusedNsfwReviewCandidateIndex ? note : (current.nsfwDetectionNote[index] ?? ''),
      ),
    }))
  }

  const applyFocusedBackendNsfwSettingsToSelected = () => {
    if (focusedNsfwReviewCandidateIndex === null) {
      return
    }

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
    if (focusedNsfwReviewCandidateIndex === null) {
      return
    }

    updateActiveBackendActionResults((current) => ({
      ...current,
      nsfwDetectionPriority: current.nsfwDetections.map((_, index) => {
        const currentPriority = current.nsfwDetectionPriority[index] ?? 'medium'
        if (index !== focusedNsfwReviewCandidateIndex) {
          return currentPriority
        }

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

  const addBackendManualSegmentPointAtCoordinates = (x: number, y: number, label: 1 | 0) => {
    setBackendManualSegmentPoints((current) => [...current, { x, y, label }])
    setSelectedBackendManualSegmentPointIndex(backendManualSegmentPoints.length)
  }

  const resetBackendManualSegmentPoints = () => {
    setBackendManualSegmentPoints(DEFAULT_SAM3_MANUAL_SEGMENT_POINTS)
    setSelectedBackendManualSegmentPointIndex(DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length - 1)
  }

  const toggleLastBackendManualSegmentPointLabel = () => {
    setBackendManualSegmentPoints((current) => {
      if (current.length === 0) {
        return current
      }

      const nextPoints = [...current]
      const lastPoint = nextPoints[nextPoints.length - 1]

      if (!lastPoint) {
        return current
      }

      nextPoints[nextPoints.length - 1] = {
        ...lastPoint,
        label: lastPoint.label === 1 ? 0 : 1,
      }

      return nextPoints
    })
  }

  const moveLastBackendManualSegmentPoint = () => {
    setBackendManualSegmentPoints((current) => {
      if (current.length === 0) {
        return current
      }

      const nextPoints = [...current]
      const lastPoint = nextPoints[nextPoints.length - 1]

      if (!lastPoint) {
        return current
      }

      nextPoints[nextPoints.length - 1] = {
        ...lastPoint,
        x: Math.min(1920, lastPoint.x + 64),
        y: Math.min(1080, lastPoint.y + 32),
      }

      return nextPoints
    })
  }

  const removeLastBackendManualSegmentPoint = () => {
    setBackendManualSegmentPoints((current) => {
      if (current.length <= DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length) {
        return current
      }

      return current.slice(0, -1)
    })
  }

  const toggleSelectedBackendManualSegmentPointLabel = () => {
    setBackendManualSegmentPoints((current) =>
      current.map((point, index) =>
        index === selectedBackendManualSegmentPointIndex
          ? {
              ...point,
              label: point.label === 1 ? 0 : 1,
            }
          : point,
      ),
    )
  }

  const moveSelectedBackendManualSegmentPoint = () => {
    setBackendManualSegmentPoints((current) =>
      current.map((point, index) =>
        index === selectedBackendManualSegmentPointIndex
          ? {
              ...point,
              x: Math.min(1920, point.x + 64),
              y: Math.min(1080, point.y + 32),
            }
          : point,
      ),
    )
  }

  const removeSelectedBackendManualSegmentPoint = () => {
    if (backendManualSegmentPoints.length <= DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length) {
      return
    }

    setBackendManualSegmentPoints((current) =>
      current.filter((_, index) => index !== selectedBackendManualSegmentPointIndex),
    )
    setSelectedBackendManualSegmentPointIndex((current) =>
      Math.max(0, Math.min(current - 1, backendManualSegmentPoints.length - 2)),
    )
  }

  const rerunLastBackendAction = async () => {
    const lastAction = backendActionHistory[0]
    if (!lastAction || !image) {
      return
    }
    await rerunBackendAction(lastAction)
  }

  const clearBackendActionHistory = () => {
    setBackendActionHistory([])
  }

  const rerunBackendAction = async (entry: BackendActionHistoryEntry) => {
    if (!image) {
      return
    }

    if (entry.type === 'sam3-auto-mosaic') {
      await runBackendSam3AutoMosaic()
      return
    }

    if (entry.type === 'nsfw-detection') {
      await runBackendNsfwDetection()
      return
    }

    await runBackendSam3ManualSegment()
  }

  const isAdditiveSelection = (event: Pick<MouseEvent, 'ctrlKey' | 'metaKey'>) => event.ctrlKey || event.metaKey
  const marqueeBounds = marqueeSelection
    ? {
        left: Math.min(marqueeSelection.startX, marqueeSelection.currentX),
        top: Math.min(marqueeSelection.startY, marqueeSelection.currentY),
        right: Math.max(marqueeSelection.startX, marqueeSelection.currentX),
        bottom: Math.max(marqueeSelection.startY, marqueeSelection.currentY),
      }
    : null
  const dragPreviewOffset = layerDragState
    ? {
        x: layerDragState.currentX - layerDragState.startX,
        y: layerDragState.currentY - layerDragState.startY,
      }
    : null
  const selectedCanvasLayerIds = selectedLayerIds.filter((id) => id !== 'base-image')
  const baseSelectionBounds = (() => {
    if (!image || selectedCanvasLayerIds.length === 0) {
      return null
    }

    const selectedIds = new Set(selectedCanvasLayerIds)
    const bounds = [
      ...image.textLayers
        .filter((layer) => layer.visible && selectedIds.has(layer.id))
        .map((layer) => ({
          left: layer.x - 28,
          top: layer.y - 28,
          right: layer.x + 28,
          bottom: layer.y + 28,
        })),
      ...image.bubbleLayers
        .filter((layer) => layer.visible && selectedIds.has(layer.id))
        .map((layer) => ({
          left: layer.x,
          top: layer.y,
          right: layer.x + layer.width,
          bottom: layer.y + layer.height,
        })),
      ...image.mosaicLayers
        .filter((layer) => layer.visible && selectedIds.has(layer.id))
        .map((layer) => ({
          left: layer.x,
          top: layer.y,
          right: layer.x + layer.width,
          bottom: layer.y + layer.height,
        })),
      ...image.overlayLayers
        .filter((layer) => layer.visible && selectedIds.has(layer.id))
        .map((layer) => ({
          left: layer.x,
          top: layer.y,
          right: layer.x + layer.width,
          bottom: layer.y + layer.height,
        })),
    ]

    if (bounds.length === 0) {
      return null
    }

    return {
      left: Math.min(...bounds.map((entry) => entry.left)),
      top: Math.min(...bounds.map((entry) => entry.top)),
      right: Math.max(...bounds.map((entry) => entry.right)),
      bottom: Math.max(...bounds.map((entry) => entry.bottom)),
    }
  })()
  const resizePreviewDelta =
    layerResizeState && baseSelectionBounds
      ? (() => {
          const rawDeltaX = layerResizeState.currentX - layerResizeState.startX
          const rawDeltaY = layerResizeState.currentY - layerResizeState.startY
          const isCornerHandle =
            (layerResizeState.handle.includes('left') || layerResizeState.handle.includes('right')) &&
            (layerResizeState.handle.includes('top') || layerResizeState.handle.includes('bottom'))

          let horizontalDelta = rawDeltaX
          let verticalDelta = rawDeltaY

          if (layerResizeState.preserveAspectRatio && isCornerHandle) {
            const baseWidth = Math.max(1, baseSelectionBounds.right - baseSelectionBounds.left)
            const baseHeight = Math.max(1, baseSelectionBounds.bottom - baseSelectionBounds.top)
            const widthRatio = Math.abs(rawDeltaX) / baseWidth
            const heightRatio = Math.abs(rawDeltaY) / baseHeight

            if (widthRatio >= heightRatio) {
              verticalDelta = Math.round((rawDeltaX * baseHeight) / baseWidth)
            } else {
              horizontalDelta = Math.round((rawDeltaY * baseWidth) / baseHeight)
            }
          }

          return {
            left: layerResizeState.handle.includes('left') ? horizontalDelta : 0,
            right: layerResizeState.handle.includes('right') ? horizontalDelta : 0,
            top: layerResizeState.handle.includes('top') ? verticalDelta : 0,
            bottom: layerResizeState.handle.includes('bottom') ? verticalDelta : 0,
          }
        })()
      : null
  const selectionBounds = baseSelectionBounds
    ? {
        left:
          baseSelectionBounds.left +
          (dragPreviewOffset?.x ?? 0) +
          (resizePreviewDelta?.left ?? 0),
        top:
          baseSelectionBounds.top +
          (dragPreviewOffset?.y ?? 0) +
          (resizePreviewDelta?.top ?? 0),
        right:
          baseSelectionBounds.right +
          (dragPreviewOffset?.x ?? 0) +
          (resizePreviewDelta?.right ?? 0),
        bottom:
          baseSelectionBounds.bottom +
          (dragPreviewOffset?.y ?? 0) +
          (resizePreviewDelta?.bottom ?? 0),
      }
    : null
  const selectionBoundsLabel =
    selectionBounds && selectedLayerCount > 1
      ? `Selection bounds ${Math.max(0, Math.round(selectionBounds.right - selectionBounds.left))} x ${Math.max(0, Math.round(selectionBounds.bottom - selectionBounds.top))}`
      : null

  useEffect(() => {
    setProjectNameDraft(projectName)
    setWidthDraft(String(outputSettings.width))
    setHeightDraft(String(outputSettings.height))
    setPrefixDraft(outputSettings.fileNamePrefix)
    setStartNumberDraft(String(outputSettings.startNumber))
    setNumberPaddingDraft(String(outputSettings.numberPadding))
  }, [
    outputSettings.fileNamePrefix,
    outputSettings.height,
    outputSettings.numberPadding,
    outputSettings.startNumber,
    outputSettings.width,
    projectName,
  ])

  useEffect(() => {
    if (backendManualSegmentPoints.length === 0) {
      return
    }

    setSelectedBackendManualSegmentPointIndex((current) =>
      Math.max(0, Math.min(current, backendManualSegmentPoints.length - 1)),
    )
  }, [backendManualSegmentPoints])

  useEffect(() => {
    updateActiveBackendActionResults((current) =>
      current.sam3ManualSegmentMaskReady || current.sam3ManualSegmentMask
        ? {
            ...current,
            sam3ManualSegmentMaskReady: false,
            sam3ManualSegmentMask: null,
          }
        : current,
    )
  }, [backendManualSegmentPoints, updateActiveBackendActionResults])

  useEffect(() => {
    const storedHistory = window.localStorage.getItem(EXPORT_HISTORY_STORAGE_KEY)

    if (!storedHistory) {
      return
    }

    try {
      const parsedHistory = JSON.parse(storedHistory) as ExportHistoryEntry[]
      if (Array.isArray(parsedHistory)) {
        setRecentExports(parsedHistory.slice(0, 5))
      }
    } catch {
      window.localStorage.removeItem(EXPORT_HISTORY_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(EXPORT_HISTORY_STORAGE_KEY, JSON.stringify(recentExports))
  }, [recentExports])

  useEffect(() => {
    window.localStorage.setItem(PERFORMANCE_METRICS_STORAGE_KEY, JSON.stringify(performanceMetrics))
  }, [performanceMetrics])

  useEffect(() => {
    window.localStorage.setItem(
      PERFORMANCE_THRESHOLD_SETTINGS_STORAGE_KEY,
      JSON.stringify(performanceThresholds),
    )
  }, [performanceThresholds])

  useEffect(() => {
    window.localStorage.setItem(TRIAL_CHECKPOINTS_STORAGE_KEY, JSON.stringify(trialReadinessCheckpoints))
  }, [trialReadinessCheckpoints])

  useEffect(() => {
    window.localStorage.setItem(PORTABLE_SMOKE_CHECKLIST_STORAGE_KEY, JSON.stringify(portableSmokeChecklist))
  }, [portableSmokeChecklist])

  useEffect(() => {
    window.localStorage.setItem(IMPORTED_HANDOFF_HISTORY_STORAGE_KEY, JSON.stringify(importedHandoffHistory))
  }, [importedHandoffHistory])

  useEffect(() => {
    if (!importedPortableSmokeReport) {
      window.localStorage.removeItem(IMPORTED_PORTABLE_SMOKE_REPORT_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(
      IMPORTED_PORTABLE_SMOKE_REPORT_STORAGE_KEY,
      JSON.stringify(importedPortableSmokeReport),
    )
  }, [importedPortableSmokeReport])

  useEffect(() => {
    const storedSettings = window.localStorage.getItem(BACKEND_SETTINGS_STORAGE_KEY)

    if (!storedSettings) {
      return
    }

      try {
        const parsedSettings = JSON.parse(storedSettings) as {
          sam3ModelSize?: 'base' | 'large'
          autoMosaicStrength?: 'light' | 'medium' | 'strong'
          nsfwThreshold?: string
          manualSegmentPoints?: Sam3SegmentPoint[]
          sam3BackendPreference?: BackendPreference
          nudenetBackendPreference?: BackendPreference
          sam3CheckpointPath?: string
          sam3ConfigPath?: string
        }

      if (parsedSettings.sam3ModelSize === 'large' || parsedSettings.sam3ModelSize === 'base') {
        setBackendSam3ModelSize(parsedSettings.sam3ModelSize)
      }

      if (
        parsedSettings.autoMosaicStrength === 'light' ||
        parsedSettings.autoMosaicStrength === 'medium' ||
        parsedSettings.autoMosaicStrength === 'strong'
      ) {
        setBackendAutoMosaicStrength(parsedSettings.autoMosaicStrength)
      }

        if (typeof parsedSettings.nsfwThreshold === 'string') {
          setBackendNsfwThreshold(parsedSettings.nsfwThreshold)
        }

        if (Array.isArray(parsedSettings.manualSegmentPoints)) {
          const validPoints = parsedSettings.manualSegmentPoints.filter(
            (point): point is Sam3SegmentPoint =>
              Boolean(point) &&
              typeof point.x === 'number' &&
              typeof point.y === 'number' &&
              (point.label === 0 || point.label === 1),
          )

          if (validPoints.length >= DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length) {
            setBackendManualSegmentPoints(validPoints)
          }
        }

        if (
          parsedSettings.sam3BackendPreference === 'auto' ||
          parsedSettings.sam3BackendPreference === 'native' ||
          parsedSettings.sam3BackendPreference === 'heuristic'
        ) {
          setSam3BackendPreference(parsedSettings.sam3BackendPreference)
        }

        if (
          parsedSettings.nudenetBackendPreference === 'auto' ||
          parsedSettings.nudenetBackendPreference === 'native' ||
          parsedSettings.nudenetBackendPreference === 'heuristic'
        ) {
          setNudenetBackendPreference(parsedSettings.nudenetBackendPreference)
        }

        if (typeof parsedSettings.sam3CheckpointPath === 'string') {
          setSam3CheckpointPath(parsedSettings.sam3CheckpointPath)
        }

        if (typeof parsedSettings.sam3ConfigPath === 'string') {
          setSam3ConfigPath(parsedSettings.sam3ConfigPath)
        }
      } catch {
        window.localStorage.removeItem(BACKEND_SETTINGS_STORAGE_KEY)
      }
    }, [])

  useEffect(() => {
    window.localStorage.setItem(
      BACKEND_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          sam3ModelSize: backendSam3ModelSize,
          autoMosaicStrength: backendAutoMosaicStrength,
          nsfwThreshold: backendNsfwThreshold,
          manualSegmentPoints: backendManualSegmentPoints,
          sam3BackendPreference,
          nudenetBackendPreference,
          sam3CheckpointPath,
          sam3ConfigPath,
        }),
      )
  }, [
    backendAutoMosaicStrength,
    backendManualSegmentPoints,
    backendNsfwThreshold,
    backendSam3ModelSize,
    nudenetBackendPreference,
    sam3CheckpointPath,
    sam3ConfigPath,
    sam3BackendPreference,
  ])

  useEffect(() => {
    const storedBackendActionHistory = window.localStorage.getItem(BACKEND_ACTION_HISTORY_STORAGE_KEY)

    if (!storedBackendActionHistory) {
      return
    }

    try {
      const parsedHistory = JSON.parse(storedBackendActionHistory) as BackendActionHistoryEntry[]
              if (Array.isArray(parsedHistory)) {
                setBackendActionHistory(
                  parsedHistory
                    .filter(
                      (entry): entry is BackendActionHistoryEntry =>
                Boolean(entry) &&
                typeof entry.id === 'string' &&
                typeof entry.label === 'string' &&
                (entry.type === 'sam3-auto-mosaic' ||
                  entry.type === 'nsfw-detection' ||
                  entry.type === 'sam3-manual-segment'),
                    )
                    .slice(0, 5),
                )
      }
    } catch {
      window.localStorage.removeItem(BACKEND_ACTION_HISTORY_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(BACKEND_ACTION_HISTORY_STORAGE_KEY, JSON.stringify(backendActionHistory))
  }, [backendActionHistory])

  useEffect(() => {
    const storedReviewState = window.localStorage.getItem(BACKEND_REVIEW_STATE_STORAGE_KEY)

    if (!storedReviewState) {
      return
    }

    try {
      const parsedReviewState = JSON.parse(storedReviewState) as {
        pages?: Record<
          string,
          {
            backendActionResults?: Partial<BackendActionResultState>
            focusedSam3ReviewCandidateIndex?: number | null
            focusedNsfwReviewCandidateIndex?: number | null
          }
        >
        backendActionResults?: Partial<BackendActionResultState>
        focusedSam3ReviewCandidateIndex?: number | null
        focusedNsfwReviewCandidateIndex?: number | null
      }

      const normalizeBackendActionResults = (
        rawResults: Partial<BackendActionResultState> | undefined,
      ): BackendActionResultState => {
        const fallback = createEmptyBackendActionResults()

        return {
          sam3AutoMosaic: Array.isArray(rawResults?.sam3AutoMosaic) ? rawResults.sam3AutoMosaic : fallback.sam3AutoMosaic,
          sam3AutoMosaicSelection: Array.isArray(rawResults?.sam3AutoMosaicSelection)
            ? rawResults.sam3AutoMosaicSelection
            : fallback.sam3AutoMosaicSelection,
          sam3AutoMosaicLabel: Array.isArray(rawResults?.sam3AutoMosaicLabel)
            ? rawResults.sam3AutoMosaicLabel.map((label) => (typeof label === 'string' ? label : ''))
            : fallback.sam3AutoMosaicLabel,
          sam3AutoMosaicNote: Array.isArray(rawResults?.sam3AutoMosaicNote)
            ? rawResults.sam3AutoMosaicNote.map((note) => (typeof note === 'string' ? note : ''))
            : fallback.sam3AutoMosaicNote,
          sam3AutoMosaicPriority: Array.isArray(rawResults?.sam3AutoMosaicPriority)
            ? rawResults.sam3AutoMosaicPriority.map((priority) =>
                priority === 'low' || priority === 'high' ? priority : 'medium',
              )
            : fallback.sam3AutoMosaicPriority,
          sam3AutoMosaicStyle: Array.isArray(rawResults?.sam3AutoMosaicStyle)
            ? rawResults.sam3AutoMosaicStyle
            : fallback.sam3AutoMosaicStyle,
          sam3AutoMosaicIntensity: Array.isArray(rawResults?.sam3AutoMosaicIntensity)
            ? rawResults.sam3AutoMosaicIntensity
            : fallback.sam3AutoMosaicIntensity,
          nsfwDetections: Array.isArray(rawResults?.nsfwDetections) ? rawResults.nsfwDetections : fallback.nsfwDetections,
          nsfwDetectionSelection: Array.isArray(rawResults?.nsfwDetectionSelection)
            ? rawResults.nsfwDetectionSelection
            : fallback.nsfwDetectionSelection,
          nsfwDetectionLabel: Array.isArray(rawResults?.nsfwDetectionLabel)
            ? rawResults.nsfwDetectionLabel.map((label) => (typeof label === 'string' ? label : ''))
            : fallback.nsfwDetectionLabel,
          nsfwDetectionNote: Array.isArray(rawResults?.nsfwDetectionNote)
            ? rawResults.nsfwDetectionNote.map((note) => (typeof note === 'string' ? note : ''))
            : fallback.nsfwDetectionNote,
          nsfwDetectionPriority: Array.isArray(rawResults?.nsfwDetectionPriority)
            ? rawResults.nsfwDetectionPriority.map((priority) =>
                priority === 'low' || priority === 'high' ? priority : 'medium',
              )
            : fallback.nsfwDetectionPriority,
          nsfwDetectionColor: Array.isArray(rawResults?.nsfwDetectionColor)
            ? rawResults.nsfwDetectionColor
            : fallback.nsfwDetectionColor,
          nsfwDetectionOpacity: Array.isArray(rawResults?.nsfwDetectionOpacity)
            ? rawResults.nsfwDetectionOpacity
            : fallback.nsfwDetectionOpacity,
          sam3ManualSegmentMaskReady:
            typeof rawResults?.sam3ManualSegmentMaskReady === 'boolean'
              ? rawResults.sam3ManualSegmentMaskReady
              : fallback.sam3ManualSegmentMaskReady,
          sam3ManualSegmentMask:
            rawResults?.sam3ManualSegmentMask && typeof rawResults.sam3ManualSegmentMask === 'object'
              ? rawResults.sam3ManualSegmentMask
              : fallback.sam3ManualSegmentMask,
          sam3AutoMosaicBaseline:
            rawResults?.sam3AutoMosaicBaseline && typeof rawResults.sam3AutoMosaicBaseline === 'object'
              ? {
                  masks: Array.isArray(rawResults.sam3AutoMosaicBaseline.masks)
                    ? rawResults.sam3AutoMosaicBaseline.masks
                    : fallback.sam3AutoMosaicBaseline,
                  labels: Array.isArray(rawResults.sam3AutoMosaicBaseline.labels)
                    ? rawResults.sam3AutoMosaicBaseline.labels.map((entry) => (typeof entry === 'string' ? entry : ''))
                    : fallback.sam3AutoMosaicBaseline?.labels ?? [],
                  notes: Array.isArray(rawResults.sam3AutoMosaicBaseline.notes)
                    ? rawResults.sam3AutoMosaicBaseline.notes.map((entry) => (typeof entry === 'string' ? entry : ''))
                    : fallback.sam3AutoMosaicBaseline?.notes ?? [],
                  priority: Array.isArray(rawResults.sam3AutoMosaicBaseline.priority)
                    ? rawResults.sam3AutoMosaicBaseline.priority.map((entry) =>
                        entry === 'low' || entry === 'high' ? entry : 'medium',
                      )
                    : fallback.sam3AutoMosaicBaseline?.priority ?? [],
                  style: Array.isArray(rawResults.sam3AutoMosaicBaseline.style)
                    ? rawResults.sam3AutoMosaicBaseline.style
                    : fallback.sam3AutoMosaicBaseline?.style ?? [],
                  intensity: Array.isArray(rawResults.sam3AutoMosaicBaseline.intensity)
                    ? rawResults.sam3AutoMosaicBaseline.intensity
                    : fallback.sam3AutoMosaicBaseline?.intensity ?? [],
                }
              : fallback.sam3AutoMosaicBaseline,
          nsfwDetectionBaseline:
            rawResults?.nsfwDetectionBaseline && typeof rawResults.nsfwDetectionBaseline === 'object'
              ? {
                  detections: Array.isArray(rawResults.nsfwDetectionBaseline.detections)
                    ? rawResults.nsfwDetectionBaseline.detections
                    : fallback.nsfwDetectionBaseline?.detections ?? [],
                  labels: Array.isArray(rawResults.nsfwDetectionBaseline.labels)
                    ? rawResults.nsfwDetectionBaseline.labels.map((entry) => (typeof entry === 'string' ? entry : ''))
                    : fallback.nsfwDetectionBaseline?.labels ?? [],
                  notes: Array.isArray(rawResults.nsfwDetectionBaseline.notes)
                    ? rawResults.nsfwDetectionBaseline.notes.map((entry) => (typeof entry === 'string' ? entry : ''))
                    : fallback.nsfwDetectionBaseline?.notes ?? [],
                  priority: Array.isArray(rawResults.nsfwDetectionBaseline.priority)
                    ? rawResults.nsfwDetectionBaseline.priority.map((entry) =>
                        entry === 'low' || entry === 'high' ? entry : 'medium',
                      )
                    : fallback.nsfwDetectionBaseline?.priority ?? [],
                  color: Array.isArray(rawResults.nsfwDetectionBaseline.color)
                    ? rawResults.nsfwDetectionBaseline.color.map((entry) => (typeof entry === 'string' ? entry : '#ff4d6d'))
                    : fallback.nsfwDetectionBaseline?.color ?? [],
                  opacity: Array.isArray(rawResults.nsfwDetectionBaseline.opacity)
                    ? rawResults.nsfwDetectionBaseline.opacity
                    : fallback.nsfwDetectionBaseline?.opacity ?? [],
                }
              : fallback.nsfwDetectionBaseline,
        }
      }

      const normalizeBackendReviewPageState = (rawPageState: {
        backendActionResults?: Partial<BackendActionResultState>
        focusedSam3ReviewCandidateIndex?: number | null
        focusedNsfwReviewCandidateIndex?: number | null
      }): BackendReviewPageState => ({
        backendActionResults: normalizeBackendActionResults(rawPageState.backendActionResults),
        focusedSam3ReviewCandidateIndex:
          typeof rawPageState.focusedSam3ReviewCandidateIndex === 'number' ||
          rawPageState.focusedSam3ReviewCandidateIndex === null
            ? rawPageState.focusedSam3ReviewCandidateIndex
            : null,
        focusedNsfwReviewCandidateIndex:
          typeof rawPageState.focusedNsfwReviewCandidateIndex === 'number' ||
          rawPageState.focusedNsfwReviewCandidateIndex === null
            ? rawPageState.focusedNsfwReviewCandidateIndex
            : null,
      })

      if (parsedReviewState.pages && typeof parsedReviewState.pages === 'object') {
        const normalizedPages = Object.fromEntries(
          Object.entries(parsedReviewState.pages).map(([pageId, state]) => [pageId, normalizeBackendReviewPageState(state)]),
        )
        setBackendReviewStateByPage(normalizedPages)
      } else {
        setBackendReviewStateByPage({
          [GLOBAL_BACKEND_REVIEW_PAGE_ID]: normalizeBackendReviewPageState(parsedReviewState),
        })
      }
    } catch {
      window.localStorage.removeItem(BACKEND_REVIEW_STATE_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      BACKEND_REVIEW_STATE_STORAGE_KEY,
      JSON.stringify({
        pages: backendReviewStateByPage,
      }),
    )
  }, [backendReviewStateByPage])

  const getCanvasCoordinatesFromRect = (clientX: number, clientY: number, rect: DOMRect | Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>) => {
    const relativeX = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
    const relativeY = rect.height > 0 ? (clientY - rect.top) / rect.height : 0

    return {
      x: Math.max(0, Math.min(1920, Math.round(relativeX * 1920))),
      y: Math.max(0, Math.min(1080, Math.round(relativeY * 1080))),
    }
  }

  const getCanvasCoordinates = (event: ReactMouseEvent<HTMLDivElement>) =>
    getCanvasCoordinatesFromRect(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())

  const collectMarqueeLayerIds = (left: number, top: number, right: number, bottom: number) => {
    if (!image) {
      return []
    }

    const intersects = (layerLeft: number, layerTop: number, layerRight: number, layerBottom: number) =>
      layerLeft <= right && layerRight >= left && layerTop <= bottom && layerBottom >= top

    return [
      ...image.textLayers
        .filter((layer) => layer.visible && layer.x >= left && layer.x <= right && layer.y >= top && layer.y <= bottom)
        .map((layer) => layer.id),
      ...image.bubbleLayers
        .filter((layer) => layer.visible && intersects(layer.x, layer.y, layer.x + layer.width, layer.y + layer.height))
        .map((layer) => layer.id),
      ...image.mosaicLayers
        .filter((layer) => layer.visible && intersects(layer.x, layer.y, layer.x + layer.width, layer.y + layer.height))
        .map((layer) => layer.id),
      ...image.overlayLayers
        .filter((layer) => layer.visible && intersects(layer.x, layer.y, layer.x + layer.width, layer.y + layer.height))
        .map((layer) => layer.id),
    ]
  }

  const handleCanvasMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (backendManualPointPickingMode !== 'off') {
      return
    }

    if (layerDragState || layerResizeState) {
      return
    }

    if (event.target !== event.currentTarget) {
      return
    }

    const coordinates = getCanvasCoordinates(event)
    setMarqueeSelection({
      startX: coordinates.x,
      startY: coordinates.y,
      currentX: coordinates.x,
      currentY: coordinates.y,
      additive: isAdditiveSelection(event),
    })
  }

  const handleCanvasMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (backendManualPointDragState) {
      const coordinates = getCanvasCoordinates(event)
      setBackendManualPointDragState((current) =>
        current
          ? {
              ...current,
              currentX: coordinates.x,
              currentY: coordinates.y,
            }
          : current,
      )
      return
    }

    if (layerResizeState) {
      const coordinates = getCanvasCoordinates(event)
      setLayerResizeState((current) =>
        current
          ? {
              ...current,
              currentX: coordinates.x,
              currentY: coordinates.y,
            }
          : current,
      )
      return
    }

    if (layerDragState) {
      const coordinates = getCanvasCoordinates(event)
      setLayerDragState((current) =>
        current
          ? {
              ...current,
              currentX: coordinates.x,
              currentY: coordinates.y,
            }
          : current,
      )
      return
    }

    if (!marqueeSelection) {
      return
    }

    const coordinates = getCanvasCoordinates(event)
    setMarqueeSelection((current) =>
      current
        ? {
            ...current,
            currentX: coordinates.x,
            currentY: coordinates.y,
          }
        : current,
    )
  }

  const handleCanvasMouseUp = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (backendManualPointDragState) {
      const coordinates = getCanvasCoordinates(event)
      setBackendManualSegmentPoints((current) =>
        current.map((point, index) =>
          index === backendManualPointDragState.index
            ? {
                ...point,
                x: coordinates.x,
                y: coordinates.y,
              }
            : point,
        ),
      )
      setSelectedBackendManualSegmentPointIndex(backendManualPointDragState.index)
      setBackendManualPointDragState(null)
      return
    }

    if (backendManualPointPickingMode !== 'off') {
      const coordinates = getCanvasCoordinates(event)
      addBackendManualSegmentPointAtCoordinates(
        coordinates.x,
        coordinates.y,
        backendManualPointPickingMode === 'negative' ? 0 : 1,
      )
      setBackendManualPointPickingMode('off')
      return
    }

    if (layerResizeState) {
      const coordinates = getCanvasCoordinates(event)
      resizeSelectedLayersByDelta(
        coordinates.x - layerResizeState.startX,
        coordinates.y - layerResizeState.startY,
        layerResizeState.handle,
        layerResizeState.preserveAspectRatio,
      )
      setLayerResizeState(null)
      return
    }

    if (layerDragState) {
      const coordinates = getCanvasCoordinates(event)
      moveSelectedLayersByDelta(coordinates.x - layerDragState.startX, coordinates.y - layerDragState.startY)
      setLayerDragState(null)
      return
    }

    if (!marqueeSelection) {
      return
    }

    const coordinates = getCanvasCoordinates(event)
    const left = Math.min(marqueeSelection.startX, coordinates.x)
    const top = Math.min(marqueeSelection.startY, coordinates.y)
    const right = Math.max(marqueeSelection.startX, coordinates.x)
    const bottom = Math.max(marqueeSelection.startY, coordinates.y)
    const layerIds = collectMarqueeLayerIds(left, top, right, bottom)

    setSelectedLayerIds(layerIds, marqueeSelection.additive)
    setMarqueeSelection(null)
  }

  const handleLayerMouseDown = (event: ReactMouseEvent<HTMLButtonElement>, layerId: string) => {
    if (event.button !== 0) {
      return
    }

    const currentSelection = selectedLayerIds.length > 0 ? selectedLayerIds : selectedLayerId ? [selectedLayerId] : []
    if (!currentSelection.includes(layerId)) {
      return
    }

    const canvasFrame = event.currentTarget.closest('.canvas-frame')
    if (!canvasFrame) {
      return
    }

    const coordinates = getCanvasCoordinatesFromRect(
      event.clientX,
      event.clientY,
      canvasFrame.getBoundingClientRect(),
    )
    setLayerDragState({
      startX: coordinates.x,
      startY: coordinates.y,
      currentX: coordinates.x,
      currentY: coordinates.y,
    })
  }

  const handleManualSegmentPointMouseDown = (event: ReactMouseEvent<HTMLButtonElement>, index: number) => {
    event.stopPropagation()

    if (event.button !== 0) {
      return
    }

    const canvasFrame = event.currentTarget.closest('.canvas-frame')
    if (!canvasFrame) {
      return
    }

    const coordinates = getCanvasCoordinatesFromRect(
      event.clientX,
      event.clientY,
      canvasFrame.getBoundingClientRect(),
    )

    setSelectedBackendManualSegmentPointIndex(index)
    setBackendManualPointDragState({
      index,
      startX: coordinates.x,
      startY: coordinates.y,
      currentX: coordinates.x,
      currentY: coordinates.y,
    })
  }

  const handleSelectionResizeMouseDown = (event: ReactMouseEvent<HTMLButtonElement>, handle: ResizeHandle) => {
    event.stopPropagation()

    const canvasFrame = event.currentTarget.closest('.canvas-frame')
    if (!canvasFrame) {
      return
    }

    const coordinates = getCanvasCoordinatesFromRect(
      event.clientX,
      event.clientY,
      canvasFrame.getBoundingClientRect(),
    )

    setLayerResizeState({
      startX: coordinates.x,
      startY: coordinates.y,
      currentX: coordinates.x,
      currentY: coordinates.y,
      handle,
      preserveAspectRatio: event.shiftKey,
    })
  }

  const handleLoadSampleImage = useCallback(() => {
    measureSyncAction('Load sample image', performanceThresholds.loadSampleImage, () => {
      loadSampleImage()
      setTrialReadinessCheckpoints((current) => ({
        ...current,
        sampleLoadedAt: new Date().toISOString(),
      }))
    })
  }, [loadSampleImage, measureSyncAction, performanceThresholds.loadSampleImage])

  const handleSaveNow = useCallback(() => {
    measureSyncAction('Save project', performanceThresholds.saveProject, () => {
      saveNow()
      setTrialReadinessCheckpoints((current) => ({
        ...current,
        projectSavedAt: new Date().toISOString(),
      }))
    })
  }, [measureSyncAction, performanceThresholds.saveProject, saveNow])

  const trialReadinessItems = [
    {
      label: 'Backend connected',
      completedAt: trialReadinessCheckpoints.backendConnectedAt,
      required: true,
    },
    {
      label: 'Sample loaded',
      completedAt: trialReadinessCheckpoints.sampleLoadedAt,
      required: true,
    },
    {
      label: 'Project saved',
      completedAt: trialReadinessCheckpoints.projectSavedAt,
      required: true,
    },
    {
      label: 'Project restored',
      completedAt: trialReadinessCheckpoints.projectRestoredAt,
      required: false,
    },
    {
      label: 'Export completed',
      completedAt: trialReadinessCheckpoints.exportCompletedAt,
      required: true,
    },
    {
      label: 'SAM3 reviewed',
      completedAt: trialReadinessCheckpoints.sam3ReviewedAt,
      required: false,
    },
    {
      label: 'NSFW reviewed',
      completedAt: trialReadinessCheckpoints.nsfwReviewedAt,
      required: false,
    },
  ] as const

  const trialReadinessCompletedCount = trialReadinessItems.filter((item) => item.completedAt).length
  const isPortableTrialReady = trialReadinessItems.filter((item) => item.required).every((item) => item.completedAt)
  const portableSmokePassedCount = portableSmokeChecklist.filter((item) => item.status === 'passed').length
  const portableSmokeFailedCount = portableSmokeChecklist.filter((item) => item.status === 'failed').length
  const portableSmokeReady =
    portableSmokeChecklist.length > 0 && portableSmokeChecklist.every((item) => item.status === 'passed')
  const performanceWarningCount = performanceMetrics.filter((item) => item.level === 'warn').length
  const releaseReadinessItems = [
    {
      label: 'Portable trial flow',
      status: isPortableTrialReady ? 'ready' : 'pending',
      detail: isPortableTrialReady
        ? 'Core sample save restore export flow is complete.'
        : `Trial checkpoints ${trialReadinessCompletedCount} / ${trialReadinessItems.length}`,
    },
    {
      label: 'Portable smoke checklist',
      status: portableSmokeReady ? 'ready' : portableSmokeFailedCount > 0 ? 'risk' : 'pending',
      detail: portableSmokeReady
        ? 'All portable smoke steps are marked passed.'
        : portableSmokeFailedCount > 0
          ? `${portableSmokeFailedCount} smoke step needs attention.`
          : `${portableSmokePassedCount} / ${portableSmokeChecklist.length} smoke steps passed`,
    },
    {
      label: 'Backend health',
      status: backendStatus && !backendStatusError ? 'ready' : 'risk',
      detail: backendStatus && !backendStatusError ? getBackendRuntimeLabel() : backendStatusError ?? 'Backend unknown',
    },
    {
      label: 'Performance window',
      status: performanceWarningCount === 0 ? 'ready' : 'risk',
      detail:
        performanceWarningCount === 0
          ? 'No recent slow operations over the configured thresholds.'
          : `${performanceWarningCount} recent operation${performanceWarningCount === 1 ? '' : 's'} exceeded threshold.`,
    },
    {
      label: 'Native backend readiness',
      status:
        backendStatus?.sam3_native_available && backendStatus?.nudenet_native_available
          ? 'ready'
          : backendStatus?.sam3_checkpoint_ready || backendStatus?.nudenet_native_available
            ? 'pending'
            : 'risk',
      detail:
        backendStatus?.sam3_native_available && backendStatus?.nudenet_native_available
          ? 'SAM3 and NudeNet native backends are both available.'
          : backendStatus?.sam3_checkpoint_ready
            ? 'SAM3 checkpoint is configured. Install or verify native runtime to complete the path.'
            : 'SAM3 checkpoint or native runtime still needs setup.',
    },
    {
      label: 'Imported smoke report',
      status: importedPortableSmokeReport
        ? importedPortableSmokeReport.statusOk
          ? 'ready'
          : 'risk'
        : 'pending',
      detail: importedPortableSmokeReport
        ? importedPortableSmokeReport.statusOk
          ? `Imported ${importedPortableSmokeReport.filename} with a healthy backend status.`
          : importedPortableSmokeReport.statusError ?? 'Imported smoke report captured a startup issue.'
        : 'Import portable-smoke-report.json from another PC to capture real startup results.',
    },
  ] as const

  const cyclePortableSmokeStatus = useCallback((id: string) => {
    setPortableSmokeChecklist((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item
        }

        const nextStatus =
          item.status === 'pending' ? 'passed' : item.status === 'passed' ? 'failed' : 'pending'

        return {
          ...item,
          status: nextStatus,
        }
      }),
    )
  }, [])

  const updatePortableSmokeNote = useCallback((id: string, note: string) => {
    setPortableSmokeChecklist((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              note,
            }
          : item,
      ),
    )
  }, [])

  const resetPortableSmokeChecklist = useCallback(() => {
    setPortableSmokeChecklist(DEFAULT_PORTABLE_SMOKE_CHECKLIST.map((item) => ({ ...item })))
  }, [])

  const syncPortableSmokeChecklist = useCallback(() => {
    setPortableSmokeChecklist((current) =>
      current.map((item) => {
        if (item.id === 'backend-panel') {
          return {
            ...item,
            status: backendStatus && !backendStatusError ? 'passed' : item.status === 'failed' ? 'failed' : 'pending',
          }
        }

        if (item.id === 'runtime-labels') {
          const runtimeReady =
            Boolean(backendStatus?.python_version) &&
            typeof backendStatus?.sam3_backend === 'string' &&
            typeof backendStatus?.nudenet_backend === 'string'
          return {
            ...item,
            status: runtimeReady ? 'passed' : item.status === 'failed' ? 'failed' : 'pending',
          }
        }

        if (item.id === 'sample-review') {
          const reviewReady =
            trialReadinessCheckpoints.sampleLoadedAt !== null &&
            (trialReadinessCheckpoints.sam3ReviewedAt !== null || trialReadinessCheckpoints.nsfwReviewedAt !== null)
          return {
            ...item,
            status: reviewReady ? 'passed' : item.status === 'failed' ? 'failed' : 'pending',
          }
        }

        if (item.id === 'save-restore-export') {
          const saveRestoreExportReady =
            trialReadinessCheckpoints.projectSavedAt !== null && trialReadinessCheckpoints.exportCompletedAt !== null
          return {
            ...item,
            status: saveRestoreExportReady ? 'passed' : item.status === 'failed' ? 'failed' : 'pending',
          }
        }

        return item
      }),
    )
  }, [backendStatus, backendStatusError, trialReadinessCheckpoints])

  const exportDiagnosticsReport = useCallback(() => {
    const report = {
      appVersion,
      backendBaseUrl,
      generatedAt: new Date().toISOString(),
      saveStatusLabel,
      exportMessage,
      backendStatus,
      backendStatusError,
      sam3BackendPreference,
      nudenetBackendPreference,
      backendRuntimeConfigMessage,
      trialReadinessCheckpoints,
      portableSmokeChecklist,
      importedPortableSmokeReport,
      importedHandoffHistory,
      performanceThresholds,
      performanceMetrics,
      recentExports,
    }
    const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadJsonBlob(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
      `creators-coco-diagnostics-${safeTimestamp}.json`,
    )
  }, [
    appVersion,
    backendBaseUrl,
    saveStatusLabel,
    exportMessage,
    backendStatus,
    backendStatusError,
    sam3BackendPreference,
    nudenetBackendPreference,
    backendRuntimeConfigMessage,
    trialReadinessCheckpoints,
    portableSmokeChecklist,
    importedPortableSmokeReport,
    importedHandoffHistory,
    performanceThresholds,
    performanceMetrics,
    recentExports,
  ])

  const exportPortableHandoffBundle = useCallback(async () => {
    const diagnostics = {
      appVersion,
      backendBaseUrl,
      generatedAt: new Date().toISOString(),
      saveStatusLabel,
      exportMessage,
      backendStatus,
      backendStatusError,
      sam3BackendPreference,
      nudenetBackendPreference,
      backendRuntimeConfigMessage,
      trialReadinessCheckpoints,
      portableSmokeChecklist,
      importedPortableSmokeReport,
      importedHandoffHistory,
      performanceThresholds,
      performanceMetrics,
      recentExports,
    }
    const runtimeProfile = {
      exportedAt: new Date().toISOString(),
      sam3BackendPreference,
      nudenetBackendPreference,
      sam3CheckpointPath: sam3CheckpointPath.trim() || null,
      sam3ConfigPath: sam3ConfigPath.trim() || null,
      environment: {
        CREATORS_COCO_SAM3_BACKEND: sam3BackendPreference,
        CREATORS_COCO_NUDENET_BACKEND: nudenetBackendPreference,
        CREATORS_COCO_SAM3_CHECKPOINT: sam3CheckpointPath.trim() || null,
        CREATORS_COCO_SAM3_CONFIG: sam3ConfigPath.trim() || null,
      },
    }
    const smokeSummary = {
      exportedAt: new Date().toISOString(),
      portableSmokeChecklist,
      portableSmokeReady,
      releaseReadinessItems,
      trialReadinessCheckpoints,
      importedPortableSmokeReport,
      importedHandoffHistory,
    }

    const zip = new JSZip()
    zip.file('diagnostics.json', JSON.stringify(diagnostics, null, 2))
    zip.file('runtime-profile.json', JSON.stringify(runtimeProfile, null, 2))
    zip.file('portable-smoke-summary.json', JSON.stringify(smokeSummary, null, 2))
    zip.file(
      'README.txt',
      [
        'CreatorsCOCO portable handoff bundle',
        `Generated: ${new Date().toISOString()}`,
        '',
        'Files:',
        '- diagnostics.json',
        '- runtime-profile.json',
        '- portable-smoke-summary.json',
      ].join('\r\n'),
    )

    const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const bundleBlob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(bundleBlob, `creators-coco-portable-handoff-${safeTimestamp}.zip`)
  }, [
    appVersion,
    backendBaseUrl,
    saveStatusLabel,
    exportMessage,
    backendStatus,
    backendStatusError,
    sam3BackendPreference,
    nudenetBackendPreference,
    backendRuntimeConfigMessage,
    trialReadinessCheckpoints,
    portableSmokeChecklist,
    importedPortableSmokeReport,
    importedHandoffHistory,
    performanceThresholds,
    performanceMetrics,
    recentExports,
    sam3CheckpointPath,
    sam3ConfigPath,
    portableSmokeReady,
    releaseReadinessItems,
  ])

  const importPortableSmokeReport = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const parsedReport = JSON.parse(await file.text()) as {
        generatedAt?: string
        portableExePath?: string
        smokeRoot?: string
        startupTimeoutSeconds?: number
        statusUrl?: string
        statusOk?: boolean
        statusError?: string | null
        backendStatus?: BackendStatusState | null
      }

      const importedReport: ImportedPortableSmokeReport = {
        filename: file.name,
        importedAt: new Date().toISOString(),
        generatedAt: typeof parsedReport.generatedAt === 'string' ? parsedReport.generatedAt : null,
        portableExePath: typeof parsedReport.portableExePath === 'string' ? parsedReport.portableExePath : null,
        smokeRoot: typeof parsedReport.smokeRoot === 'string' ? parsedReport.smokeRoot : null,
        startupTimeoutSeconds:
          typeof parsedReport.startupTimeoutSeconds === 'number' ? parsedReport.startupTimeoutSeconds : null,
        statusUrl: typeof parsedReport.statusUrl === 'string' ? parsedReport.statusUrl : null,
        statusOk: parsedReport.statusOk === true,
        statusError: typeof parsedReport.statusError === 'string' ? parsedReport.statusError : null,
        backendStatus:
          parsedReport.backendStatus && typeof parsedReport.backendStatus === 'object'
            ? parsedReport.backendStatus
            : null,
      }

      setImportedPortableSmokeReport(importedReport)
      setPortableSmokeChecklist((current) =>
        current.map((item) => {
          if (item.id === 'backend-panel') {
            return {
              ...item,
              status: importedReport.statusOk ? 'passed' : 'failed',
              note: importedReport.statusOk
                ? `Smoke status OK from ${file.name}`
                : importedReport.statusError ?? `Smoke status failed from ${file.name}`,
            }
          }

          if (item.id === 'runtime-labels') {
            const runtimeReady =
              Boolean(importedReport.backendStatus?.python_version) &&
              typeof importedReport.backendStatus?.sam3_backend === 'string' &&
              typeof importedReport.backendStatus?.nudenet_backend === 'string'
            return {
              ...item,
              status: runtimeReady ? 'passed' : importedReport.statusOk ? item.status : 'failed',
              note: runtimeReady
                ? `Python ${importedReport.backendStatus?.python_version ?? 'unknown'} / SAM3 ${importedReport.backendStatus?.sam3_backend ?? 'unknown'} / NudeNet ${importedReport.backendStatus?.nudenet_backend ?? 'unknown'}`
                : item.note,
            }
          }

          return item
        }),
      )
      setBackendRuntimeConfigMessage(
        importedReport.statusOk
          ? `Portable smoke report imported: backend status reached from ${file.name}`
          : `Portable smoke report imported with startup issue: ${importedReport.statusError ?? 'unknown error'}`,
      )
    } catch {
      setBackendRuntimeConfigMessage('Portable smoke report import failed')
    } finally {
      event.target.value = ''
    }
  }, [])

  const exportBackendRuntimeProfile = useCallback(() => {
    const profile = {
      exportedAt: new Date().toISOString(),
      sam3BackendPreference,
      nudenetBackendPreference,
      sam3CheckpointPath: sam3CheckpointPath.trim() || null,
      sam3ConfigPath: sam3ConfigPath.trim() || null,
      environment: {
        CREATORS_COCO_SAM3_BACKEND: sam3BackendPreference,
        CREATORS_COCO_NUDENET_BACKEND: nudenetBackendPreference,
        CREATORS_COCO_SAM3_CHECKPOINT: sam3CheckpointPath.trim() || null,
        CREATORS_COCO_SAM3_CONFIG: sam3ConfigPath.trim() || null,
      },
    }
    const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadJsonBlob(
      new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' }),
      `creators-coco-runtime-profile-${safeTimestamp}.json`,
    )
  }, [nudenetBackendPreference, sam3BackendPreference, sam3CheckpointPath, sam3ConfigPath])

  const exportSam3SetupScript = useCallback(() => {
    const scriptLines = [
      `$env:CREATORS_COCO_SAM3_BACKEND = "${sam3BackendPreference}"`,
      `$env:CREATORS_COCO_NUDENET_BACKEND = "${nudenetBackendPreference}"`,
      `$env:CREATORS_COCO_SAM3_CHECKPOINT = "${sam3CheckpointPath.trim()}"`,
      `$env:CREATORS_COCO_SAM3_CONFIG = "${sam3ConfigPath.trim()}"`,
      '',
      '# Launch CreatorsCOCO after setting the runtime profile.',
      'npm run dev',
    ]
    const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadJsonBlob(
      new Blob([scriptLines.join('\r\n')], { type: 'text/plain;charset=utf-8' }),
      `creators-coco-sam3-runtime-${safeTimestamp}.ps1`,
    )
  }, [nudenetBackendPreference, sam3BackendPreference, sam3CheckpointPath, sam3ConfigPath])

  const importBackendRuntimeProfile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      try {
        let rawText: string
        let diagnosticsText: string | null = null
        let smokeSummaryText: string | null = null
        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = await JSZip.loadAsync(await file.arrayBuffer())
          const profileEntry = zip.file('runtime-profile.json')
          if (!profileEntry) {
            throw new Error('runtime-profile.json not found')
          }
          rawText = await profileEntry.async('string')
          diagnosticsText = await zip.file('diagnostics.json')?.async('string') ?? null
          smokeSummaryText = await zip.file('portable-smoke-summary.json')?.async('string') ?? null
        } else {
          rawText = await file.text()
        }
        const parsedProfile = JSON.parse(rawText) as {
          sam3BackendPreference?: BackendPreference
          nudenetBackendPreference?: BackendPreference
          sam3CheckpointPath?: string | null
          sam3ConfigPath?: string | null
        }
        const parsedDiagnostics = diagnosticsText
          ? (JSON.parse(diagnosticsText) as {
              performanceThresholds?: Partial<PerformanceThresholds>
              importedPortableSmokeReport?: Partial<ImportedPortableSmokeReport> | null
            })
          : null
        const parsedSmokeSummary = smokeSummaryText
          ? (JSON.parse(smokeSummaryText) as {
              portableSmokeChecklist?: PortableSmokeChecklistItem[]
              trialReadinessCheckpoints?: Partial<TrialReadinessCheckpoints>
              importedPortableSmokeReport?: Partial<ImportedPortableSmokeReport> | null
            })
          : null
        const importedFromZip = file.name.toLowerCase().endsWith('.zip')
        const nextSam3Preference =
          parsedProfile.sam3BackendPreference === 'native' || parsedProfile.sam3BackendPreference === 'heuristic'
            ? parsedProfile.sam3BackendPreference
            : 'auto'
        const nextNudenetPreference =
          parsedProfile.nudenetBackendPreference === 'native' ||
          parsedProfile.nudenetBackendPreference === 'heuristic'
            ? parsedProfile.nudenetBackendPreference
            : 'auto'
        const nextCheckpointPath =
          typeof parsedProfile.sam3CheckpointPath === 'string' ? parsedProfile.sam3CheckpointPath : ''
        const nextConfigPath = typeof parsedProfile.sam3ConfigPath === 'string' ? parsedProfile.sam3ConfigPath : ''

        setSam3BackendPreference(nextSam3Preference)
        setNudenetBackendPreference(nextNudenetPreference)
        setSam3CheckpointPath(nextCheckpointPath)
        setSam3ConfigPath(nextConfigPath)
        if (parsedDiagnostics?.performanceThresholds) {
          setPerformanceThresholds((current) => ({
            backendStatus:
              typeof parsedDiagnostics.performanceThresholds?.backendStatus === 'number'
                ? parsedDiagnostics.performanceThresholds.backendStatus
                : current.backendStatus,
            loadSampleImage:
              typeof parsedDiagnostics.performanceThresholds?.loadSampleImage === 'number'
                ? parsedDiagnostics.performanceThresholds.loadSampleImage
                : current.loadSampleImage,
            saveProject:
              typeof parsedDiagnostics.performanceThresholds?.saveProject === 'number'
                ? parsedDiagnostics.performanceThresholds.saveProject
                : current.saveProject,
            pngExport:
              typeof parsedDiagnostics.performanceThresholds?.pngExport === 'number'
                ? parsedDiagnostics.performanceThresholds.pngExport
                : current.pngExport,
            pdfExport:
              typeof parsedDiagnostics.performanceThresholds?.pdfExport === 'number'
                ? parsedDiagnostics.performanceThresholds.pdfExport
                : current.pdfExport,
            zipExport:
              typeof parsedDiagnostics.performanceThresholds?.zipExport === 'number'
                ? parsedDiagnostics.performanceThresholds.zipExport
                : current.zipExport,
            sam3AutoMosaic:
              typeof parsedDiagnostics.performanceThresholds?.sam3AutoMosaic === 'number'
                ? parsedDiagnostics.performanceThresholds.sam3AutoMosaic
                : current.sam3AutoMosaic,
            nsfwDetection:
              typeof parsedDiagnostics.performanceThresholds?.nsfwDetection === 'number'
                ? parsedDiagnostics.performanceThresholds.nsfwDetection
                : current.nsfwDetection,
            sam3ManualSegment:
              typeof parsedDiagnostics.performanceThresholds?.sam3ManualSegment === 'number'
                ? parsedDiagnostics.performanceThresholds.sam3ManualSegment
                : current.sam3ManualSegment,
          }))
        }
        if (Array.isArray(parsedSmokeSummary?.portableSmokeChecklist)) {
          setPortableSmokeChecklist(
            parsedSmokeSummary.portableSmokeChecklist.map((item, index) => ({
              id: typeof item.id === 'string' ? item.id : `imported-${index + 1}`,
              label: typeof item.label === 'string' ? item.label : `Imported step ${index + 1}`,
              status:
                item.status === 'passed' || item.status === 'failed' || item.status === 'pending'
                  ? item.status
                  : 'pending',
              note: typeof item.note === 'string' ? item.note : '',
            })),
          )
        }
        if (parsedSmokeSummary?.trialReadinessCheckpoints) {
          setTrialReadinessCheckpoints((current) => ({
            backendConnectedAt:
              typeof parsedSmokeSummary.trialReadinessCheckpoints?.backendConnectedAt === 'string'
                ? parsedSmokeSummary.trialReadinessCheckpoints.backendConnectedAt
                : current.backendConnectedAt,
            sampleLoadedAt:
              typeof parsedSmokeSummary.trialReadinessCheckpoints?.sampleLoadedAt === 'string'
                ? parsedSmokeSummary.trialReadinessCheckpoints.sampleLoadedAt
                : current.sampleLoadedAt,
            projectSavedAt:
              typeof parsedSmokeSummary.trialReadinessCheckpoints?.projectSavedAt === 'string'
                ? parsedSmokeSummary.trialReadinessCheckpoints.projectSavedAt
                : current.projectSavedAt,
            projectRestoredAt:
              typeof parsedSmokeSummary.trialReadinessCheckpoints?.projectRestoredAt === 'string'
                ? parsedSmokeSummary.trialReadinessCheckpoints.projectRestoredAt
                : current.projectRestoredAt,
            exportCompletedAt:
              typeof parsedSmokeSummary.trialReadinessCheckpoints?.exportCompletedAt === 'string'
                ? parsedSmokeSummary.trialReadinessCheckpoints.exportCompletedAt
                : current.exportCompletedAt,
            sam3ReviewedAt:
              typeof parsedSmokeSummary.trialReadinessCheckpoints?.sam3ReviewedAt === 'string'
                ? parsedSmokeSummary.trialReadinessCheckpoints.sam3ReviewedAt
                : current.sam3ReviewedAt,
            nsfwReviewedAt:
              typeof parsedSmokeSummary.trialReadinessCheckpoints?.nsfwReviewedAt === 'string'
                ? parsedSmokeSummary.trialReadinessCheckpoints.nsfwReviewedAt
                : current.nsfwReviewedAt,
          }))
        }
        const importedSmokeReportCandidate =
          parsedSmokeSummary?.importedPortableSmokeReport ?? parsedDiagnostics?.importedPortableSmokeReport ?? null
        if (importedSmokeReportCandidate && typeof importedSmokeReportCandidate === 'object') {
          setImportedPortableSmokeReport({
            filename:
              typeof importedSmokeReportCandidate.filename === 'string'
                ? importedSmokeReportCandidate.filename
                : 'portable-smoke-report.json',
            importedAt:
              typeof importedSmokeReportCandidate.importedAt === 'string'
                ? importedSmokeReportCandidate.importedAt
                : new Date().toISOString(),
            generatedAt:
              typeof importedSmokeReportCandidate.generatedAt === 'string'
                ? importedSmokeReportCandidate.generatedAt
                : null,
            portableExePath:
              typeof importedSmokeReportCandidate.portableExePath === 'string'
                ? importedSmokeReportCandidate.portableExePath
                : null,
            smokeRoot:
              typeof importedSmokeReportCandidate.smokeRoot === 'string' ? importedSmokeReportCandidate.smokeRoot : null,
            startupTimeoutSeconds:
              typeof importedSmokeReportCandidate.startupTimeoutSeconds === 'number'
                ? importedSmokeReportCandidate.startupTimeoutSeconds
                : null,
            statusUrl:
              typeof importedSmokeReportCandidate.statusUrl === 'string' ? importedSmokeReportCandidate.statusUrl : null,
            statusOk: importedSmokeReportCandidate.statusOk === true,
            statusError:
              typeof importedSmokeReportCandidate.statusError === 'string'
                ? importedSmokeReportCandidate.statusError
                : null,
            backendStatus:
              importedSmokeReportCandidate.backendStatus &&
              typeof importedSmokeReportCandidate.backendStatus === 'object'
                ? (importedSmokeReportCandidate.backendStatus as BackendStatusState)
                : null,
          })
        }
        setImportedHandoffHistory((current) =>
          [
            {
              id: `${Date.now()}-${file.name}`,
              filename: file.name,
              importedAt: new Date().toISOString(),
              source: importedFromZip ? 'zip' : 'json',
              includedHandoffData: importedFromZip && Boolean(smokeSummaryText || diagnosticsText),
            },
            ...current,
          ].slice(0, 5),
        )

        const config = await updateBackendRuntimeConfig(
          nextSam3Preference,
          nextNudenetPreference,
          nextCheckpointPath,
          nextConfigPath,
        )
        setBackendRuntimeConfigMessage(
          `Runtime profile imported: SAM3 ${config.sam3_effective_backend}, NudeNet ${config.nudenet_effective_backend}${importedFromZip ? ' with handoff data' : ''}`,
        )
        setBackendStatus((current) =>
          current
            ? {
                ...current,
                sam3_backend: config.sam3_effective_backend,
                nudenet_backend: config.nudenet_effective_backend,
                sam3_native_available: config.sam3_native_available,
                nudenet_native_available: config.nudenet_native_available,
                sam3_checkpoint_path: config.sam3_checkpoint_path,
                sam3_config_path: config.sam3_config_path,
                sam3_checkpoint_ready: config.sam3_checkpoint_ready,
                sam3_native_reason: config.sam3_native_reason,
                nudenet_native_reason: config.nudenet_native_reason,
                sam3_backend_preference: config.sam3_backend_preference,
                nudenet_backend_preference: config.nudenet_backend_preference,
                sam3_recommendation: config.sam3_recommendation,
                nudenet_recommendation: config.nudenet_recommendation,
              }
            : current,
        )
      } catch {
        setBackendRuntimeConfigMessage('Runtime profile import failed')
      } finally {
        event.target.value = ''
      }
    },
    [],
  )

  const updatePerformanceThreshold = useCallback(
    (key: keyof PerformanceThresholds, rawValue: string) => {
      const parsed = Number.parseInt(rawValue, 10)
      setPerformanceThresholds((current) => ({
        ...current,
        [key]: Number.isFinite(parsed) ? Math.max(50, Math.min(20000, parsed)) : current[key],
      }))
    },
    [],
  )

  const resetPerformanceThresholds = useCallback(() => {
    setPerformanceThresholds({ ...DEFAULT_PERFORMANCE_THRESHOLDS })
  }, [])

  const handleExportPng = async () => {
    if (!image) {
      return
    }

    await measureAsyncAction('PNG export', performanceThresholds.pngExport, () =>
      exportPageAsPng(image, imageTransform, outputSettings, activePageIndex),
    )
    setExportMessage(`Exported ${image.name} as PNG`)
    setTrialReadinessCheckpoints((current) => ({
      ...current,
      exportCompletedAt: new Date().toISOString(),
    }))
    pushExportHistory({ format: 'PNG', label: image.name })
  }

  const handleExportZip = async () => {
    if (pages.length === 0) {
      return
    }

    await measureAsyncAction('ZIP export', performanceThresholds.zipExport, () =>
      exportPagesAsZip(pages, outputSettings),
    )
    setExportMessage(`Exported ${pages.length} pages as ZIP`)
    setTrialReadinessCheckpoints((current) => ({
      ...current,
      exportCompletedAt: new Date().toISOString(),
    }))
    pushExportHistory({ format: 'ZIP', label: `${pages.length} pages` })
  }

  const handleExportPdf = async () => {
    if (!image) {
      return
    }

    await measureAsyncAction('PDF export', performanceThresholds.pdfExport, () =>
      exportPageAsPdf(image, imageTransform, outputSettings, activePageIndex),
    )
    setExportMessage(`Exported ${image.name} as PDF`)
    setTrialReadinessCheckpoints((current) => ({
      ...current,
      exportCompletedAt: new Date().toISOString(),
    }))
    pushExportHistory({ format: 'PDF', label: image.name })
  }

  const commitWidthDraft = () => {
    if (widthDraft === '') {
      setWidthDraft(String(outputSettings.width))
      return
    }

    setCustomOutputWidth(Number(widthDraft))
  }

  const commitHeightDraft = () => {
    if (heightDraft === '') {
      setHeightDraft(String(outputSettings.height))
      return
    }

    setCustomOutputHeight(Number(heightDraft))
  }

  const commitPrefixDraft = () => {
    setFileNamePrefix(prefixDraft)
  }

  const commitStartNumberDraft = () => {
    if (startNumberDraft === '') {
      setStartNumberDraft(String(outputSettings.startNumber))
      return
    }

    setStartNumber(Number(startNumberDraft))
  }

  const commitNumberPaddingDraft = () => {
    if (numberPaddingDraft === '') {
      setNumberPaddingDraft(String(outputSettings.numberPadding))
      return
    }

    setNumberPadding(Number(numberPaddingDraft))
  }

  const commitProjectNameDraft = () => {
    setProjectName(projectNameDraft)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    loadImageFile(file)
    event.target.value = ''
  }

  const handleWatermarkFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    loadWatermarkImageFile(file)
    event.target.value = ''
  }

  const handleMessageWindowAssetChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    loadSelectedMessageWindowAsset(file)
    event.target.value = ''
  }

  const handleCanvasDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files ?? [])
    if (files.length > 0) {
      loadImageFiles(files)
    }
  }

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboardFiles = Array.from(event.clipboardData?.files ?? [])
      const itemFiles =
        clipboardFiles.length > 0
          ? []
          : Array.from(event.clipboardData?.items ?? [])
              .filter((item) => item.kind === 'file')
              .map((item) => item.getAsFile())
              .filter((file): file is File => file !== null)
      const files = clipboardFiles.length > 0 ? clipboardFiles : itemFiles

      if (files.length === 0) {
        return
      }

      event.preventDefault()
      loadImageFiles(files)
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [loadImageFiles])

  useEffect(() => {
    restoreSavedProject()
    if (typeof window !== 'undefined' && window.localStorage.getItem(PROJECT_STORAGE_KEY)) {
      setTrialReadinessCheckpoints((current) => ({
        ...current,
        projectRestoredAt: current.projectRestoredAt ?? new Date().toISOString(),
      }))
    }
  }, [restoreSavedProject])

  useEffect(() => {
    void loadBackendStatus()
  }, [])

    useEffect(
      () => () => {
        for (const modelName of ['sam3', 'nudenet'] as const) {
          clearBackendModelProgressWatch(modelName)
        }
      },
      [],
    )

  useEffect(() => {
    if (!isDirty) {
      return
    }

    const timer = window.setTimeout(() => {
      handleSaveNow()
    }, 300000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [handleSaveNow, isDirty])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if (!(event.ctrlKey || event.metaKey)) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          nudgeSelectedLayer(-32, 0)
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          nudgeSelectedLayer(32, 0)
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          nudgeSelectedLayer(0, -32)
        } else if (event.key === 'ArrowDown') {
          event.preventDefault()
          nudgeSelectedLayer(0, 32)
        }
        return
      }

      if (key === 's') {
        event.preventDefault()
        handleSaveNow()
        return
      }

      if (key === 'z') {
        event.preventDefault()
        undo()
        return
      }

      if (key === 'y') {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleSaveNow, nudgeSelectedLayer, redo, undo])

  return (
    <div className="app-shell">
      <header aria-label="Main menu" className="menu-bar">
        <div className="brand">
          <strong>CreatorsCOCO</strong>
          <span>{projectName}</span>
        </div>
        <DakiniWordmark />
        <label className="project-name-field">
          <span>Project</span>
          <input
            aria-label="Project name"
            type="text"
            value={projectNameDraft}
            onChange={(event) => {
              setProjectNameDraft(event.target.value)
            }}
            onBlur={commitProjectNameDraft}
          />
        </label>
        <nav aria-label="Primary navigation">
          <button type="button">File</button>
          <button type="button">Edit</button>
          <button type="button">View</button>
          <button type="button">Tools</button>
          <button type="button" onClick={() => setIsHelpOpen(true)}>
            Help
          </button>
        </nav>
      </header>

      {isHelpOpen ? (
        <div className="help-overlay" role="dialog" aria-modal="true" aria-label="About CreatorsCOCO">
          <div className="help-card">
            <div className="help-header">
              <div>
                <div className="panel-title">About CreatorsCOCO</div>
                <div className="panel-subtitle">{`Version ${appVersion}`}</div>
              </div>
              <button type="button" className="page-card page-button help-close" onClick={() => setIsHelpOpen(false)}>
                Close
              </button>
            </div>
            <DakiniWordmark />
            <div className="help-grid">
              <div className="page-card">
                <strong>Provided by Dakini_tencho</strong>
                <span>CreatorsCOCO desktop editor with local FastAPI review tooling.</span>
                <span>{`Backend target ${backendBaseUrl}`}</span>
                <span>{getBackendRuntimeLabel()}</span>
                <span>{getBackendCapabilityLabel('sam3')}</span>
                <span>{getBackendCapabilityLabel('nudenet')}</span>
                <span>{getSam3CheckpointLabel()}</span>
                <span>{getSam3CheckpointPathLabel()}</span>
                <span>{getSam3ConfigPathLabel()}</span>
                <span>Environment keys CREATORS_COCO_SAM3_CHECKPOINT / CREATORS_COCO_SAM3_CONFIG</span>
                {backendStatus?.sam3_native_reason ? <span>{`SAM3 native detail ${backendStatus.sam3_native_reason}`}</span> : null}
                {backendStatus?.nudenet_native_reason ? <span>{`NudeNet native detail ${backendStatus.nudenet_native_reason}`}</span> : null}
                {backendStatus?.sam3_recommendation ? <span>{backendStatus.sam3_recommendation}</span> : null}
                {backendStatus?.nudenet_recommendation ? <span>{backendStatus.nudenet_recommendation}</span> : null}
                {backendStatus?.sam3_error_message ? <span>{backendStatus.sam3_error_message}</span> : null}
                {backendStatus?.nudenet_error_message ? <span>{backendStatus.nudenet_error_message}</span> : null}
              </div>
              <div className="page-card">
                <strong>{`Schema v${CURRENT_PROJECT_SCHEMA_VERSION}`}</strong>
                <span>{`Migration path ${PROJECT_SCHEMA_MIGRATIONS.map((migration) => migration.label).join(', ')}`}</span>
                <span>{`Storage key ${PROJECT_STORAGE_KEY}`}</span>
              </div>
              <div className="page-card">
                <strong>Portable Smoke Test</strong>
                <span>1. Copy the portable exe to a clean folder on another PC.</span>
                <span>2. Launch it once and wait for unpacking to finish.</span>
                <span>3. Confirm backend status leaves the unavailable state.</span>
                <span>4. Load the sample image and run SAM3 or NSFW once.</span>
                <label className="text-layer-field">
                  <span>Import portable smoke report</span>
                  <input
                    aria-label="Import portable smoke report"
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => void importPortableSmokeReport(event)}
                  />
                </label>
                {importedPortableSmokeReport ? (
                  <div className="portable-smoke-imported-summary">
                    <strong>{`${importedPortableSmokeReport.filename} ${importedPortableSmokeReport.statusOk ? 'ok' : 'issue'}`}</strong>
                    <span>{`Imported ${formatMetricRecordedAt(importedPortableSmokeReport.importedAt)}`}</span>
                    {importedPortableSmokeReport.generatedAt ? (
                      <span>{`Generated ${formatMetricRecordedAt(importedPortableSmokeReport.generatedAt)}`}</span>
                    ) : null}
                    {importedPortableSmokeReport.portableExePath ? (
                      <span>{`Exe ${importedPortableSmokeReport.portableExePath}`}</span>
                    ) : null}
                    {importedPortableSmokeReport.statusError ? <span>{importedPortableSmokeReport.statusError}</span> : null}
                  </div>
                ) : null}
              </div>
              <div className="page-card">
                <strong>Trial readiness</strong>
                <span>
                  {isPortableTrialReady
                    ? 'Portable trial ready'
                    : `Portable trial in progress ${trialReadinessCompletedCount} / ${trialReadinessItems.length}`}
                </span>
                <div className="trial-readiness-list">
                  {trialReadinessItems.map((item) => (
                    <div
                      key={item.label}
                      className={`trial-readiness-item ${item.completedAt ? 'complete' : 'pending'}`}
                    >
                      <strong>{`${item.label} ${item.completedAt ? 'complete' : 'pending'}`}</strong>
                      <span>
                        {item.completedAt
                          ? `Completed ${formatMetricRecordedAt(item.completedAt)}`
                          : 'Run the core flow once to mark this checkpoint.'}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="page-card page-button"
                  onClick={() => setTrialReadinessCheckpoints({ ...EMPTY_TRIAL_READINESS_CHECKPOINTS })}
                >
                  Reset trial readiness
                </button>
              </div>
              <div className="page-card">
                <strong>Release readiness</strong>
                <div className="help-action-row">
                  <button type="button" className="page-card page-button" onClick={exportDiagnosticsReport}>
                    Export diagnostics report
                  </button>
                  <button type="button" className="page-card page-button" onClick={() => void exportPortableHandoffBundle()}>
                    Export portable handoff bundle
                  </button>
                </div>
                <div className="trial-readiness-list">
                  {releaseReadinessItems.map((item) => (
                    <div
                      key={item.label}
                      className={`trial-readiness-item ${
                        item.status === 'ready' ? 'complete' : item.status === 'risk' ? 'failed' : 'pending'
                      }`}
                    >
                      <strong>{`${item.label} ${item.status}`}</strong>
                      <span>{item.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="page-card">
                <strong>Portable smoke checklist</strong>
                <span>{portableSmokeReady ? 'Portable smoke complete' : `${portableSmokePassedCount} / ${portableSmokeChecklist.length} steps passed`}</span>
                <div className="portable-smoke-list">
                  {portableSmokeChecklist.map((item) => (
                    <div key={item.id} className={`portable-smoke-item ${item.status}`}>
                      <strong>{`${item.label} ${item.status}`}</strong>
                      <div className="help-action-row">
                        <button
                          type="button"
                          className="page-card page-button"
                          onClick={() => cyclePortableSmokeStatus(item.id)}
                          aria-label={`Cycle smoke step: ${item.label}`}
                        >
                          {item.status === 'pending' ? 'Mark passed' : item.status === 'passed' ? 'Mark failed' : 'Reset pending'}
                        </button>
                      </div>
                      <label className="text-layer-field">
                        <span>{`${item.label} note`}</span>
                        <input
                          aria-label={`${item.label} note`}
                          type="text"
                          value={item.note}
                          onChange={(event) => updatePortableSmokeNote(item.id, event.target.value)}
                          placeholder="Optional tester note"
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="help-action-row">
                  <button type="button" className="page-card page-button" onClick={syncPortableSmokeChecklist}>
                    Sync portable smoke checklist
                  </button>
                </div>
                <button type="button" className="page-card page-button" onClick={resetPortableSmokeChecklist}>
                  Reset portable smoke checklist
                </button>
              </div>
              <div className="page-card">
                <strong>Imported handoff history</strong>
                {importedHandoffHistory.length === 0 ? (
                  <span>No handoff imports yet</span>
                ) : (
                  <div className="trial-readiness-list">
                    {importedHandoffHistory.map((entry) => (
                      <div key={entry.id} className="trial-readiness-item complete">
                        <strong>{`${entry.filename} ${entry.source}`}</strong>
                        <span>{`Imported ${formatMetricRecordedAt(entry.importedAt)}`}</span>
                        <span>{entry.includedHandoffData ? 'Included handoff smoke/diagnostic data' : 'Runtime profile only'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="page-card">
                <strong>Backend strategy</strong>
                <label className="text-layer-field">
                  <span>SAM3 strategy</span>
                  <select
                    aria-label="SAM3 backend strategy"
                    value={sam3BackendPreference}
                    onChange={(event) =>
                      setSam3BackendPreference(
                        event.target.value === 'native' || event.target.value === 'heuristic'
                          ? event.target.value
                          : 'auto',
                      )
                    }
                  >
                    <option value="auto">auto</option>
                    <option value="native">native</option>
                    <option value="heuristic">heuristic</option>
                  </select>
                </label>
                <label className="text-layer-field">
                  <span>SAM3 checkpoint path</span>
                  <input
                    aria-label="SAM3 checkpoint path"
                    type="text"
                    value={sam3CheckpointPath}
                    onChange={(event) => setSam3CheckpointPath(event.target.value)}
                    placeholder="D:\\models\\sam3.pt"
                  />
                </label>
                <label className="text-layer-field">
                  <span>SAM3 config path</span>
                  <input
                    aria-label="SAM3 config path"
                    type="text"
                    value={sam3ConfigPath}
                    onChange={(event) => setSam3ConfigPath(event.target.value)}
                    placeholder="D:\\models\\sam3.yaml"
                  />
                </label>
                <label className="text-layer-field">
                  <span>NudeNet strategy</span>
                  <select
                    aria-label="NudeNet backend strategy"
                    value={nudenetBackendPreference}
                    onChange={(event) =>
                      setNudenetBackendPreference(
                        event.target.value === 'native' || event.target.value === 'heuristic'
                          ? event.target.value
                          : 'auto',
                      )
                    }
                  >
                    <option value="auto">auto</option>
                    <option value="native">native</option>
                    <option value="heuristic">heuristic</option>
                  </select>
                </label>
                <span>{getBackendPreferenceLabel('sam3')}</span>
                <span>{getSam3CheckpointLabel()}</span>
                <span>{getSam3CheckpointPathLabel()}</span>
                <span>{getSam3ConfigPathLabel()}</span>
                <span>Environment keys CREATORS_COCO_SAM3_CHECKPOINT / CREATORS_COCO_SAM3_CONFIG</span>
                <span>{getBackendPreferenceLabel('nudenet')}</span>
                {backendRuntimeConfigMessage ? <span>{backendRuntimeConfigMessage}</span> : null}
                <div className="help-action-row">
                  <button type="button" className="page-card page-button" onClick={() => void syncBackendRuntimePreferences()}>
                    Apply backend strategy
                  </button>
                  <button type="button" className="page-card page-button" onClick={exportBackendRuntimeProfile}>
                    Export backend runtime profile
                  </button>
                  <button type="button" className="page-card page-button" onClick={exportSam3SetupScript}>
                    Export SAM3 setup script
                  </button>
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={() => void refreshBackendRuntimePreferences()}
                  >
                    Refresh backend strategy
                  </button>
                </div>
                <label className="text-layer-field">
                  <span>Import backend runtime profile</span>
                  <input
                    aria-label="Import backend runtime profile"
                    type="file"
                    accept="application/json,.json,application/zip,.zip"
                    onChange={(event) => void importBackendRuntimeProfile(event)}
                  />
                </label>
              </div>
              <div className="page-card">
                <strong>Recent performance</strong>
                {performanceMetrics.length === 0 ? (
                  <span>No metrics recorded yet</span>
                ) : (
                  <div className="help-metric-list">
                    {performanceMetrics.map((metric) => (
                      <div
                        key={metric.id}
                        className={`help-metric-item ${metric.level === 'warn' ? 'warn' : 'ok'}`}
                      >
                        <strong>{`${metric.action} ${formatMetricDuration(metric.durationMs)}`}</strong>
                        <span>{metric.level === 'warn' ? 'Slow' : 'OK'}</span>
                        <span>{`${formatMetricRecordedAt(metric.recordedAt)} / threshold ${formatMetricDuration(metric.thresholdMs)}`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="page-card">
                <strong>Performance thresholds</strong>
                <div className="help-threshold-grid">
                  <label className="text-layer-field">
                    <span>Backend status ms</span>
                    <input
                      aria-label="Backend status threshold"
                      type="number"
                      min={50}
                      max={20000}
                      step={50}
                      value={performanceThresholds.backendStatus}
                      onChange={(event) => updatePerformanceThreshold('backendStatus', event.target.value)}
                    />
                  </label>
                  <label className="text-layer-field">
                    <span>Load sample ms</span>
                    <input
                      aria-label="Load sample threshold"
                      type="number"
                      min={50}
                      max={20000}
                      step={50}
                      value={performanceThresholds.loadSampleImage}
                      onChange={(event) => updatePerformanceThreshold('loadSampleImage', event.target.value)}
                    />
                  </label>
                  <label className="text-layer-field">
                    <span>Save project ms</span>
                    <input
                      aria-label="Save project threshold"
                      type="number"
                      min={50}
                      max={20000}
                      step={50}
                      value={performanceThresholds.saveProject}
                      onChange={(event) => updatePerformanceThreshold('saveProject', event.target.value)}
                    />
                  </label>
                  <label className="text-layer-field">
                    <span>PNG export ms</span>
                    <input
                      aria-label="PNG export threshold"
                      type="number"
                      min={50}
                      max={20000}
                      step={50}
                      value={performanceThresholds.pngExport}
                      onChange={(event) => updatePerformanceThreshold('pngExport', event.target.value)}
                    />
                  </label>
                  <label className="text-layer-field">
                    <span>PDF export ms</span>
                    <input
                      aria-label="PDF export threshold"
                      type="number"
                      min={50}
                      max={20000}
                      step={50}
                      value={performanceThresholds.pdfExport}
                      onChange={(event) => updatePerformanceThreshold('pdfExport', event.target.value)}
                    />
                  </label>
                  <label className="text-layer-field">
                    <span>ZIP export ms</span>
                    <input
                      aria-label="ZIP export threshold"
                      type="number"
                      min={50}
                      max={20000}
                      step={50}
                      value={performanceThresholds.zipExport}
                      onChange={(event) => updatePerformanceThreshold('zipExport', event.target.value)}
                    />
                  </label>
                  <label className="text-layer-field">
                    <span>SAM3 auto mosaic ms</span>
                    <input
                      aria-label="SAM3 auto mosaic threshold"
                      type="number"
                      min={50}
                      max={20000}
                      step={50}
                      value={performanceThresholds.sam3AutoMosaic}
                      onChange={(event) => updatePerformanceThreshold('sam3AutoMosaic', event.target.value)}
                    />
                  </label>
                  <label className="text-layer-field">
                    <span>NSFW detection ms</span>
                    <input
                      aria-label="NSFW detection threshold"
                      type="number"
                      min={50}
                      max={20000}
                      step={50}
                      value={performanceThresholds.nsfwDetection}
                      onChange={(event) => updatePerformanceThreshold('nsfwDetection', event.target.value)}
                    />
                  </label>
                  <label className="text-layer-field">
                    <span>SAM3 manual ms</span>
                    <input
                      aria-label="SAM3 manual segment threshold"
                      type="number"
                      min={50}
                      max={20000}
                      step={50}
                      value={performanceThresholds.sam3ManualSegment}
                      onChange={(event) => updatePerformanceThreshold('sam3ManualSegment', event.target.value)}
                    />
                  </label>
                </div>
                <button type="button" className="page-card page-button" onClick={resetPerformanceThresholds}>
                  Reset performance thresholds
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="workspace-grid">
        <aside aria-label="Tool palette" className="tool-palette">
          <div className="panel-title">Tools</div>
          <div className="tool-stack" role="toolbar" aria-label="Tool palette">
            {toolLabels.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={tool.id === activeTool ? 'tool-button active' : 'tool-button'}
                aria-pressed={tool.id === activeTool}
                onClick={() => setActiveTool(tool.id)}
              >
                {tool.label}
              </button>
            ))}
          </div>
        </aside>

        <main aria-label="Canvas workspace" className="canvas-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Main canvas</div>
              <div className="panel-subtitle">Phase 1 canvas MVP</div>
            </div>
            <div className="canvas-controls">
              <label className="file-picker">
                <span>Choose image</span>
                <input
                  aria-label="Open image file"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                />
              </label>
              <button type="button" onClick={handleLoadSampleImage}>
                Load sample image
              </button>
              <button type="button" onClick={selectAllVisibleLayers} disabled={!image}>
                Select all visible layers
              </button>
              <button type="button" onClick={() => selectVisibleLayersByType('text')} disabled={!image}>
                Select text layers
              </button>
              <button type="button" onClick={() => selectVisibleLayersByType('message-window')} disabled={!image}>
                Select message window layers
              </button>
              <button type="button" onClick={() => selectVisibleLayersByType('bubble')} disabled={!image}>
                Select bubble layers
              </button>
              <button type="button" onClick={() => selectVisibleLayersByType('mosaic')} disabled={!image}>
                Select mosaic layers
              </button>
              <button type="button" onClick={() => selectVisibleLayersByType('overlay')} disabled={!image}>
                Select overlay layers
              </button>
              <button type="button" onClick={() => selectVisibleLayersByType('watermark')} disabled={!image}>
                Select watermark layers
              </button>
              <button type="button" onClick={invertLayerSelection} disabled={!image}>
                Invert layer selection
              </button>
              <button type="button" onClick={clearLayerSelection} disabled={!selectedLayerId}>
                Clear layer selection
              </button>
              <button type="button" onClick={addTextLayer} disabled={!image}>
                Add text layer
              </button>
              <button type="button" onClick={addMessageWindowLayer} disabled={!image}>
                Add message window layer
              </button>
              <button type="button" onClick={addWatermarkLayer} disabled={!image}>
                Add watermark layer
              </button>
              <label className="file-picker">
                <span>Watermark asset</span>
                <input
                  aria-label="Open watermark image"
                  type="file"
                  accept=".png,image/png"
                  onChange={handleWatermarkFileChange}
                />
              </label>
              <button type="button" onClick={addBubbleLayer} disabled={!image}>
                Add bubble layer
              </button>
              <button type="button" onClick={addMosaicLayer} disabled={!image}>
                Add mosaic layer
              </button>
              <button type="button" onClick={addOverlayLayer} disabled={!image}>
                Add overlay layer
              </button>
              <button type="button" onClick={zoomOut}>
                Zoom out
              </button>
              <button type="button" onClick={zoomIn}>
                Zoom in
              </button>
              <button type="button" onClick={undo} disabled={undoStack.length === 0}>
                Undo
              </button>
              <button type="button" onClick={redo} disabled={redoStack.length === 0}>
                Redo
              </button>
              <button type="button" onClick={handleSaveNow} disabled={!isDirty}>
                Save now
              </button>
              <button type="button" onClick={saveCurrentPageAsTemplate} disabled={!image}>
                Save page as template
              </button>
              <button type="button" onClick={saveCurrentPageAsReusableAsset} disabled={!image}>
                Save page as reusable asset
              </button>
              <button type="button" onClick={handleExportPng} disabled={!image}>
                Export PNG
              </button>
              <button type="button" onClick={handleExportZip} disabled={pages.length === 0}>
                Export ZIP
              </button>
              <button type="button" onClick={handleExportPdf} disabled={!image}>
                Export PDF
              </button>
              <button type="button" onClick={deleteActivePage} disabled={!image}>
                Delete active page
              </button>
              <button type="button" onClick={duplicateActivePage} disabled={!image}>
                Duplicate active page
              </button>
              <label className="text-layer-field">
                <span>Variant text</span>
                <input
                  aria-label="Duplicate page text swap"
                  type="text"
                  value={duplicatePageTextDraft}
                  onChange={(event) => {
                    setDuplicatePageTextDraft(event.target.value)
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => duplicateActivePageWithTextSwap(duplicatePageTextDraft)}
                disabled={!image}
              >
                Duplicate page with text swap
              </button>
              <label className="text-layer-field">
                <span>Variant batch</span>
                <textarea
                  aria-label="Duplicate page variant batch"
                  value={variantBatchDraft}
                  onChange={(event) => {
                    setVariantBatchDraft(event.target.value)
                  }}
                  rows={3}
                />
              </label>
              <label className="text-layer-field">
                <span>Variant label</span>
                <input
                  aria-label="Active page variant label"
                  type="text"
                  value={image?.variantLabel ?? ''}
                  onChange={(event) => {
                    setActivePageVariantLabel(event.target.value)
                  }}
                  disabled={!image}
                />
              </label>
              <button
                type="button"
                onClick={() => duplicateActivePageWithTextVariants(variantBatchDraft.split('\n'))}
                disabled={!image}
              >
                Duplicate page as batch variants
              </button>
              <button type="button" onClick={moveActivePageUp} disabled={!image}>
                Move active page up
              </button>
              <button type="button" onClick={moveActivePageDown} disabled={!image}>
                Move active page down
              </button>
            </div>
          </div>
          <div className="editor-hint" aria-label="Editor guidance">
            <strong>{image ? 'Editing target' : 'Getting started'}</strong>
            <span>{editorHintMessage}</span>
          </div>
          <div className="canvas-surface">
            {image ? (
              <div className="canvas-stack">
                <div
                  aria-label="Canvas frame"
                  className={selectedLayerId === 'base-image' ? 'canvas-frame loaded selected' : 'canvas-frame loaded'}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                >
                  {getPageBackendImageSource(image) ? (
                    <img
                      alt={`Canvas image preview: ${image.name}`}
                      className="canvas-base-image"
                      src={getPageBackendImageSource(image)}
                      style={
                        imageTransform
                          ? {
                              left: `${(imageTransform.x / outputSettings.width) * 100}%`,
                              top: `${(imageTransform.y / outputSettings.height) * 100}%`,
                              width: `${(imageTransform.width / outputSettings.width) * 100}%`,
                              height: `${(imageTransform.height / outputSettings.height) * 100}%`,
                            }
                          : undefined
                      }
                    />
                  ) : null}
                  <div className="canvas-frame-meta">
                  <span>{image.name}</span>
                  <strong>
                    {selectedLayerId === 'base-image'
                      ? 'Selected base image'
                      : 'Image ready for canvas placement'}
                  </strong>
                  <span>
                    {image.width} x {image.height}
                  </span>
                  {imageTransform ? (
                    <span className="transform-chip">
                      {imageTransform.width} x {imageTransform.height} at {imageTransform.x},{' '}
                      {imageTransform.y}
                    </span>
                  ) : null}
                  </div>
                  {image.textLayers.filter((layer) => layer.visible).map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      className={selectedLayerId === layer.id ? 'text-layer-chip selected' : 'text-layer-chip'}
                      style={{
                        left: `${layer.x / 10}%`,
                        top: `${layer.y / 10}%`,
                        fontSize: `${Math.max(14, Math.round(layer.fontSize * 0.65))}px`,
                        color: layer.fillMode === 'gradient' ? 'transparent' : layer.color,
                        backgroundImage:
                          layer.fillMode === 'gradient'
                            ? `linear-gradient(135deg, ${layer.gradientFrom}, ${layer.gradientTo})`
                            : undefined,
                        backgroundClip: layer.fillMode === 'gradient' ? 'text' : undefined,
                        WebkitBackgroundClip: layer.fillMode === 'gradient' ? 'text' : undefined,
                        writingMode: layer.isVertical ? 'vertical-rl' : 'horizontal-tb',
                        lineHeight: String(layer.lineHeight),
                        letterSpacing: `${layer.letterSpacing}px`,
                        maxWidth: `${Math.max(80, Math.round(layer.maxWidth * 0.24))}px`,
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                        WebkitTextStroke: layer.strokeWidth > 0 ? `${layer.strokeWidth}px ${layer.strokeColor}` : undefined,
                        textShadow: layer.shadowEnabled ? '3px 3px 10px rgba(0, 0, 0, 0.35)' : undefined,
                      }}
                      onClick={(event) => selectTextLayer(layer.id, isAdditiveSelection(event))}
                      onMouseDown={(event) => handleLayerMouseDown(event, layer.id)}
                      aria-label={`Select text layer: ${layer.text}`}
                    >
                      {layer.text}
                    </button>
                  ))}
                  {image.messageWindowLayers.map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      className={selectedLayerId === layer.id ? 'overlay-layer-chip message-window-chip selected' : 'overlay-layer-chip message-window-chip'}
                      style={{
                        left: `${layer.x / 19.2}%`,
                        top: `${layer.y / 10.8}%`,
                        width: `${Math.max(140, Math.round(layer.width * 0.24))}px`,
                        minHeight: `${Math.max(80, Math.round(layer.height * 0.2))}px`,
                        opacity: layer.opacity,
                        border:
                          layer.frameStyle === 'neon'
                            ? '2px solid rgba(118, 255, 244, 0.95)'
                            : layer.frameStyle === 'soft'
                              ? '2px solid rgba(255, 244, 214, 0.7)'
                              : '2px solid rgba(243, 239, 230, 0.9)',
                        background:
                          layer.assetName
                            ? 'linear-gradient(90deg, rgba(255,255,255,0.16) 0 12%, transparent 12% 88%, rgba(255,255,255,0.16) 88% 100%), linear-gradient(180deg, rgba(255,255,255,0.14) 0 18%, transparent 18% 82%, rgba(255,255,255,0.14) 82% 100%), linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.06)), linear-gradient(180deg, rgba(28,22,18,0.96), rgba(45,31,26,0.9))'
                            : layer.frameStyle === 'neon'
                              ? 'linear-gradient(135deg, rgba(5, 51, 64, 0.96), rgba(18, 22, 54, 0.92))'
                              : layer.frameStyle === 'soft'
                                ? 'linear-gradient(180deg, rgba(73, 55, 44, 0.92), rgba(43, 31, 27, 0.86))'
                                : 'linear-gradient(180deg, rgba(28, 22, 18, 0.94), rgba(20, 16, 13, 0.88))',
                        boxShadow:
                          layer.frameStyle === 'neon'
                            ? '0 0 0 1px rgba(118,255,244,0.5), 0 0 22px rgba(118,255,244,0.28)'
                            : layer.assetName
                              ? 'inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 0 0 10px rgba(255,244,214,0.06), 0 18px 30px rgba(0,0,0,0.24)'
                              : undefined,
                      }}
                      onClick={() => selectMessageWindowLayer(layer.id)}
                      aria-label={`Select message window layer: ${layer.speaker}`}
                    >
                      <strong>{layer.speaker}</strong>
                      <span>{layer.body}</span>
                      {layer.assetName ? <small>9-slice asset</small> : null}
                      {layer.assetName ? <small>{`Asset ${layer.assetName}`}</small> : null}
                    </button>
                  ))}
                  {image.bubbleLayers.filter((layer) => layer.visible).map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      className={selectedLayerId === layer.id ? 'bubble-layer-chip selected' : 'bubble-layer-chip'}
                      style={{
                        left: `${layer.x / 10}%`,
                        top: `${layer.y / 10}%`,
                        width: `${Math.max(120, Math.round(layer.width * 0.3))}px`,
                        minHeight: `${Math.max(72, Math.round(layer.height * 0.3))}px`,
                        borderRadius:
                          (layer.bubbleShape ?? 'round') === 'rounded-rect'
                            ? '22px'
                            : (layer.bubbleShape ?? 'round') === 'round'
                              ? '999px'
                              : layer.stylePreset === 'thought'
                                ? '40%'
                                : '12px',
                        clipPath: getBubbleClipPath(layer.bubbleShape ?? 'round', layer.shapeSeed ?? 0),
                        background: layer.fillColor,
                        borderColor: layer.borderColor,
                      }}
                      onClick={(event) => selectBubbleLayer(layer.id, isAdditiveSelection(event))}
                      onMouseDown={(event) => handleLayerMouseDown(event, layer.id)}
                      aria-label={`Select bubble layer: ${layer.text}`}
                    >
                      {layer.text}
                      <small>{`${getBubbleShapeLabel(layer.bubbleShape ?? 'round')} v${getBubbleShapeVariantNumber(layer.shapeSeed ?? 0)}`}</small>
                    </button>
                  ))}
                  {image.mosaicLayers.filter((layer) => layer.visible).map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      className={selectedLayerId === layer.id ? 'mosaic-layer-chip selected' : 'mosaic-layer-chip'}
                      style={{
                        left: `${layer.x / 10}%`,
                        top: `${layer.y / 10}%`,
                        width: `${Math.max(64, Math.round(layer.width * 0.3))}px`,
                        minHeight: `${Math.max(64, Math.round(layer.height * 0.3))}px`,
                        background:
                          layer.style === 'blur'
                            ? 'rgba(255, 215, 177, 0.72)'
                            : layer.style === 'noise'
                              ? 'repeating-linear-gradient(45deg, rgba(255, 215, 177, 0.84), rgba(255, 215, 177, 0.84) 6px, rgba(36, 27, 21, 0.1) 6px, rgba(36, 27, 21, 0.1) 12px)'
                              : 'repeating-linear-gradient(90deg, rgba(255, 215, 177, 0.82), rgba(255, 215, 177, 0.82) 8px, rgba(36, 27, 21, 0.12) 8px, rgba(36, 27, 21, 0.12) 16px)',
                        backgroundSize:
                          layer.style === 'blur'
                            ? '100% 100%'
                            : `${Math.max(6, layer.intensity)}px ${Math.max(6, layer.intensity)}px`,
                        filter: layer.style === 'blur' ? 'blur(5px)' : undefined,
                      }}
                      onClick={(event) => selectMosaicLayer(layer.id, isAdditiveSelection(event))}
                      onMouseDown={(event) => handleLayerMouseDown(event, layer.id)}
                      aria-label={`Select mosaic layer ${layer.intensity}`}
                    >
                      {layer.style === 'pixelate' ? 'Mosaic' : layer.style === 'blur' ? 'Blur' : 'Noise'}
                    </button>
                  ))}
                  {image.overlayLayers.filter((layer) => layer.visible).map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      className={selectedLayerId === layer.id ? 'overlay-layer-chip selected' : 'overlay-layer-chip'}
                      style={{
                        left: `${layer.x / 10}%`,
                        top: `${layer.y / 10}%`,
                        width: `${Math.max(96, Math.round(layer.width * 0.3))}px`,
                        minHeight: `${Math.max(64, Math.round(layer.height * 0.3))}px`,
                        background:
                          layer.fillMode === 'gradient'
                            ? `linear-gradient(${layer.gradientDirection === 'vertical' ? '180deg' : layer.gradientDirection === 'horizontal' ? '90deg' : '135deg'}, ${layer.gradientFrom}, ${layer.gradientTo})`
                            : layer.color,
                        opacity: layer.opacity,
                      }}
                      onClick={(event) => selectOverlayLayer(layer.id, isAdditiveSelection(event))}
                      onMouseDown={(event) => handleLayerMouseDown(event, layer.id)}
                      aria-label={`Select overlay layer ${layer.opacity}`}
                    >
                      Overlay
                    </button>
                  ))}
                  {previewSam3ReviewCandidates.map((candidate) => (
                    <button
                      key={`sam3-review-preview-${candidate.index}`}
                      type="button"
                      className={
                        candidate.focused
                          ? candidate.selected
                            ? 'backend-review-preview sam3 selected focused'
                            : 'backend-review-preview sam3 focused'
                          : candidate.selected
                            ? 'backend-review-preview sam3 selected'
                            : 'backend-review-preview sam3'
                      }
                      style={{
                        left: `${(candidate.x / 1920) * 100}%`,
                        top: `${(candidate.y / 1080) * 100}%`,
                        width: `${(candidate.width / 1920) * 100}%`,
                        height: `${(candidate.height / 1080) * 100}%`,
                        background:
                          candidate.maskPreviewUrl
                            ? `${candidate.style === 'blur'
                                ? 'linear-gradient(135deg, rgba(255, 215, 177, 0.26), rgba(255, 215, 177, 0.14))'
                                : candidate.style === 'noise'
                                  ? 'repeating-linear-gradient(45deg, rgba(255, 215, 177, 0.3), rgba(255, 215, 177, 0.3) 6px, rgba(36, 27, 21, 0.1) 6px, rgba(36, 27, 21, 0.1) 12px)'
                                  : 'repeating-linear-gradient(90deg, rgba(255, 215, 177, 0.28), rgba(255, 215, 177, 0.28) 8px, rgba(36, 27, 21, 0.08) 8px, rgba(36, 27, 21, 0.08) 16px)'}, url(${candidate.maskPreviewUrl}) center / cover no-repeat`
                            : candidate.style === 'blur'
                              ? 'rgba(255, 215, 177, 0.38)'
                              : candidate.style === 'noise'
                                ? 'repeating-linear-gradient(45deg, rgba(255, 215, 177, 0.36), rgba(255, 215, 177, 0.36) 6px, rgba(36, 27, 21, 0.1) 6px, rgba(36, 27, 21, 0.1) 12px)'
                                : 'repeating-linear-gradient(90deg, rgba(255, 215, 177, 0.34), rgba(255, 215, 177, 0.34) 8px, rgba(36, 27, 21, 0.08) 8px, rgba(36, 27, 21, 0.08) 16px)',
                        backgroundSize: candidate.maskPreviewUrl
                          ? undefined
                          : `${Math.max(6, candidate.intensity)}px ${Math.max(6, candidate.intensity)}px`,
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveFocusedSam3ReviewCandidateIndex(candidate.index)
                      }}
                      aria-label={`SAM3 review preview ${candidate.index + 1}: ${candidate.selected ? 'selected' : 'skipped'}${candidate.focused ? ' focused' : ''}`}
                      data-style={candidate.style}
                      data-intensity={String(candidate.intensity)}
                    >
                      <span>{`SAM3 ${candidate.index + 1} ${candidate.style}`}</span>
                    </button>
                  ))}
                  {previewNsfwReviewCandidates.map((candidate) => (
                    <button
                      key={`nsfw-review-preview-${candidate.index}`}
                      type="button"
                      className={
                        candidate.focused
                          ? candidate.selected
                            ? 'backend-review-preview nsfw selected focused'
                            : 'backend-review-preview nsfw focused'
                          : candidate.selected
                            ? 'backend-review-preview nsfw selected'
                            : 'backend-review-preview nsfw'
                      }
                      style={{
                        left: `${(candidate.x / 1920) * 100}%`,
                        top: `${(candidate.y / 1080) * 100}%`,
                        width: `${(candidate.width / 1920) * 100}%`,
                        height: `${(candidate.height / 1080) * 100}%`,
                        borderColor: candidate.color,
                        background: candidate.maskPreviewUrl
                          ? `linear-gradient(135deg, ${candidate.color}33, ${candidate.color}14), url(${candidate.maskPreviewUrl}) center / cover no-repeat`
                          : `${candidate.color}22`,
                        opacity: candidate.opacity,
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveFocusedNsfwReviewCandidateIndex(candidate.index)
                      }}
                      aria-label={`NSFW review preview ${candidate.index + 1}: ${candidate.selected ? 'selected' : 'skipped'}${candidate.focused ? ' focused' : ''}`}
                      data-color={candidate.color}
                      data-opacity={candidate.opacity.toFixed(1)}
                    >
                      <span>{`NSFW ${candidate.index + 1}`}</span>
                    </button>
                  ))}
                  {backendActionResults.sam3ManualSegmentMaskReady && manualSegmentMaskBounds ? (
                    <div
                      aria-label="Manual segment preview"
                      className="backend-review-preview sam3 manual"
                      style={{
                        left: `${(manualSegmentMaskBounds.x / 1920) * 100}%`,
                        top: `${(manualSegmentMaskBounds.y / 1080) * 100}%`,
                        width: `${(manualSegmentMaskBounds.width / 1920) * 100}%`,
                        height: `${(manualSegmentMaskBounds.height / 1080) * 100}%`,
                        backgroundImage: manualSegmentMaskPreviewUrl
                          ? `linear-gradient(135deg, rgba(116, 196, 255, 0.2), rgba(116, 196, 255, 0.08)), url(${manualSegmentMaskPreviewUrl})`
                          : undefined,
                        backgroundRepeat: manualSegmentMaskPreviewUrl ? 'no-repeat' : undefined,
                        backgroundPosition: manualSegmentMaskPreviewUrl ? 'center' : undefined,
                        backgroundSize: manualSegmentMaskPreviewUrl ? 'cover' : undefined,
                      }}
                    >
                      <span>Manual mask</span>
                    </div>
                  ) : null}
                  {image.watermarkLayers.map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      className={selectedLayerId === layer.id ? 'watermark-layer-chip selected' : 'watermark-layer-chip'}
                      style={{
                        left: `${(layer.x / 1920) * 100}%`,
                        top: `${(layer.y / 1080) * 100}%`,
                        opacity: layer.opacity,
                        color: layer.color,
                        transform: `translate(-50%, -50%) rotate(${layer.angle}deg) scale(${layer.scale})`,
                        letterSpacing: `${0.08 * layer.density}em`,
                        width: layer.tiled ? '74%' : 'auto',
                      }}
                      onClick={() => selectWatermarkLayer(layer.id)}
                      aria-label={`Select watermark layer: ${layer.assetName ?? layer.text}`}
                    >
                      {layer.mode === 'image'
                        ? `[${layer.assetName ?? 'watermark.png'}]`
                        : layer.repeated
                        ? Array.from({ length: Math.max(3, layer.density + 2) }, () => layer.text).join(' • ')
                        : layer.text}
                    </button>
                  ))}
                  {previewBackendManualSegmentPoints.map((point, index) => (
                    <button
                      key={`manual-point-${index}-${point.label}`}
                      type="button"
                      className={
                        index === selectedBackendManualSegmentPointIndex
                          ? 'manual-segment-point selected'
                          : 'manual-segment-point'
                      }
                      style={{
                        left: `${(point.x / 1920) * 100}%`,
                        top: `${(point.y / 1080) * 100}%`,
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedBackendManualSegmentPointIndex(index)
                      }}
                      onMouseDown={(event) => handleManualSegmentPointMouseDown(event, index)}
                      aria-label={`Select manual segment point ${index + 1}: ${
                        point.label === 0 ? 'negative' : 'positive'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  {marqueeBounds ? (
                    <div
                      aria-label="Marquee selection"
                      className="marquee-selection"
                      style={{
                        left: `${(marqueeBounds.left / 1920) * 100}%`,
                        top: `${(marqueeBounds.top / 1080) * 100}%`,
                        width: `${((marqueeBounds.right - marqueeBounds.left) / 1920) * 100}%`,
                        height: `${((marqueeBounds.bottom - marqueeBounds.top) / 1080) * 100}%`,
                      }}
                    />
                  ) : null}
                  {selectionBounds ? (
                    <div
                      aria-label="Selection bounds"
                      className="selection-bounds"
                      style={{
                        left: `${(selectionBounds.left / 1920) * 100}%`,
                        top: `${(selectionBounds.top / 1080) * 100}%`,
                        width: `${((selectionBounds.right - selectionBounds.left) / 1920) * 100}%`,
                        height: `${((selectionBounds.bottom - selectionBounds.top) / 1080) * 100}%`,
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Resize selected layers top left"
                        className="selection-handle selection-handle-top-left"
                        onMouseDown={(event) => handleSelectionResizeMouseDown(event, 'top-left')}
                      />
                      <button
                        type="button"
                        aria-label="Resize selected layers top"
                        className="selection-handle selection-handle-top"
                        onMouseDown={(event) => handleSelectionResizeMouseDown(event, 'top')}
                      />
                      <button
                        type="button"
                        aria-label="Resize selected layers top right"
                        className="selection-handle selection-handle-top-right"
                        onMouseDown={(event) => handleSelectionResizeMouseDown(event, 'top-right')}
                      />
                      <button
                        type="button"
                        aria-label="Resize selected layers left"
                        className="selection-handle selection-handle-left"
                        onMouseDown={(event) => handleSelectionResizeMouseDown(event, 'left')}
                      />
                      <button
                        type="button"
                        aria-label="Resize selected layers right"
                        className="selection-handle selection-handle-right"
                        onMouseDown={(event) => handleSelectionResizeMouseDown(event, 'right')}
                      />
                      <button
                        type="button"
                        aria-label="Resize selected layers bottom left"
                        className="selection-handle selection-handle-bottom-left"
                        onMouseDown={(event) => handleSelectionResizeMouseDown(event, 'bottom-left')}
                      />
                      <button
                        type="button"
                        aria-label="Resize selected layers bottom"
                        className="selection-handle selection-handle-bottom"
                        onMouseDown={(event) => handleSelectionResizeMouseDown(event, 'bottom')}
                      />
                      <button
                        type="button"
                        aria-label="Resize selected layers"
                        className="selection-handle selection-handle-bottom-right"
                        onMouseDown={(event) => handleSelectionResizeMouseDown(event, 'bottom-right')}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="selection-controls" role="group" aria-label="Selection controls">
                  <button type="button" onClick={selectBaseImageLayer}>
                    Select base image layer
                  </button>
                  <button
                    type="button"
                    onClick={toggleSelectedLayerVisibility}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Toggle selected layer visibility
                  </button>
                  <button
                    type="button"
                    onClick={toggleSelectedLayerLock}
                    disabled={
                      !activeTextLayer &&
                      !activeMessageWindowLayer &&
                      !activeBubbleLayer &&
                      !activeMosaicLayer &&
                      !activeOverlayLayer &&
                      !activeWatermarkLayer
                    }
                  >
                    Toggle selected layer lock
                  </button>
                  <button type="button" onClick={groupSelectedLayers} disabled={selectedLayerCount < 2}>
                    Group selected layers
                  </button>
                  <button type="button" onClick={selectGroupedLayers} disabled={!activeLayerGroupId}>
                    Select grouped layers
                  </button>
                  <button
                    type="button"
                    onClick={ungroupSelectedLayers}
                    disabled={!activeLayerGroupId && selectedLayerCount < 2}
                  >
                    Ungroup selected layers
                  </button>
                  <button
                    type="button"
                    onClick={duplicateSelectedLayer}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Duplicate selected layer
                  </button>
                  <button
                    type="button"
                    onClick={centerSelectedLayer}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Center selected layer
                  </button>
                  <button
                    type="button"
                    onClick={moveSelectedLayerBackward}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Move selected layer backward
                  </button>
                  <button
                    type="button"
                    onClick={moveSelectedLayerForward}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Move selected layer forward
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedLayer}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Delete selected layer
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayer('left')}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Align selected layer left
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayer('right')}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Align selected layer right
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayer('top')}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Align selected layer top
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayer('bottom')}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Align selected layer bottom
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayersCenter('horizontal')}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Align selected layers center horizontally
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayersCenter('vertical')}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Align selected layers center vertically
                  </button>
                  <button
                    type="button"
                    onClick={() => distributeSelectedLayers('horizontal')}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Distribute selected layers horizontally
                  </button>
                  <button
                    type="button"
                    onClick={() => distributeSelectedLayers('vertical')}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Distribute selected layers vertically
                  </button>
                  <button
                    type="button"
                    onClick={() => matchSelectedLayerSize('width')}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Match selected layer widths
                  </button>
                  <button
                    type="button"
                    onClick={() => matchSelectedLayerSize('height')}
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
                  >
                    Match selected layer heights
                  </button>
                  <button type="button" onClick={() => moveSelection(-32, 0)}>
                    Move left
                  </button>
                  <button type="button" onClick={() => moveSelection(32, 0)}>
                    Move right
                  </button>
                  <button type="button" onClick={() => moveSelection(0, -32)}>
                    Move up
                  </button>
                  <button type="button" onClick={() => moveSelection(0, 32)}>
                    Move down
                  </button>
                  <button type="button" onClick={() => scaleSelection(0.9)}>
                    Scale down
                  </button>
                  <button type="button" onClick={() => scaleSelection(1.125)}>
                    Scale up
                  </button>
                </div>
                {activeTextLayer ? (
                  <div className="selection-controls text-controls" role="group" aria-label="Text layer controls">
                    <label className="text-layer-field">
                      <span>Layer name</span>
                      <input
                        aria-label="Selected layer name"
                        type="text"
                        value={activeNamedLayer?.name ?? ''}
                        onChange={(event) => {
                          renameSelectedLayer(event.target.value)
                        }}
                      />
                    </label>
                    <label className="text-layer-field">
                      <span>Text</span>
                      <input
                        aria-label="Selected text content"
                        type="text"
                        value={activeTextLayer.text}
                        onChange={(event) => {
                          updateSelectedTextLayerText(event.target.value)
                        }}
                      />
                    </label>
                    <label className="text-layer-field color-field">
                      <span>Color</span>
                      <input
                        aria-label="Selected text color"
                        type="color"
                        value={activeTextLayer.color}
                        onChange={(event) => {
                          setSelectedTextLayerColor(event.target.value)
                        }}
                      />
                    </label>
                    <label className="text-layer-field color-field">
                      <span>Gradient from</span>
                      <input
                        aria-label="Selected text gradient from"
                        type="color"
                        value={activeTextLayer.gradientFrom}
                        onChange={(event) => {
                          setSelectedTextLayerGradientFrom(event.target.value)
                        }}
                      />
                    </label>
                    <label className="text-layer-field color-field">
                      <span>Gradient to</span>
                      <input
                        aria-label="Selected text gradient to"
                        type="color"
                        value={activeTextLayer.gradientTo}
                        onChange={(event) => {
                          setSelectedTextLayerGradientTo(event.target.value)
                        }}
                      />
                    </label>
                    <button type="button" onClick={() => moveSelectedTextLayer(32, 0)}>
                      Move text right
                    </button>
                    <button type="button" onClick={() => moveSelectedTextLayer(0, 32)}>
                      Move text down
                    </button>
                    <button type="button" onClick={() => changeSelectedTextLayerFontSize(2)}>
                      Increase text size
                    </button>
                    <button type="button" onClick={() => changeSelectedTextLayerLineHeight(0.1)}>
                      Increase line height
                    </button>
                    <button type="button" onClick={() => changeSelectedTextLayerLetterSpacing(1)}>
                      Increase letter spacing
                    </button>
                    <button type="button" onClick={() => changeSelectedTextLayerMaxWidth(-40)}>
                      Narrow text wrap
                    </button>
                    <button type="button" onClick={toggleSelectedTextLayerFillMode}>
                      Toggle gradient fill
                    </button>
                    <button type="button" onClick={toggleSelectedTextLayerVertical}>
                      Toggle vertical text
                    </button>
                    <button type="button" onClick={() => changeSelectedTextLayerOutlineWidth(1)}>
                      Increase outline
                    </button>
                    <button type="button" onClick={toggleSelectedTextLayerShadow}>
                      Toggle text shadow
                    </button>
                    <button type="button" onClick={saveSelectedTextStylePreset}>
                      Save text preset
                    </button>
                    {textStylePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyTextStylePreset(preset.id)}
                      >
                        {`Apply text preset: ${preset.label}`}
                      </button>
                    ))}
                    <button type="button" onClick={moveSelectedTextLayerBackward}>
                      Send text backward
                    </button>
                    <button type="button" onClick={moveSelectedTextLayerForward}>
                      Bring text forward
                    </button>
                    <button type="button" onClick={deleteSelectedTextLayer}>
                      Delete text layer
                    </button>
                  </div>
                ) : null}
                {activeMessageWindowLayer ? (
                  <div className="selection-controls text-controls" role="group" aria-label="Message window controls">
                    <label className="text-layer-field">
                      <span>Layer name</span>
                      <input
                        aria-label="Selected layer name"
                        type="text"
                        value={activeNamedLayer?.name ?? ''}
                        onChange={(event) => {
                          renameSelectedLayer(event.target.value)
                        }}
                      />
                    </label>
                    <label className="text-layer-field">
                      <span>Speaker</span>
                      <input
                        aria-label="Selected message speaker"
                        type="text"
                        value={activeMessageWindowLayer.speaker}
                        onChange={(event) => {
                          updateSelectedMessageWindowSpeaker(event.target.value)
                        }}
                      />
                    </label>
                    <label className="text-layer-field">
                      <span>Body</span>
                      <input
                        aria-label="Selected message body"
                        type="text"
                        value={activeMessageWindowLayer.body}
                        onChange={(event) => {
                          updateSelectedMessageWindowBody(event.target.value)
                        }}
                      />
                    </label>
                    <button type="button" onClick={() => moveSelectedMessageWindowLayer(32, 0)}>
                      Move message window right
                    </button>
                    <button type="button" onClick={() => moveSelectedMessageWindowLayer(0, -32)}>
                      Move message window up
                    </button>
                    <button type="button" onClick={() => resizeSelectedMessageWindowLayer(32, 0)}>
                      Increase message window width
                    </button>
                    <button type="button" onClick={() => resizeSelectedMessageWindowLayer(0, 32)}>
                      Increase message window height
                    </button>
                    <button type="button" onClick={cycleSelectedMessageWindowFrameStyle}>
                      Cycle message window frame
                    </button>
                    <label className="file-picker">
                      <span>Load window asset</span>
                      <input
                        aria-label="Open message window asset"
                        type="file"
                        accept=".png,image/png"
                        onChange={handleMessageWindowAssetChange}
                      />
                    </label>
                    <button type="button" onClick={saveSelectedMessageWindowPreset}>
                      Save message preset
                    </button>
                    {messageWindowPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyMessageWindowPreset(preset.id)}
                      >
                        {`Apply message preset: ${preset.label}`}
                      </button>
                    ))}
                  </div>
                ) : null}
                {activeWatermarkLayer ? (
                  <div className="selection-controls text-controls" role="group" aria-label="Watermark layer controls">
                    <label className="text-layer-field">
                      <span>Layer name</span>
                      <input
                        aria-label="Selected layer name"
                        type="text"
                        value={activeNamedLayer?.name ?? ''}
                        onChange={(event) => {
                          renameSelectedLayer(event.target.value)
                        }}
                      />
                    </label>
                    <label className="text-layer-field">
                      <span>Watermark</span>
                      <input
                        aria-label="Selected watermark text"
                        type="text"
                        value={activeWatermarkLayer.text}
                        onChange={(event) => {
                          updateSelectedWatermarkText(event.target.value)
                        }}
                      />
                    </label>
                    <button type="button" onClick={() => changeSelectedWatermarkOpacity(0.1)}>
                      Increase watermark opacity
                    </button>
                    <button type="button" onClick={toggleSelectedWatermarkPattern}>
                      Toggle watermark pattern
                    </button>
                    <button type="button" onClick={() => setSelectedWatermarkPreset('patreon')}>
                      Apply Patreon CTA watermark
                    </button>
                    <button type="button" onClick={() => setSelectedWatermarkPreset('discord')}>
                      Apply Discord CTA watermark
                    </button>
                    <button type="button" onClick={() => changeSelectedWatermarkAngle(8)}>
                      Rotate watermark more
                    </button>
                    <button type="button" onClick={() => changeSelectedWatermarkDensity(1)}>
                      Increase watermark density
                    </button>
                    <button type="button" onClick={() => moveSelectedWatermarkLayer(96, 0)}>
                      Move watermark right
                    </button>
                    <button type="button" onClick={() => moveSelectedWatermarkLayer(0, 64)}>
                      Move watermark down
                    </button>
                    <button type="button" onClick={() => changeSelectedWatermarkScale(0.2)}>
                      Increase watermark scale
                    </button>
                    <button type="button" onClick={toggleSelectedWatermarkTileLayout}>
                      Toggle watermark tile layout
                    </button>
                    <button type="button" onClick={saveSelectedWatermarkStylePreset}>
                      Save watermark preset
                    </button>
                    {watermarkStylePresets.length > 0 ? (
                      <div className="selection-controls">
                        {watermarkStylePresets.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyWatermarkStylePreset(preset.id)}
                          >
                            {`Apply watermark preset: ${preset.label}`}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {activeBubbleLayer ? (
                  <div className="selection-controls text-controls" role="group" aria-label="Bubble layer controls">
                    <label className="text-layer-field">
                      <span>Layer name</span>
                      <input
                        aria-label="Selected layer name"
                        type="text"
                        value={activeNamedLayer?.name ?? ''}
                        onChange={(event) => {
                          renameSelectedLayer(event.target.value)
                        }}
                      />
                    </label>
                    <label className="text-layer-field">
                      <span>Bubble</span>
                      <input
                        aria-label="Selected bubble content"
                        type="text"
                        value={activeBubbleLayer.text}
                        onChange={(event) => {
                          updateSelectedBubbleLayerText(event.target.value)
                        }}
                      />
                    </label>
                    <label className="text-layer-field color-field">
                      <span>Fill</span>
                      <input
                        aria-label="Selected bubble fill color"
                        type="color"
                        value={activeBubbleLayer.fillColor}
                        onChange={(event) => {
                          setSelectedBubbleFillColor(event.target.value)
                        }}
                      />
                    </label>
                    <label className="text-layer-field color-field">
                      <span>Border</span>
                      <input
                        aria-label="Selected bubble border color"
                        type="color"
                        value={activeBubbleLayer.borderColor}
                        onChange={(event) => {
                          setSelectedBubbleBorderColor(event.target.value)
                        }}
                      />
                    </label>
                    <button type="button" onClick={() => moveSelectedBubbleLayer(32, 0)}>
                      Move bubble right
                    </button>
                    <button type="button" onClick={() => moveSelectedBubbleLayer(0, 32)}>
                      Move bubble down
                    </button>
                    <button type="button" onClick={() => resizeSelectedBubbleLayer(32, 0)}>
                      Increase bubble width
                    </button>
                    <button type="button" onClick={() => resizeSelectedBubbleLayer(0, 32)}>
                      Increase bubble height
                    </button>
                    <button type="button" onClick={() => setSelectedBubbleTailDirection('left')}>
                      Tail left
                    </button>
                    <button type="button" onClick={() => setSelectedBubbleTailDirection('right')}>
                      Tail right
                    </button>
                    <button type="button" onClick={() => setSelectedBubbleTailDirection('bottom')}>
                      Tail bottom
                    </button>
                    <button type="button" onClick={() => setSelectedBubbleStylePreset('speech')}>
                      Style speech
                    </button>
                    <button type="button" onClick={() => setSelectedBubbleStylePreset('thought')}>
                      Style thought
                    </button>
                    <button type="button" onClick={() => setSelectedBubbleShape('round')}>
                      Shape round
                    </button>
                    <button type="button" onClick={() => setSelectedBubbleShape('rounded-rect')}>
                      Shape rounded rect
                    </button>
                    <button type="button" onClick={() => setSelectedBubbleShape('spiky')}>
                      Shape spiky
                    </button>
                    <button type="button" onClick={() => setSelectedBubbleShape('cloud')}>
                      Shape cloud
                    </button>
                    <button type="button" onClick={() => setSelectedBubbleShape('urchin')}>
                      Shape urchin
                    </button>
                    <button type="button" onClick={randomizeSelectedBubbleShape}>
                      Randomize bubble shape
                    </button>
                    <button type="button" onClick={moveSelectedBubbleLayerBackward}>
                      Send bubble backward
                    </button>
                    <button type="button" onClick={moveSelectedBubbleLayerForward}>
                      Bring bubble forward
                    </button>
                    <button type="button" onClick={duplicateSelectedBubbleLayer}>
                      Duplicate bubble layer
                    </button>
                    <button type="button" onClick={saveSelectedBubbleStylePreset}>
                      Save bubble preset
                    </button>
                    {bubbleStylePresets.length > 0 ? (
                      <div className="selection-controls">
                        {bubbleStylePresets.map((preset) => (
                          <button key={preset.id} type="button" onClick={() => applyBubbleStylePreset(preset.id)}>
                            {`Apply bubble preset: ${preset.label}`}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button type="button" onClick={deleteSelectedBubbleLayer}>
                      Delete bubble layer
                    </button>
                  </div>
                ) : null}
                {activeMosaicLayer ? (
                  <div className="selection-controls text-controls" role="group" aria-label="Mosaic layer controls">
                    <label className="text-layer-field">
                      <span>Layer name</span>
                      <input
                        aria-label="Selected layer name"
                        type="text"
                        value={activeNamedLayer?.name ?? ''}
                        onChange={(event) => {
                          renameSelectedLayer(event.target.value)
                        }}
                      />
                    </label>
                    <button type="button" onClick={() => moveSelectedMosaicLayer(32, 0)}>
                      Move mosaic right
                    </button>
                    <button type="button" onClick={() => moveSelectedMosaicLayer(0, 32)}>
                      Move mosaic down
                    </button>
                    <button type="button" onClick={() => resizeSelectedMosaicLayer(32, 0)}>
                      Increase mosaic width
                    </button>
                    <button type="button" onClick={() => resizeSelectedMosaicLayer(0, 32)}>
                      Increase mosaic height
                    </button>
                    <button type="button" onClick={() => changeSelectedMosaicIntensity(4)}>
                      Increase mosaic intensity
                    </button>
                    <button type="button" onClick={() => setSelectedMosaicIntensity(8)}>
                      Mosaic intensity Small
                    </button>
                    <button type="button" onClick={() => setSelectedMosaicIntensity(16)}>
                      Mosaic intensity Medium
                    </button>
                    <button type="button" onClick={() => setSelectedMosaicIntensity(24)}>
                      Mosaic intensity Large
                    </button>
                    <button type="button" onClick={cycleSelectedMosaicStyle}>
                      Cycle mosaic style
                    </button>
                    <button type="button" onClick={() => setSelectedMosaicStyle('pixelate')}>
                      Mosaic pixelate
                    </button>
                    <button type="button" onClick={() => setSelectedMosaicStyle('blur')}>
                      Mosaic blur
                    </button>
                    <button type="button" onClick={() => setSelectedMosaicStyle('noise')}>
                      Mosaic noise
                    </button>
                    <button type="button" onClick={moveSelectedMosaicLayerBackward}>
                      Send mosaic backward
                    </button>
                    <button type="button" onClick={moveSelectedMosaicLayerForward}>
                      Bring mosaic forward
                    </button>
                    <button type="button" onClick={duplicateSelectedMosaicLayer}>
                      Duplicate mosaic layer
                    </button>
                    <button type="button" onClick={saveSelectedMosaicStylePreset}>
                      Save mosaic preset
                    </button>
                    {mosaicStylePresets.length > 0 ? (
                      <div className="selection-controls">
                        {mosaicStylePresets.map((preset) => (
                          <button key={preset.id} type="button" onClick={() => applyMosaicStylePreset(preset.id)}>
                            {`Apply mosaic preset: ${preset.label}`}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button type="button" onClick={deleteSelectedMosaicLayer}>
                      Delete mosaic layer
                    </button>
                  </div>
                ) : null}
                {activeOverlayLayer ? (
                  <div className="selection-controls text-controls" role="group" aria-label="Overlay layer controls">
                    <label className="text-layer-field">
                      <span>Layer name</span>
                      <input
                        aria-label="Selected layer name"
                        type="text"
                        value={activeNamedLayer?.name ?? ''}
                        onChange={(event) => {
                          renameSelectedLayer(event.target.value)
                        }}
                      />
                    </label>
                    <label className="text-layer-field color-field">
                      <span>Tint</span>
                      <input
                        aria-label="Selected overlay color"
                        type="color"
                        value={activeOverlayLayer.color}
                        onChange={(event) => {
                          setSelectedOverlayColor(event.target.value)
                        }}
                      />
                    </label>
                    <button type="button" onClick={cycleSelectedOverlayAreaPreset}>
                      Cycle overlay area
                    </button>
                    <button type="button" onClick={() => setSelectedOverlayAreaPreset('full')}>
                      Overlay full
                    </button>
                    <button type="button" onClick={() => setSelectedOverlayAreaPreset('top-half')}>
                      Overlay top half
                    </button>
                    <button type="button" onClick={() => setSelectedOverlayAreaPreset('bottom-half')}>
                      Overlay bottom half
                    </button>
                    <button type="button" onClick={() => setSelectedOverlayAreaPreset('center-band')}>
                      Overlay center band
                    </button>
                    <button type="button" onClick={toggleSelectedOverlayFillMode}>
                      Toggle overlay gradient
                    </button>
                    <label className="text-layer-field color-field">
                      <span>Gradient from</span>
                      <input
                        aria-label="Selected overlay gradient from"
                        type="color"
                        value={activeOverlayLayer.gradientFrom}
                        onChange={(event) => {
                          setSelectedOverlayGradientFrom(event.target.value)
                        }}
                      />
                    </label>
                    <label className="text-layer-field color-field">
                      <span>Gradient to</span>
                      <input
                        aria-label="Selected overlay gradient to"
                        type="color"
                        value={activeOverlayLayer.gradientTo}
                        onChange={(event) => {
                          setSelectedOverlayGradientTo(event.target.value)
                        }}
                      />
                    </label>
                    <button type="button" onClick={cycleSelectedOverlayGradientDirection}>
                      Cycle overlay gradient direction
                    </button>
                    <button type="button" onClick={() => moveSelectedOverlayLayer(32, 0)}>
                      Move overlay right
                    </button>
                    <button type="button" onClick={() => changeSelectedOverlayOpacity(0.1)}>
                      Increase overlay opacity
                    </button>
                    <button type="button" onClick={moveSelectedOverlayLayerBackward}>
                      Send overlay backward
                    </button>
                    <button type="button" onClick={moveSelectedOverlayLayerForward}>
                      Bring overlay forward
                    </button>
                    <button type="button" onClick={duplicateSelectedOverlayLayer}>
                      Duplicate overlay layer
                    </button>
                    <button type="button" onClick={saveSelectedOverlayStylePreset}>
                      Save overlay preset
                    </button>
                    {overlayStylePresets.length > 0 ? (
                      <div className="selection-controls">
                        {overlayStylePresets.map((preset) => (
                          <button key={preset.id} type="button" onClick={() => applyOverlayStylePreset(preset.id)}>
                            {`Apply overlay preset: ${preset.label}`}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button type="button" onClick={deleteSelectedOverlayLayer}>
                      Delete overlay layer
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                className="canvas-empty-state drop-zone-button"
                aria-label="Canvas drop zone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleCanvasDrop}
              >
                <strong>Drop or choose an image to begin</strong>
                <span>Zoom / pan controls are active for the current page.</span>
                {loadError ? <span className="error-text">{loadError}</span> : null}
              </button>
            )}
          </div>
        </main>

        <div className="right-sidebar">
          <aside aria-label="Page list" className="sidebar-card">
            <div className="panel-title">Pages</div>
            <div className="page-list">
              {pages.length === 0 ? (
                <div className="page-card current empty">
                  <span>01</span>
                  <strong>Cover draft</strong>
                </div>
              ) : (
                pages.map((page, index) => {
                  const pageNumber = `${index + 1}`.padStart(2, '0')
                  const isActive = page.id === activePageId

                  return (
                    <button
                      key={page.id}
                      type="button"
                      className={isActive ? 'page-card current page-button' : 'page-card page-button'}
                      aria-pressed={isActive}
                      onClick={() => selectPage(page.id)}
                      aria-label={`Open page ${pageNumber}: ${page.name}`}
                    >
                      <span>{pageNumber}</span>
                      <strong>{page.name}</strong>
                      {page.variantLabel ? <small>{`Variant ${page.variantLabel}`}</small> : null}
                    </button>
                  )
                })
              )}
            </div>
            <div className="page-meta">
              {pageCount === 1 ? '1 page loaded' : `${pageCount} pages loaded`}
            </div>
            {loadError ? <div className="page-meta error-text">{loadError}</div> : null}
          </aside>

          <section aria-label="Property inspector" className="sidebar-card">
            <div className="panel-title">Inspector</div>
            <dl className="inspector-grid">
              <div>
                <dt>Selection</dt>
                <dd>{selectedLayerCount > 1 ? `${selectedLayerCount} layers selected` : selectionLabel}</dd>
              </div>
              <div>
                <dt>Active tool</dt>
                <dd>{activeTool}</dd>
              </div>
              <div>
                <dt>Output</dt>
                <dd>{`${outputSettings.width} x ${outputSettings.height} ${outputSettings.format.toUpperCase()}`}</dd>
              </div>
              {activePageVariantLabel ? (
                <div>
                  <dt>Variant</dt>
                  <dd>{`Variant ${activePageVariantLabel}`}</dd>
                </div>
              ) : null}
              {activePageVariantSourceLabel ? (
                <div>
                  <dt>Variant source</dt>
                  <dd>{`Source ${activePageVariantSourceLabel}`}</dd>
                </div>
              ) : null}
              <div>
                <dt>Transform</dt>
                <dd>{positionLabel}</dd>
              </div>
              <div>
                <dt>Bounds</dt>
                <dd>{sizeLabel}</dd>
              </div>
              {selectionBoundsLabel ? (
                <div>
                  <dt>Selection box</dt>
                  <dd>{selectionBoundsLabel}</dd>
                </div>
              ) : null}
              {selectedLayerTypeLabel ? (
                <div>
                  <dt>Selection mix</dt>
                  <dd>{selectedLayerTypeLabel}</dd>
                </div>
              ) : null}
              {multiSelectionActionLabel ? (
                <div>
                  <dt>Shared actions</dt>
                  <dd>{multiSelectionActionLabel}</dd>
                </div>
              ) : null}
              {activeLayerGroupId ? (
                <div>
                  <dt>Group</dt>
                  <dd>{`Group ${activeLayerGroupCount} layers`}</dd>
                </div>
              ) : null}
              {(activeTextLayer || activeBubbleLayer || activeMosaicLayer || activeOverlayLayer) ? (
                <div>
                  <dt>Visibility</dt>
                  <dd>{visibilityLabel}</dd>
                </div>
              ) : null}
              {(activeTextLayer || activeBubbleLayer || activeMosaicLayer || activeOverlayLayer) ? (
                <div>
                  <dt>Lock</dt>
                  <dd>{lockLabel}</dd>
                </div>
              ) : null}
              {activeTextLayer ? (
                <>
                  <div>
                    <dt>Name</dt>
                    <dd>{`Name ${getTextLayerLabel(activeTextLayer)}`}</dd>
                  </div>
                  <div>
                    <dt>Color</dt>
                    <dd>{`Color ${activeTextLayer.color}`}</dd>
                  </div>
                  <div>
                    <dt>Fill</dt>
                    <dd>
                      {activeTextLayer.fillMode === 'gradient'
                        ? `Fill Gradient ${activeTextLayer.gradientFrom} to ${activeTextLayer.gradientTo}`
                        : 'Fill Solid'}
                    </dd>
                  </div>
                  <div>
                    <dt>Direction</dt>
                    <dd>{`Direction ${activeTextLayer.isVertical ? 'Vertical' : 'Horizontal'}`}</dd>
                  </div>
                  <div>
                    <dt>Layout</dt>
                    <dd>{`Line height ${activeTextLayer.lineHeight.toFixed(1)} / Letter spacing ${activeTextLayer.letterSpacing}px / Wrap ${activeTextLayer.maxWidth}px`}</dd>
                  </div>
                  <div>
                    <dt>Outline</dt>
                    <dd>{`Outline ${activeTextLayer.strokeWidth} px`}</dd>
                  </div>
                  <div>
                    <dt>Shadow</dt>
                    <dd>{`Shadow ${activeTextLayer.shadowEnabled ? 'On' : 'Off'}`}</dd>
                  </div>
                  <div>
                    <dt>Order</dt>
                    <dd>{`Order ${activeTextLayerOrder} of ${image?.textLayers.length ?? 0}`}</dd>
                  </div>
                </>
              ) : null}
              {activeMessageWindowLayer ? (
                <>
                  <div>
                    <dt>Name</dt>
                    <dd>{`Name ${getMessageWindowLayerLabel(activeMessageWindowLayer)}`}</dd>
                  </div>
                  <div>
                    <dt>Window</dt>
                    <dd>{`Window: ${activeMessageWindowLayer.speaker}`}</dd>
                  </div>
                  <div>
                    <dt>Frame</dt>
                    <dd>{`Frame ${activeMessageWindowLayer.frameStyle}${activeMessageWindowLayer.assetName ? ` / Asset ${activeMessageWindowLayer.assetName}` : ''}`}</dd>
                  </div>
                  <div>
                    <dt>Render</dt>
                    <dd>{activeMessageWindowLayer.assetName ? 'Render 9-slice asset' : 'Render Frame only'}</dd>
                  </div>
                  <div>
                    <dt>Body</dt>
                    <dd>{`Body ${activeMessageWindowLayer.body}`}</dd>
                  </div>
                  <div>
                    <dt>Opacity</dt>
                    <dd>{`Window opacity ${activeMessageWindowLayer.opacity.toFixed(1)}`}</dd>
                  </div>
                  <div>
                    <dt>Order</dt>
                    <dd>{`Order ${(image?.messageWindowLayers.findIndex((layer) => layer.id === activeMessageWindowLayer.id) ?? -1) + 1} of ${image?.messageWindowLayers.length ?? 0}`}</dd>
                  </div>
                </>
              ) : null}
              {activeBubbleLayer ? (
                <>
                  <div>
                    <dt>Name</dt>
                    <dd>{`Name ${getBubbleLayerLabel(activeBubbleLayer)}`}</dd>
                  </div>
                  <div>
                    <dt>Bubble</dt>
                    <dd>{`Bubble: ${activeBubbleLayer.text}`}</dd>
                  </div>
                  <div>
                    <dt>Tail</dt>
                    <dd>{`Tail ${activeBubbleLayer.tailDirection.charAt(0).toUpperCase()}${activeBubbleLayer.tailDirection.slice(1)}`}</dd>
                  </div>
                  <div>
                    <dt>Style</dt>
                    <dd>{`Style ${activeBubbleLayer.stylePreset.charAt(0).toUpperCase()}${activeBubbleLayer.stylePreset.slice(1)}`}</dd>
                  </div>
                  <div>
                    <dt>Shape</dt>
                    <dd>{`Shape ${getBubbleShapeLabel(activeBubbleShape)} / Variant ${activeBubbleShapeVariant}`}</dd>
                  </div>
                  <div>
                    <dt>Fill</dt>
                    <dd>{`Fill ${activeBubbleLayer.fillColor}`}</dd>
                  </div>
                  <div>
                    <dt>Border</dt>
                    <dd>{`Border ${activeBubbleLayer.borderColor}`}</dd>
                  </div>
                  <div>
                    <dt>Order</dt>
                    <dd>{`Order ${(image?.bubbleLayers.findIndex((layer) => layer.id === activeBubbleLayer.id) ?? -1) + 1} of ${image?.bubbleLayers.length ?? 0}`}</dd>
                  </div>
                </>
              ) : null}
              {activeMosaicLayer ? (
                <>
                  <div>
                    <dt>Name</dt>
                    <dd>{`Name ${getMosaicLayerLabel(activeMosaicLayer)}`}</dd>
                  </div>
                  <div>
                    <dt>Mosaic</dt>
                    <dd>{`Mosaic intensity ${activeMosaicLayer.intensity}`}</dd>
                  </div>
                  <div>
                    <dt>Style</dt>
                    <dd>{`Mosaic style ${activeMosaicLayer.style}`}</dd>
                  </div>
                  <div>
                    <dt>Order</dt>
                    <dd>{`Order ${(image?.mosaicLayers.findIndex((layer) => layer.id === activeMosaicLayer.id) ?? -1) + 1} of ${image?.mosaicLayers.length ?? 0}`}</dd>
                  </div>
                </>
              ) : null}
              {activeOverlayLayer ? (
                <>
                  <div>
                    <dt>Name</dt>
                    <dd>{`Name ${getOverlayLayerLabel(activeOverlayLayer)}`}</dd>
                  </div>
                  <div>
                    <dt>Overlay</dt>
                    <dd>{`Overlay opacity ${activeOverlayLayer.opacity.toFixed(1)}`}</dd>
                  </div>
                  <div>
                    <dt>Tint</dt>
                    <dd>{`Tint ${activeOverlayLayer.color}`}</dd>
                  </div>
                  <div>
                    <dt>Area</dt>
                    <dd>{`Overlay area ${activeOverlayLayer.areaPreset}`}</dd>
                  </div>
                  <div>
                    <dt>Fill</dt>
                    <dd>
                      {activeOverlayLayer.fillMode === 'gradient'
                        ? `Overlay fill Gradient ${activeOverlayLayer.gradientFrom} to ${activeOverlayLayer.gradientTo}`
                        : 'Overlay fill Solid'}
                    </dd>
                  </div>
                  <div>
                    <dt>Direction</dt>
                    <dd>{`Gradient direction ${activeOverlayLayer.gradientDirection}`}</dd>
                  </div>
                  <div>
                    <dt>Order</dt>
                    <dd>{`Order ${(image?.overlayLayers.findIndex((layer) => layer.id === activeOverlayLayer.id) ?? -1) + 1} of ${image?.overlayLayers.length ?? 0}`}</dd>
                  </div>
                </>
              ) : null}
              {activeWatermarkLayer ? (
                <>
                  <div>
                    <dt>Name</dt>
                    <dd>{`Name ${getWatermarkLayerLabel(activeWatermarkLayer)}`}</dd>
                  </div>
                  <div>
                    <dt>Watermark</dt>
                    <dd>{`Watermark: ${activeWatermarkLayer.assetName ?? activeWatermarkLayer.text}`}</dd>
                  </div>
                  <div>
                    <dt>Mode</dt>
                    <dd>{`Mode ${activeWatermarkLayer.mode === 'image' ? 'Image' : 'Text'}`}</dd>
                  </div>
                  <div>
                    <dt>Opacity</dt>
                    <dd>{`Watermark opacity ${activeWatermarkLayer.opacity.toFixed(1)}`}</dd>
                  </div>
                  <div>
                    <dt>Pattern</dt>
                    <dd>{`Pattern ${activeWatermarkLayer.repeated ? 'Repeated' : 'Single'}`}</dd>
                  </div>
                  <div>
                    <dt>Angle</dt>
                    <dd>{`Angle ${activeWatermarkLayer.angle} deg`}</dd>
                  </div>
                  <div>
                    <dt>Density</dt>
                    <dd>{`Density ${activeWatermarkLayer.density}x`}</dd>
                  </div>
                  <div>
                    <dt>Scale</dt>
                    <dd>{`Scale ${activeWatermarkLayer.scale.toFixed(1)}x`}</dd>
                  </div>
                  <div>
                    <dt>Layout</dt>
                    <dd>{`Layout ${activeWatermarkLayer.tiled ? 'Tiled' : 'Single'}`}</dd>
                  </div>
                  <div>
                    <dt>Order</dt>
                    <dd>{`Order ${(image?.watermarkLayers.findIndex((layer) => layer.id === activeWatermarkLayer.id) ?? -1) + 1} of ${image?.watermarkLayers.length ?? 0}`}</dd>
                  </div>
                </>
              ) : null}
            </dl>
          </section>

          <section aria-label="Layer panel" className="sidebar-card">
            <div className="panel-title">Layers</div>
            <ul className="layer-list">
              <li className={selectedLayerId === 'base-image' ? 'selected-layer' : undefined}>
                <span className="layer-visibility" aria-hidden="true">
                  eye
                </span>
                <span>{image ? '1 image layer' : 'Base image'}</span>
              </li>
              {image?.textLayers.length ? (
                image.textLayers.map((layer) => (
                  <li key={layer.id} className={selectedLayerId === layer.id ? 'selected-layer' : undefined}>
                    <span className="layer-visibility" aria-hidden="true">
                      {layer.visible ? 'eye' : 'off'}
                    </span>
                    <button
                      type="button"
                      className="layer-select-button"
                      onClick={(event) => selectTextLayer(layer.id, isAdditiveSelection(event))}
                      aria-label={`Layer text: ${getTextLayerLabel(layer)}${layer.groupId ? ' grouped' : ''} (${image.textLayers.findIndex((entry) => entry.id === layer.id) + 1})`}
                    >
                      Text: {getTextLayerLabel(layer)}{layer.groupId ? ' [Group]' : ''}
                    </button>
                  </li>
                ))
              ) : (
                <li>
                  <span className="layer-visibility" aria-hidden="true">
                    eye
                  </span>
                  <span>Text overlay</span>
                </li>
              )}
              {image?.messageWindowLayers.map((layer) => (
                <li key={layer.id} className={selectedLayerId === layer.id ? 'selected-layer' : undefined}>
                  <span className="layer-visibility" aria-hidden="true">
                    {layer.visible ? 'eye' : 'off'}
                  </span>
                  <button
                    type="button"
                    className="layer-select-button"
                    onClick={(event) => selectMessageWindowLayer(layer.id, isAdditiveSelection(event))}
                    aria-label={`Message window layer: ${getMessageWindowLayerLabel(layer)}${layer.groupId ? ' grouped' : ''}`}
                  >
                    Message window: {getMessageWindowLayerLabel(layer)}{layer.groupId ? ' [Group]' : ''}
                  </button>
                </li>
              ))}
              {image?.bubbleLayers.map((layer) => (
                <li key={layer.id} className={selectedLayerId === layer.id ? 'selected-layer' : undefined}>
                  <span className="layer-visibility" aria-hidden="true">
                    {layer.visible ? 'eye' : 'off'}
                  </span>
                  <button
                    type="button"
                    className="layer-select-button"
                    onClick={(event) => selectBubbleLayer(layer.id, isAdditiveSelection(event))}
                  >
                    Bubble layer: {getBubbleLayerLabel(layer)}{layer.groupId ? ' [Group]' : ''}
                  </button>
                </li>
              ))}
              {image?.mosaicLayers.map((layer) => (
                <li key={layer.id} className={selectedLayerId === layer.id ? 'selected-layer' : undefined}>
                  <span className="layer-visibility" aria-hidden="true">
                    {layer.visible ? 'eye' : 'off'}
                  </span>
                    <button
                      type="button"
                      className="layer-select-button"
                      onClick={(event) => selectMosaicLayer(layer.id, isAdditiveSelection(event))}
                      aria-label={`Mosaic layer ${getMosaicLayerLabel(layer)} (${image.mosaicLayers.findIndex((entry) => entry.id === layer.id) + 1})`}
                    >
                      Mosaic: {getMosaicLayerLabel(layer)}{layer.groupId ? ' [Group]' : ''}
                    </button>
                </li>
              ))}
              {image?.overlayLayers.map((layer) => (
                <li key={layer.id} className={selectedLayerId === layer.id ? 'selected-layer' : undefined}>
                  <span className="layer-visibility" aria-hidden="true">
                    {layer.visible ? 'eye' : 'off'}
                  </span>
                    <button
                      type="button"
                      className="layer-select-button"
                      onClick={(event) => selectOverlayLayer(layer.id, isAdditiveSelection(event))}
                      aria-label={`Overlay layer ${getOverlayLayerLabel(layer)}${layer.groupId ? ' grouped' : ''} (${image.overlayLayers.findIndex((entry) => entry.id === layer.id) + 1})`}
                    >
                      Overlay: {getOverlayLayerLabel(layer)}{layer.groupId ? ' [Group]' : ''}
                    </button>
                </li>
              ))}
              {image?.watermarkLayers.map((layer) => (
                <li key={layer.id} className={selectedLayerId === layer.id ? 'selected-layer' : undefined}>
                  <span className="layer-visibility" aria-hidden="true">
                    {layer.visible ? 'eye' : 'off'}
                  </span>
                  <button
                    type="button"
                    className="layer-select-button"
                    onClick={(event) => selectWatermarkLayer(layer.id, isAdditiveSelection(event))}
                    aria-label={`Watermark layer: ${getWatermarkLayerLabel(layer)}${layer.groupId ? ' grouped' : ''}`}
                  >
                    Watermark: {getWatermarkLayerLabel(layer)}{layer.groupId ? ' [Group]' : ''}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Recent projects" className="sidebar-card">
            <div className="panel-title">Recent projects</div>
            <div className="page-list">
              {recentProjects.length === 0 ? (
                <div className="page-card empty">
                  <strong>No saved projects yet</strong>
                </div>
              ) : (
                recentProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className="page-card page-button"
                    onClick={() => openRecentProject(project.id)}
                    aria-label={`Open recent project: ${project.name}`}
                  >
                    <strong>{project.name}</strong>
                    <span>{project.pageCount} pages</span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section aria-label="Backend status" className="sidebar-card">
            <div className="panel-title">Backend status</div>
            {backendStatusError ? (
              <div className="page-list">
                <div className="page-card empty">
                  <strong>{backendStatusError}</strong>
                  <span>{`Target ${backendBaseUrl}`}</span>
                  <span>Portable build may take a few seconds to unpack and launch the backend.</span>
                  <span>Retry after a short wait, or reopen the app if the backend never appears.</span>
                </div>
                <button type="button" className="page-card page-button" onClick={() => void loadBackendStatus()}>
                  Retry backend status
                </button>
              </div>
            ) : backendStatus ? (
              <div className="page-list">
                <div className="page-card">
                  <strong>{backendStatus.sam3_loaded ? 'SAM3 Ready' : 'SAM3 Loading'}</strong>
                  <span>{getBackendModelStatusDetail('sam3')}</span>
                  <span>{getBackendCapabilityLabel('sam3')}</span>
                  {backendStatus.sam3_native_reason ? <span>{`SAM3 native detail ${backendStatus.sam3_native_reason}`}</span> : null}
                  {backendStatus.sam3_recommendation ? <span>{backendStatus.sam3_recommendation}</span> : null}
                  {backendStatus.sam3_error_message ? <span>{backendStatus.sam3_error_message}</span> : null}
                </div>
                <div className="page-card">
                  <strong>{backendStatus.nudenet_loaded ? 'NudeNet Ready' : 'NudeNet Loading'}</strong>
                  <span>{getBackendModelStatusDetail('nudenet')}</span>
                  <span>{getBackendCapabilityLabel('nudenet')}</span>
                  {backendStatus.nudenet_native_reason ? <span>{`NudeNet native detail ${backendStatus.nudenet_native_reason}`}</span> : null}
                  {backendStatus.nudenet_recommendation ? <span>{backendStatus.nudenet_recommendation}</span> : null}
                  {backendStatus.nudenet_error_message ? <span>{backendStatus.nudenet_error_message}</span> : null}
                </div>
                <div className="page-card">
                  <strong>{backendStatus.gpu_available ? 'GPU Available' : 'GPU Unavailable'}</strong>
                  <span>{getBackendRuntimeLabel()}</span>
                </div>
                <div className="page-card">
                  <strong>Runtime strategy</strong>
                  <span>{getBackendPreferenceLabel('sam3')}</span>
                  <span>{getSam3CheckpointLabel()}</span>
                  <span>{getSam3CheckpointPathLabel()}</span>
                  <span>{getSam3ConfigPathLabel()}</span>
                  <span>{getBackendPreferenceLabel('nudenet')}</span>
                  {backendRuntimeConfigMessage ? <span>{backendRuntimeConfigMessage}</span> : null}
                  <div className="help-action-row">
                    <button
                      type="button"
                      className="page-card page-button"
                      onClick={() => void syncBackendRuntimePreferences()}
                    >
                      Apply backend strategy
                    </button>
                    <button
                      type="button"
                      className="page-card page-button"
                      onClick={() => void refreshBackendRuntimePreferences()}
                    >
                      Refresh backend strategy
                    </button>
                  </div>
                </div>
                <label className="text-layer-field">
                  <span>SAM3 model size</span>
                  <select
                    aria-label="SAM3 model size"
                    value={backendSam3ModelSize}
                    onChange={(event) => {
                      setBackendSam3ModelSize(event.target.value === 'large' ? 'large' : 'base')
                    }}
                  >
                    <option value="base">base</option>
                    <option value="large">large</option>
                  </select>
                </label>
                <div className="page-card">
                  <strong>{`SAM3 model size: ${backendSam3ModelSize}`}</strong>
                </div>
                <label className="text-layer-field">
                  <span>Auto mosaic strength</span>
                  <select
                    aria-label="Auto mosaic strength"
                    value={backendAutoMosaicStrength}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      setBackendAutoMosaicStrength(
                        nextValue === 'light' || nextValue === 'strong' ? nextValue : 'medium',
                      )
                    }}
                  >
                    <option value="light">light</option>
                    <option value="medium">medium</option>
                    <option value="strong">strong</option>
                  </select>
                </label>
                <div className="page-card">
                  <strong>{`Auto mosaic strength: ${backendAutoMosaicStrength}`}</strong>
                </div>
                <label className="text-layer-field">
                  <span>NSFW threshold</span>
                  <input
                    aria-label="NSFW threshold"
                    type="number"
                    min="0.1"
                    max="0.99"
                    step="0.01"
                    value={backendNsfwThreshold}
                    onChange={(event) => {
                      setBackendNsfwThreshold(event.target.value)
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="page-card page-button"
                  onClick={() => void startBackendModelDownload('sam3')}
                  disabled={isBackendModelReady('sam3') || isBackendModelDownloading('sam3')}
                >
                  {getBackendModelButtonLabel('sam3')}
                </button>
                <button
                  type="button"
                  className="page-card page-button"
                  onClick={() => void startBackendModelDownload('nudenet')}
                  disabled={isBackendModelReady('nudenet') || isBackendModelDownloading('nudenet')}
                >
                  {getBackendModelButtonLabel('nudenet')}
                </button>
                <button
                  type="button"
                  className="page-card page-button"
                  onClick={() => void runBackendSam3AutoMosaic()}
                  disabled={!hasActiveImage}
                >
                  Run SAM3 auto mosaic
                </button>
                <button
                  type="button"
                  className="page-card page-button"
                  onClick={() => void runBackendSam3AutoMosaicForAllPages()}
                  disabled={pages.length === 0}
                >
                  Run SAM3 auto mosaic for all pages
                </button>
                <button
                  type="button"
                  className="page-card page-button"
                  onClick={() => void runBackendNsfwDetection()}
                  disabled={!hasActiveImage}
                >
                  Run NSFW detection
                </button>
                {backendActionResults.sam3AutoMosaic.length > 0 ? (
                  <>
                    <div className="page-card">
                      <strong>{`SAM3 review candidates: ${backendActionResults.sam3AutoMosaic.length}`}</strong>
                      <span>{`${backendActionResults.sam3AutoMosaicSelection.filter(Boolean).length} selected for apply`}</span>
                    </div>
                    <div className="page-card">
                      <strong>{`Focused SAM3 candidate: ${focusedSam3ReviewCandidateIndex === null ? 'none' : focusedSam3ReviewCandidateIndex + 1}`}</strong>
                      <span>{`Label ${focusedSam3ReviewCandidateIndex === null ? 'none' : getSam3CandidateCardLabel(focusedSam3ReviewCandidateIndex)}`}</span>
                      <span>{`Note ${focusedSam3ReviewCandidateIndex === null ? 'none' : getSam3CandidateCardNote(focusedSam3ReviewCandidateIndex)}`}</span>
                      <span>{`Priority ${focusedSam3ReviewCandidateIndex === null ? 'none' : getSam3CandidatePriority(focusedSam3ReviewCandidateIndex)}`}</span>
                      <span>{`Style ${focusedSam3ReviewCandidateIndex === null ? 'none' : backendActionResults.sam3AutoMosaicStyle[focusedSam3ReviewCandidateIndex] ?? 'pixelate'}`}</span>
                      <span>{`Intensity ${focusedSam3ReviewCandidateIndex === null ? 'none' : backendActionResults.sam3AutoMosaicIntensity[focusedSam3ReviewCandidateIndex] ?? 16}`}</span>
                    </div>
                    <label className="text-layer-field">
                      <span>Focused SAM3 label</span>
                      <input
                        aria-label="Focused SAM3 candidate label"
                        type="text"
                        value={focusedSam3ReviewCandidateIndex === null ? '' : getSam3CandidateInputLabel(focusedSam3ReviewCandidateIndex)}
                        onChange={(event) => {
                          renameFocusedBackendSam3Candidate(event.target.value)
                        }}
                        disabled={focusedSam3ReviewCandidateIndex === null}
                      />
                    </label>
                    <label className="text-layer-field">
                      <span>Focused SAM3 note</span>
                      <input
                        aria-label="Focused SAM3 candidate note"
                        type="text"
                        value={focusedSam3ReviewCandidateIndex === null ? '' : getSam3CandidateInputNote(focusedSam3ReviewCandidateIndex)}
                        onChange={(event) => {
                          updateFocusedBackendSam3CandidateNote(event.target.value)
                        }}
                        disabled={focusedSam3ReviewCandidateIndex === null}
                      />
                    </label>
                    <div className="selection-controls">
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={() => setAllBackendSam3AutoMosaicSelection(true)}
                      >
                        Select all SAM3 candidates
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={() => setAllBackendSam3AutoMosaicSelection(false)}
                      >
                        Clear SAM3 candidates
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={cycleFocusedBackendSam3AutoMosaicStyle}
                        disabled={focusedSam3ReviewCandidateIndex === null}
                      >
                        Cycle focused SAM3 style
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={increaseFocusedBackendSam3AutoMosaicIntensity}
                        disabled={focusedSam3ReviewCandidateIndex === null}
                      >
                        Increase focused SAM3 intensity
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={cycleFocusedBackendSam3Priority}
                        disabled={focusedSam3ReviewCandidateIndex === null}
                      >
                        Cycle focused SAM3 priority
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={applyFocusedBackendSam3SettingsToSelected}
                        disabled={focusedSam3ReviewCandidateIndex === null}
                      >
                        Apply focused SAM3 settings to selected
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={() => selectBackendSam3CandidatesByPriority('high')}
                      >
                        Select high priority SAM3 candidates
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={() => void recalculateActiveBackendSam3Review()}
                        disabled={!hasActiveImage}
                      >
                        Recalculate SAM3 candidates
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={revertFocusedBackendSam3Candidate}
                        disabled={focusedSam3ReviewCandidateIndex === null}
                      >
                        Revert focused SAM3 edits
                      </button>
                    </div>
                    {backendActionResults.sam3AutoMosaic.map((mask, index) => {
                      const bounds = parseBackendLayerSuggestion(mask, index)
                      const selected = backendActionResults.sam3AutoMosaicSelection[index] !== false

                      return (
                        <button
                          key={`sam3-candidate-${index}`}
                          type="button"
                          className="page-card page-button"
                          onClick={() => toggleBackendSam3AutoMosaicSelection(index)}
                          aria-pressed={selected}
                          aria-label={`Toggle SAM3 candidate ${index + 1}`}
                        >
                          <strong>{`${getSam3CandidateCardLabel(index)} ${selected ? 'selected' : 'skipped'}`}</strong>
                          {getBackendMaskPreviewUrl(mask) ? (
                            <img
                              alt={`SAM3 mask preview ${index + 1}`}
                              className="backend-mask-thumbnail"
                              src={getBackendMaskPreviewUrl(mask) ?? undefined}
                            />
                          ) : null}
                          <span>{`Note ${getSam3CandidateCardNote(index)}`}</span>
                          <span>{`Priority ${getSam3CandidatePriority(index)}`}</span>
                          <span>{`Style ${backendActionResults.sam3AutoMosaicStyle[index] ?? 'pixelate'}`}</span>
                          <span>{`Intensity ${backendActionResults.sam3AutoMosaicIntensity[index] ?? 16}`}</span>
                          <span>{`${Math.round(bounds.width)} x ${Math.round(bounds.height)} at ${Math.round(bounds.x)}, ${Math.round(bounds.y)}`}</span>
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      className="page-card page-button"
                      onClick={applyBackendSam3AutoMosaicToCanvas}
                      disabled={!hasActiveImage || backendActionResults.sam3AutoMosaicSelection.every((selected) => !selected)}
                    >
                      Apply SAM3 auto mosaic to canvas
                    </button>
                  </>
                ) : null}
                {backendActionResults.nsfwDetections.length > 0 ? (
                  <>
                    <div className="page-card">
                      <strong>{`NSFW review candidates: ${backendActionResults.nsfwDetections.length}`}</strong>
                      <span>{`${backendActionResults.nsfwDetectionSelection.filter(Boolean).length} selected for apply`}</span>
                    </div>
                    <div className="page-card">
                      <strong>{`Focused NSFW candidate: ${focusedNsfwReviewCandidateIndex === null ? 'none' : focusedNsfwReviewCandidateIndex + 1}`}</strong>
                      <span>{`Label ${focusedNsfwReviewCandidateIndex === null ? 'none' : getNsfwCandidateCardLabel(focusedNsfwReviewCandidateIndex)}`}</span>
                      <span>{`Note ${focusedNsfwReviewCandidateIndex === null ? 'none' : getNsfwCandidateCardNote(focusedNsfwReviewCandidateIndex)}`}</span>
                      <span>{`Priority ${focusedNsfwReviewCandidateIndex === null ? 'none' : getNsfwCandidatePriority(focusedNsfwReviewCandidateIndex)}`}</span>
                      <span>{`Color ${focusedNsfwReviewCandidateIndex === null ? 'none' : backendActionResults.nsfwDetectionColor[focusedNsfwReviewCandidateIndex] ?? '#ff4d6d'}`}</span>
                      <span>{`Opacity ${focusedNsfwReviewCandidateIndex === null ? 'none' : (backendActionResults.nsfwDetectionOpacity[focusedNsfwReviewCandidateIndex] ?? 0.4).toFixed(1)}`}</span>
                    </div>
                    <label className="text-layer-field">
                      <span>Focused NSFW label</span>
                      <input
                        aria-label="Focused NSFW candidate label"
                        type="text"
                        value={focusedNsfwReviewCandidateIndex === null ? '' : getNsfwCandidateInputLabel(focusedNsfwReviewCandidateIndex)}
                        onChange={(event) => {
                          renameFocusedBackendNsfwCandidate(event.target.value)
                        }}
                        disabled={focusedNsfwReviewCandidateIndex === null}
                      />
                    </label>
                    <label className="text-layer-field">
                      <span>Focused NSFW note</span>
                      <input
                        aria-label="Focused NSFW candidate note"
                        type="text"
                        value={focusedNsfwReviewCandidateIndex === null ? '' : getNsfwCandidateInputNote(focusedNsfwReviewCandidateIndex)}
                        onChange={(event) => {
                          updateFocusedBackendNsfwCandidateNote(event.target.value)
                        }}
                        disabled={focusedNsfwReviewCandidateIndex === null}
                      />
                    </label>
                    <div className="selection-controls">
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={() => setAllBackendNsfwDetectionSelection(true)}
                      >
                        Select all NSFW candidates
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={() => setAllBackendNsfwDetectionSelection(false)}
                      >
                        Clear NSFW candidates
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={cycleFocusedBackendNsfwDetectionColor}
                        disabled={focusedNsfwReviewCandidateIndex === null}
                      >
                        Cycle focused NSFW color
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={increaseFocusedBackendNsfwDetectionOpacity}
                        disabled={focusedNsfwReviewCandidateIndex === null}
                      >
                        Increase focused NSFW opacity
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={cycleFocusedBackendNsfwPriority}
                        disabled={focusedNsfwReviewCandidateIndex === null}
                      >
                        Cycle focused NSFW priority
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={applyFocusedBackendNsfwSettingsToSelected}
                        disabled={focusedNsfwReviewCandidateIndex === null}
                      >
                        Apply focused NSFW settings to selected
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={() => selectBackendNsfwCandidatesByPriority('high')}
                      >
                        Select high priority NSFW candidates
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={() => void recalculateActiveBackendNsfwReview()}
                        disabled={!hasActiveImage}
                      >
                        Recalculate NSFW candidates
                      </button>
                      <button
                        type="button"
                        className="page-card page-button"
                        onClick={revertFocusedBackendNsfwCandidate}
                        disabled={focusedNsfwReviewCandidateIndex === null}
                      >
                        Revert focused NSFW edits
                      </button>
                    </div>
                    {backendActionResults.nsfwDetections.map((detection, index) => {
                      const bounds = parseBackendLayerSuggestion(detection, index)
                      const selected = backendActionResults.nsfwDetectionSelection[index] !== false

                      return (
                        <button
                          key={`nsfw-candidate-${index}`}
                          type="button"
                          className="page-card page-button"
                          onClick={() => toggleBackendNsfwDetectionSelection(index)}
                          aria-pressed={selected}
                          aria-label={`Toggle NSFW candidate ${index + 1}`}
                        >
                          <strong>{`${getNsfwCandidateCardLabel(index)} ${selected ? 'selected' : 'skipped'}`}</strong>
                          {getBackendMaskPreviewUrl(detection) ? (
                            <img
                              alt={`NSFW mask preview ${index + 1}`}
                              className="backend-mask-thumbnail"
                              src={getBackendMaskPreviewUrl(detection) ?? undefined}
                            />
                          ) : null}
                          <span>{`Note ${getNsfwCandidateCardNote(index)}`}</span>
                          <span>{`Priority ${getNsfwCandidatePriority(index)}`}</span>
                          <span>{`Color ${backendActionResults.nsfwDetectionColor[index] ?? '#ff4d6d'}`}</span>
                          <span>{`Opacity ${(backendActionResults.nsfwDetectionOpacity[index] ?? 0.4).toFixed(1)}`}</span>
                          <span>{`${Math.round(bounds.width)} x ${Math.round(bounds.height)} at ${Math.round(bounds.x)}, ${Math.round(bounds.y)}`}</span>
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      className="page-card page-button"
                      onClick={applyBackendNsfwDetectionsToCanvas}
                      disabled={!hasActiveImage || backendActionResults.nsfwDetectionSelection.every((selected) => !selected)}
                    >
                      Apply NSFW detections to canvas
                    </button>
                  </>
                ) : null}
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={addBackendManualSegmentPoint}
                    disabled={!hasActiveImage}
                  >
                    Add manual segment point
                  </button>
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={addNegativeBackendManualSegmentPoint}
                    disabled={!hasActiveImage}
                  >
                    Add negative manual segment point
                  </button>
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={() => setBackendManualPointPickingMode('positive')}
                    disabled={!hasActiveImage}
                  >
                    Enable positive point picking
                  </button>
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={() => setBackendManualPointPickingMode('negative')}
                    disabled={!hasActiveImage}
                  >
                    Enable negative point picking
                  </button>
                  {backendManualPointPickingMode !== 'off' ? (
                    <button
                      type="button"
                      className="page-card page-button"
                      onClick={() => setBackendManualPointPickingMode('off')}
                      disabled={!hasActiveImage}
                    >
                      Cancel manual point picking
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={resetBackendManualSegmentPoints}
                    disabled={!hasActiveImage}
                  >
                    Reset manual segment points
                  </button>
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={toggleLastBackendManualSegmentPointLabel}
                    disabled={!hasActiveImage || backendManualSegmentPoints.length === 0}
                  >
                    Toggle last manual point label
                  </button>
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={moveLastBackendManualSegmentPoint}
                    disabled={!hasActiveImage || backendManualSegmentPoints.length === 0}
                  >
                    Move last manual point
                  </button>
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={removeLastBackendManualSegmentPoint}
                    disabled={!hasActiveImage || backendManualSegmentPoints.length <= DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length}
                  >
                    Remove last manual point
                  </button>
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={toggleSelectedBackendManualSegmentPointLabel}
                    disabled={!hasActiveImage || selectedBackendManualSegmentPoint === null}
                  >
                    Toggle selected manual point label
                  </button>
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={moveSelectedBackendManualSegmentPoint}
                    disabled={!hasActiveImage || selectedBackendManualSegmentPoint === null}
                  >
                    Move selected manual point
                  </button>
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={removeSelectedBackendManualSegmentPoint}
                    disabled={
                      !hasActiveImage ||
                      selectedBackendManualSegmentPoint === null ||
                      backendManualSegmentPoints.length <= DEFAULT_SAM3_MANUAL_SEGMENT_POINTS.length
                    }
                  >
                    Remove selected manual point
                  </button>
                  <div className="page-card">
                    <strong>{`Manual segment points: ${backendManualSegmentPoints.length}`}</strong>
                  </div>
                  <div className="page-card">
                    <strong>{`Selected manual point: ${selectedBackendManualSegmentPointIndex + 1} of ${
                      backendManualSegmentPoints.length
                    }`}</strong>
                  </div>
                  <div className="page-card">
                    <strong>{`Selected manual point label: ${
                      selectedBackendManualSegmentPoint?.label === 0 ? 'negative' : 'positive'
                    }`}</strong>
                  </div>
                  <div className="page-card">
                    <strong>{`Selected manual point coordinates: ${selectedBackendManualSegmentPoint?.x ?? 0}, ${
                      selectedBackendManualSegmentPoint?.y ?? 0
                    }`}</strong>
                  </div>
                  <div className="page-card">
                    <strong>{`Last manual point label: ${
                      backendManualSegmentPoints[backendManualSegmentPoints.length - 1]?.label === 0
                        ? 'negative'
                        : 'positive'
                    }`}</strong>
                  </div>
                  <div className="page-card">
                    <strong>{`Last manual point: ${
                      backendManualSegmentPoints[backendManualSegmentPoints.length - 1]?.x ?? 0
                    }, ${backendManualSegmentPoints[backendManualSegmentPoints.length - 1]?.y ?? 0}`}</strong>
                  </div>
                  <div className="page-card">
                    <strong>{`Manual point picking: ${backendManualPointPickingMode}`}</strong>
                  </div>
                  <button
                    type="button"
                    className="page-card page-button"
                    onClick={() => void runBackendSam3ManualSegment()}
                    disabled={!hasActiveImage}
                  >
                  Run SAM3 manual segment
                </button>
                {backendActionResults.sam3ManualSegmentMaskReady ? (
                  <>
                    <div className="page-card">
                      <strong>SAM3 manual segment review ready</strong>
                      <span>{`${backendManualSegmentPoints.filter((point) => point.label === 1).length} positive / ${backendManualSegmentPoints.filter((point) => point.label === 0).length} negative points`}</span>
                      {manualSegmentMaskPreviewUrl ? (
                        <img
                          alt="Manual segment mask preview"
                          className="backend-mask-thumbnail"
                          src={manualSegmentMaskPreviewUrl}
                        />
                      ) : null}
                      {manualSegmentMaskBounds ? (
                        <span>{`${Math.round(manualSegmentMaskBounds.width)} x ${Math.round(manualSegmentMaskBounds.height)} at ${Math.round(manualSegmentMaskBounds.x)}, ${Math.round(manualSegmentMaskBounds.y)}`}</span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="page-card page-button"
                      onClick={applyBackendSam3ManualSegmentToCanvas}
                      disabled={!hasActiveImage}
                    >
                      Apply manual segment to canvas
                    </button>
                  </>
                ) : null}
                {backendDownloads.sam3 ? (
                  <div className="page-card">
                    <strong>{backendDownloads.sam3}</strong>
                  </div>
                ) : null}
                {backendDownloads.nudenet ? (
                  <div className="page-card">
                    <strong>{backendDownloads.nudenet}</strong>
                  </div>
                ) : null}
                {backendActions.sam3AutoMosaic ? (
                  <div className="page-card">
                    <strong>{backendActions.sam3AutoMosaic}</strong>
                  </div>
                ) : null}
                {backendActions.nsfwDetection ? (
                  <div className="page-card">
                    <strong>{backendActions.nsfwDetection}</strong>
                  </div>
                ) : null}
                {backendActions.sam3ManualSegment ? (
                  <div className="page-card">
                    <strong>{backendActions.sam3ManualSegment}</strong>
                  </div>
                ) : null}
                {backendActions.sam3Batch ? (
                  <div className="page-card">
                    <strong>{backendActions.sam3Batch}</strong>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="page-card page-button"
                  onClick={() => void rerunLastBackendAction()}
                  disabled={!hasActiveImage || backendActionHistory.length === 0}
                >
                  Run last backend action again
                </button>
                <button
                  type="button"
                  className="page-card page-button"
                  onClick={clearBackendActionHistory}
                  disabled={backendActionHistory.length === 0}
                >
                  Clear backend action history
                </button>
                <div className="page-card">
                  <strong>Recent backend actions</strong>
                  <span>{backendActionHistory.length === 0 ? 'No backend actions yet' : backendActionHistory[0].label}</span>
                </div>
                {backendActionHistory.map((entry, index) => (
                  <div key={entry.id} className="page-card">
                    {index > 0 ? <span>{entry.label}</span> : null}
                    <button
                      type="button"
                      className="page-button"
                      onClick={() => void rerunBackendAction(entry)}
                      disabled={!hasActiveImage}
                      aria-label={`Run backend action again: ${entry.label}`}
                    >
                      Run again
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="page-card empty">
                <strong>Checking backend status...</strong>
              </div>
            )}
          </section>

          <section aria-label="Preset library" className="sidebar-card">
            <div className="panel-title">Preset library</div>
            <div className="page-list">
              <div className="page-card">
                <strong>{`${messageWindowPresets.length} message presets`}</strong>
                <span>{`${textStylePresets.length} text presets / ${watermarkStylePresets.length} watermark presets / ${bubbleStylePresets.length} bubble presets / ${overlayStylePresets.length} overlay presets / ${mosaicStylePresets.length} mosaic presets / ${templates.length} templates / ${reusableAssets.length} reusable assets`}</span>
              </div>
              <label className="text-layer-field">
                <span>Search</span>
                <input
                  aria-label="Preset library search"
                  type="text"
                  value={presetLibrarySearch}
                  onChange={(event) => {
                    setPresetLibrarySearch(event.target.value)
                  }}
                />
              </label>
              <div className="selection-controls">
                <button type="button" className="page-button" onClick={() => setPresetLibraryFilter('all')}>
                  Show all presets
                </button>
                <button type="button" className="page-button" onClick={() => setPresetLibraryFilter('text')}>
                  Show text presets
                </button>
                <button type="button" className="page-button" onClick={() => setPresetLibraryFilter('message')}>
                  Show message presets
                </button>
                <button type="button" className="page-button" onClick={() => setPresetLibraryFilter('watermark')}>
                  Show watermark presets
                </button>
                <button type="button" className="page-button" onClick={() => setPresetLibraryFilter('bubble')}>
                  Show bubble presets
                </button>
                <button type="button" className="page-button" onClick={() => setPresetLibraryFilter('overlay')}>
                  Show overlay presets
                </button>
                <button type="button" className="page-button" onClick={() => setPresetLibraryFilter('mosaic')}>
                  Show mosaic presets
                </button>
                <button type="button" className="page-button" onClick={() => setPresetLibraryFilter('template')}>
                  Show templates
                </button>
                <button type="button" className="page-button" onClick={() => setPresetLibraryFilter('asset')}>
                  Show reusable assets
                </button>
              </div>
              {(presetLibraryFilter === 'all' || presetLibraryFilter === 'text') && textStylePresets.length === 0 ? (
                <div className="page-card empty">
                  <strong>No text presets yet</strong>
                </div>
              ) : presetLibraryFilter === 'all' || presetLibraryFilter === 'text' ? (
                textStylePresets.filter((preset) => matchesPresetSearch(preset.label, preset.text)).map((preset) => {
                  const presetLabel = preset.label.trim() || 'Untitled text preset'
                  const previewLines = getTextPresetPreviewLines(preset).slice(0, 3)

                  return (
                    <div key={preset.id} className="page-card">
                      <label className="text-layer-field">
                        <span>Text preset</span>
                        <input
                          aria-label={`Text preset name: ${presetLabel}`}
                          type="text"
                          value={preset.label}
                          onChange={(event) => {
                            renameTextStylePreset(preset.id, event.target.value)
                          }}
                        />
                      </label>
                      <div className="template-preview" aria-label={`Text preset preview: ${presetLabel}`}>
                        {previewLines.map((line) => (
                          <small key={line}>{`Preview ${line}`}</small>
                        ))}
                      </div>
                      <div className="selection-controls">
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => applyTextStylePreset(preset.id)}
                          aria-label={`Apply text preset: ${presetLabel}`}
                        >
                          Apply to selected text
                        </button>
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => duplicateTextStylePreset(preset.id)}
                          aria-label={`Duplicate text preset: ${presetLabel}`}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => deleteTextStylePreset(preset.id)}
                          aria-label={`Delete text preset: ${presetLabel}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : null}
              {(presetLibraryFilter === 'all' || presetLibraryFilter === 'message') && messageWindowPresets.length === 0 ? (
                <div className="page-card empty">
                  <strong>No message presets yet</strong>
                </div>
              ) : presetLibraryFilter === 'all' || presetLibraryFilter === 'message' ? (
                messageWindowPresets.filter((preset) => matchesPresetSearch(preset.label, preset.speaker, preset.body)).map((preset) => {
                  const presetLabel = preset.label.trim() || 'Untitled preset'
                  const previewLines = getMessagePresetPreviewLines(preset).slice(0, 3)

                  return (
                    <div key={preset.id} className="page-card">
                      <label className="text-layer-field">
                        <span>Preset</span>
                        <input
                          aria-label={`Message preset name: ${presetLabel}`}
                          type="text"
                          value={preset.label}
                          onChange={(event) => {
                            renameMessageWindowPreset(preset.id, event.target.value)
                          }}
                        />
                      </label>
                      <div className="template-preview" aria-label={`Message preset preview: ${presetLabel}`}>
                        {previewLines.map((line) => (
                          <small key={line}>{`Preview ${line}`}</small>
                        ))}
                      </div>
                      <div className="selection-controls">
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => applyMessageWindowPreset(preset.id)}
                          aria-label={`Apply message preset: ${presetLabel}`}
                        >
                          Apply to selected window
                        </button>
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => duplicateMessageWindowPreset(preset.id)}
                          aria-label={`Duplicate message preset: ${presetLabel}`}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => deleteMessageWindowPreset(preset.id)}
                          aria-label={`Delete message preset: ${presetLabel}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : null}
              {(presetLibraryFilter === 'all' || presetLibraryFilter === 'bubble') && bubbleStylePresets.length === 0 ? (
                <div className="page-card empty">
                  <strong>No bubble presets yet</strong>
                </div>
              ) : presetLibraryFilter === 'all' || presetLibraryFilter === 'bubble' ? (
                bubbleStylePresets
                  .filter((preset) => matchesPresetSearch(preset.label, preset.text, preset.stylePreset, preset.bubbleShape))
                  .map((preset) => {
                    const presetLabel = preset.label.trim() || 'Untitled bubble preset'
                    const previewLines = getBubblePresetPreviewLines(preset).slice(0, 3)

                    return (
                      <div key={preset.id} className="page-card">
                        <label className="text-layer-field">
                          <span>Bubble preset</span>
                          <input
                            aria-label={`Bubble preset name: ${presetLabel}`}
                            type="text"
                            value={preset.label}
                            onChange={(event) => {
                              renameBubbleStylePreset(preset.id, event.target.value)
                            }}
                          />
                        </label>
                        <div className="template-preview" aria-label={`Bubble preset preview: ${presetLabel}`}>
                          {previewLines.map((line) => (
                            <small key={line}>{`Preview ${line}`}</small>
                          ))}
                        </div>
                        <div className="selection-controls">
                          <button
                            type="button"
                            className="page-button"
                            onClick={() => applyBubbleStylePreset(preset.id)}
                            aria-label={`Apply bubble preset: ${presetLabel}`}
                          >
                            Apply to selected bubble
                          </button>
                          <button
                            type="button"
                            className="page-button"
                            onClick={() => duplicateBubbleStylePreset(preset.id)}
                            aria-label={`Duplicate bubble preset: ${presetLabel}`}
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            className="page-button"
                            onClick={() => deleteBubbleStylePreset(preset.id)}
                            aria-label={`Delete bubble preset: ${presetLabel}`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })
              ) : null}
              {(presetLibraryFilter === 'all' || presetLibraryFilter === 'overlay') && overlayStylePresets.length === 0 ? (
                <div className="page-card empty">
                  <strong>No overlay presets yet</strong>
                </div>
              ) : presetLibraryFilter === 'all' || presetLibraryFilter === 'overlay' ? (
                overlayStylePresets
                  .filter((preset) => matchesPresetSearch(preset.label, preset.areaPreset, preset.fillMode, preset.gradientDirection))
                  .map((preset) => {
                    const presetLabel = preset.label.trim() || 'Untitled overlay preset'
                    const previewLines = getOverlayPresetPreviewLines(preset).slice(0, 3)

                    return (
                      <div key={preset.id} className="page-card">
                        <label className="text-layer-field">
                          <span>Overlay preset</span>
                          <input
                            aria-label={`Overlay preset name: ${presetLabel}`}
                            type="text"
                            value={preset.label}
                            onChange={(event) => {
                              renameOverlayStylePreset(preset.id, event.target.value)
                            }}
                          />
                        </label>
                        <div className="template-preview" aria-label={`Overlay preset preview: ${presetLabel}`}>
                          {previewLines.map((line) => (
                            <small key={line}>{`Preview ${line}`}</small>
                          ))}
                        </div>
                        <div className="selection-controls">
                          <button
                            type="button"
                            className="page-button"
                            onClick={() => applyOverlayStylePreset(preset.id)}
                            aria-label={`Apply overlay preset: ${presetLabel}`}
                          >
                            Apply to selected overlay
                          </button>
                          <button
                            type="button"
                            className="page-button"
                            onClick={() => duplicateOverlayStylePreset(preset.id)}
                            aria-label={`Duplicate overlay preset: ${presetLabel}`}
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            className="page-button"
                            onClick={() => deleteOverlayStylePreset(preset.id)}
                            aria-label={`Delete overlay preset: ${presetLabel}`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })
              ) : null}
              {(presetLibraryFilter === 'all' || presetLibraryFilter === 'mosaic') && mosaicStylePresets.length === 0 ? (
                <div className="page-card empty">
                  <strong>No mosaic presets yet</strong>
                </div>
              ) : presetLibraryFilter === 'all' || presetLibraryFilter === 'mosaic' ? (
                mosaicStylePresets
                  .filter((preset) => matchesPresetSearch(preset.label, preset.style))
                  .map((preset) => {
                    const presetLabel = preset.label.trim() || 'Untitled mosaic preset'
                    const previewLines = getMosaicPresetPreviewLines(preset).slice(0, 3)

                    return (
                      <div key={preset.id} className="page-card">
                        <label className="text-layer-field">
                          <span>Mosaic preset</span>
                          <input
                            aria-label={`Mosaic preset name: ${presetLabel}`}
                            type="text"
                            value={preset.label}
                            onChange={(event) => {
                              renameMosaicStylePreset(preset.id, event.target.value)
                            }}
                          />
                        </label>
                        <div className="template-preview" aria-label={`Mosaic preset preview: ${presetLabel}`}>
                          {previewLines.map((line) => (
                            <small key={line}>{`Preview ${line}`}</small>
                          ))}
                        </div>
                        <div className="selection-controls">
                          <button
                            type="button"
                            className="page-button"
                            onClick={() => applyMosaicStylePreset(preset.id)}
                            aria-label={`Apply mosaic preset: ${presetLabel}`}
                          >
                            Apply to selected mosaic
                          </button>
                          <button
                            type="button"
                            className="page-button"
                            onClick={() => duplicateMosaicStylePreset(preset.id)}
                            aria-label={`Duplicate mosaic preset: ${presetLabel}`}
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            className="page-button"
                            onClick={() => deleteMosaicStylePreset(preset.id)}
                            aria-label={`Delete mosaic preset: ${presetLabel}`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })
              ) : null}
              {(presetLibraryFilter === 'all' || presetLibraryFilter === 'watermark') && watermarkStylePresets.length === 0 ? (
                <div className="page-card empty">
                  <strong>No watermark presets yet</strong>
                </div>
              ) : presetLibraryFilter === 'all' || presetLibraryFilter === 'watermark' ? (
                watermarkStylePresets
                  .filter((preset) => matchesPresetSearch(preset.label, preset.text, preset.assetName))
                  .map((preset) => {
                    const presetLabel = preset.label.trim() || 'Untitled watermark preset'
                    const previewLines = getWatermarkPresetPreviewLines(preset).slice(0, 3)

                    return (
                      <div key={preset.id} className="page-card">
                        <label className="text-layer-field">
                          <span>Watermark preset</span>
                          <input
                            aria-label={`Watermark preset name: ${presetLabel}`}
                            type="text"
                            value={preset.label}
                            onChange={(event) => {
                              renameWatermarkStylePreset(preset.id, event.target.value)
                            }}
                          />
                        </label>
                        <div className="template-preview" aria-label={`Watermark preset preview: ${presetLabel}`}>
                          {previewLines.map((line) => (
                            <small key={line}>{`Preview ${line}`}</small>
                          ))}
                        </div>
                        <div className="selection-controls">
                          <button
                            type="button"
                            className="page-button"
                            onClick={() => applyWatermarkStylePreset(preset.id)}
                            aria-label={`Apply watermark preset: ${presetLabel}`}
                          >
                            Apply to selected watermark
                          </button>
                          <button
                            type="button"
                            className="page-button"
                            onClick={() => duplicateWatermarkStylePreset(preset.id)}
                            aria-label={`Duplicate watermark preset: ${presetLabel}`}
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            className="page-button"
                            onClick={() => deleteWatermarkStylePreset(preset.id)}
                            aria-label={`Delete watermark preset: ${presetLabel}`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })
              ) : null}
            </div>
          </section>

          <section aria-label="Page templates" className="sidebar-card">
            <div className="panel-title">Templates</div>
            <div className="page-list">
              {(presetLibraryFilter === 'all' || presetLibraryFilter === 'template') && templates.length === 0 ? (
                <div className="page-card empty">
                  <strong>No templates yet</strong>
                </div>
              ) : presetLibraryFilter === 'all' || presetLibraryFilter === 'template' ? (
                templates
                  .filter((template) => matchesPresetSearch(template.label, ...getTemplatePreviewLines(template)))
                  .map((template) => {
                  const templateLabel = template.label.trim() || 'Untitled template'
                  const layerCount =
                    template.textLayers.length +
                    template.messageWindowLayers.length +
                    template.bubbleLayers.length +
                    template.mosaicLayers.length +
                    template.overlayLayers.length +
                    template.watermarkLayers.length
                  const previewLines = getTemplatePreviewLines(template).slice(0, 3)

                  return (
                    <div key={template.id} className="page-card">
                      <label className="text-layer-field">
                        <span>Template</span>
                        <input
                          aria-label={`Template name: ${templateLabel}`}
                          type="text"
                          value={template.label}
                          onChange={(event) => {
                            renameTemplate(template.id, event.target.value)
                          }}
                        />
                      </label>
                      <span>{`${layerCount} layers`}</span>
                      <div className="template-preview" aria-label={`Template preview: ${templateLabel}`}>
                        {previewLines.length === 0 ? (
                          <small>Preview Empty layout</small>
                        ) : (
                          previewLines.map((line) => <small key={line}>{`Preview ${line}`}</small>)
                        )}
                      </div>
                      <div className="selection-controls">
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => applyTemplateToActivePage(template.id)}
                          aria-label={`Apply template: ${templateLabel}`}
                        >
                          Apply to active page
                        </button>
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => applyTemplateToAllPages(template.id)}
                          aria-label={`Apply template to all pages: ${templateLabel}`}
                        >
                          Apply to all pages
                        </button>
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => duplicateTemplate(template.id)}
                          aria-label={`Duplicate template: ${templateLabel}`}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => deleteTemplate(template.id)}
                          aria-label={`Delete template: ${templateLabel}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : null}
            </div>
          </section>

          <section aria-label="Reusable assets" className="sidebar-card">
            <div className="panel-title">Reusable assets</div>
            <div className="page-list">
              {(presetLibraryFilter === 'all' || presetLibraryFilter === 'asset') && reusableAssets.length === 0 ? (
                <div className="page-card empty">
                  <strong>No reusable assets yet</strong>
                </div>
              ) : presetLibraryFilter === 'all' || presetLibraryFilter === 'asset' ? (
                reusableAssets.filter((asset) => matchesPresetSearch(asset.label, asset.assetName, asset.summary)).map((asset) => {
                  const assetLabel = asset.label.trim() || 'Untitled asset'

                  return (
                    <div key={asset.id} className="page-card">
                      <label className="text-layer-field">
                        <span>Asset</span>
                        <input
                          aria-label={`Reusable asset name: ${assetLabel}`}
                          type="text"
                          value={asset.label}
                          onChange={(event) => {
                            renameReusableAsset(asset.id, event.target.value)
                          }}
                        />
                      </label>
                      <div className="template-preview" aria-label={`Reusable asset preview: ${assetLabel}`}>
                        <small>{`Asset ${asset.assetName}`}</small>
                        <small>{`Preview ${asset.summary}`}</small>
                      </div>
                      <div className="selection-controls">
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => applyReusableAssetToActivePage(asset.id)}
                          aria-label={`Apply reusable asset: ${assetLabel}`}
                        >
                          Apply to active page
                        </button>
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => duplicateReusableAsset(asset.id)}
                          aria-label={`Duplicate reusable asset: ${assetLabel}`}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="page-button"
                          onClick={() => deleteReusableAsset(asset.id)}
                          aria-label={`Delete reusable asset: ${assetLabel}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : null}
            </div>
          </section>

          <section aria-label="Export settings" className="sidebar-card">
            <div className="panel-title">Export settings</div>
            <div className="page-list">
              {outputPresets.map((preset) => (
                <button
                  key={preset.presetId}
                  type="button"
                  className={preset.presetId === outputSettings.presetId ? 'page-card current page-button' : 'page-card page-button'}
                  onClick={() => setOutputPreset(preset.presetId)}
                  aria-label={`Preset ${preset.label}`}
                  aria-pressed={preset.presetId === outputSettings.presetId}
                >
                  <strong>{preset.label}</strong>
                  <span>
                    {preset.width} x {preset.height}
                  </span>
                </button>
              ))}
            </div>
            <div className="export-dimensions">
              <label className="export-prefix">
                <span>Prefix</span>
                <input
                  aria-label="Export filename prefix"
                  type="text"
                  value={prefixDraft}
                  onChange={(event) => {
                    setPrefixDraft(event.target.value)
                  }}
                  onBlur={commitPrefixDraft}
                />
              </label>
              <label>
                <span>Start</span>
                <input
                  aria-label="Export start number"
                  type="number"
                  min={1}
                  max={9999}
                  step={1}
                  value={startNumberDraft}
                  onChange={(event) => {
                    setStartNumberDraft(event.target.value)
                  }}
                  onBlur={commitStartNumberDraft}
                />
              </label>
              <label>
                <span>Padding</span>
                <input
                  aria-label="Export number padding"
                  type="number"
                  min={2}
                  max={6}
                  step={1}
                  value={numberPaddingDraft}
                  onChange={(event) => {
                    setNumberPaddingDraft(event.target.value)
                  }}
                  onBlur={commitNumberPaddingDraft}
                />
              </label>
              <label>
                <span>Width</span>
                <input
                  aria-label="Output width"
                  type="number"
                  min={256}
                  max={4096}
                  step={1}
                  value={widthDraft}
                  onChange={(event) => {
                    setWidthDraft(event.target.value)
                  }}
                  onBlur={commitWidthDraft}
                />
              </label>
              <label>
                <span>Height</span>
                <input
                  aria-label="Output height"
                  type="number"
                  min={256}
                  max={4096}
                  step={1}
                  value={heightDraft}
                  onChange={(event) => {
                    setHeightDraft(event.target.value)
                  }}
                  onBlur={commitHeightDraft}
                />
              </label>
            </div>
            <div className="selection-controls">
              <button
                type="button"
                className={
                  outputSettings.qualityMode === 'high' ? 'page-card current page-button' : 'page-card page-button'
                }
                onClick={() => setExportQualityMode('high')}
                aria-label="Export quality High"
                aria-pressed={outputSettings.qualityMode === 'high'}
              >
                High quality
              </button>
              <button
                type="button"
                className={
                  outputSettings.qualityMode === 'medium' ? 'page-card current page-button' : 'page-card page-button'
                }
                onClick={() => setExportQualityMode('medium')}
                aria-label="Export quality Medium"
                aria-pressed={outputSettings.qualityMode === 'medium'}
              >
                Medium quality
              </button>
              <button
                type="button"
                className={
                  outputSettings.qualityMode === 'low' ? 'page-card current page-button' : 'page-card page-button'
                }
                onClick={() => setExportQualityMode('low')}
                aria-label="Export quality Low"
                aria-pressed={outputSettings.qualityMode === 'low'}
              >
                Low quality
              </button>
              <button
                type="button"
                className={
                  outputSettings.qualityMode === 'platform' ? 'page-card current page-button' : 'page-card page-button'
                }
                onClick={() => setExportQualityMode('platform')}
                aria-label="Export quality Platform"
                aria-pressed={outputSettings.qualityMode === 'platform'}
              >
                Platform preset
              </button>
            </div>
            <div className="selection-controls">
              <button
                type="button"
                className={
                  outputSettings.resizeFitMode === 'contain' ? 'page-card current page-button' : 'page-card page-button'
                }
                onClick={() => setResizeFitMode('contain')}
                aria-label="Resize fit Contain"
                aria-pressed={outputSettings.resizeFitMode === 'contain'}
              >
                Contain
              </button>
              <button
                type="button"
                className={
                  outputSettings.resizeFitMode === 'cover' ? 'page-card current page-button' : 'page-card page-button'
                }
                onClick={() => setResizeFitMode('cover')}
                aria-label="Resize fit Cover"
                aria-pressed={outputSettings.resizeFitMode === 'cover'}
              >
                Cover
              </button>
              <button
                type="button"
                className={
                  outputSettings.resizeFitMode === 'stretch' ? 'page-card current page-button' : 'page-card page-button'
                }
                onClick={() => setResizeFitMode('stretch')}
                aria-label="Resize fit Stretch"
                aria-pressed={outputSettings.resizeFitMode === 'stretch'}
              >
                Stretch
              </button>
            </div>
            <div className="selection-controls">
              <button
                type="button"
                className={
                  outputSettings.resizeBackgroundMode === 'white' ? 'page-card current page-button' : 'page-card page-button'
                }
                onClick={() => setResizeBackgroundMode('white')}
                aria-label="Resize background White"
                aria-pressed={outputSettings.resizeBackgroundMode === 'white'}
              >
                White margin
              </button>
              <button
                type="button"
                className={
                  outputSettings.resizeBackgroundMode === 'black' ? 'page-card current page-button' : 'page-card page-button'
                }
                onClick={() => setResizeBackgroundMode('black')}
                aria-label="Resize background Black"
                aria-pressed={outputSettings.resizeBackgroundMode === 'black'}
              >
                Black margin
              </button>
              <button
                type="button"
                className={
                  outputSettings.resizeBackgroundMode === 'blurred-art'
                    ? 'page-card current page-button'
                    : 'page-card page-button'
                }
                onClick={() => setResizeBackgroundMode('blurred-art')}
                aria-label="Resize background Blurred art"
                aria-pressed={outputSettings.resizeBackgroundMode === 'blurred-art'}
              >
                Blurred art
              </button>
            </div>
            <div className="page-meta">Output preset {outputSettings.label}</div>
            <div className="page-meta">
              Export quality{' '}
              {outputSettings.qualityMode === 'platform'
                ? 'Platform preset'
                : outputSettings.qualityMode === 'medium'
                  ? 'Medium'
                  : outputSettings.qualityMode === 'low'
                    ? 'Low'
                    : 'High'}
            </div>
            <div className="page-meta">
              Resize fit{' '}
              {outputSettings.resizeFitMode === 'cover'
                ? 'Cover'
                : outputSettings.resizeFitMode === 'stretch'
                  ? 'Stretch'
                  : 'Contain'}
            </div>
            <div className="page-meta">
              Resize background{' '}
              {outputSettings.resizeBackgroundMode === 'blurred-art'
                ? 'Blurred art'
                : outputSettings.resizeBackgroundMode === 'black'
                  ? 'Black'
                  : 'White'}
            </div>
            <div className="page-meta">Export prefix {outputSettings.fileNamePrefix}</div>
            <div className="page-meta">
              Export numbering {outputSettings.startNumber} / pad {outputSettings.numberPadding}
            </div>
            <div className="page-meta">{EXPORT_METADATA_POLICY_LABEL}</div>
            <div className="export-preview">
              <div className="panel-title">Export preview</div>
              <div className="page-meta">PNG {pngPreviewName}</div>
              <div className="page-meta">PDF {pdfPreviewName}</div>
              <div className="page-meta">ZIP {zipPreviewName}</div>
              <div
                aria-label="Resize preview frame"
                className={`resize-preview-frame resize-preview-${outputSettings.resizeBackgroundMode}`}
              >
                {exportPreviewLayout ? (
                  <>
                    <div
                      className="resize-preview-art"
                      style={{
                        left: `${exportPreviewLayout.xPercent}%`,
                        top: `${exportPreviewLayout.yPercent}%`,
                        width: `${exportPreviewLayout.widthPercent}%`,
                        height: `${exportPreviewLayout.heightPercent}%`,
                      }}
                    >
                      <span className="resize-preview-art-label">{`Preview art: ${image?.name ?? 'Active image'}`}</span>
                    </div>
                    <div className="resize-preview-caption">
                      <strong>{exportPreviewLayout.cropLabel}</strong>
                      <span>{`${outputSettings.width} x ${outputSettings.height} / ${outputSettings.resizeFitMode}`}</span>
                    </div>
                  </>
                ) : (
                  <div className="resize-preview-empty">
                    <strong>No active page</strong>
                    <span>Load an image to preview size unification.</span>
                  </div>
                )}
              </div>
              <div className="page-list export-entry-list">
                {zipEntryPreviewNames.length === 0 ? (
                  <div className="page-card empty">
                    <strong>No ZIP entries yet</strong>
                  </div>
                ) : (
                  zipEntryPreviewNames.map((entryName) => (
                    <div key={entryName} className="page-card">
                      <strong>{entryName}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="export-preview">
              <div className="panel-title">Recent exports</div>
              <div className="page-list export-entry-list">
                {recentExports.length === 0 ? (
                  <div className="page-card empty">
                    <strong>No exports yet</strong>
                  </div>
                ) : (
                  recentExports.map((entry, index) => (
                    <div key={`${entry.format}-${entry.label}-${index}`} className="page-card">
                      <strong>{entry.format} {entry.label}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer aria-label="Status bar" className="status-bar">
        <span>Zoom {zoomPercent}%</span>
        <span>Image {image ? `${image.width} x ${image.height}` : 'No image loaded'}</span>
        <span>{saveStatusLabel}</span>
        <span>{exportMessage}</span>
        <span>{`Version ${appVersion}`}</span>
        <span>Cursor 0, 0</span>
      </footer>
    </div>
  )
}

export default App
