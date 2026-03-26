import { create } from 'zustand'
import type { BubbleShape } from '../lib/bubbleShapes'

export type Tool = 'select' | 'text' | 'message-window' | 'bubble' | 'mosaic' | 'overlay'

export type CanvasImage = {
  id: string
  name: string
  variantLabel?: string | null
  variantSourcePageId?: string | null
  width: number
  height: number
  sourceUrl?: string | null
  textLayers: CanvasTextLayer[]
  messageWindowLayers: CanvasMessageWindowLayer[]
  bubbleLayers: CanvasBubbleLayer[]
  mosaicLayers: CanvasMosaicLayer[]
  overlayLayers: CanvasOverlayLayer[]
  watermarkLayers: CanvasWatermarkLayer[]
}

export type ResizeBackgroundMode = 'white' | 'black' | 'blurred-art'
export type ResizeFitMode = 'contain' | 'cover' | 'stretch'
export type ExportQualityMode = 'high' | 'medium' | 'low' | 'platform'

export type RubyAnnotation = {
  start: number
  end: number
  text: string
}

export type CanvasTextLayer = {
  id: string
  name?: string | null
  groupId?: string | null
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  lineHeight: number
  letterSpacing: number
  maxWidth: number
  fillMode: 'solid' | 'gradient'
  gradientFrom: string
  gradientTo: string
  isVertical: boolean
  fontFamily: string
  rotation: number
  strokeWidth: number
  strokeColor: string
  shadowEnabled: boolean
  ruby?: RubyAnnotation[]
  visible: boolean
  locked: boolean
}

export type CanvasBubbleLayer = {
  id: string
  name?: string | null
  groupId?: string | null
  text: string
  x: number
  y: number
  width: number
  height: number
  tailDirection: 'left' | 'right' | 'bottom'
  stylePreset: 'speech' | 'thought'
  bubbleShape?: BubbleShape
  shapeSeed?: number
  fillColor: string
  borderColor: string
  visible: boolean
  locked: boolean
}

export type CanvasMessageWindowLayer = {
  id: string
  name?: string | null
  groupId?: string | null
  speaker: string
  body: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  frameStyle: 'classic' | 'soft' | 'neon'
  assetName: string | null
  visible: boolean
  locked: boolean
}

export type CanvasWatermarkLayer = {
  id: string
  name?: string | null
  groupId?: string | null
  text: string
  opacity: number
  color: string
  repeated: boolean
  angle: number
  density: number
  preset: 'custom' | 'patreon' | 'discord'
  mode: 'text' | 'image'
  assetName: string | null
  x: number
  y: number
  scale: number
  tiled: boolean
  visible: boolean
  locked: boolean
}

export type CanvasMosaicLayer = {
  id: string
  name?: string | null
  groupId?: string | null
  x: number
  y: number
  width: number
  height: number
  intensity: number
  style: 'pixelate' | 'blur' | 'noise'
  visible: boolean
  locked: boolean
}

export type CanvasOverlayLayer = {
  id: string
  name?: string | null
  groupId?: string | null
  x: number
  y: number
  width: number
  height: number
  areaPreset: 'custom' | 'full' | 'top-half' | 'bottom-half' | 'center-band'
  color: string
  fillMode: 'solid' | 'gradient'
  gradientFrom: string
  gradientTo: string
  gradientDirection: 'vertical' | 'horizontal' | 'diagonal'
  opacity: number
  visible: boolean
  locked: boolean
}

export type CanvasTransform = {
  x: number
  y: number
  width: number
  height: number
}

export type OutputPresetId = 'hd-landscape' | 'square-1080' | 'story-1080x1920' | 'custom'

export type OutputSettings = {
  presetId: OutputPresetId
  label: string
  width: number
  height: number
  format: 'png'
  fileNamePrefix: string
  startNumber: number
  numberPadding: number
  resizeBackgroundMode: ResizeBackgroundMode
  resizeFitMode: ResizeFitMode
  qualityMode: ExportQualityMode
}

export type MessageWindowPreset = {
  id: string
  label: string
  speaker: string
  body: string
  width: number
  height: number
  opacity: number
  frameStyle: 'classic' | 'soft' | 'neon'
  assetName: string | null
}

export type TextStylePreset = {
  id: string
  label: string
  text: string
  fontSize: number
  color: string
  lineHeight: number
  letterSpacing: number
  maxWidth: number
  fillMode: 'solid' | 'gradient'
  gradientFrom: string
  gradientTo: string
  isVertical: boolean
  strokeWidth: number
  strokeColor: string
  shadowEnabled: boolean
}

export type WatermarkStylePreset = {
  id: string
  label: string
  text: string
  opacity: number
  color: string
  repeated: boolean
  angle: number
  density: number
  preset: 'custom' | 'patreon' | 'discord'
  mode: 'text' | 'image'
  assetName: string | null
  scale: number
  tiled: boolean
}

export type BubbleStylePreset = {
  id: string
  label: string
  text: string
  tailDirection: CanvasBubbleLayer['tailDirection']
  stylePreset: CanvasBubbleLayer['stylePreset']
  bubbleShape: BubbleShape
  shapeSeed: number
  fillColor: string
  borderColor: string
}

export type OverlayStylePreset = {
  id: string
  label: string
  areaPreset: CanvasOverlayLayer['areaPreset']
  color: string
  fillMode: CanvasOverlayLayer['fillMode']
  gradientFrom: string
  gradientTo: string
  gradientDirection: CanvasOverlayLayer['gradientDirection']
  opacity: number
}

export type MosaicStylePreset = {
  id: string
  label: string
  intensity: number
  style: CanvasMosaicLayer['style']
  width: number
  height: number
}

export type PageTemplate = {
  id: string
  label: string
  textLayers: CanvasTextLayer[]
  messageWindowLayers: CanvasMessageWindowLayer[]
  bubbleLayers: CanvasBubbleLayer[]
  mosaicLayers: CanvasMosaicLayer[]
  overlayLayers: CanvasOverlayLayer[]
  watermarkLayers: CanvasWatermarkLayer[]
}

export type ReusablePageAsset = {
  id: string
  label: string
  assetName: string
  summary: string
}

type LayerType = 'text' | 'message-window' | 'bubble' | 'mosaic' | 'overlay' | 'watermark'
export type ResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'

type PersistedProject = {
  schemaVersion: number
  id: string
  name: string
  pages: CanvasImage[]
  activePageId: string | null
  selectedLayerId: string | null
  imageTransform: CanvasTransform | null
  outputSettings: OutputSettings
  lastSavedAt: string | null
  messageWindowPresets: MessageWindowPreset[]
  textStylePresets: TextStylePreset[]
  watermarkStylePresets: WatermarkStylePreset[]
  bubbleStylePresets: BubbleStylePreset[]
  overlayStylePresets: OverlayStylePreset[]
  mosaicStylePresets: MosaicStylePreset[]
  templates: PageTemplate[]
  reusableAssets: ReusablePageAsset[]
}

type StoredProjectSnapshot = Partial<PersistedProject> & {
  schemaVersion?: number
}

export type ProjectSchemaMigration = {
  fromVersion: number
  toVersion: number
  label: string
}

export type RecentProjectEntry = {
  id: string
  name: string
  pageCount: number
  lastSavedAt: string | null
}

type HistoryEntry = {
  pages: CanvasImage[]
  activePageId: string | null
  imageTransform: CanvasTransform | null
  selectedLayerId: string | null
}

type WorkspaceState = {
  activeTool: Tool
  zoomPercent: number
  pages: CanvasImage[]
  activePageId: string | null
  pageThumbnails: Record<string, string>
  loadError: string | null
  selectedLayerId: string | null
  selectedLayerIds: string[]
  imageTransform: CanvasTransform | null
  outputSettings: OutputSettings
  isDirty: boolean
  lastSavedAt: string | null
  projectId: string
  projectName: string
  recentProjects: RecentProjectEntry[]
  messageWindowPresets: MessageWindowPreset[]
  textStylePresets: TextStylePreset[]
  watermarkStylePresets: WatermarkStylePreset[]
  bubbleStylePresets: BubbleStylePreset[]
  overlayStylePresets: OverlayStylePreset[]
  mosaicStylePresets: MosaicStylePreset[]
  templates: PageTemplate[]
  reusableAssets: ReusablePageAsset[]
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
  zoomIn: () => void
  zoomOut: () => void
  undo: () => void
  redo: () => void
  saveNow: () => void
  restoreSavedProject: () => void
  openRecentProject: (projectId: string) => void
  setActiveTool: (tool: Tool) => void
  setProjectName: (name: string) => void
  selectAllVisibleLayers: () => void
  selectVisibleLayersByType: (type: LayerType) => void
  invertLayerSelection: () => void
  selectGroupedLayers: () => void
  setSelectedLayerIds: (layerIds: string[], additive?: boolean) => void
  clearLayerSelection: () => void
  setOutputPreset: (presetId: OutputPresetId) => void
  setCustomOutputWidth: (width: number) => void
  setCustomOutputHeight: (height: number) => void
  setResizeBackgroundMode: (mode: ResizeBackgroundMode) => void
  setResizeFitMode: (mode: ResizeFitMode) => void
  setExportQualityMode: (mode: ExportQualityMode) => void
  setFileNamePrefix: (prefix: string) => void
  setStartNumber: (value: number) => void
  setNumberPadding: (value: number) => void
  loadSampleImage: () => void
  loadImageFile: (file: File) => void
  loadImageFiles: (files: File[]) => void
  selectPage: (pageId: string) => void
  duplicateActivePage: () => void
  duplicateActivePageWithTextSwap: (text: string) => void
  duplicateActivePageWithTextVariants: (texts: string[]) => void
  setActivePageVariantLabel: (label: string) => void
  saveCurrentPageAsTemplate: () => void
  renameTemplate: (templateId: string, name: string) => void
  duplicateTemplate: (templateId: string) => void
  deleteTemplate: (templateId: string) => void
  applyTemplateToActivePage: (templateId: string) => void
  applyTemplateToAllPages: (templateId: string) => void
  applyTemplatePreservingText: (templateId: string) => void
  saveCurrentPageAsReusableAsset: () => void
  renameReusableAsset: (assetId: string, name: string) => void
  duplicateReusableAsset: (assetId: string) => void
  deleteReusableAsset: (assetId: string) => void
  applyReusableAssetToActivePage: (assetId: string) => void
  addTextLayer: () => void
  selectTextLayer: (layerId: string, additive?: boolean) => void
  updateSelectedTextLayerText: (text: string) => void
  moveSelectedTextLayer: (dx: number, dy: number) => void
  changeSelectedTextLayerFontSize: (delta: number) => void
  setSelectedTextLayerColor: (color: string) => void
  changeSelectedTextLayerLineHeight: (delta: number) => void
  changeSelectedTextLayerLetterSpacing: (delta: number) => void
  changeSelectedTextLayerMaxWidth: (delta: number) => void
  toggleSelectedTextLayerFillMode: () => void
  setSelectedTextLayerGradientFrom: (color: string) => void
  setSelectedTextLayerGradientTo: (color: string) => void
  deleteSelectedTextLayer: () => void
  moveSelectedTextLayerBackward: () => void
  moveSelectedTextLayerForward: () => void
  toggleSelectedTextLayerVertical: () => void
  changeSelectedTextLayerOutlineWidth: (delta: number) => void
  toggleSelectedTextLayerShadow: () => void
  setSelectedTextLayerRuby: (ruby: RubyAnnotation[]) => void
  setSelectedTextLayerFontFamily: (fontFamily: string) => void
  setSelectedTextLayerRotation: (rotation: number) => void
  changeSelectedTextLayerRotation: (delta: number) => void
  saveSelectedTextStylePreset: () => void
  applyTextStylePreset: (presetId: string) => void
  renameTextStylePreset: (presetId: string, name: string) => void
  duplicateTextStylePreset: (presetId: string) => void
  deleteTextStylePreset: (presetId: string) => void
  addMessageWindowLayer: () => void
  selectMessageWindowLayer: (layerId: string, additive?: boolean) => void
  updateSelectedMessageWindowSpeaker: (speaker: string) => void
  updateSelectedMessageWindowBody: (body: string) => void
  moveSelectedMessageWindowLayer: (dx: number, dy: number) => void
  resizeSelectedMessageWindowLayer: (widthDelta: number, heightDelta: number) => void
  cycleSelectedMessageWindowFrameStyle: () => void
  loadSelectedMessageWindowAsset: (file: File) => void
  saveSelectedMessageWindowPreset: () => void
  applyMessageWindowPreset: (presetId: string) => void
  renameMessageWindowPreset: (presetId: string, name: string) => void
  duplicateMessageWindowPreset: (presetId: string) => void
  deleteMessageWindowPreset: (presetId: string) => void
  addWatermarkLayer: () => void
  loadWatermarkImageFile: (file: File) => void
  selectWatermarkLayer: (layerId: string, additive?: boolean) => void
  updateSelectedWatermarkText: (text: string) => void
  changeSelectedWatermarkOpacity: (delta: number) => void
  toggleSelectedWatermarkPattern: () => void
  setSelectedWatermarkPreset: (preset: 'patreon' | 'discord') => void
  changeSelectedWatermarkAngle: (delta: number) => void
  changeSelectedWatermarkDensity: (delta: number) => void
  moveSelectedWatermarkLayer: (dx: number, dy: number) => void
  changeSelectedWatermarkScale: (delta: number) => void
  toggleSelectedWatermarkTileLayout: () => void
  saveSelectedWatermarkStylePreset: () => void
  applyWatermarkStylePreset: (presetId: string) => void
  renameWatermarkStylePreset: (presetId: string, name: string) => void
  duplicateWatermarkStylePreset: (presetId: string) => void
  deleteWatermarkStylePreset: (presetId: string) => void
  addBubbleLayer: () => void
  selectBubbleLayer: (layerId: string, additive?: boolean) => void
  updateSelectedBubbleLayerText: (text: string) => void
  moveSelectedBubbleLayer: (dx: number, dy: number) => void
  deleteSelectedBubbleLayer: () => void
  resizeSelectedBubbleLayer: (widthDelta: number, heightDelta: number) => void
  setSelectedBubbleTailDirection: (direction: 'left' | 'right' | 'bottom') => void
  setSelectedBubbleStylePreset: (preset: 'speech' | 'thought') => void
  setSelectedBubbleShape: (shape: BubbleShape) => void
  randomizeSelectedBubbleShape: () => void
  saveSelectedBubbleStylePreset: () => void
  applyBubbleStylePreset: (presetId: string) => void
  renameBubbleStylePreset: (presetId: string, name: string) => void
  duplicateBubbleStylePreset: (presetId: string) => void
  deleteBubbleStylePreset: (presetId: string) => void
  duplicateSelectedBubbleLayer: () => void
  moveSelectedBubbleLayerBackward: () => void
  moveSelectedBubbleLayerForward: () => void
  setSelectedBubbleFillColor: (color: string) => void
  setSelectedBubbleBorderColor: (color: string) => void
  addMosaicLayer: () => void
  selectMosaicLayer: (layerId: string, additive?: boolean) => void
  moveSelectedMosaicLayer: (dx: number, dy: number) => void
  resizeSelectedMosaicLayer: (widthDelta: number, heightDelta: number) => void
  changeSelectedMosaicIntensity: (delta: number) => void
  setSelectedMosaicIntensity: (intensity: number) => void
  setSelectedMosaicStyle: (style: CanvasMosaicLayer['style']) => void
  cycleSelectedMosaicStyle: () => void
  saveSelectedMosaicStylePreset: () => void
  applyMosaicStylePreset: (presetId: string) => void
  renameMosaicStylePreset: (presetId: string, name: string) => void
  duplicateMosaicStylePreset: (presetId: string) => void
  deleteMosaicStylePreset: (presetId: string) => void
  duplicateSelectedMosaicLayer: () => void
  moveSelectedMosaicLayerBackward: () => void
  moveSelectedMosaicLayerForward: () => void
  deleteSelectedMosaicLayer: () => void
  addOverlayLayer: () => void
  selectOverlayLayer: (layerId: string, additive?: boolean) => void
  moveSelectedOverlayLayer: (dx: number, dy: number) => void
  changeSelectedOverlayOpacity: (delta: number) => void
  setSelectedOverlayColor: (color: string) => void
  setSelectedOverlayAreaPreset: (preset: CanvasOverlayLayer['areaPreset']) => void
  cycleSelectedOverlayAreaPreset: () => void
  toggleSelectedOverlayFillMode: () => void
  setSelectedOverlayGradientFrom: (color: string) => void
  setSelectedOverlayGradientTo: (color: string) => void
  cycleSelectedOverlayGradientDirection: () => void
  saveSelectedOverlayStylePreset: () => void
  applyOverlayStylePreset: (presetId: string) => void
  renameOverlayStylePreset: (presetId: string, name: string) => void
  duplicateOverlayStylePreset: (presetId: string) => void
  deleteOverlayStylePreset: (presetId: string) => void
  duplicateSelectedOverlayLayer: () => void
  moveSelectedOverlayLayerBackward: () => void
  moveSelectedOverlayLayerForward: () => void
  deleteSelectedOverlayLayer: () => void
  addBackendMosaicLayers: (
    layers: Array<{
      x: number
      y: number
      width: number
      height: number
      intensity: number
      style: CanvasMosaicLayer['style']
      name?: string | null
    }>,
  ) => void
  addBackendMosaicLayersToPage: (
    pageId: string,
    layers: Array<{
      x: number
      y: number
      width: number
      height: number
      intensity: number
      style: CanvasMosaicLayer['style']
      name?: string | null
    }>,
  ) => void
  addBackendOverlayLayers: (
    layers: Array<{
      x: number
      y: number
      width: number
      height: number
      color: string
      opacity: number
      fillMode?: CanvasOverlayLayer['fillMode']
      gradientFrom?: string
      gradientTo?: string
      gradientDirection?: CanvasOverlayLayer['gradientDirection']
      name?: string | null
    }>,
  ) => void
  addBackendOverlayLayersToPage: (
    pageId: string,
    layers: Array<{
      x: number
      y: number
      width: number
      height: number
      color: string
      opacity: number
      fillMode?: CanvasOverlayLayer['fillMode']
      gradientFrom?: string
      gradientTo?: string
      gradientDirection?: CanvasOverlayLayer['gradientDirection']
      name?: string | null
    }>,
  ) => void
  toggleSelectedLayerVisibility: () => void
  toggleSelectedLayerLock: () => void
  toggleLayerVisibilityById: (layerId: string) => void
  toggleLayerLockById: (layerId: string) => void
  groupSelectedLayers: () => void
  ungroupSelectedLayers: () => void
  duplicateSelectedLayer: () => void
  centerSelectedLayer: () => void
  alignSelectedLayer: (direction: 'left' | 'right' | 'top' | 'bottom') => void
  alignSelectedLayersCenter: (axis: 'horizontal' | 'vertical') => void
  distributeSelectedLayers: (axis: 'horizontal' | 'vertical') => void
  matchSelectedLayerSize: (dimension: 'width' | 'height') => void
  moveSelectedLayersByDelta: (dx: number, dy: number) => void
  resizeSelectedLayersByDelta: (
    widthDelta: number,
    heightDelta: number,
    handle?: ResizeHandle,
    preserveAspectRatio?: boolean,
  ) => void
  deleteSelectedLayer: () => void
  renameSelectedLayer: (name: string) => void
  moveSelectedLayerBackward: () => void
  moveSelectedLayerForward: () => void
  nudgeSelectedLayer: (dx: number, dy: number) => void
  deleteActivePage: () => void
  moveActivePageUp: () => void
  moveActivePageDown: () => void
  movePageToIndex: (pageId: string, targetIndex: number) => void
  moveLayerToIndex: (layerId: string, targetIndex: number) => void
  setPageThumbnail: (pageId: string, dataUrl: string) => void
  selectBaseImageLayer: () => void
  moveSelection: (dx: number, dy: number) => void
  scaleSelection: (factor: number) => void
}

const SAMPLE_IMAGE: CanvasImage = {
  id: 'page-sample',
  name: 'sample-page-01.webp',
  width: 3840,
  height: 2160,
  sourceUrl: null,
  variantLabel: null,
  variantSourcePageId: null,
  textLayers: [],
  messageWindowLayers: [],
  bubbleLayers: [],
  mosaicLayers: [],
  overlayLayers: [],
  watermarkLayers: [],
}

const INITIAL_IMAGE_TRANSFORM: CanvasTransform = {
  x: 0,
  y: 0,
  width: 960,
  height: 540,
}

const clampZoom = (value: number) => Math.max(25, Math.min(400, value))
const supportedExtensions = ['png', 'jpg', 'jpeg', 'webp']
export const PROJECT_STORAGE_KEY = 'creators-coco.project'
export const RECENT_PROJECTS_STORAGE_KEY = 'creators-coco.recent-projects'
export const PERFORMANCE_METRICS_STORAGE_KEY = 'creators-coco.performance-metrics'
export const CURRENT_PROJECT_SCHEMA_VERSION = 1
export const PROJECT_SCHEMA_MIGRATIONS: ProjectSchemaMigration[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    label: 'v0 -> v1',
  },
]
export const outputPresets: OutputSettings[] = [
  {
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
  },
  {
    presetId: 'square-1080',
    label: 'Square 1080',
    width: 1080,
    height: 1080,
    format: 'png',
    fileNamePrefix: 'creators-coco',
    startNumber: 1,
    numberPadding: 2,
    resizeBackgroundMode: 'white',
    resizeFitMode: 'contain',
    qualityMode: 'high',
  },
  {
    presetId: 'story-1080x1920',
    label: 'Story 1080x1920',
    width: 1080,
    height: 1920,
    format: 'png',
    fileNamePrefix: 'creators-coco',
    startNumber: 1,
    numberPadding: 2,
    resizeBackgroundMode: 'white',
    resizeFitMode: 'contain',
    qualityMode: 'high',
  },
  {
    presetId: 'custom',
    label: 'Custom 1920x1080',
    width: 1920,
    height: 1080,
    format: 'png',
    fileNamePrefix: 'creators-coco',
    startNumber: 1,
    numberPadding: 2,
    resizeBackgroundMode: 'white',
    resizeFitMode: 'contain',
    qualityMode: 'high',
  },
]

const sanitizeOutputSize = (value: number) => Math.max(256, Math.min(4096, Math.round(value)))

const createCustomOutputSettings = (width: number, height: number): OutputSettings => {
  const nextWidth = sanitizeOutputSize(width)
  const nextHeight = sanitizeOutputSize(height)

  return {
    presetId: 'custom',
    label: `Custom ${nextWidth}x${nextHeight}`,
    width: nextWidth,
    height: nextHeight,
    format: 'png',
    fileNamePrefix: 'creators-coco',
    startNumber: 1,
    numberPadding: 2,
    resizeBackgroundMode: 'white',
    resizeFitMode: 'contain',
    qualityMode: 'high',
  }
}

const withFileNamePrefix = (settings: OutputSettings, fileNamePrefix: string): OutputSettings => ({
  ...settings,
  fileNamePrefix: sanitizeFileNamePrefix(fileNamePrefix),
})

const sanitizeFileNamePrefix = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'creators-coco'

const sanitizeStartNumber = (value: number) => Math.max(1, Math.min(9999, Math.round(value)))
const sanitizeNumberPadding = (value: number) => Math.max(2, Math.min(6, Math.round(value)))
const sanitizeProjectName = (value: string) => value.trim() || 'Untitled project'

const withNumbering = (
  settings: OutputSettings,
  startNumber: number,
  numberPadding: number,
): OutputSettings => ({
  ...settings,
  startNumber: sanitizeStartNumber(startNumber),
  numberPadding: sanitizeNumberPadding(numberPadding),
})

const withResizeBackgroundMode = (
  settings: OutputSettings,
  resizeBackgroundMode: ResizeBackgroundMode,
): OutputSettings => ({
  ...settings,
  resizeBackgroundMode,
})

const withResizeFitMode = (settings: OutputSettings, resizeFitMode: ResizeFitMode): OutputSettings => ({
  ...settings,
  resizeFitMode,
})

const withExportQualityMode = (settings: OutputSettings, qualityMode: ExportQualityMode): OutputSettings => ({
  ...settings,
  qualityMode,
})

const inferImageSize = (fileName: string): Pick<CanvasImage, 'width' | 'height'> => {
  const extension = fileName.split('.').pop()?.toLowerCase()

  if (extension === 'webp') {
    return { width: 3840, height: 2160 }
  }

  return { width: 1920, height: 1080 }
}

const createPageId = () =>
  `page-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

const createImageFromFile = (file: File): CanvasImage => ({
  id: createPageId(),
  name: file.name,
  ...inferImageSize(file.name),
  sourceUrl: typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null,
  variantLabel: null,
  variantSourcePageId: null,
  textLayers: [],
  messageWindowLayers: [],
  bubbleLayers: [],
  mosaicLayers: [],
  overlayLayers: [],
  watermarkLayers: [],
})

const createTextLayerId = () =>
  `text-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

const createBubbleLayerId = () =>
  `bubble-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

const createMessageWindowLayerId = () =>
  `message-window-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

const createMosaicLayerId = () =>
  `mosaic-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

const createOverlayLayerId = () =>
  `overlay-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
const createWatermarkLayerId = () =>
  `watermark-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

const createMessagePresetId = () =>
  `message-preset-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
const createTextPresetId = () =>
  `text-preset-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
const createWatermarkPresetId = () =>
  `watermark-preset-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
const createBubblePresetId = () =>
  `bubble-preset-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
const createOverlayPresetId = () =>
  `overlay-preset-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
const createMosaicPresetId = () =>
  `mosaic-preset-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

const createTemplateId = () =>
  `template-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

const createReusableAssetId = () =>
  `asset-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

const createGroupId = () =>
  `group-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

const createTextLayer = (): CanvasTextLayer => ({
  id: createTextLayerId(),
  name: null,
  groupId: null,
  text: 'New text',
  x: 120,
  y: 120,
  fontSize: 32,
  color: '#ffffff',
  lineHeight: 1.2,
  letterSpacing: 0,
  maxWidth: 360,
  fillMode: 'solid',
  gradientFrom: '#ffffff',
  gradientTo: '#ff9a6b',
  isVertical: false,
  fontFamily: 'sans-serif',
  rotation: 0,
  strokeWidth: 0,
  strokeColor: '#241b15',
  shadowEnabled: false,
  visible: true,
  locked: false,
})

const createBubbleLayer = (): CanvasBubbleLayer => ({
  id: createBubbleLayerId(),
  name: null,
  groupId: null,
  text: 'New bubble',
  x: 240,
  y: 180,
  width: 220,
  height: 120,
  tailDirection: 'left',
  stylePreset: 'speech',
  bubbleShape: 'round',
  shapeSeed: 0,
  fillColor: '#ffffff',
  borderColor: '#241b15',
  visible: true,
  locked: false,
})

const createMessageWindowLayer = (): CanvasMessageWindowLayer => ({
  id: createMessageWindowLayerId(),
  name: null,
  groupId: null,
  speaker: 'Speaker',
  body: 'New line',
  x: 688,
  y: 760,
  width: 608,
  height: 220,
  opacity: 0.9,
  frameStyle: 'classic',
  assetName: null,
  visible: true,
  locked: false,
})

const createWatermarkLayer = (): CanvasWatermarkLayer => ({
  id: createWatermarkLayerId(),
  name: null,
  groupId: null,
  text: 'Sample watermark',
  opacity: 0.3,
  color: '#fff4d6',
  repeated: false,
  angle: -16,
  density: 1,
  preset: 'custom',
  mode: 'text',
  assetName: null,
  x: 960,
  y: 540,
  scale: 1,
  tiled: false,
  visible: true,
  locked: false,
})

const createMosaicLayer = (): CanvasMosaicLayer => ({
  id: createMosaicLayerId(),
  name: null,
  groupId: null,
  x: 320,
  y: 220,
  width: 180,
  height: 120,
  intensity: 12,
  style: 'pixelate',
  visible: true,
  locked: false,
})

const createOverlayLayer = (): CanvasOverlayLayer => ({
  id: createOverlayLayerId(),
  name: null,
  groupId: null,
  x: 180,
  y: 120,
  width: 320,
  height: 180,
  areaPreset: 'custom',
  color: '#ffcc44',
  fillMode: 'solid',
  gradientFrom: '#ffcc44',
  gradientTo: '#ff6b6b',
  gradientDirection: 'diagonal',
  opacity: 0.4,
  visible: true,
  locked: false,
})

const sanitizeTextColor = (value: string) =>
  /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : '#ffffff'

const getSupportedFileError = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return !extension || !supportedExtensions.includes(extension)
    ? `Unsupported file type: ${file.name}`
    : null
}

const readFileAsDataUrl = async (file: File): Promise<string | null> => {
  if (typeof FileReader === 'undefined') {
    return null
  }

  return await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

const createInitialState = () => ({
  activeTool: 'select',
  zoomPercent: 100,
  pages: [] as CanvasImage[],
  activePageId: null as string | null,
  pageThumbnails: {} as Record<string, string>,
  loadError: null as string | null,
  selectedLayerId: null as string | null,
  selectedLayerIds: [] as string[],
  imageTransform: null as CanvasTransform | null,
  outputSettings: outputPresets[0],
  isDirty: false,
  lastSavedAt: null as string | null,
  projectId: 'project-default',
  projectName: 'Untitled project',
  recentProjects: [] as RecentProjectEntry[],
  messageWindowPresets: [] as MessageWindowPreset[],
  textStylePresets: [] as TextStylePreset[],
  watermarkStylePresets: [] as WatermarkStylePreset[],
  bubbleStylePresets: [] as BubbleStylePreset[],
  overlayStylePresets: [] as OverlayStylePreset[],
  mosaicStylePresets: [] as MosaicStylePreset[],
  templates: [] as PageTemplate[],
  reusableAssets: [] as ReusablePageAsset[],
  undoStack: [] as HistoryEntry[],
  redoStack: [] as HistoryEntry[],
})

const cloneTextLayer = (layer: CanvasTextLayer): CanvasTextLayer => ({
  ...layer,
  id: createTextLayerId(),
})

const cloneMessageWindowLayer = (layer: CanvasMessageWindowLayer): CanvasMessageWindowLayer => ({
  ...layer,
  id: createMessageWindowLayerId(),
})

const cloneBubbleLayer = (layer: CanvasBubbleLayer): CanvasBubbleLayer => ({
  ...layer,
  id: createBubbleLayerId(),
})

const cloneMosaicLayer = (layer: CanvasMosaicLayer): CanvasMosaicLayer => ({
  ...layer,
  id: createMosaicLayerId(),
})

const cloneOverlayLayer = (layer: CanvasOverlayLayer): CanvasOverlayLayer => ({
  ...layer,
  id: createOverlayLayerId(),
})

const cloneWatermarkLayer = (layer: CanvasWatermarkLayer): CanvasWatermarkLayer => ({
  ...layer,
  id: createWatermarkLayerId(),
})

const cloneTemplate = (template: PageTemplate): PageTemplate => ({
  ...template,
  textLayers: template.textLayers.map((layer) => ({ ...layer })),
  messageWindowLayers: template.messageWindowLayers.map((layer) => ({ ...layer })),
  bubbleLayers: template.bubbleLayers.map((layer) => ({ ...layer })),
  mosaicLayers: template.mosaicLayers.map((layer) => ({ ...layer })),
  overlayLayers: template.overlayLayers.map((layer) => ({ ...layer })),
  watermarkLayers: template.watermarkLayers.map((layer) => ({ ...layer })),
})

const cloneReusableAsset = (asset: ReusablePageAsset): ReusablePageAsset => ({
  ...asset,
})

const createReusableAssetSummary = (page: CanvasImage) => {
  const summaryParts = [
    page.textLayers[0]?.text ? `Text ${page.textLayers[0].text}` : null,
    page.messageWindowLayers[0]?.speaker ? `Window ${page.messageWindowLayers[0].speaker}` : null,
    page.bubbleLayers[0]?.text ? `Bubble ${page.bubbleLayers[0].text}` : null,
    page.overlayLayers[0] ? `Overlay ${page.overlayLayers[0].fillMode}` : null,
    page.mosaicLayers[0] ? `Mosaic ${page.mosaicLayers[0].style}` : null,
    page.watermarkLayers[0]?.assetName ?? page.watermarkLayers[0]?.text
      ? `Watermark ${page.watermarkLayers[0]?.assetName ?? page.watermarkLayers[0]?.text}`
      : null,
  ].filter(Boolean)

  return summaryParts.slice(0, 3).join(' / ') || 'Layer composition'
}

const snapshotHistory = (state: Pick<
  WorkspaceState,
  'pages' | 'activePageId' | 'imageTransform' | 'selectedLayerId'
>): HistoryEntry => ({
  pages: state.pages.map((page) => ({
    ...page,
    textLayers: page.textLayers.map((layer) => ({ ...layer })),
    messageWindowLayers: page.messageWindowLayers.map((layer) => ({ ...layer })),
    bubbleLayers: page.bubbleLayers.map((layer) => ({ ...layer })),
    mosaicLayers: page.mosaicLayers.map((layer) => ({ ...layer })),
    overlayLayers: page.overlayLayers.map((layer) => ({ ...layer })),
    watermarkLayers: page.watermarkLayers.map((layer) => ({ ...layer })),
  })),
  activePageId: state.activePageId,
  imageTransform: state.imageTransform ? { ...state.imageTransform } : null,
  selectedLayerId: state.selectedLayerId,
})

const withHistory = (
  state: WorkspaceState,
  next: Partial<WorkspaceState>,
): Partial<WorkspaceState> => ({
  ...next,
  isDirty: true,
  undoStack: [...state.undoStack, snapshotHistory(state)].slice(-50),
  redoStack: [],
})

const serializeProject = (
  state: Pick<
    WorkspaceState,
    | 'pages'
    | 'activePageId'
    | 'selectedLayerId'
    | 'imageTransform'
    | 'outputSettings'
    | 'lastSavedAt'
    | 'projectId'
    | 'projectName'
    | 'messageWindowPresets'
    | 'textStylePresets'
    | 'watermarkStylePresets'
    | 'bubbleStylePresets'
    | 'overlayStylePresets'
    | 'mosaicStylePresets'
    | 'templates'
    | 'reusableAssets'
  >,
): PersistedProject => ({
  schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
  id: state.projectId !== 'project-default' ? state.projectId : state.pages[0]?.id ? `project-${state.pages[0].id}` : 'project-default',
  name:
    state.projectName !== 'Untitled project'
      ? state.projectName
      : state.pages[0]?.name
        ? `${state.pages[0].name} project`
        : 'Untitled project',
  pages: state.pages.map((page) => ({
    ...page,
    textLayers: page.textLayers.map((layer) => ({ ...layer })),
    messageWindowLayers: page.messageWindowLayers.map((layer) => ({ ...layer })),
    bubbleLayers: page.bubbleLayers.map((layer) => ({ ...layer })),
    mosaicLayers: page.mosaicLayers.map((layer) => ({ ...layer })),
    overlayLayers: page.overlayLayers.map((layer) => ({ ...layer })),
    watermarkLayers: page.watermarkLayers.map((layer) => ({ ...layer })),
  })),
  activePageId: state.activePageId,
  selectedLayerId: state.selectedLayerId,
  imageTransform: state.imageTransform ? { ...state.imageTransform } : null,
  outputSettings: state.outputSettings,
  lastSavedAt: state.lastSavedAt,
  messageWindowPresets: state.messageWindowPresets.map((preset) => ({ ...preset })),
  textStylePresets: state.textStylePresets.map((preset) => ({ ...preset })),
  watermarkStylePresets: state.watermarkStylePresets.map((preset) => ({ ...preset })),
  bubbleStylePresets: state.bubbleStylePresets.map((preset) => ({ ...preset })),
  overlayStylePresets: state.overlayStylePresets.map((preset) => ({ ...preset })),
  mosaicStylePresets: state.mosaicStylePresets.map((preset) => ({ ...preset })),
  templates: state.templates.map(cloneTemplate),
  reusableAssets: state.reusableAssets.map(cloneReusableAsset),
})

const shouldRewriteStoredProject = (project: StoredProjectSnapshot) =>
  project.schemaVersion !== CURRENT_PROJECT_SCHEMA_VERSION ||
  !project.outputSettings ||
  project.outputSettings.resizeFitMode == null ||
  project.outputSettings.resizeBackgroundMode == null ||
  project.outputSettings.qualityMode == null

const getStoredProjectSchemaVersion = (project: StoredProjectSnapshot) =>
  typeof project.schemaVersion === 'number' && Number.isFinite(project.schemaVersion) ? project.schemaVersion : 0

const migrateStoredProjectSnapshot = (project: StoredProjectSnapshot): StoredProjectSnapshot => {
  let currentProject: StoredProjectSnapshot = { ...project }
  let currentVersion = getStoredProjectSchemaVersion(currentProject)

  while (currentVersion < CURRENT_PROJECT_SCHEMA_VERSION) {
    const migration = PROJECT_SCHEMA_MIGRATIONS.find((entry) => entry.fromVersion === currentVersion)
    if (!migration) {
      break
    }

    if (migration.fromVersion === 0 && migration.toVersion === 1) {
      currentProject = {
        ...currentProject,
        schemaVersion: 1,
        outputSettings: currentProject.outputSettings
          ? {
              ...currentProject.outputSettings,
              resizeFitMode: currentProject.outputSettings.resizeFitMode ?? 'contain',
              resizeBackgroundMode: currentProject.outputSettings.resizeBackgroundMode ?? 'white',
              qualityMode: currentProject.outputSettings.qualityMode ?? 'high',
            }
          : {
              ...outputPresets[0],
            },
      }
      currentVersion = migration.toVersion
      continue
    }

    break
  }

  return currentProject
}

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const writeProjectToStorage = (project: PersistedProject) => {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project))
}

const readRecentProjectsFromStorage = (): RecentProjectEntry[] => {
  if (!canUseStorage()) {
    return []
  }

  const storedProjects = window.localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY)
  if (!storedProjects) {
    return []
  }

  try {
    const parsedProjects = JSON.parse(storedProjects) as RecentProjectEntry[]
    return Array.isArray(parsedProjects) ? parsedProjects : []
  } catch {
    window.localStorage.removeItem(RECENT_PROJECTS_STORAGE_KEY)
    return []
  }
}

const writeRecentProjectsToStorage = (recentProjects: RecentProjectEntry[]) => {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(recentProjects))
}

const upsertRecentProject = (project: PersistedProject): RecentProjectEntry[] => {
  const nextEntry: RecentProjectEntry = {
    id: project.id,
    name: project.name,
    pageCount: project.pages.length,
    lastSavedAt: project.lastSavedAt,
  }

  const recentProjects = readRecentProjectsFromStorage().filter((entry) => entry.id !== nextEntry.id)
  const nextRecentProjects = [nextEntry, ...recentProjects].slice(0, 5)
  writeRecentProjectsToStorage(nextRecentProjects)
  return nextRecentProjects
}

const readProjectFromStorage = (): PersistedProject | null => {
  if (!canUseStorage()) {
    return null
  }

  const storedProject = window.localStorage.getItem(PROJECT_STORAGE_KEY)
  if (!storedProject) {
    return null
  }

  try {
    const rawParsedProject = JSON.parse(storedProject) as StoredProjectSnapshot
    const parsedProject = migrateStoredProjectSnapshot(rawParsedProject)
    const storedPreset = outputPresets.find(
      (preset) => preset.presetId === parsedProject.outputSettings?.presetId,
    )
    const outputSettings =
      parsedProject.outputSettings?.presetId === 'custom'
        ? withNumbering(
            withFileNamePrefix(
              createCustomOutputSettings(
                parsedProject.outputSettings.width,
                parsedProject.outputSettings.height,
              ),
              parsedProject.outputSettings.fileNamePrefix,
            ),
            parsedProject.outputSettings.startNumber ?? 1,
            parsedProject.outputSettings.numberPadding ?? 2,
          )
        : withNumbering(
            withFileNamePrefix(
              storedPreset ?? outputPresets[0],
              parsedProject.outputSettings?.fileNamePrefix ?? 'creators-coco',
            ),
            parsedProject.outputSettings?.startNumber ?? 1,
            parsedProject.outputSettings?.numberPadding ?? 2,
          )
    const normalizedOutputSettings = withResizeBackgroundMode(
      withExportQualityMode(
        withResizeFitMode(outputSettings, parsedProject.outputSettings?.resizeFitMode ?? 'contain'),
        parsedProject.outputSettings?.qualityMode ?? 'high',
      ),
      parsedProject.outputSettings?.resizeBackgroundMode ?? 'white',
    )

    const normalizedProject: PersistedProject = {
      schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
      id: parsedProject.id ?? 'project-default',
      name: parsedProject.name ?? 'Untitled project',
      pages: Array.isArray(parsedProject.pages)
        ? parsedProject.pages.map((page) => ({
            ...page,
            sourceUrl: page.sourceUrl ?? null,
            variantLabel: page.variantLabel ?? null,
            variantSourcePageId: page.variantSourcePageId ?? null,
            textLayers: Array.isArray(page.textLayers)
              ? page.textLayers.map((layer) => ({
                  ...layer,
                  name: layer.name ?? null,
                  groupId: layer.groupId ?? null,
                  lineHeight: layer.lineHeight ?? 1.2,
                  letterSpacing: layer.letterSpacing ?? 0,
                  maxWidth: layer.maxWidth ?? 360,
                  fillMode: layer.fillMode ?? 'solid',
                  gradientFrom: layer.gradientFrom ?? layer.color ?? '#ffffff',
                  gradientTo: layer.gradientTo ?? '#ff9a6b',
                  isVertical: layer.isVertical ?? false,
                  fontFamily: layer.fontFamily ?? 'sans-serif',
                  rotation: layer.rotation ?? 0,
                  strokeWidth: layer.strokeWidth ?? 0,
                  strokeColor: layer.strokeColor ?? '#241b15',
                  shadowEnabled: layer.shadowEnabled ?? false,
                  visible: layer.visible ?? true,
                  locked: layer.locked ?? false,
                }))
              : [],
            messageWindowLayers: Array.isArray(page.messageWindowLayers)
                ? page.messageWindowLayers.map((layer) => ({
                  ...layer,
                  name: layer.name ?? null,
                  groupId: layer.groupId ?? null,
                  opacity: layer.opacity ?? 0.9,
                  frameStyle: layer.frameStyle ?? 'classic',
                  assetName: layer.assetName ?? null,
                  visible: layer.visible ?? true,
                  locked: layer.locked ?? false,
                }))
              : [],
            bubbleLayers: Array.isArray(page.bubbleLayers)
                ? page.bubbleLayers.map((layer) => ({
                  ...layer,
                  name: layer.name ?? null,
                  groupId: layer.groupId ?? null,
                  tailDirection: layer.tailDirection ?? 'left',
                  stylePreset: layer.stylePreset ?? 'speech',
                  bubbleShape: layer.bubbleShape ?? 'round',
                  shapeSeed: layer.shapeSeed ?? 0,
                  fillColor: layer.fillColor ?? '#ffffff',
                  borderColor: layer.borderColor ?? '#241b15',
                  visible: layer.visible ?? true,
                  locked: layer.locked ?? false,
                }))
              : [],
            mosaicLayers: Array.isArray(page.mosaicLayers)
              ? page.mosaicLayers.map((layer) => ({
                  ...layer,
                  name: layer.name ?? null,
                  style: layer.style ?? 'pixelate',
                  groupId: layer.groupId ?? null,
                  visible: layer.visible ?? true,
                  locked: layer.locked ?? false,
                }))
              : [],
            overlayLayers: Array.isArray(page.overlayLayers)
              ? page.overlayLayers.map((layer) => ({
                  ...layer,
                  name: layer.name ?? null,
                  areaPreset: layer.areaPreset ?? 'custom',
                  fillMode: layer.fillMode ?? 'solid',
                  gradientFrom: layer.gradientFrom ?? layer.color ?? '#ffcc44',
                  gradientTo: layer.gradientTo ?? '#ff6b6b',
                  gradientDirection: layer.gradientDirection ?? 'diagonal',
                  groupId: layer.groupId ?? null,
                  visible: layer.visible ?? true,
                  locked: layer.locked ?? false,
                }))
              : [],
            watermarkLayers: Array.isArray(page.watermarkLayers)
                ? page.watermarkLayers.map((layer) => ({
                  ...layer,
                  name: layer.name ?? null,
                  groupId: layer.groupId ?? null,
                  opacity: layer.opacity ?? 0.3,
                  color: layer.color ?? '#fff4d6',
                  repeated: layer.repeated ?? false,
                  angle: layer.angle ?? -16,
                  density: layer.density ?? 1,
                  preset: layer.preset ?? 'custom',
                  mode: layer.mode ?? 'text',
                  assetName: layer.assetName ?? null,
                  x: layer.x ?? 960,
                  y: layer.y ?? 540,
                  scale: layer.scale ?? 1,
                  tiled: layer.tiled ?? false,
                  visible: layer.visible ?? true,
                  locked: layer.locked ?? false,
                }))
              : [],
          }))
        : [],
      activePageId: parsedProject.activePageId ?? null,
      selectedLayerId: parsedProject.selectedLayerId ?? null,
      imageTransform: parsedProject.imageTransform ?? null,
      outputSettings: normalizedOutputSettings,
      lastSavedAt: parsedProject.lastSavedAt ?? null,
      messageWindowPresets: Array.isArray(parsedProject.messageWindowPresets)
        ? parsedProject.messageWindowPresets.map((preset) => ({ ...preset }))
        : [],
      textStylePresets: Array.isArray(parsedProject.textStylePresets)
        ? parsedProject.textStylePresets.map((preset) => ({ ...preset }))
        : [],
      watermarkStylePresets: Array.isArray(parsedProject.watermarkStylePresets)
        ? parsedProject.watermarkStylePresets.map((preset) => ({ ...preset }))
        : [],
      bubbleStylePresets: Array.isArray(parsedProject.bubbleStylePresets)
        ? parsedProject.bubbleStylePresets.map((preset) => ({ ...preset }))
        : [],
      overlayStylePresets: Array.isArray(parsedProject.overlayStylePresets)
        ? parsedProject.overlayStylePresets.map((preset) => ({ ...preset }))
        : [],
      mosaicStylePresets: Array.isArray(parsedProject.mosaicStylePresets)
        ? parsedProject.mosaicStylePresets.map((preset) => ({ ...preset }))
        : [],
      templates: Array.isArray(parsedProject.templates)
        ? parsedProject.templates.map((template) => ({
            ...template,
            textLayers: Array.isArray(template.textLayers) ? template.textLayers.map((layer) => ({ ...layer })) : [],
            messageWindowLayers: Array.isArray(template.messageWindowLayers)
              ? template.messageWindowLayers.map((layer) => ({ ...layer }))
              : [],
            bubbleLayers: Array.isArray(template.bubbleLayers) ? template.bubbleLayers.map((layer) => ({ ...layer })) : [],
            mosaicLayers: Array.isArray(template.mosaicLayers) ? template.mosaicLayers.map((layer) => ({ ...layer })) : [],
            overlayLayers: Array.isArray(template.overlayLayers) ? template.overlayLayers.map((layer) => ({ ...layer })) : [],
            watermarkLayers: Array.isArray(template.watermarkLayers)
              ? template.watermarkLayers.map((layer) => ({ ...layer }))
              : [],
          }))
        : [],
      reusableAssets: Array.isArray(parsedProject.reusableAssets)
        ? parsedProject.reusableAssets.map((asset) => ({
            ...asset,
          }))
        : [],
    }

    if (shouldRewriteStoredProject(rawParsedProject)) {
      writeProjectToStorage(normalizedProject)
    }

    return normalizedProject
  } catch {
    window.localStorage.removeItem(PROJECT_STORAGE_KEY)
    return null
  }
}

const updateActivePage = (
  pages: CanvasImage[],
  activePageId: string | null,
  updater: (page: CanvasImage) => CanvasImage,
) =>
  pages.map((page) => (page.id === activePageId ? updater(page) : page))

const updatePageById = (
  pages: CanvasImage[],
  pageId: string,
  updater: (page: CanvasImage) => CanvasImage,
) => pages.map((page) => (page.id === pageId ? updater(page) : page))

const selectActiveTextLayer = (
  state: Pick<WorkspaceState, 'pages' | 'activePageId' | 'selectedLayerId'>,
) => {
  const page = selectActiveImage(state)
  if (!page || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
    return null
  }

  return page.textLayers.find((layer) => layer.id === state.selectedLayerId) ?? null
}

const selectActiveBubbleLayer = (
  state: Pick<WorkspaceState, 'pages' | 'activePageId' | 'selectedLayerId'>,
) => {
  const page = selectActiveImage(state)
  if (!page || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
    return null
  }

  return page.bubbleLayers.find((layer) => layer.id === state.selectedLayerId) ?? null
}

const selectActiveMessageWindowLayer = (
  state: Pick<WorkspaceState, 'pages' | 'activePageId' | 'selectedLayerId'>,
) => {
  const page = selectActiveImage(state)
  if (!page || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
    return null
  }

  return page.messageWindowLayers.find((layer) => layer.id === state.selectedLayerId) ?? null
}

const selectActiveMosaicLayer = (
  state: Pick<WorkspaceState, 'pages' | 'activePageId' | 'selectedLayerId'>,
) => {
  const page = selectActiveImage(state)
  if (!page || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
    return null
  }

  return page.mosaicLayers.find((layer) => layer.id === state.selectedLayerId) ?? null
}

const selectActiveOverlayLayer = (
  state: Pick<WorkspaceState, 'pages' | 'activePageId' | 'selectedLayerId'>,
) => {
  const page = selectActiveImage(state)
  if (!page || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
    return null
  }

  return page.overlayLayers.find((layer) => layer.id === state.selectedLayerId) ?? null
}

const selectActiveWatermarkLayer = (
  state: Pick<WorkspaceState, 'pages' | 'activePageId' | 'selectedLayerId'>,
) => {
  const page = selectActiveImage(state)
  if (!page || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
    return null
  }

  return page.watermarkLayers.find((layer) => layer.id === state.selectedLayerId) ?? null
}

const getVisibleLayerIdsByType = (page: CanvasImage, type: LayerType) => {
  if (type === 'text') {
    return page.textLayers.filter((layer) => layer.visible).map((layer) => layer.id)
  }

  if (type === 'message-window') {
    return page.messageWindowLayers.filter((layer) => layer.visible).map((layer) => layer.id)
  }

  if (type === 'bubble') {
    return page.bubbleLayers.filter((layer) => layer.visible).map((layer) => layer.id)
  }

  if (type === 'mosaic') {
    return page.mosaicLayers.filter((layer) => layer.visible).map((layer) => layer.id)
  }

  if (type === 'watermark') {
    return page.watermarkLayers.filter((layer) => layer.visible).map((layer) => layer.id)
  }

  return page.overlayLayers.filter((layer) => layer.visible).map((layer) => layer.id)
}

const getAllVisibleLayerIds = (page: CanvasImage) => [
  ...getVisibleLayerIdsByType(page, 'text'),
  ...getVisibleLayerIdsByType(page, 'message-window'),
  ...getVisibleLayerIdsByType(page, 'bubble'),
  ...getVisibleLayerIdsByType(page, 'mosaic'),
  ...getVisibleLayerIdsByType(page, 'overlay'),
  ...getVisibleLayerIdsByType(page, 'watermark'),
]

const getEffectiveSelectedLayerIds = (
  state: Pick<WorkspaceState, 'selectedLayerId' | 'selectedLayerIds'>,
) => {
  const selectedLayerIds = state.selectedLayerIds.length > 0 ? state.selectedLayerIds : state.selectedLayerId ? [state.selectedLayerId] : []

  return selectedLayerIds.filter((layerId) => layerId !== 'base-image')
}

const toggleLayerSelectionState = (
  state: Pick<WorkspaceState, 'selectedLayerId' | 'selectedLayerIds'>,
  layerId: string,
  additive = false,
) => {
  if (!additive) {
    return {
      selectedLayerId: layerId,
      selectedLayerIds: [layerId],
    }
  }

  const currentSelection = getEffectiveSelectedLayerIds(state)
  const hasLayer = currentSelection.includes(layerId)

  if (hasLayer) {
    const selectedLayerIds = currentSelection.filter((entry) => entry !== layerId)
    return {
      selectedLayerId: selectedLayerIds[selectedLayerIds.length - 1] ?? null,
      selectedLayerIds,
    }
  }

  const selectedLayerIds = [...currentSelection, layerId]
  return {
    selectedLayerId: layerId,
    selectedLayerIds,
  }
}

type SelectedPosition = {
  id: string
  type: LayerType
  x: number
  y: number
  locked: boolean
}

const getSelectedPositions = (page: CanvasImage, selectedLayerIds: Set<string>): SelectedPosition[] => [
  ...page.textLayers
    .filter((layer) => selectedLayerIds.has(layer.id))
    .map((layer) => ({ id: layer.id, type: 'text' as const, x: layer.x, y: layer.y, locked: layer.locked })),
  ...page.messageWindowLayers
    .filter((layer) => selectedLayerIds.has(layer.id))
    .map((layer) => ({ id: layer.id, type: 'message-window' as const, x: layer.x, y: layer.y, locked: layer.locked })),
  ...page.bubbleLayers
    .filter((layer) => selectedLayerIds.has(layer.id))
    .map((layer) => ({ id: layer.id, type: 'bubble' as const, x: layer.x, y: layer.y, locked: layer.locked })),
  ...page.mosaicLayers
    .filter((layer) => selectedLayerIds.has(layer.id))
    .map((layer) => ({ id: layer.id, type: 'mosaic' as const, x: layer.x, y: layer.y, locked: layer.locked })),
  ...page.overlayLayers
    .filter((layer) => selectedLayerIds.has(layer.id))
    .map((layer) => ({ id: layer.id, type: 'overlay' as const, x: layer.x, y: layer.y, locked: layer.locked })),
  ...page.watermarkLayers
    .filter((layer) => selectedLayerIds.has(layer.id))
    .map((layer) => ({ id: layer.id, type: 'watermark' as const, x: layer.x, y: layer.y, locked: layer.locked })),
]

const applyPositionMap = (
  page: CanvasImage,
  positionMap: Map<string, number>,
  axis: 'horizontal' | 'vertical',
) => ({
  ...page,
  textLayers: page.textLayers.map((layer) =>
    positionMap.has(layer.id)
      ? { ...layer, x: axis === 'horizontal' ? positionMap.get(layer.id) ?? layer.x : layer.x, y: axis === 'vertical' ? positionMap.get(layer.id) ?? layer.y : layer.y }
      : layer,
  ),
  messageWindowLayers: page.messageWindowLayers.map((layer) =>
    positionMap.has(layer.id)
      ? { ...layer, x: axis === 'horizontal' ? positionMap.get(layer.id) ?? layer.x : layer.x, y: axis === 'vertical' ? positionMap.get(layer.id) ?? layer.y : layer.y }
      : layer,
  ),
  bubbleLayers: page.bubbleLayers.map((layer) =>
    positionMap.has(layer.id)
      ? { ...layer, x: axis === 'horizontal' ? positionMap.get(layer.id) ?? layer.x : layer.x, y: axis === 'vertical' ? positionMap.get(layer.id) ?? layer.y : layer.y }
      : layer,
  ),
  mosaicLayers: page.mosaicLayers.map((layer) =>
    positionMap.has(layer.id)
      ? { ...layer, x: axis === 'horizontal' ? positionMap.get(layer.id) ?? layer.x : layer.x, y: axis === 'vertical' ? positionMap.get(layer.id) ?? layer.y : layer.y }
      : layer,
  ),
  overlayLayers: page.overlayLayers.map((layer) =>
    positionMap.has(layer.id)
      ? { ...layer, x: axis === 'horizontal' ? positionMap.get(layer.id) ?? layer.x : layer.x, y: axis === 'vertical' ? positionMap.get(layer.id) ?? layer.y : layer.y }
      : layer,
  ),
  watermarkLayers: page.watermarkLayers.map((layer) =>
    positionMap.has(layer.id)
      ? { ...layer, x: axis === 'horizontal' ? positionMap.get(layer.id) ?? layer.x : layer.x, y: axis === 'vertical' ? positionMap.get(layer.id) ?? layer.y : layer.y }
      : layer,
  ),
})

const getSelectedResizableLayers = (page: CanvasImage, selectedLayerIds: Set<string>) => [
  ...page.messageWindowLayers
    .filter((layer) => selectedLayerIds.has(layer.id))
    .map((layer) => ({ id: layer.id, width: layer.width, height: layer.height, locked: layer.locked })),
  ...page.bubbleLayers
    .filter((layer) => selectedLayerIds.has(layer.id))
    .map((layer) => ({ id: layer.id, width: layer.width, height: layer.height, locked: layer.locked })),
  ...page.mosaicLayers
    .filter((layer) => selectedLayerIds.has(layer.id))
    .map((layer) => ({ id: layer.id, width: layer.width, height: layer.height, locked: layer.locked })),
  ...page.overlayLayers
    .filter((layer) => selectedLayerIds.has(layer.id))
    .map((layer) => ({ id: layer.id, width: layer.width, height: layer.height, locked: layer.locked })),
]

const getLayerGroupId = (page: CanvasImage, layerId: string) =>
  page.textLayers.find((layer) => layer.id === layerId)?.groupId ??
  page.messageWindowLayers.find((layer) => layer.id === layerId)?.groupId ??
  page.bubbleLayers.find((layer) => layer.id === layerId)?.groupId ??
  page.mosaicLayers.find((layer) => layer.id === layerId)?.groupId ??
  page.overlayLayers.find((layer) => layer.id === layerId)?.groupId ??
  page.watermarkLayers.find((layer) => layer.id === layerId)?.groupId ??
  null

const getGroupedLayerIds = (page: CanvasImage, groupId: string) => [
  ...page.textLayers.filter((layer) => layer.groupId === groupId).map((layer) => layer.id),
  ...page.messageWindowLayers.filter((layer) => layer.groupId === groupId).map((layer) => layer.id),
  ...page.bubbleLayers.filter((layer) => layer.groupId === groupId).map((layer) => layer.id),
  ...page.mosaicLayers.filter((layer) => layer.groupId === groupId).map((layer) => layer.id),
  ...page.overlayLayers.filter((layer) => layer.groupId === groupId).map((layer) => layer.id),
  ...page.watermarkLayers.filter((layer) => layer.groupId === groupId).map((layer) => layer.id),
]

const getActionableLayerIds = (state: Pick<WorkspaceState, 'activePageId' | 'selectedLayerId' | 'selectedLayerIds' | 'pages'>) => {
  if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
    return []
  }

  const explicitSelection = getEffectiveSelectedLayerIds(state)
  if (explicitSelection.length > 1) {
    return explicitSelection
  }

  const page = selectActiveImage(state)
  if (!page) {
    return explicitSelection
  }

  const groupId = getLayerGroupId(page, state.selectedLayerId)
  return groupId ? getGroupedLayerIds(page, groupId) : explicitSelection
}

const moveSelectedLayers = (state: WorkspaceState, dx: number, dy: number) => {
  if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
    return state
  }

  const selectedLayerIds = new Set(getEffectiveSelectedLayerIds(state))
  if (selectedLayerIds.size > 1) {
    return withHistory(state, {
      pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
        ...entry,
        textLayers: entry.textLayers.map((layer) =>
          selectedLayerIds.has(layer.id) && !layer.locked ? { ...layer, x: layer.x + dx, y: layer.y + dy } : layer,
        ),
        bubbleLayers: entry.bubbleLayers.map((layer) =>
          selectedLayerIds.has(layer.id) && !layer.locked ? { ...layer, x: layer.x + dx, y: layer.y + dy } : layer,
        ),
        mosaicLayers: entry.mosaicLayers.map((layer) =>
          selectedLayerIds.has(layer.id) && !layer.locked ? { ...layer, x: layer.x + dx, y: layer.y + dy } : layer,
        ),
        overlayLayers: entry.overlayLayers.map((layer) =>
          selectedLayerIds.has(layer.id) && !layer.locked ? { ...layer, x: layer.x + dx, y: layer.y + dy } : layer,
        ),
      })),
      loadError: null,
    })
  }

  const textLayer = selectActiveTextLayer(state)
  if (textLayer && !textLayer.locked) {
    return withHistory(state, {
      pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
        ...entry,
        textLayers: entry.textLayers.map((layer) =>
          layer.id === textLayer.id ? { ...layer, x: layer.x + dx, y: layer.y + dy } : layer,
        ),
      })),
      loadError: null,
    })
  }

  const bubbleLayer = selectActiveBubbleLayer(state)
  if (bubbleLayer && !bubbleLayer.locked) {
    return withHistory(state, {
      pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
        ...entry,
        bubbleLayers: entry.bubbleLayers.map((layer) =>
          layer.id === bubbleLayer.id ? { ...layer, x: layer.x + dx, y: layer.y + dy } : layer,
        ),
      })),
      loadError: null,
    })
  }

  const mosaicLayer = selectActiveMosaicLayer(state)
  if (mosaicLayer && !mosaicLayer.locked) {
    return withHistory(state, {
      pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
        ...entry,
        mosaicLayers: entry.mosaicLayers.map((layer) =>
          layer.id === mosaicLayer.id ? { ...layer, x: layer.x + dx, y: layer.y + dy } : layer,
        ),
      })),
      loadError: null,
    })
  }

  const overlayLayer = selectActiveOverlayLayer(state)
  if (overlayLayer && !overlayLayer.locked) {
    return withHistory(state, {
      pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
        ...entry,
        overlayLayers: entry.overlayLayers.map((layer) =>
          layer.id === overlayLayer.id ? { ...layer, x: layer.x + dx, y: layer.y + dy } : layer,
        ),
      })),
      loadError: null,
    })
  }

  return state
}

const applyResizeDelta = (
  frame: { x: number; y: number; width: number; height: number },
  minimumSize: { width: number; height: number },
  widthDelta: number,
  heightDelta: number,
  handle: ResizeHandle,
  preserveAspectRatio = false,
) => {
  let nextX = frame.x
  let nextY = frame.y
  let nextWidth = frame.width
  let nextHeight = frame.height

  if (handle.includes('left')) {
    nextWidth = Math.max(minimumSize.width, frame.width - widthDelta)
    nextX = frame.x + (frame.width - nextWidth)
  } else if (handle.includes('right')) {
    nextWidth = Math.max(minimumSize.width, frame.width + widthDelta)
  }

  if (handle.includes('top')) {
    nextHeight = Math.max(minimumSize.height, frame.height - heightDelta)
    nextY = frame.y + (frame.height - nextHeight)
  } else if (handle.includes('bottom')) {
    nextHeight = Math.max(minimumSize.height, frame.height + heightDelta)
  }

  const isCornerHandle =
    (handle.includes('left') || handle.includes('right')) &&
    (handle.includes('top') || handle.includes('bottom'))

  if (preserveAspectRatio && isCornerHandle) {
    const aspectRatio = frame.width / frame.height
    const widthRatio = Math.abs(nextWidth - frame.width) / Math.max(1, frame.width)
    const heightRatio = Math.abs(nextHeight - frame.height) / Math.max(1, frame.height)

    if (widthRatio >= heightRatio) {
      nextHeight = Math.max(minimumSize.height, Math.round(nextWidth / aspectRatio))
      nextWidth = Math.max(minimumSize.width, Math.round(nextHeight * aspectRatio))
    } else {
      nextWidth = Math.max(minimumSize.width, Math.round(nextHeight * aspectRatio))
      nextHeight = Math.max(minimumSize.height, Math.round(nextWidth / aspectRatio))
    }

    if (handle.includes('left')) {
      nextX = frame.x + (frame.width - nextWidth)
    }

    if (handle.includes('top')) {
      nextY = frame.y + (frame.height - nextHeight)
    }
  }

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  }
}

const resizeSelectedLayers = (
  state: WorkspaceState,
  widthDelta: number,
  heightDelta: number,
  handle: ResizeHandle = 'bottom-right',
  preserveAspectRatio = false,
) => {
  if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
    return state
  }

  const selectedLayerIds = new Set(getEffectiveSelectedLayerIds(state))

  if (selectedLayerIds.size > 1) {
    return withHistory(state, {
      pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
        ...entry,
        bubbleLayers: entry.bubbleLayers.map((layer) =>
          selectedLayerIds.has(layer.id) && !layer.locked
            ? {
                ...layer,
                ...applyResizeDelta(
                  layer,
                  { width: 120, height: 72 },
                  widthDelta,
                  heightDelta,
                  handle,
                  preserveAspectRatio,
                ),
              }
            : layer,
        ),
        mosaicLayers: entry.mosaicLayers.map((layer) =>
          selectedLayerIds.has(layer.id) && !layer.locked
            ? {
                ...layer,
                ...applyResizeDelta(
                  layer,
                  { width: 64, height: 64 },
                  widthDelta,
                  heightDelta,
                  handle,
                  preserveAspectRatio,
                ),
              }
            : layer,
        ),
        overlayLayers: entry.overlayLayers.map((layer) =>
          selectedLayerIds.has(layer.id) && !layer.locked
            ? {
                ...layer,
                ...applyResizeDelta(
                  layer,
                  { width: 96, height: 64 },
                  widthDelta,
                  heightDelta,
                  handle,
                  preserveAspectRatio,
                ),
              }
            : layer,
        ),
      })),
      loadError: null,
    })
  }

  const bubbleLayer = selectActiveBubbleLayer(state)
  if (bubbleLayer && !bubbleLayer.locked) {
    return withHistory(state, {
      pages: updateActivePage(state.pages, state.activePageId, (page) => ({
        ...page,
        bubbleLayers: page.bubbleLayers.map((layer) =>
          layer.id === bubbleLayer.id
            ? {
                ...layer,
                ...applyResizeDelta(
                  layer,
                  { width: 120, height: 72 },
                  widthDelta,
                  heightDelta,
                  handle,
                  preserveAspectRatio,
                ),
              }
            : layer,
        ),
      })),
      loadError: null,
    })
  }

  const mosaicLayer = selectActiveMosaicLayer(state)
  if (mosaicLayer && !mosaicLayer.locked) {
    return withHistory(state, {
      pages: updateActivePage(state.pages, state.activePageId, (page) => ({
        ...page,
        mosaicLayers: page.mosaicLayers.map((layer) =>
          layer.id === mosaicLayer.id
            ? {
                ...layer,
                ...applyResizeDelta(
                  layer,
                  { width: 64, height: 64 },
                  widthDelta,
                  heightDelta,
                  handle,
                  preserveAspectRatio,
                ),
              }
            : layer,
        ),
      })),
      loadError: null,
    })
  }

  const overlayLayer = selectActiveOverlayLayer(state)
  if (overlayLayer && !overlayLayer.locked) {
    return withHistory(state, {
      pages: updateActivePage(state.pages, state.activePageId, (page) => ({
        ...page,
        overlayLayers: page.overlayLayers.map((layer) =>
          layer.id === overlayLayer.id
            ? {
                ...layer,
                ...applyResizeDelta(
                  layer,
                  { width: 96, height: 64 },
                  widthDelta,
                  heightDelta,
                  handle,
                  preserveAspectRatio,
                ),
              }
            : layer,
        ),
      })),
      loadError: null,
    })
  }

  return state
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...createInitialState(),
  zoomIn: () => set((state) => ({ zoomPercent: clampZoom(state.zoomPercent + 25) })),
  zoomOut: () => set((state) => ({ zoomPercent: clampZoom(state.zoomPercent - 25) })),
  saveNow: () =>
    set((state) => {
      const lastSavedAt = new Date().toISOString()
      const persistedProject = serializeProject({
          pages: state.pages,
          activePageId: state.activePageId,
          selectedLayerId: state.selectedLayerId,
          imageTransform: state.imageTransform,
          outputSettings: state.outputSettings,
          lastSavedAt,
          projectId: state.projectId,
          projectName: state.projectName,
          messageWindowPresets: state.messageWindowPresets,
          textStylePresets: state.textStylePresets,
          watermarkStylePresets: state.watermarkStylePresets,
          bubbleStylePresets: state.bubbleStylePresets,
          overlayStylePresets: state.overlayStylePresets,
          mosaicStylePresets: state.mosaicStylePresets,
          templates: state.templates,
          reusableAssets: state.reusableAssets,
        })
      const recentProjects = upsertRecentProject(persistedProject)
      writeProjectToStorage(persistedProject)

      return {
        isDirty: false,
        lastSavedAt,
        projectId: persistedProject.id,
        projectName: persistedProject.name,
        recentProjects,
        loadError: null,
      }
    }),
  restoreSavedProject: () =>
    set(() => {
      const savedProject = readProjectFromStorage()
      const recentProjects = readRecentProjectsFromStorage()

      if (!savedProject) {
        return {
          recentProjects,
        }
      }

      return {
        pages: savedProject.pages,
        activePageId: savedProject.activePageId,
        selectedLayerId: savedProject.selectedLayerId,
        selectedLayerIds: savedProject.selectedLayerId ? [savedProject.selectedLayerId] : [],
        imageTransform: savedProject.imageTransform,
        outputSettings: savedProject.outputSettings,
        lastSavedAt: savedProject.lastSavedAt,
        projectId: savedProject.id,
        projectName: savedProject.name,
        messageWindowPresets: savedProject.messageWindowPresets,
        textStylePresets: savedProject.textStylePresets,
        watermarkStylePresets: savedProject.watermarkStylePresets,
        bubbleStylePresets: savedProject.bubbleStylePresets,
        overlayStylePresets: savedProject.overlayStylePresets,
        mosaicStylePresets: savedProject.mosaicStylePresets,
        templates: savedProject.templates,
        reusableAssets: savedProject.reusableAssets,
        recentProjects,
        loadError: null,
        isDirty: false,
        undoStack: [],
        redoStack: [],
      }
    }),
  setActiveTool: (tool) =>
    set(() => ({
      activeTool: tool,
    })),
  selectAllVisibleLayers: () =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const selectedLayerIds = getAllVisibleLayerIds(page)

      return {
        selectedLayerIds,
        selectedLayerId: selectedLayerIds[0] ?? null,
        loadError: null,
      }
    }),
  selectVisibleLayersByType: (type) =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const selectedLayerIds = getVisibleLayerIdsByType(page, type)

      return {
        selectedLayerIds,
        selectedLayerId: selectedLayerIds[0] ?? null,
        loadError: null,
      }
    }),
  invertLayerSelection: () =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const currentSelection = new Set(getEffectiveSelectedLayerIds(state))
      const selectedLayerIds = getAllVisibleLayerIds(page).filter((layerId) => !currentSelection.has(layerId))

      return {
        selectedLayerIds,
        selectedLayerId: selectedLayerIds[0] ?? null,
        loadError: null,
      }
    }),
  selectGroupedLayers: () =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }

      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const groupId = getLayerGroupId(page, state.selectedLayerId)
      if (!groupId) {
        return state
      }

      const groupedLayerIds = getGroupedLayerIds(page, groupId)
      return {
        selectedLayerIds: groupedLayerIds,
        selectedLayerId: groupedLayerIds[0] ?? state.selectedLayerId,
        loadError: null,
      }
    }),
  setSelectedLayerIds: (layerIds, additive = false) =>
    set((state) => {
      const nextLayerIds = [...new Set(layerIds.filter((layerId) => layerId !== 'base-image'))]

      if (additive) {
        const currentSelection = getEffectiveSelectedLayerIds(state)
        const mergedLayerIds = [...new Set([...currentSelection, ...nextLayerIds])]
        return {
          selectedLayerIds: mergedLayerIds,
          selectedLayerId: mergedLayerIds[mergedLayerIds.length - 1] ?? null,
          loadError: null,
        }
      }

      return {
        selectedLayerIds: nextLayerIds,
        selectedLayerId: nextLayerIds[0] ?? null,
        loadError: null,
      }
    }),
  clearLayerSelection: () =>
    set(() => ({
      selectedLayerId: null,
      selectedLayerIds: [],
    })),
  setProjectName: (name) =>
    set(() => ({
      projectName: sanitizeProjectName(name),
    })),
  openRecentProject: (projectId) =>
    set((state) => {
      const savedProject = readProjectFromStorage()
      const recentProjects = readRecentProjectsFromStorage()

      if (!savedProject || savedProject.id !== projectId) {
        return {
          recentProjects,
        }
      }

      return {
        pages: savedProject.pages,
        activePageId: savedProject.activePageId,
        selectedLayerId: savedProject.selectedLayerId,
        selectedLayerIds: savedProject.selectedLayerId ? [savedProject.selectedLayerId] : [],
        imageTransform: savedProject.imageTransform,
        outputSettings: savedProject.outputSettings,
        lastSavedAt: savedProject.lastSavedAt,
        projectId: savedProject.id,
        projectName: savedProject.name,
        messageWindowPresets: savedProject.messageWindowPresets,
        textStylePresets: savedProject.textStylePresets,
        watermarkStylePresets: savedProject.watermarkStylePresets,
        bubbleStylePresets: savedProject.bubbleStylePresets,
        overlayStylePresets: savedProject.overlayStylePresets,
        mosaicStylePresets: savedProject.mosaicStylePresets,
        templates: savedProject.templates,
        reusableAssets: savedProject.reusableAssets,
        recentProjects,
        loadError: null,
        isDirty: false,
        undoStack: [],
        redoStack: [],
      }
    }),
  setOutputPreset: (presetId) =>
    set((state) => {
      const preset = outputPresets.find((entry) => entry.presetId === presetId)

      if (!preset) {
        return {}
      }

      return {
        outputSettings: withNumbering(
          withFileNamePrefix(preset, state.outputSettings.fileNamePrefix),
          state.outputSettings.startNumber,
          state.outputSettings.numberPadding,
        ),
      }
    }),
  setCustomOutputWidth: (width) =>
    set((state) => ({
      outputSettings: withNumbering(
        withFileNamePrefix(
          createCustomOutputSettings(width, state.outputSettings.height),
          state.outputSettings.fileNamePrefix,
        ),
        state.outputSettings.startNumber,
        state.outputSettings.numberPadding,
      ),
    })),
  setCustomOutputHeight: (height) =>
    set((state) => ({
      outputSettings: withNumbering(
        withFileNamePrefix(
          createCustomOutputSettings(state.outputSettings.width, height),
          state.outputSettings.fileNamePrefix,
        ),
        state.outputSettings.startNumber,
        state.outputSettings.numberPadding,
      ),
    })),
  setResizeBackgroundMode: (mode) =>
    set((state) => ({
      outputSettings: {
        ...state.outputSettings,
        resizeBackgroundMode: mode,
      },
    })),
  setResizeFitMode: (mode) =>
    set((state) => ({
      outputSettings: {
        ...state.outputSettings,
        resizeFitMode: mode,
      },
    })),
  setExportQualityMode: (mode) =>
    set((state) => ({
      outputSettings: {
        ...state.outputSettings,
        qualityMode: mode,
      },
    })),
  setFileNamePrefix: (prefix) =>
    set((state) => ({
      outputSettings: {
        ...state.outputSettings,
        fileNamePrefix: sanitizeFileNamePrefix(prefix),
      },
    })),
  setStartNumber: (value) =>
    set((state) => ({
      outputSettings: {
        ...state.outputSettings,
        startNumber: sanitizeStartNumber(value),
      },
    })),
  setNumberPadding: (value) =>
    set((state) => ({
      outputSettings: {
        ...state.outputSettings,
        numberPadding: sanitizeNumberPadding(value),
      },
    })),
  undo: () =>
    set((state) => {
      const previous = state.undoStack[state.undoStack.length - 1]
      if (!previous) {
        return state
      }

      return {
        ...previous,
        isDirty: true,
        loadError: null,
        lastSavedAt: state.lastSavedAt,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, snapshotHistory(state)].slice(-50),
      }
    }),
  redo: () =>
    set((state) => {
      const next = state.redoStack[state.redoStack.length - 1]
      if (!next) {
        return state
      }

      return {
        ...next,
        isDirty: true,
        loadError: null,
        lastSavedAt: state.lastSavedAt,
        undoStack: [...state.undoStack, snapshotHistory(state)].slice(-50),
        redoStack: state.redoStack.slice(0, -1),
      }
    }),
  loadSampleImage: () =>
    set((state) =>
      withHistory(state, {
        pages: [SAMPLE_IMAGE],
        activePageId: SAMPLE_IMAGE.id,
        loadError: null,
        selectedLayerId: null,
        imageTransform: { ...INITIAL_IMAGE_TRANSFORM },
      }),
    ),
  loadImageFile: (file) =>
    set((state) => {
      const error = getSupportedFileError(file)

      if (error) {
        return {
          pages: state.pages,
          activePageId: state.activePageId,
          loadError: error,
          selectedLayerId: null,
          imageTransform: state.activePageId ? state.imageTransform : null,
        }
      }

      const image = createImageFromFile(file)

      void readFileAsDataUrl(file).then((dataUrl) => {
        if (!dataUrl) {
          return
        }

        set((current) => {
          if (!current.pages.some((page) => page.id === image.id)) {
            return current
          }

          const pages = current.pages.map((page) =>
            page.id === image.id
              ? {
                  ...page,
                  sourceUrl: dataUrl,
                }
              : page,
          )

          const nextState = {
            ...current,
            pages,
          }

          if (canUseStorage() && window.localStorage.getItem(PROJECT_STORAGE_KEY)) {
            writeProjectToStorage(
              serializeProject({
                pages,
                activePageId: current.activePageId,
                selectedLayerId: current.selectedLayerId,
                imageTransform: current.imageTransform,
                outputSettings: current.outputSettings,
                lastSavedAt: current.lastSavedAt,
                projectId: current.projectId,
                projectName: current.projectName,
                messageWindowPresets: current.messageWindowPresets,
                textStylePresets: current.textStylePresets,
                watermarkStylePresets: current.watermarkStylePresets,
                bubbleStylePresets: current.bubbleStylePresets,
                overlayStylePresets: current.overlayStylePresets,
                mosaicStylePresets: current.mosaicStylePresets,
                templates: current.templates,
                reusableAssets: current.reusableAssets,
              }),
            )
          }

          return nextState
        })
      })

      return withHistory(state, {
        pages: [...state.pages, image],
        activePageId: image.id,
        loadError: null,
        selectedLayerId: null,
        imageTransform: { ...INITIAL_IMAGE_TRANSFORM },
      })
    }),
  loadImageFiles: (files) =>
    set((state) => {
      const supportedFiles: File[] = []
      let lastError: string | null = null

      for (const file of files) {
        const error = getSupportedFileError(file)
        if (error) {
          lastError = error
          continue
        }
        supportedFiles.push(file)
      }

      if (supportedFiles.length === 0) {
        return {
          pages: state.pages,
          activePageId: state.activePageId,
          loadError: lastError,
          selectedLayerId: null,
          imageTransform: state.activePageId ? state.imageTransform : null,
        }
      }

      const images = supportedFiles.map(createImageFromFile)
      const activeImage = images[images.length - 1]

      supportedFiles.forEach((file, index) => {
        const image = images[index]
        if (!image) {
          return
        }

        void readFileAsDataUrl(file).then((dataUrl) => {
          if (!dataUrl) {
            return
          }

          set((current) => {
            if (!current.pages.some((page) => page.id === image.id)) {
              return current
            }

            const pages = current.pages.map((page) =>
              page.id === image.id
                ? {
                    ...page,
                    sourceUrl: dataUrl,
                  }
                : page,
            )

            if (canUseStorage() && window.localStorage.getItem(PROJECT_STORAGE_KEY)) {
              writeProjectToStorage(
                serializeProject({
                  pages,
                  activePageId: current.activePageId,
                  selectedLayerId: current.selectedLayerId,
                  imageTransform: current.imageTransform,
                  outputSettings: current.outputSettings,
                  lastSavedAt: current.lastSavedAt,
                  projectId: current.projectId,
                  projectName: current.projectName,
                  messageWindowPresets: current.messageWindowPresets,
                  textStylePresets: current.textStylePresets,
                  watermarkStylePresets: current.watermarkStylePresets,
                  bubbleStylePresets: current.bubbleStylePresets,
                  overlayStylePresets: current.overlayStylePresets,
                  mosaicStylePresets: current.mosaicStylePresets,
                  templates: current.templates,
                  reusableAssets: current.reusableAssets,
                }),
              )
            }

            return {
              ...current,
              pages,
            }
          })
        })
      })

      return withHistory(state, {
        pages: [...state.pages, ...images],
        activePageId: activeImage.id,
        loadError: lastError,
        selectedLayerId: null,
        imageTransform: { ...INITIAL_IMAGE_TRANSFORM },
      })
    }),
  duplicateActivePage: () =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const duplicatedPage: CanvasImage = {
        ...page,
        id: createPageId(),
        name: page.name.replace(/(\.[^.]+)$/, '-copy$1'),
        variantLabel: 'Copy',
        variantSourcePageId: page.variantSourcePageId ?? page.id,
        textLayers: page.textLayers.map(cloneTextLayer),
        messageWindowLayers: page.messageWindowLayers.map(cloneMessageWindowLayer),
        bubbleLayers: page.bubbleLayers.map(cloneBubbleLayer),
        mosaicLayers: page.mosaicLayers.map(cloneMosaicLayer),
        overlayLayers: page.overlayLayers.map(cloneOverlayLayer),
        watermarkLayers: page.watermarkLayers.map(cloneWatermarkLayer),
      }

      return withHistory(state, {
        pages: [...state.pages, duplicatedPage],
        activePageId: duplicatedPage.id,
        selectedLayerId: null,
        selectedLayerIds: [],
        imageTransform: state.imageTransform ? { ...state.imageTransform } : { ...INITIAL_IMAGE_TRANSFORM },
        loadError: null,
      })
    }),
  duplicateActivePageWithTextSwap: (text) =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const duplicatedPage: CanvasImage = {
        ...page,
        id: createPageId(),
        name: page.name.replace(/(\.[^.]+)$/, '-copy$1'),
        variantLabel: text,
        variantSourcePageId: page.variantSourcePageId ?? page.id,
        textLayers: page.textLayers.map((layer, index) => ({
          ...cloneTextLayer(layer),
          text: index === 0 ? text : layer.text,
        })),
        messageWindowLayers: page.messageWindowLayers.map(cloneMessageWindowLayer),
        bubbleLayers: page.bubbleLayers.map(cloneBubbleLayer),
        mosaicLayers: page.mosaicLayers.map(cloneMosaicLayer),
        overlayLayers: page.overlayLayers.map(cloneOverlayLayer),
        watermarkLayers: page.watermarkLayers.map(cloneWatermarkLayer),
      }

      return withHistory(state, {
        pages: [...state.pages, duplicatedPage],
        activePageId: duplicatedPage.id,
        selectedLayerId: duplicatedPage.textLayers[0]?.id ?? null,
        selectedLayerIds: duplicatedPage.textLayers[0]?.id ? [duplicatedPage.textLayers[0].id] : [],
        imageTransform: state.imageTransform ? { ...state.imageTransform } : { ...INITIAL_IMAGE_TRANSFORM },
        loadError: null,
      })
    }),
  duplicateActivePageWithTextVariants: (texts) =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const normalizedTexts = texts.map((text) => text.trim()).filter(Boolean)
      if (normalizedTexts.length === 0) {
        return state
      }

      const duplicatedPages: CanvasImage[] = normalizedTexts.map((text, pageIndex) => ({
        ...page,
        id: createPageId(),
        name: page.name.replace(/(\.[^.]+)$/, `-variant-${pageIndex + 1}$1`),
        variantLabel: text,
        variantSourcePageId: page.variantSourcePageId ?? page.id,
        textLayers: page.textLayers.map((layer, index) => ({
          ...cloneTextLayer(layer),
          text: index === 0 ? text : layer.text,
        })),
        messageWindowLayers: page.messageWindowLayers.map(cloneMessageWindowLayer),
        bubbleLayers: page.bubbleLayers.map(cloneBubbleLayer),
        mosaicLayers: page.mosaicLayers.map(cloneMosaicLayer),
        overlayLayers: page.overlayLayers.map(cloneOverlayLayer),
        watermarkLayers: page.watermarkLayers.map(cloneWatermarkLayer),
      }))

      const activeDuplicatedPage = duplicatedPages[duplicatedPages.length - 1]
      return withHistory(state, {
        pages: [...state.pages, ...duplicatedPages],
        activePageId: activeDuplicatedPage?.id ?? state.activePageId,
        selectedLayerId: activeDuplicatedPage?.textLayers[0]?.id ?? null,
        selectedLayerIds: activeDuplicatedPage?.textLayers[0]?.id ? [activeDuplicatedPage.textLayers[0].id] : [],
        imageTransform: state.imageTransform ? { ...state.imageTransform } : { ...INITIAL_IMAGE_TRANSFORM },
        loadError: null,
      })
    }),
  setActivePageVariantLabel: (label) =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const hasLabel = label.trim().length > 0
      const pages = state.pages.map((entry) =>
        entry.id === page.id
          ? {
              ...entry,
              variantLabel: hasLabel ? label : null,
            }
          : entry,
      )

      return withHistory(state, {
        pages,
        loadError: null,
      })
    }),
  saveCurrentPageAsTemplate: () =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const template: PageTemplate = {
        id: createTemplateId(),
        label: `${page.name} layout`,
        textLayers: page.textLayers.map((layer) => ({ ...layer })),
        messageWindowLayers: page.messageWindowLayers.map((layer) => ({ ...layer })),
        bubbleLayers: page.bubbleLayers.map((layer) => ({ ...layer })),
        mosaicLayers: page.mosaicLayers.map((layer) => ({ ...layer })),
        overlayLayers: page.overlayLayers.map((layer) => ({ ...layer })),
        watermarkLayers: page.watermarkLayers.map((layer) => ({ ...layer })),
      }

      return {
        templates: [template, ...state.templates.filter((entry) => entry.label !== template.label)].slice(0, 12),
      }
    }),
  renameTemplate: (templateId, name) =>
    set((state) => ({
      templates: state.templates.map((template) =>
        template.id === templateId ? { ...template, label: name } : template,
      ),
    })),
  duplicateTemplate: (templateId) =>
    set((state) => {
      const template = state.templates.find((entry) => entry.id === templateId)
      if (!template) {
        return state
      }

      const duplicatedTemplate: PageTemplate = {
        ...cloneTemplate(template),
        id: createTemplateId(),
        label: `${template.label} copy`,
      }

      return {
        templates: [duplicatedTemplate, ...state.templates].slice(0, 12),
      }
    }),
  deleteTemplate: (templateId) =>
    set((state) => ({
      templates: state.templates.filter((template) => template.id !== templateId),
    })),
  applyTemplateToActivePage: (templateId) =>
    set((state) => {
      const page = selectActiveImage(state)
      const template = state.templates.find((entry) => entry.id === templateId)
      if (!page || !template || !state.activePageId) {
        return state
      }

      const textLayers = template.textLayers.map(cloneTextLayer)
      const messageWindowLayers = template.messageWindowLayers.map(cloneMessageWindowLayer)
      const bubbleLayers = template.bubbleLayers.map(cloneBubbleLayer)
      const mosaicLayers = template.mosaicLayers.map(cloneMosaicLayer)
      const overlayLayers = template.overlayLayers.map(cloneOverlayLayer)
      const watermarkLayers = template.watermarkLayers.map(cloneWatermarkLayer)
      const nextSelectedLayerId =
        messageWindowLayers[0]?.id ??
        textLayers[0]?.id ??
        bubbleLayers[0]?.id ??
        mosaicLayers[0]?.id ??
        overlayLayers[0]?.id ??
        watermarkLayers[0]?.id ??
        null

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          textLayers,
          messageWindowLayers,
          bubbleLayers,
          mosaicLayers,
          overlayLayers,
          watermarkLayers,
        })),
        selectedLayerId: nextSelectedLayerId,
        selectedLayerIds: nextSelectedLayerId ? [nextSelectedLayerId] : [],
        loadError: null,
      })
    }),
  applyTemplateToAllPages: (templateId) =>
    set((state) => {
      const template = state.templates.find((entry) => entry.id === templateId)
      if (!template || state.pages.length === 0) {
        return state
      }

      return withHistory(state, {
        pages: state.pages.map((page) => ({
          ...page,
          textLayers: template.textLayers.map(cloneTextLayer),
          messageWindowLayers: template.messageWindowLayers.map(cloneMessageWindowLayer),
          bubbleLayers: template.bubbleLayers.map(cloneBubbleLayer),
          mosaicLayers: template.mosaicLayers.map(cloneMosaicLayer),
          overlayLayers: template.overlayLayers.map(cloneOverlayLayer),
          watermarkLayers: template.watermarkLayers.map(cloneWatermarkLayer),
        })),
        selectedLayerId: null,
        selectedLayerIds: [],
        loadError: null,
      })
    }),
  applyTemplatePreservingText: (templateId) =>
    set((state) => {
      const page = selectActiveImage(state)
      const template = state.templates.find((entry) => entry.id === templateId)
      if (!page || !template || !state.activePageId) {
        return state
      }

      // Apply template layers but carry over existing text content (by index)
      const textLayers = template.textLayers.map((tLayer, i) => ({
        ...cloneTextLayer(tLayer),
        text: page.textLayers[i]?.text ?? tLayer.text,
      }))
      const messageWindowLayers = template.messageWindowLayers.map((tLayer, i) => ({
        ...cloneMessageWindowLayer(tLayer),
        speaker: page.messageWindowLayers[i]?.speaker ?? tLayer.speaker,
        body: page.messageWindowLayers[i]?.body ?? tLayer.body,
      }))
      const bubbleLayers = template.bubbleLayers.map((tLayer, i) => ({
        ...cloneBubbleLayer(tLayer),
        text: page.bubbleLayers[i]?.text ?? tLayer.text,
      }))
      const mosaicLayers = template.mosaicLayers.map(cloneMosaicLayer)
      const overlayLayers = template.overlayLayers.map(cloneOverlayLayer)
      const watermarkLayers = template.watermarkLayers.map(cloneWatermarkLayer)
      const nextSelectedLayerId =
        messageWindowLayers[0]?.id ??
        textLayers[0]?.id ??
        bubbleLayers[0]?.id ??
        mosaicLayers[0]?.id ??
        overlayLayers[0]?.id ??
        watermarkLayers[0]?.id ??
        null

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          textLayers,
          messageWindowLayers,
          bubbleLayers,
          mosaicLayers,
          overlayLayers,
          watermarkLayers,
        })),
        selectedLayerId: nextSelectedLayerId,
        selectedLayerIds: nextSelectedLayerId ? [nextSelectedLayerId] : [],
        loadError: null,
      })
    }),
  saveCurrentPageAsReusableAsset: () =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const asset: ReusablePageAsset = {
        id: createReusableAssetId(),
        label: `${page.name} asset`,
        assetName: page.name.replace(/(\.[^.]+)$/, '-layout.png'),
        summary: createReusableAssetSummary(page),
      }

      return {
        reusableAssets: [asset, ...state.reusableAssets.filter((entry) => entry.label !== asset.label)].slice(0, 12),
      }
    }),
  renameReusableAsset: (assetId, name) =>
    set((state) => ({
      reusableAssets: state.reusableAssets.map((asset) =>
        asset.id === assetId
          ? {
              ...asset,
              label: name,
            }
          : asset,
      ),
    })),
  duplicateReusableAsset: (assetId) =>
    set((state) => {
      const asset = state.reusableAssets.find((entry) => entry.id === assetId)
      if (!asset) {
        return state
      }

      const duplicatedAsset: ReusablePageAsset = {
        ...cloneReusableAsset(asset),
        id: createReusableAssetId(),
        label: `${asset.label} copy`,
      }

      return {
        reusableAssets: [duplicatedAsset, ...state.reusableAssets].slice(0, 12),
      }
    }),
  deleteReusableAsset: (assetId) =>
    set((state) => ({
      reusableAssets: state.reusableAssets.filter((asset) => asset.id !== assetId),
    })),
  applyReusableAssetToActivePage: (assetId) =>
    set((state) => {
      const page = selectActiveImage(state)
      const asset = state.reusableAssets.find((entry) => entry.id === assetId)
      if (!page || !asset || !state.activePageId) {
        return state
      }

      const watermarkLayer: CanvasWatermarkLayer = {
        id: createWatermarkLayerId(),
        name: asset.label,
        groupId: null,
        text: asset.assetName,
        opacity: 0.35,
        color: '#fff4d6',
        repeated: false,
        angle: -12,
        density: 1,
        preset: 'custom',
        mode: 'image',
        assetName: asset.assetName,
        x: 960,
        y: 540,
        scale: 1,
        tiled: false,
        visible: true,
        locked: false,
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          watermarkLayers: [...entry.watermarkLayers, watermarkLayer],
        })),
        selectedLayerId: watermarkLayer.id,
        selectedLayerIds: [watermarkLayer.id],
        loadError: null,
      })
    }),
  addWatermarkLayer: () =>
    set((state) => {
      if (!state.activePageId) {
        return state
      }

      const watermarkLayer = createWatermarkLayer()

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          watermarkLayers: [...page.watermarkLayers, watermarkLayer],
        })),
        selectedLayerId: watermarkLayer.id,
        selectedLayerIds: [watermarkLayer.id],
        loadError: null,
      })
    }),
  loadWatermarkImageFile: (file) =>
    set((state) => {
      if (!state.activePageId) {
        return state
      }

      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension !== 'png') {
        return {
          loadError: `Unsupported watermark asset: ${file.name}`,
        }
      }

      const watermarkLayer: CanvasWatermarkLayer = {
        ...createWatermarkLayer(),
        text: file.name,
        mode: 'image',
        assetName: file.name,
        repeated: false,
        opacity: 0.7,
        angle: 0,
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          watermarkLayers: [...page.watermarkLayers, watermarkLayer],
        })),
        selectedLayerId: watermarkLayer.id,
        selectedLayerIds: [watermarkLayer.id],
        loadError: null,
      })
    }),
  selectWatermarkLayer: (layerId, additive) =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page || !page.watermarkLayers.some((layer) => layer.id === layerId)) {
        return state
      }

      const nextSelection = toggleLayerSelectionState(state, layerId, additive)

      return {
        selectedLayerId: nextSelection.selectedLayerId,
        selectedLayerIds: nextSelection.selectedLayerIds,
        loadError: null,
      }
    }),
  updateSelectedWatermarkText: (text) =>
    set((state) => {
      const activeWatermarkLayer = selectActiveWatermarkLayer(state)
      if (!activeWatermarkLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          watermarkLayers: page.watermarkLayers.map((layer) =>
            layer.id === activeWatermarkLayer.id ? { ...layer, text } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  changeSelectedWatermarkOpacity: (delta) =>
    set((state) => {
      const activeWatermarkLayer = selectActiveWatermarkLayer(state)
      if (!activeWatermarkLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          watermarkLayers: page.watermarkLayers.map((layer) =>
            layer.id === activeWatermarkLayer.id
              ? { ...layer, opacity: Math.max(0.1, Math.min(0.9, Number((layer.opacity + delta).toFixed(1)))) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  toggleSelectedWatermarkPattern: () =>
    set((state) => {
      const activeWatermarkLayer = selectActiveWatermarkLayer(state)
      if (!activeWatermarkLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          watermarkLayers: page.watermarkLayers.map((layer) =>
            layer.id === activeWatermarkLayer.id ? { ...layer, repeated: !layer.repeated } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedWatermarkPreset: (preset) =>
    set((state) => {
      const activeWatermarkLayer = selectActiveWatermarkLayer(state)
      if (!activeWatermarkLayer || !state.activePageId) {
        return state
      }

      const presetConfig =
        preset === 'patreon'
          ? { text: 'Continue on Patreon', repeated: true, color: '#ffe1a8' }
          : { text: 'Join the Discord bonus', repeated: true, color: '#d8e4ff' }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          watermarkLayers: page.watermarkLayers.map((layer) =>
            layer.id === activeWatermarkLayer.id
              ? {
                  ...layer,
                  ...presetConfig,
                  preset,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  changeSelectedWatermarkAngle: (delta) =>
    set((state) => {
      const activeWatermarkLayer = selectActiveWatermarkLayer(state)
      if (!activeWatermarkLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          watermarkLayers: page.watermarkLayers.map((layer) =>
            layer.id === activeWatermarkLayer.id
              ? { ...layer, angle: Math.max(-45, Math.min(45, layer.angle + delta)) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  changeSelectedWatermarkDensity: (delta) =>
    set((state) => {
      const activeWatermarkLayer = selectActiveWatermarkLayer(state)
      if (!activeWatermarkLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          watermarkLayers: page.watermarkLayers.map((layer) =>
            layer.id === activeWatermarkLayer.id
              ? { ...layer, density: Math.max(1, Math.min(4, layer.density + delta)) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  moveSelectedWatermarkLayer: (dx, dy) =>
    set((state) => {
      const activeWatermarkLayer = selectActiveWatermarkLayer(state)
      if (!activeWatermarkLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          watermarkLayers: page.watermarkLayers.map((layer) =>
            layer.id === activeWatermarkLayer.id
              ? { ...layer, x: layer.x + dx, y: layer.y + dy }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  changeSelectedWatermarkScale: (delta) =>
    set((state) => {
      const activeWatermarkLayer = selectActiveWatermarkLayer(state)
      if (!activeWatermarkLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          watermarkLayers: page.watermarkLayers.map((layer) =>
            layer.id === activeWatermarkLayer.id
              ? { ...layer, scale: Math.max(0.4, Math.min(3, Number((layer.scale + delta).toFixed(1)))) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  toggleSelectedWatermarkTileLayout: () =>
    set((state) => {
      const activeWatermarkLayer = selectActiveWatermarkLayer(state)
      if (!activeWatermarkLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          watermarkLayers: page.watermarkLayers.map((layer) =>
            layer.id === activeWatermarkLayer.id ? { ...layer, tiled: !layer.tiled } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  saveSelectedWatermarkStylePreset: () =>
    set((state) => {
      const activeWatermarkLayer = selectActiveWatermarkLayer(state)
      if (!activeWatermarkLayer) {
        return state
      }

      const preset: WatermarkStylePreset = {
        id: createWatermarkPresetId(),
        label: activeWatermarkLayer.name?.trim() || activeWatermarkLayer.assetName || activeWatermarkLayer.text || 'Watermark preset',
        text: activeWatermarkLayer.text,
        opacity: activeWatermarkLayer.opacity,
        color: activeWatermarkLayer.color,
        repeated: activeWatermarkLayer.repeated,
        angle: activeWatermarkLayer.angle,
        density: activeWatermarkLayer.density,
        preset: activeWatermarkLayer.preset,
        mode: activeWatermarkLayer.mode,
        assetName: activeWatermarkLayer.assetName,
        scale: activeWatermarkLayer.scale,
        tiled: activeWatermarkLayer.tiled,
      }

      return {
        watermarkStylePresets: [preset, ...state.watermarkStylePresets.filter((entry) => entry.label !== preset.label)].slice(0, 12),
      }
    }),
  applyWatermarkStylePreset: (presetId) =>
    set((state) => {
      const activeWatermarkLayer = selectActiveWatermarkLayer(state)
      const preset = state.watermarkStylePresets.find((entry) => entry.id === presetId)
      if (!activeWatermarkLayer || !preset || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          watermarkLayers: page.watermarkLayers.map((layer) =>
            layer.id === activeWatermarkLayer.id
              ? {
                  ...layer,
                  text: preset.text,
                  opacity: preset.opacity,
                  color: preset.color,
                  repeated: preset.repeated,
                  angle: preset.angle,
                  density: preset.density,
                  preset: preset.preset,
                  mode: preset.mode,
                  assetName: preset.assetName,
                  scale: preset.scale,
                  tiled: preset.tiled,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  renameWatermarkStylePreset: (presetId, name) =>
    set((state) => ({
      watermarkStylePresets: state.watermarkStylePresets.map((preset) =>
        preset.id === presetId ? { ...preset, label: name } : preset,
      ),
    })),
  duplicateWatermarkStylePreset: (presetId) =>
    set((state) => {
      const preset = state.watermarkStylePresets.find((entry) => entry.id === presetId)
      if (!preset) {
        return state
      }

      const duplicatedPreset: WatermarkStylePreset = {
        ...preset,
        id: createWatermarkPresetId(),
        label: `${preset.label} copy`,
      }

      return {
        watermarkStylePresets: [duplicatedPreset, ...state.watermarkStylePresets].slice(0, 12),
      }
    }),
  deleteWatermarkStylePreset: (presetId) =>
    set((state) => ({
      watermarkStylePresets: state.watermarkStylePresets.filter((preset) => preset.id !== presetId),
    })),
  addTextLayer: () =>
    set((state) => {
      if (!state.activePageId) {
        return state
      }

      const textLayer = createTextLayer()

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: [...page.textLayers, textLayer],
        })),
        selectedLayerId: textLayer.id,
        selectedLayerIds: [textLayer.id],
        loadError: null,
      })
    }),
  selectTextLayer: (layerId, additive = false) =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page || !page.textLayers.some((layer) => layer.id === layerId)) {
        return state
      }

      if (additive) {
        return {
          ...toggleLayerSelectionState(state, layerId, true),
          loadError: null,
        }
      }

      return {
        selectedLayerId: layerId,
        selectedLayerIds: [layerId],
        loadError: null,
      }
    }),
  updateSelectedTextLayerText: (text) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id ? { ...layer, text } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  moveSelectedTextLayer: (dx, dy) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id
              ? { ...layer, x: layer.x + dx, y: layer.y + dy }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  changeSelectedTextLayerFontSize: (delta) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id
              ? { ...layer, fontSize: Math.max(12, layer.fontSize + delta) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedTextLayerColor: (color) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id
              ? { ...layer, color: sanitizeTextColor(color) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  changeSelectedTextLayerLineHeight: (delta) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id
              ? { ...layer, lineHeight: Math.max(0.8, Math.min(2.4, Number((layer.lineHeight + delta).toFixed(1)))) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  changeSelectedTextLayerLetterSpacing: (delta) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id
              ? { ...layer, letterSpacing: Math.max(0, Math.min(16, layer.letterSpacing + delta)) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  changeSelectedTextLayerMaxWidth: (delta) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id
              ? { ...layer, maxWidth: Math.max(120, Math.min(960, layer.maxWidth + delta)) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  toggleSelectedTextLayerFillMode: () =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id
              ? { ...layer, fillMode: layer.fillMode === 'solid' ? 'gradient' : 'solid' }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedTextLayerGradientFrom: (color) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id ? { ...layer, gradientFrom: sanitizeTextColor(color) } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedTextLayerGradientTo: (color) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id ? { ...layer, gradientTo: sanitizeTextColor(color) } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  deleteSelectedTextLayer: () =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.filter((layer) => layer.id !== activeTextLayer.id),
        })),
        selectedLayerId: null,
        loadError: null,
      })
    }),
  moveSelectedTextLayerBackward: () =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      const page = selectActiveImage(state)
      if (!activeTextLayer || !page || !state.activePageId) {
        return state
      }

      const index = page.textLayers.findIndex((layer) => layer.id === activeTextLayer.id)
      if (index <= 0) {
        return state
      }

      const nextLayers = [...page.textLayers]
      ;[nextLayers[index - 1], nextLayers[index]] = [nextLayers[index], nextLayers[index - 1]]

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          textLayers: nextLayers,
        })),
        loadError: null,
      })
    }),
  moveSelectedTextLayerForward: () =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      const page = selectActiveImage(state)
      if (!activeTextLayer || !page || !state.activePageId) {
        return state
      }

      const index = page.textLayers.findIndex((layer) => layer.id === activeTextLayer.id)
      if (index === -1 || index >= page.textLayers.length - 1) {
        return state
      }

      const nextLayers = [...page.textLayers]
      ;[nextLayers[index], nextLayers[index + 1]] = [nextLayers[index + 1], nextLayers[index]]

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          textLayers: nextLayers,
        })),
        loadError: null,
      })
    }),
  toggleSelectedTextLayerVertical: () =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id ? { ...layer, isVertical: !layer.isVertical } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  changeSelectedTextLayerOutlineWidth: (delta) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id
              ? { ...layer, strokeWidth: Math.max(0, Math.min(12, layer.strokeWidth + delta)) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  toggleSelectedTextLayerShadow: () =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id
              ? { ...layer, shadowEnabled: !layer.shadowEnabled }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedTextLayerRuby: (ruby) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }
      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id ? { ...layer, ruby } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedTextLayerFontFamily: (fontFamily) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) {
        return state
      }
      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id ? { ...layer, fontFamily } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedTextLayerRotation: (rotation) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) return state
      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id
              ? { ...layer, rotation: ((rotation % 360) + 360) % 360 }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  changeSelectedTextLayerRotation: (delta) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer || !state.activePageId || activeTextLayer.locked) return state
      const nextRotation = (((activeTextLayer.rotation ?? 0) + delta) % 360 + 360) % 360
      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id ? { ...layer, rotation: nextRotation } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  saveSelectedTextStylePreset: () =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      if (!activeTextLayer) {
        return state
      }

      const preset: TextStylePreset = {
        id: createTextPresetId(),
        label: activeTextLayer.name?.trim() || activeTextLayer.text || 'Text preset',
        text: activeTextLayer.text,
        fontSize: activeTextLayer.fontSize,
        color: activeTextLayer.color,
        lineHeight: activeTextLayer.lineHeight,
        letterSpacing: activeTextLayer.letterSpacing,
        maxWidth: activeTextLayer.maxWidth,
        fillMode: activeTextLayer.fillMode,
        gradientFrom: activeTextLayer.gradientFrom,
        gradientTo: activeTextLayer.gradientTo,
        isVertical: activeTextLayer.isVertical,
        strokeWidth: activeTextLayer.strokeWidth,
        strokeColor: activeTextLayer.strokeColor,
        shadowEnabled: activeTextLayer.shadowEnabled,
      }

      return {
        textStylePresets: [preset, ...state.textStylePresets.filter((entry) => entry.label !== preset.label)].slice(0, 12),
      }
    }),
  applyTextStylePreset: (presetId) =>
    set((state) => {
      const activeTextLayer = selectActiveTextLayer(state)
      const preset = state.textStylePresets.find((entry) => entry.id === presetId)
      if (!activeTextLayer || !preset || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === activeTextLayer.id
              ? {
                  ...layer,
                  text: preset.text,
                  fontSize: preset.fontSize,
                  color: preset.color,
                  lineHeight: preset.lineHeight,
                  letterSpacing: preset.letterSpacing,
                  maxWidth: preset.maxWidth,
                  fillMode: preset.fillMode,
                  gradientFrom: preset.gradientFrom,
                  gradientTo: preset.gradientTo,
                  isVertical: preset.isVertical,
                  strokeWidth: preset.strokeWidth,
                  strokeColor: preset.strokeColor,
                  shadowEnabled: preset.shadowEnabled,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  renameTextStylePreset: (presetId, name) =>
    set((state) => ({
      textStylePresets: state.textStylePresets.map((preset) =>
        preset.id === presetId ? { ...preset, label: name } : preset,
      ),
    })),
  duplicateTextStylePreset: (presetId) =>
    set((state) => {
      const preset = state.textStylePresets.find((entry) => entry.id === presetId)
      if (!preset) {
        return state
      }

      const duplicatedPreset: TextStylePreset = {
        ...preset,
        id: createTextPresetId(),
        label: `${preset.label} copy`,
      }

      return {
        textStylePresets: [duplicatedPreset, ...state.textStylePresets].slice(0, 12),
      }
    }),
  deleteTextStylePreset: (presetId) =>
    set((state) => ({
      textStylePresets: state.textStylePresets.filter((preset) => preset.id !== presetId),
    })),
  addMessageWindowLayer: () =>
    set((state) => {
      if (!state.activePageId) {
        return state
      }

      const messageWindowLayer = createMessageWindowLayer()

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          messageWindowLayers: [...page.messageWindowLayers, messageWindowLayer],
        })),
        selectedLayerId: messageWindowLayer.id,
        selectedLayerIds: [messageWindowLayer.id],
        loadError: null,
      })
    }),
  selectMessageWindowLayer: (layerId, additive) =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page || !page.messageWindowLayers.some((layer) => layer.id === layerId)) {
        return state
      }

      const nextSelection = toggleLayerSelectionState(state, layerId, additive)

      return {
        selectedLayerId: nextSelection.selectedLayerId,
        selectedLayerIds: nextSelection.selectedLayerIds,
        loadError: null,
      }
    }),
  updateSelectedMessageWindowSpeaker: (speaker) =>
    set((state) => {
      const activeMessageWindowLayer = selectActiveMessageWindowLayer(state)
      if (!activeMessageWindowLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          messageWindowLayers: page.messageWindowLayers.map((layer) =>
            layer.id === activeMessageWindowLayer.id ? { ...layer, speaker } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  updateSelectedMessageWindowBody: (body) =>
    set((state) => {
      const activeMessageWindowLayer = selectActiveMessageWindowLayer(state)
      if (!activeMessageWindowLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          messageWindowLayers: page.messageWindowLayers.map((layer) =>
            layer.id === activeMessageWindowLayer.id ? { ...layer, body } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  moveSelectedMessageWindowLayer: (dx, dy) =>
    set((state) => {
      const activeMessageWindowLayer = selectActiveMessageWindowLayer(state)
      if (!activeMessageWindowLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          messageWindowLayers: page.messageWindowLayers.map((layer) =>
            layer.id === activeMessageWindowLayer.id
              ? { ...layer, x: layer.x + dx, y: layer.y + dy }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  resizeSelectedMessageWindowLayer: (widthDelta, heightDelta) =>
    set((state) => {
      const activeMessageWindowLayer = selectActiveMessageWindowLayer(state)
      if (!activeMessageWindowLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          messageWindowLayers: page.messageWindowLayers.map((layer) =>
            layer.id === activeMessageWindowLayer.id
              ? {
                  ...layer,
                  width: Math.max(360, layer.width + widthDelta),
                  height: Math.max(160, layer.height + heightDelta),
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  cycleSelectedMessageWindowFrameStyle: () =>
    set((state) => {
      const activeMessageWindowLayer = selectActiveMessageWindowLayer(state)
      if (!activeMessageWindowLayer || !state.activePageId) {
        return state
      }

      const nextFrameStyle =
        activeMessageWindowLayer.frameStyle === 'classic'
          ? 'soft'
          : activeMessageWindowLayer.frameStyle === 'soft'
            ? 'neon'
            : 'classic'

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          messageWindowLayers: page.messageWindowLayers.map((layer) =>
            layer.id === activeMessageWindowLayer.id
              ? {
                  ...layer,
                  frameStyle: nextFrameStyle,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  loadSelectedMessageWindowAsset: (file) =>
    set((state) => {
      const activeMessageWindowLayer = selectActiveMessageWindowLayer(state)
      if (!activeMessageWindowLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          messageWindowLayers: page.messageWindowLayers.map((layer) =>
            layer.id === activeMessageWindowLayer.id
              ? {
                  ...layer,
                  assetName: file.name,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  saveSelectedMessageWindowPreset: () =>
    set((state) => {
      const activeMessageWindowLayer = selectActiveMessageWindowLayer(state)
      if (!activeMessageWindowLayer) {
        return state
      }

      const preset: MessageWindowPreset = {
        id: createMessagePresetId(),
        label: activeMessageWindowLayer.speaker || 'Message preset',
        speaker: activeMessageWindowLayer.speaker,
        body: activeMessageWindowLayer.body,
        width: activeMessageWindowLayer.width,
        height: activeMessageWindowLayer.height,
        opacity: activeMessageWindowLayer.opacity,
        frameStyle: activeMessageWindowLayer.frameStyle,
        assetName: activeMessageWindowLayer.assetName,
      }

      return {
        messageWindowPresets: [preset, ...state.messageWindowPresets.filter((entry) => entry.label !== preset.label)].slice(0, 8),
      }
    }),
  applyMessageWindowPreset: (presetId) =>
    set((state) => {
      const activeMessageWindowLayer = selectActiveMessageWindowLayer(state)
      const preset = state.messageWindowPresets.find((entry) => entry.id === presetId)
      if (!activeMessageWindowLayer || !preset || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          messageWindowLayers: page.messageWindowLayers.map((layer) =>
            layer.id === activeMessageWindowLayer.id
              ? {
                  ...layer,
                  speaker: preset.speaker,
                  body: preset.body,
                  width: preset.width,
                  height: preset.height,
                  opacity: preset.opacity,
                  frameStyle: preset.frameStyle,
                  assetName: preset.assetName,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  renameMessageWindowPreset: (presetId, name) =>
    set((state) => ({
      messageWindowPresets: state.messageWindowPresets.map((preset) =>
        preset.id === presetId ? { ...preset, label: name } : preset,
      ),
    })),
  duplicateMessageWindowPreset: (presetId) =>
    set((state) => {
      const preset = state.messageWindowPresets.find((entry) => entry.id === presetId)
      if (!preset) {
        return state
      }

      const duplicatedPreset: MessageWindowPreset = {
        ...preset,
        id: createMessagePresetId(),
        label: `${preset.label} copy`,
      }

      return {
        messageWindowPresets: [duplicatedPreset, ...state.messageWindowPresets].slice(0, 8),
      }
    }),
  deleteMessageWindowPreset: (presetId) =>
    set((state) => ({
      messageWindowPresets: state.messageWindowPresets.filter((preset) => preset.id !== presetId),
    })),
  addBubbleLayer: () =>
    set((state) => {
      if (!state.activePageId) {
        return state
      }

      const bubbleLayer = createBubbleLayer()

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          bubbleLayers: [...page.bubbleLayers, bubbleLayer],
        })),
        selectedLayerId: bubbleLayer.id,
        selectedLayerIds: [bubbleLayer.id],
        loadError: null,
      })
    }),
  selectBubbleLayer: (layerId, additive = false) =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page || !page.bubbleLayers.some((layer) => layer.id === layerId)) {
        return state
      }

      if (additive) {
        return {
          ...toggleLayerSelectionState(state, layerId, true),
          loadError: null,
        }
      }

      return {
        selectedLayerId: layerId,
        selectedLayerIds: [layerId],
        loadError: null,
      }
    }),
  updateSelectedBubbleLayerText: (text) =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      if (!activeBubbleLayer || !state.activePageId || activeBubbleLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          bubbleLayers: page.bubbleLayers.map((layer) =>
            layer.id === activeBubbleLayer.id ? { ...layer, text } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  moveSelectedBubbleLayer: (dx, dy) =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      if (!activeBubbleLayer || !state.activePageId || activeBubbleLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          bubbleLayers: page.bubbleLayers.map((layer) =>
            layer.id === activeBubbleLayer.id
              ? { ...layer, x: layer.x + dx, y: layer.y + dy }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  deleteSelectedBubbleLayer: () =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      if (!activeBubbleLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          bubbleLayers: page.bubbleLayers.filter((layer) => layer.id !== activeBubbleLayer.id),
        })),
        selectedLayerId: null,
        loadError: null,
      })
    }),
  resizeSelectedBubbleLayer: (widthDelta, heightDelta) =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      if (!activeBubbleLayer || !state.activePageId || activeBubbleLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          bubbleLayers: page.bubbleLayers.map((layer) =>
            layer.id === activeBubbleLayer.id
              ? {
                  ...layer,
                  width: Math.max(120, layer.width + widthDelta),
                  height: Math.max(72, layer.height + heightDelta),
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedBubbleTailDirection: (direction) =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      if (!activeBubbleLayer || !state.activePageId || activeBubbleLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          bubbleLayers: page.bubbleLayers.map((layer) =>
            layer.id === activeBubbleLayer.id ? { ...layer, tailDirection: direction } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedBubbleStylePreset: (preset) =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      if (!activeBubbleLayer || !state.activePageId || activeBubbleLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          bubbleLayers: page.bubbleLayers.map((layer) =>
            layer.id === activeBubbleLayer.id ? { ...layer, stylePreset: preset } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedBubbleShape: (shape) =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      if (!activeBubbleLayer || !state.activePageId || activeBubbleLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          bubbleLayers: page.bubbleLayers.map((layer) =>
            layer.id === activeBubbleLayer.id ? { ...layer, bubbleShape: shape } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  randomizeSelectedBubbleShape: () =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      if (!activeBubbleLayer || !state.activePageId || activeBubbleLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          bubbleLayers: page.bubbleLayers.map((layer) =>
            layer.id === activeBubbleLayer.id ? { ...layer, shapeSeed: (layer.shapeSeed ?? 0) + 1 } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  saveSelectedBubbleStylePreset: () =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      if (!activeBubbleLayer) {
        return state
      }

      const preset: BubbleStylePreset = {
        id: createBubblePresetId(),
        label: activeBubbleLayer.name?.trim() || activeBubbleLayer.text || 'Bubble preset',
        text: activeBubbleLayer.text,
        tailDirection: activeBubbleLayer.tailDirection,
        stylePreset: activeBubbleLayer.stylePreset,
        bubbleShape: activeBubbleLayer.bubbleShape ?? 'round',
        shapeSeed: activeBubbleLayer.shapeSeed ?? 0,
        fillColor: activeBubbleLayer.fillColor,
        borderColor: activeBubbleLayer.borderColor,
      }

      return {
        bubbleStylePresets: [preset, ...state.bubbleStylePresets.filter((entry) => entry.label !== preset.label)].slice(0, 12),
      }
    }),
  applyBubbleStylePreset: (presetId) =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      const preset = state.bubbleStylePresets.find((entry) => entry.id === presetId)
      if (!activeBubbleLayer || !preset || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          bubbleLayers: page.bubbleLayers.map((layer) =>
            layer.id === activeBubbleLayer.id
              ? {
                  ...layer,
                  text: preset.text,
                  tailDirection: preset.tailDirection,
                  stylePreset: preset.stylePreset,
                  bubbleShape: preset.bubbleShape,
                  shapeSeed: preset.shapeSeed,
                  fillColor: preset.fillColor,
                  borderColor: preset.borderColor,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  renameBubbleStylePreset: (presetId, name) =>
    set((state) => ({
      bubbleStylePresets: state.bubbleStylePresets.map((preset) =>
        preset.id === presetId ? { ...preset, label: name } : preset,
      ),
    })),
  duplicateBubbleStylePreset: (presetId) =>
    set((state) => {
      const preset = state.bubbleStylePresets.find((entry) => entry.id === presetId)
      if (!preset) {
        return state
      }

      const duplicatedPreset: BubbleStylePreset = {
        ...preset,
        id: createBubblePresetId(),
        label: `${preset.label} copy`,
      }

      return {
        bubbleStylePresets: [duplicatedPreset, ...state.bubbleStylePresets].slice(0, 12),
      }
    }),
  deleteBubbleStylePreset: (presetId) =>
    set((state) => ({
      bubbleStylePresets: state.bubbleStylePresets.filter((preset) => preset.id !== presetId),
    })),
  duplicateSelectedBubbleLayer: () =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      const page = selectActiveImage(state)
      if (!activeBubbleLayer || !page || !state.activePageId) {
        return state
      }

      const duplicatedLayer: CanvasBubbleLayer = {
        ...activeBubbleLayer,
        id: createBubbleLayerId(),
        text: `${activeBubbleLayer.text} copy`,
        x: activeBubbleLayer.x + 24,
        y: activeBubbleLayer.y + 24,
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          bubbleLayers: [...page.bubbleLayers, duplicatedLayer],
        })),
        selectedLayerId: duplicatedLayer.id,
        loadError: null,
      })
    }),
  moveSelectedBubbleLayerBackward: () =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      const page = selectActiveImage(state)
      if (!activeBubbleLayer || !page || !state.activePageId) {
        return state
      }

      const index = page.bubbleLayers.findIndex((layer) => layer.id === activeBubbleLayer.id)
      if (index <= 0) {
        return state
      }

      const nextLayers = [...page.bubbleLayers]
      ;[nextLayers[index - 1], nextLayers[index]] = [nextLayers[index], nextLayers[index - 1]]

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          bubbleLayers: nextLayers,
        })),
        loadError: null,
      })
    }),
  moveSelectedBubbleLayerForward: () =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      const page = selectActiveImage(state)
      if (!activeBubbleLayer || !page || !state.activePageId) {
        return state
      }

      const index = page.bubbleLayers.findIndex((layer) => layer.id === activeBubbleLayer.id)
      if (index === -1 || index >= page.bubbleLayers.length - 1) {
        return state
      }

      const nextLayers = [...page.bubbleLayers]
      ;[nextLayers[index], nextLayers[index + 1]] = [nextLayers[index + 1], nextLayers[index]]

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          bubbleLayers: nextLayers,
        })),
        loadError: null,
      })
    }),
  setSelectedBubbleFillColor: (color) =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      if (!activeBubbleLayer || !state.activePageId || activeBubbleLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          bubbleLayers: page.bubbleLayers.map((layer) =>
            layer.id === activeBubbleLayer.id ? { ...layer, fillColor: sanitizeTextColor(color) } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedBubbleBorderColor: (color) =>
    set((state) => {
      const activeBubbleLayer = selectActiveBubbleLayer(state)
      if (!activeBubbleLayer || !state.activePageId || activeBubbleLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          bubbleLayers: page.bubbleLayers.map((layer) =>
            layer.id === activeBubbleLayer.id ? { ...layer, borderColor: sanitizeTextColor(color) } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  addMosaicLayer: () =>
    set((state) => {
      if (!state.activePageId) {
        return state
      }

      const mosaicLayer = createMosaicLayer()
      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          mosaicLayers: [...page.mosaicLayers, mosaicLayer],
        })),
        selectedLayerId: mosaicLayer.id,
        selectedLayerIds: [mosaicLayer.id],
        loadError: null,
      })
    }),
  selectMosaicLayer: (layerId, additive = false) =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page || !page.mosaicLayers.some((layer) => layer.id === layerId)) {
        return state
      }

      if (additive) {
        return {
          ...toggleLayerSelectionState(state, layerId, true),
          loadError: null,
        }
      }

      return {
        selectedLayerId: layerId,
        selectedLayerIds: [layerId],
        loadError: null,
      }
    }),
  moveSelectedMosaicLayer: (dx, dy) =>
    set((state) => {
      const activeMosaicLayer = selectActiveMosaicLayer(state)
      if (!activeMosaicLayer || !state.activePageId || activeMosaicLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          mosaicLayers: page.mosaicLayers.map((layer) =>
            layer.id === activeMosaicLayer.id
              ? { ...layer, x: layer.x + dx, y: layer.y + dy }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  resizeSelectedMosaicLayer: (widthDelta, heightDelta) =>
    set((state) => {
      const activeMosaicLayer = selectActiveMosaicLayer(state)
      if (!activeMosaicLayer || !state.activePageId || activeMosaicLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          mosaicLayers: page.mosaicLayers.map((layer) =>
            layer.id === activeMosaicLayer.id
              ? {
                  ...layer,
                  width: Math.max(64, layer.width + widthDelta),
                  height: Math.max(64, layer.height + heightDelta),
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  changeSelectedMosaicIntensity: (delta) =>
    set((state) => {
      const activeMosaicLayer = selectActiveMosaicLayer(state)
      if (!activeMosaicLayer || !state.activePageId || activeMosaicLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          mosaicLayers: page.mosaicLayers.map((layer) =>
            layer.id === activeMosaicLayer.id
              ? { ...layer, intensity: Math.max(4, Math.min(64, layer.intensity + delta)) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedMosaicIntensity: (intensity) =>
    set((state) => {
      const activeMosaicLayer = selectActiveMosaicLayer(state)
      if (!activeMosaicLayer || !state.activePageId || activeMosaicLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          mosaicLayers: page.mosaicLayers.map((layer) =>
            layer.id === activeMosaicLayer.id
              ? { ...layer, intensity: Math.max(4, Math.min(48, Math.round(intensity))) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedMosaicStyle: (style) =>
    set((state) => {
      const activeMosaicLayer = selectActiveMosaicLayer(state)
      if (!activeMosaicLayer || !state.activePageId || activeMosaicLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          mosaicLayers: page.mosaicLayers.map((layer) =>
            layer.id === activeMosaicLayer.id ? { ...layer, style } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  cycleSelectedMosaicStyle: () =>
    set((state) => {
      const activeMosaicLayer = selectActiveMosaicLayer(state)
      if (!activeMosaicLayer || !state.activePageId || activeMosaicLayer.locked) {
        return state
      }

      const nextStyle =
        activeMosaicLayer.style === 'pixelate'
          ? 'blur'
          : activeMosaicLayer.style === 'blur'
            ? 'noise'
            : 'pixelate'

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          mosaicLayers: page.mosaicLayers.map((layer) =>
            layer.id === activeMosaicLayer.id ? { ...layer, style: nextStyle } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  saveSelectedMosaicStylePreset: () =>
    set((state) => {
      const activeMosaicLayer = selectActiveMosaicLayer(state)
      if (!activeMosaicLayer) {
        return state
      }

      const preset: MosaicStylePreset = {
        id: createMosaicPresetId(),
        label: activeMosaicLayer.name?.trim() || `${activeMosaicLayer.style} ${activeMosaicLayer.intensity}`,
        intensity: activeMosaicLayer.intensity,
        style: activeMosaicLayer.style,
        width: activeMosaicLayer.width,
        height: activeMosaicLayer.height,
      }

      return {
        mosaicStylePresets: [preset, ...state.mosaicStylePresets.filter((entry) => entry.label !== preset.label)].slice(0, 12),
      }
    }),
  applyMosaicStylePreset: (presetId) =>
    set((state) => {
      const activeMosaicLayer = selectActiveMosaicLayer(state)
      const preset = state.mosaicStylePresets.find((entry) => entry.id === presetId)
      if (!activeMosaicLayer || !preset || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          mosaicLayers: page.mosaicLayers.map((layer) =>
            layer.id === activeMosaicLayer.id
              ? {
                  ...layer,
                  intensity: preset.intensity,
                  style: preset.style,
                  width: preset.width,
                  height: preset.height,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  renameMosaicStylePreset: (presetId, name) =>
    set((state) => ({
      mosaicStylePresets: state.mosaicStylePresets.map((preset) =>
        preset.id === presetId ? { ...preset, label: name } : preset,
      ),
    })),
  duplicateMosaicStylePreset: (presetId) =>
    set((state) => {
      const preset = state.mosaicStylePresets.find((entry) => entry.id === presetId)
      if (!preset) {
        return state
      }

      const duplicatedPreset: MosaicStylePreset = {
        ...preset,
        id: createMosaicPresetId(),
        label: `${preset.label} copy`,
      }

      return {
        mosaicStylePresets: [duplicatedPreset, ...state.mosaicStylePresets].slice(0, 12),
      }
    }),
  deleteMosaicStylePreset: (presetId) =>
    set((state) => ({
      mosaicStylePresets: state.mosaicStylePresets.filter((preset) => preset.id !== presetId),
    })),
  duplicateSelectedMosaicLayer: () =>
    set((state) => {
      const activeMosaicLayer = selectActiveMosaicLayer(state)
      const page = selectActiveImage(state)
      if (!activeMosaicLayer || !page || !state.activePageId) {
        return state
      }

      const duplicatedLayer: CanvasMosaicLayer = {
        ...activeMosaicLayer,
        id: createMosaicLayerId(),
        x: activeMosaicLayer.x + 24,
        y: activeMosaicLayer.y + 24,
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          mosaicLayers: [...page.mosaicLayers, duplicatedLayer],
        })),
        selectedLayerId: duplicatedLayer.id,
        loadError: null,
      })
    }),
  moveSelectedMosaicLayerBackward: () =>
    set((state) => {
      const activeMosaicLayer = selectActiveMosaicLayer(state)
      const page = selectActiveImage(state)
      if (!activeMosaicLayer || !page || !state.activePageId) {
        return state
      }

      const index = page.mosaicLayers.findIndex((layer) => layer.id === activeMosaicLayer.id)
      if (index <= 0) {
        return state
      }

      const nextLayers = [...page.mosaicLayers]
      ;[nextLayers[index - 1], nextLayers[index]] = [nextLayers[index], nextLayers[index - 1]]

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          mosaicLayers: nextLayers,
        })),
        loadError: null,
      })
    }),
  moveSelectedMosaicLayerForward: () =>
    set((state) => {
      const activeMosaicLayer = selectActiveMosaicLayer(state)
      const page = selectActiveImage(state)
      if (!activeMosaicLayer || !page || !state.activePageId) {
        return state
      }

      const index = page.mosaicLayers.findIndex((layer) => layer.id === activeMosaicLayer.id)
      if (index === -1 || index >= page.mosaicLayers.length - 1) {
        return state
      }

      const nextLayers = [...page.mosaicLayers]
      ;[nextLayers[index], nextLayers[index + 1]] = [nextLayers[index + 1], nextLayers[index]]

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          mosaicLayers: nextLayers,
        })),
        loadError: null,
      })
    }),
  deleteSelectedMosaicLayer: () =>
    set((state) => {
      const activeMosaicLayer = selectActiveMosaicLayer(state)
      if (!activeMosaicLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          mosaicLayers: page.mosaicLayers.filter((layer) => layer.id !== activeMosaicLayer.id),
        })),
        selectedLayerId: null,
        loadError: null,
      })
    }),
  addOverlayLayer: () =>
    set((state) => {
      if (!state.activePageId) {
        return state
      }

      const overlayLayer = createOverlayLayer()
      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: [...page.overlayLayers, overlayLayer],
        })),
        selectedLayerId: overlayLayer.id,
        selectedLayerIds: [overlayLayer.id],
        loadError: null,
      })
    }),
  selectOverlayLayer: (layerId, additive = false) =>
    set((state) => {
      const page = selectActiveImage(state)
      if (!page || !page.overlayLayers.some((layer) => layer.id === layerId)) {
        return state
      }

      if (additive) {
        return {
          ...toggleLayerSelectionState(state, layerId, true),
          loadError: null,
        }
      }

      return {
        selectedLayerId: layerId,
        selectedLayerIds: [layerId],
        loadError: null,
      }
    }),
  moveSelectedOverlayLayer: (dx, dy) =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      if (!activeOverlayLayer || !state.activePageId || activeOverlayLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: page.overlayLayers.map((layer) =>
            layer.id === activeOverlayLayer.id
              ? { ...layer, x: layer.x + dx, y: layer.y + dy }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  changeSelectedOverlayOpacity: (delta) =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      if (!activeOverlayLayer || !state.activePageId || activeOverlayLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: page.overlayLayers.map((layer) =>
            layer.id === activeOverlayLayer.id
              ? { ...layer, opacity: Math.max(0.1, Math.min(1, Math.round((layer.opacity + delta) * 10) / 10)) }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedOverlayColor: (color) =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      if (!activeOverlayLayer || !state.activePageId || activeOverlayLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: page.overlayLayers.map((layer) =>
            layer.id === activeOverlayLayer.id ? { ...layer, color: sanitizeTextColor(color) } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedOverlayAreaPreset: (preset) =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      if (!activeOverlayLayer || !state.activePageId || activeOverlayLayer.locked) {
        return state
      }

      const nextBounds =
        preset === 'full'
          ? { x: 960, y: 540, width: 1920, height: 1080 }
          : preset === 'top-half'
            ? { x: 960, y: 270, width: 1920, height: 540 }
            : preset === 'bottom-half'
              ? { x: 960, y: 810, width: 1920, height: 540 }
              : preset === 'center-band'
                ? { x: 960, y: 540, width: 1920, height: 320 }
                : { x: 180, y: 120, width: 320, height: 180 }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: page.overlayLayers.map((layer) =>
            layer.id === activeOverlayLayer.id
              ? {
                  ...layer,
                  ...nextBounds,
                  areaPreset: preset,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  cycleSelectedOverlayAreaPreset: () =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      if (!activeOverlayLayer || !state.activePageId || activeOverlayLayer.locked) {
        return state
      }

      const nextPreset =
        activeOverlayLayer.areaPreset === 'custom'
          ? 'full'
          : activeOverlayLayer.areaPreset === 'full'
            ? 'top-half'
            : activeOverlayLayer.areaPreset === 'top-half'
              ? 'bottom-half'
              : activeOverlayLayer.areaPreset === 'bottom-half'
                ? 'center-band'
                : 'custom'

      const nextBounds =
        nextPreset === 'full'
          ? { x: 960, y: 540, width: 1920, height: 1080 }
          : nextPreset === 'top-half'
            ? { x: 960, y: 270, width: 1920, height: 540 }
            : nextPreset === 'bottom-half'
              ? { x: 960, y: 810, width: 1920, height: 540 }
              : nextPreset === 'center-band'
                ? { x: 960, y: 540, width: 1920, height: 320 }
                : { x: 180, y: 120, width: 320, height: 180 }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: page.overlayLayers.map((layer) =>
            layer.id === activeOverlayLayer.id
              ? {
                  ...layer,
                  ...nextBounds,
                  areaPreset: nextPreset,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  toggleSelectedOverlayFillMode: () =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      if (!activeOverlayLayer || !state.activePageId || activeOverlayLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: page.overlayLayers.map((layer) =>
            layer.id === activeOverlayLayer.id
              ? { ...layer, fillMode: layer.fillMode === 'solid' ? 'gradient' : 'solid' }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedOverlayGradientFrom: (color) =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      if (!activeOverlayLayer || !state.activePageId || activeOverlayLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: page.overlayLayers.map((layer) =>
            layer.id === activeOverlayLayer.id ? { ...layer, gradientFrom: sanitizeTextColor(color) } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  setSelectedOverlayGradientTo: (color) =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      if (!activeOverlayLayer || !state.activePageId || activeOverlayLayer.locked) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: page.overlayLayers.map((layer) =>
            layer.id === activeOverlayLayer.id ? { ...layer, gradientTo: sanitizeTextColor(color) } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  cycleSelectedOverlayGradientDirection: () =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      if (!activeOverlayLayer || !state.activePageId || activeOverlayLayer.locked) {
        return state
      }

      const nextDirection =
        activeOverlayLayer.gradientDirection === 'diagonal'
          ? 'vertical'
          : activeOverlayLayer.gradientDirection === 'vertical'
            ? 'horizontal'
            : 'diagonal'

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: page.overlayLayers.map((layer) =>
            layer.id === activeOverlayLayer.id
              ? {
                  ...layer,
                  gradientDirection: nextDirection,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  saveSelectedOverlayStylePreset: () =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      if (!activeOverlayLayer) {
        return state
      }

      const preset: OverlayStylePreset = {
        id: createOverlayPresetId(),
        label: activeOverlayLayer.name?.trim() || `Overlay ${activeOverlayLayer.areaPreset}`,
        areaPreset: activeOverlayLayer.areaPreset,
        color: activeOverlayLayer.color,
        fillMode: activeOverlayLayer.fillMode,
        gradientFrom: activeOverlayLayer.gradientFrom,
        gradientTo: activeOverlayLayer.gradientTo,
        gradientDirection: activeOverlayLayer.gradientDirection,
        opacity: activeOverlayLayer.opacity,
      }

      return {
        overlayStylePresets: [preset, ...state.overlayStylePresets.filter((entry) => entry.label !== preset.label)].slice(0, 12),
      }
    }),
  applyOverlayStylePreset: (presetId) =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      const preset = state.overlayStylePresets.find((entry) => entry.id === presetId)
      if (!activeOverlayLayer || !preset || !state.activePageId) {
        return state
      }

      const nextBounds =
        preset.areaPreset === 'full'
          ? { x: 960, y: 540, width: 1920, height: 1080 }
          : preset.areaPreset === 'top-half'
            ? { x: 960, y: 270, width: 1920, height: 540 }
            : preset.areaPreset === 'bottom-half'
              ? { x: 960, y: 810, width: 1920, height: 540 }
              : preset.areaPreset === 'center-band'
                ? { x: 960, y: 540, width: 1920, height: 320 }
                : { x: activeOverlayLayer.x, y: activeOverlayLayer.y, width: activeOverlayLayer.width, height: activeOverlayLayer.height }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: page.overlayLayers.map((layer) =>
            layer.id === activeOverlayLayer.id
              ? {
                  ...layer,
                  ...nextBounds,
                  areaPreset: preset.areaPreset,
                  color: preset.color,
                  fillMode: preset.fillMode,
                  gradientFrom: preset.gradientFrom,
                  gradientTo: preset.gradientTo,
                  gradientDirection: preset.gradientDirection,
                  opacity: preset.opacity,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  renameOverlayStylePreset: (presetId, name) =>
    set((state) => ({
      overlayStylePresets: state.overlayStylePresets.map((preset) =>
        preset.id === presetId ? { ...preset, label: name } : preset,
      ),
    })),
  duplicateOverlayStylePreset: (presetId) =>
    set((state) => {
      const preset = state.overlayStylePresets.find((entry) => entry.id === presetId)
      if (!preset) {
        return state
      }

      const duplicatedPreset: OverlayStylePreset = {
        ...preset,
        id: createOverlayPresetId(),
        label: `${preset.label} copy`,
      }

      return {
        overlayStylePresets: [duplicatedPreset, ...state.overlayStylePresets].slice(0, 12),
      }
    }),
  deleteOverlayStylePreset: (presetId) =>
    set((state) => ({
      overlayStylePresets: state.overlayStylePresets.filter((preset) => preset.id !== presetId),
    })),
  duplicateSelectedOverlayLayer: () =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      const page = selectActiveImage(state)
      if (!activeOverlayLayer || !page || !state.activePageId) {
        return state
      }

      const duplicatedLayer: CanvasOverlayLayer = {
        ...activeOverlayLayer,
        id: createOverlayLayerId(),
        x: activeOverlayLayer.x + 24,
        y: activeOverlayLayer.y + 24,
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          overlayLayers: [...page.overlayLayers, duplicatedLayer],
        })),
        selectedLayerId: duplicatedLayer.id,
        loadError: null,
      })
    }),
  moveSelectedOverlayLayerBackward: () =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      const page = selectActiveImage(state)
      if (!activeOverlayLayer || !page || !state.activePageId) {
        return state
      }

      const index = page.overlayLayers.findIndex((layer) => layer.id === activeOverlayLayer.id)
      if (index <= 0) {
        return state
      }

      const nextLayers = [...page.overlayLayers]
      ;[nextLayers[index - 1], nextLayers[index]] = [nextLayers[index], nextLayers[index - 1]]

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          overlayLayers: nextLayers,
        })),
        loadError: null,
      })
    }),
  moveSelectedOverlayLayerForward: () =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      const page = selectActiveImage(state)
      if (!activeOverlayLayer || !page || !state.activePageId) {
        return state
      }

      const index = page.overlayLayers.findIndex((layer) => layer.id === activeOverlayLayer.id)
      if (index === -1 || index >= page.overlayLayers.length - 1) {
        return state
      }

      const nextLayers = [...page.overlayLayers]
      ;[nextLayers[index], nextLayers[index + 1]] = [nextLayers[index + 1], nextLayers[index]]

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          overlayLayers: nextLayers,
        })),
        loadError: null,
      })
    }),
  deleteSelectedOverlayLayer: () =>
    set((state) => {
      const activeOverlayLayer = selectActiveOverlayLayer(state)
      if (!activeOverlayLayer || !state.activePageId) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: page.overlayLayers.filter((layer) => layer.id !== activeOverlayLayer.id),
        })),
        selectedLayerId: null,
        loadError: null,
      })
    }),
  addBackendMosaicLayers: (layers) =>
    set((state) => {
      if (!state.activePageId || layers.length === 0) {
        return state
      }

      const nextLayers = layers.map((layer, index) => ({
        ...createMosaicLayer(),
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        intensity: layer.intensity,
        style: layer.style,
        name: layer.name ?? `Backend mosaic ${index + 1}`,
      }))
      const lastLayer = nextLayers[nextLayers.length - 1] ?? null

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          mosaicLayers: [...page.mosaicLayers, ...nextLayers],
        })),
        selectedLayerId: lastLayer?.id ?? state.selectedLayerId,
        selectedLayerIds: lastLayer ? [lastLayer.id] : state.selectedLayerIds,
        loadError: null,
      })
    }),
  addBackendMosaicLayersToPage: (pageId, layers) =>
    set((state) => {
      if (!pageId || layers.length === 0) {
        return state
      }

      const nextLayers = layers.map((layer, index) => ({
        ...createMosaicLayer(),
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        intensity: layer.intensity,
        style: layer.style,
        name: layer.name?.trim() || `Backend mosaic ${index + 1}`,
      }))

      return withHistory(state, {
        pages: updatePageById(state.pages, pageId, (page) => ({
          ...page,
          mosaicLayers: [...page.mosaicLayers, ...nextLayers],
        })),
        loadError: null,
      })
    }),
  addBackendOverlayLayers: (layers) =>
    set((state) => {
      if (!state.activePageId || layers.length === 0) {
        return state
      }

      const nextLayers = layers.map((layer, index) => ({
        ...createOverlayLayer(),
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        areaPreset: 'custom' as const,
        color: sanitizeTextColor(layer.color),
        fillMode: layer.fillMode ?? 'solid',
        gradientFrom: sanitizeTextColor(layer.gradientFrom ?? layer.color),
        gradientTo: sanitizeTextColor(layer.gradientTo ?? layer.color),
        gradientDirection: layer.gradientDirection ?? 'diagonal',
        opacity: Math.max(0.1, Math.min(1, layer.opacity)),
        name: layer.name ?? `Backend overlay ${index + 1}`,
      }))
      const lastLayer = nextLayers[nextLayers.length - 1] ?? null

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          overlayLayers: [...page.overlayLayers, ...nextLayers],
        })),
        selectedLayerId: lastLayer?.id ?? state.selectedLayerId,
        selectedLayerIds: lastLayer ? [lastLayer.id] : state.selectedLayerIds,
        loadError: null,
      })
    }),
  addBackendOverlayLayersToPage: (pageId, layers) =>
    set((state) => {
      if (!pageId || layers.length === 0) {
        return state
      }

      const nextLayers = layers.map((layer, index) => ({
        ...createOverlayLayer(),
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        color: layer.color,
        opacity: layer.opacity,
        fillMode: layer.fillMode ?? 'solid',
        gradientFrom: layer.gradientFrom ?? layer.color,
        gradientTo: layer.gradientTo ?? '#111111',
        gradientDirection: layer.gradientDirection ?? 'vertical',
        name: layer.name?.trim() || `Backend overlay ${index + 1}`,
      }))

      return withHistory(state, {
        pages: updatePageById(state.pages, pageId, (page) => ({
          ...page,
          overlayLayers: [...page.overlayLayers, ...nextLayers],
        })),
        loadError: null,
      })
    }),
  toggleSelectedLayerVisibility: () =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }
      const selectedLayerIds = new Set(getActionableLayerIds(state))

      if (selectedLayerIds.size > 1) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            textLayers: page.textLayers.map((layer) =>
              selectedLayerIds.has(layer.id) ? { ...layer, visible: !layer.visible } : layer,
            ),
            messageWindowLayers: page.messageWindowLayers.map((layer) =>
              selectedLayerIds.has(layer.id) ? { ...layer, visible: !layer.visible } : layer,
            ),
            bubbleLayers: page.bubbleLayers.map((layer) =>
              selectedLayerIds.has(layer.id) ? { ...layer, visible: !layer.visible } : layer,
            ),
            mosaicLayers: page.mosaicLayers.map((layer) =>
              selectedLayerIds.has(layer.id) ? { ...layer, visible: !layer.visible } : layer,
            ),
            overlayLayers: page.overlayLayers.map((layer) =>
              selectedLayerIds.has(layer.id) ? { ...layer, visible: !layer.visible } : layer,
            ),
            watermarkLayers: page.watermarkLayers.map((layer) =>
              selectedLayerIds.has(layer.id) ? { ...layer, visible: !layer.visible } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const textLayer = selectActiveTextLayer(state)
      if (textLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            textLayers: page.textLayers.map((layer) =>
              layer.id === textLayer.id ? { ...layer, visible: !layer.visible } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const bubbleLayer = selectActiveBubbleLayer(state)
      if (bubbleLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            bubbleLayers: page.bubbleLayers.map((layer) =>
              layer.id === bubbleLayer.id ? { ...layer, visible: !layer.visible } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const messageWindowLayer = selectActiveMessageWindowLayer(state)
      if (messageWindowLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            messageWindowLayers: page.messageWindowLayers.map((layer) =>
              layer.id === messageWindowLayer.id ? { ...layer, visible: !layer.visible } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const mosaicLayer = selectActiveMosaicLayer(state)
      if (mosaicLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            mosaicLayers: page.mosaicLayers.map((layer) =>
              layer.id === mosaicLayer.id ? { ...layer, visible: !layer.visible } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const overlayLayer = selectActiveOverlayLayer(state)
      if (overlayLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            overlayLayers: page.overlayLayers.map((layer) =>
              layer.id === overlayLayer.id ? { ...layer, visible: !layer.visible } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const watermarkLayer = selectActiveWatermarkLayer(state)
      if (watermarkLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            watermarkLayers: page.watermarkLayers.map((layer) =>
              layer.id === watermarkLayer.id ? { ...layer, visible: !layer.visible } : layer,
            ),
          })),
          loadError: null,
        })
      }

      return state
    }),
  toggleSelectedLayerLock: () =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }
      const selectedLayerIds = new Set(getActionableLayerIds(state))

      if (selectedLayerIds.size > 1) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            textLayers: page.textLayers.map((layer) =>
              selectedLayerIds.has(layer.id) ? { ...layer, locked: !layer.locked } : layer,
            ),
            messageWindowLayers: page.messageWindowLayers.map((layer) =>
              selectedLayerIds.has(layer.id) ? { ...layer, locked: !layer.locked } : layer,
            ),
            bubbleLayers: page.bubbleLayers.map((layer) =>
              selectedLayerIds.has(layer.id) ? { ...layer, locked: !layer.locked } : layer,
            ),
            mosaicLayers: page.mosaicLayers.map((layer) =>
              selectedLayerIds.has(layer.id) ? { ...layer, locked: !layer.locked } : layer,
            ),
            overlayLayers: page.overlayLayers.map((layer) =>
              selectedLayerIds.has(layer.id) ? { ...layer, locked: !layer.locked } : layer,
            ),
            watermarkLayers: page.watermarkLayers.map((layer) =>
              selectedLayerIds.has(layer.id) ? { ...layer, locked: !layer.locked } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const textLayer = selectActiveTextLayer(state)
      if (textLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            textLayers: page.textLayers.map((layer) =>
              layer.id === textLayer.id ? { ...layer, locked: !layer.locked } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const bubbleLayer = selectActiveBubbleLayer(state)
      if (bubbleLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            bubbleLayers: page.bubbleLayers.map((layer) =>
              layer.id === bubbleLayer.id ? { ...layer, locked: !layer.locked } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const messageWindowLayer = selectActiveMessageWindowLayer(state)
      if (messageWindowLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            messageWindowLayers: page.messageWindowLayers.map((layer) =>
              layer.id === messageWindowLayer.id ? { ...layer, locked: !layer.locked } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const mosaicLayer = selectActiveMosaicLayer(state)
      if (mosaicLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            mosaicLayers: page.mosaicLayers.map((layer) =>
              layer.id === mosaicLayer.id ? { ...layer, locked: !layer.locked } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const overlayLayer = selectActiveOverlayLayer(state)
      if (overlayLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            overlayLayers: page.overlayLayers.map((layer) =>
              layer.id === overlayLayer.id ? { ...layer, locked: !layer.locked } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const watermarkLayer = selectActiveWatermarkLayer(state)
      if (watermarkLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            watermarkLayers: page.watermarkLayers.map((layer) =>
              layer.id === watermarkLayer.id ? { ...layer, locked: !layer.locked } : layer,
            ),
          })),
          loadError: null,
        })
      }

      return state
    }),
  toggleLayerVisibilityById: (layerId) =>
    set((state) => {
      if (!state.activePageId) return state
      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((l) => l.id === layerId ? { ...l, visible: !l.visible } : l),
          messageWindowLayers: page.messageWindowLayers.map((l) => l.id === layerId ? { ...l, visible: !l.visible } : l),
          bubbleLayers: page.bubbleLayers.map((l) => l.id === layerId ? { ...l, visible: !l.visible } : l),
          mosaicLayers: page.mosaicLayers.map((l) => l.id === layerId ? { ...l, visible: !l.visible } : l),
          overlayLayers: page.overlayLayers.map((l) => l.id === layerId ? { ...l, visible: !l.visible } : l),
          watermarkLayers: page.watermarkLayers.map((l) => l.id === layerId ? { ...l, visible: !l.visible } : l),
        })),
        loadError: null,
      })
    }),
  toggleLayerLockById: (layerId) =>
    set((state) => {
      if (!state.activePageId) return state
      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((l) => l.id === layerId ? { ...l, locked: !l.locked } : l),
          messageWindowLayers: page.messageWindowLayers.map((l) => l.id === layerId ? { ...l, locked: !l.locked } : l),
          bubbleLayers: page.bubbleLayers.map((l) => l.id === layerId ? { ...l, locked: !l.locked } : l),
          mosaicLayers: page.mosaicLayers.map((l) => l.id === layerId ? { ...l, locked: !l.locked } : l),
          overlayLayers: page.overlayLayers.map((l) => l.id === layerId ? { ...l, locked: !l.locked } : l),
          watermarkLayers: page.watermarkLayers.map((l) => l.id === layerId ? { ...l, locked: !l.locked } : l),
        })),
        loadError: null,
      })
    }),
  groupSelectedLayers: () =>
    set((state) => {
      if (!state.activePageId) {
        return state
      }

      const selectedLayerIds = getEffectiveSelectedLayerIds(state)
      if (selectedLayerIds.length < 2) {
        return state
      }

      const groupId = createGroupId()
      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          textLayers: entry.textLayers.map((layer) =>
            selectedLayerIds.includes(layer.id) ? { ...layer, groupId } : layer,
          ),
          messageWindowLayers: entry.messageWindowLayers.map((layer) =>
            selectedLayerIds.includes(layer.id) ? { ...layer, groupId } : layer,
          ),
          bubbleLayers: entry.bubbleLayers.map((layer) =>
            selectedLayerIds.includes(layer.id) ? { ...layer, groupId } : layer,
          ),
          mosaicLayers: entry.mosaicLayers.map((layer) =>
            selectedLayerIds.includes(layer.id) ? { ...layer, groupId } : layer,
          ),
          overlayLayers: entry.overlayLayers.map((layer) =>
            selectedLayerIds.includes(layer.id) ? { ...layer, groupId } : layer,
          ),
          watermarkLayers: entry.watermarkLayers.map((layer) =>
            selectedLayerIds.includes(layer.id) ? { ...layer, groupId } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  ungroupSelectedLayers: () =>
    set((state) => {
      if (!state.activePageId) {
        return state
      }

      const selectedLayerIds = new Set(getEffectiveSelectedLayerIds(state))
      if (selectedLayerIds.size === 0) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          textLayers: entry.textLayers.map((layer) =>
            selectedLayerIds.has(layer.id) ? { ...layer, groupId: null } : layer,
          ),
          messageWindowLayers: entry.messageWindowLayers.map((layer) =>
            selectedLayerIds.has(layer.id) ? { ...layer, groupId: null } : layer,
          ),
          bubbleLayers: entry.bubbleLayers.map((layer) =>
            selectedLayerIds.has(layer.id) ? { ...layer, groupId: null } : layer,
          ),
          mosaicLayers: entry.mosaicLayers.map((layer) =>
            selectedLayerIds.has(layer.id) ? { ...layer, groupId: null } : layer,
          ),
          overlayLayers: entry.overlayLayers.map((layer) =>
            selectedLayerIds.has(layer.id) ? { ...layer, groupId: null } : layer,
          ),
          watermarkLayers: entry.watermarkLayers.map((layer) =>
            selectedLayerIds.has(layer.id) ? { ...layer, groupId: null } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  duplicateSelectedLayer: () =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }

      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const selectedLayerIds = new Set(getActionableLayerIds(state))
      if (selectedLayerIds.size > 1) {
        const duplicatedGroupId = createGroupId()
        const duplicatedTextLayers = page.textLayers
          .filter((layer) => selectedLayerIds.has(layer.id) && !layer.locked)
          .map((layer) => ({
            ...layer,
            id: createTextLayerId(),
            groupId: duplicatedGroupId,
            text: `${layer.text} copy`,
            x: layer.x + 24,
            y: layer.y + 24,
          }))
        const duplicatedMessageWindowLayers = page.messageWindowLayers
          .filter((layer) => selectedLayerIds.has(layer.id) && !layer.locked)
          .map((layer) => ({
            ...layer,
            id: createMessageWindowLayerId(),
            groupId: duplicatedGroupId,
            speaker: `${layer.speaker} copy`,
            x: layer.x + 24,
            y: layer.y + 24,
          }))
        const duplicatedBubbleLayers = page.bubbleLayers
          .filter((layer) => selectedLayerIds.has(layer.id) && !layer.locked)
          .map((layer) => ({
            ...layer,
            id: createBubbleLayerId(),
            groupId: duplicatedGroupId,
            text: `${layer.text} copy`,
            x: layer.x + 24,
            y: layer.y + 24,
          }))
        const duplicatedMosaicLayers = page.mosaicLayers
          .filter((layer) => selectedLayerIds.has(layer.id) && !layer.locked)
          .map((layer) => ({
            ...layer,
            id: createMosaicLayerId(),
            groupId: duplicatedGroupId,
            x: layer.x + 24,
            y: layer.y + 24,
          }))
        const duplicatedOverlayLayers = page.overlayLayers
          .filter((layer) => selectedLayerIds.has(layer.id) && !layer.locked)
          .map((layer) => ({
            ...layer,
            id: createOverlayLayerId(),
            groupId: duplicatedGroupId,
            x: layer.x + 24,
            y: layer.y + 24,
          }))
        const duplicatedWatermarkLayers = page.watermarkLayers
          .filter((layer) => selectedLayerIds.has(layer.id) && !layer.locked)
          .map((layer) => ({
            ...layer,
            id: createWatermarkLayerId(),
            groupId: duplicatedGroupId,
            x: layer.x + 24,
            y: layer.y + 24,
          }))

        const nextSelectedLayerIds = [
          ...selectedLayerIds,
          ...duplicatedTextLayers.map((layer) => layer.id),
          ...duplicatedMessageWindowLayers.map((layer) => layer.id),
          ...duplicatedBubbleLayers.map((layer) => layer.id),
          ...duplicatedMosaicLayers.map((layer) => layer.id),
          ...duplicatedOverlayLayers.map((layer) => layer.id),
          ...duplicatedWatermarkLayers.map((layer) => layer.id),
        ]

        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            textLayers: [...entry.textLayers, ...duplicatedTextLayers],
            messageWindowLayers: [...entry.messageWindowLayers, ...duplicatedMessageWindowLayers],
            bubbleLayers: [...entry.bubbleLayers, ...duplicatedBubbleLayers],
            mosaicLayers: [...entry.mosaicLayers, ...duplicatedMosaicLayers],
            overlayLayers: [...entry.overlayLayers, ...duplicatedOverlayLayers],
            watermarkLayers: [...entry.watermarkLayers, ...duplicatedWatermarkLayers],
          })),
          selectedLayerId: nextSelectedLayerIds[0] ?? null,
          selectedLayerIds: nextSelectedLayerIds,
          loadError: null,
        })
      }

      const textLayer = selectActiveTextLayer(state)
      if (textLayer && !textLayer.locked) {
        const duplicatedLayer: CanvasTextLayer = {
          ...textLayer,
          id: createTextLayerId(),
          text: `${textLayer.text} copy`,
          x: textLayer.x + 24,
          y: textLayer.y + 24,
        }

        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            textLayers: [...page.textLayers, duplicatedLayer],
          })),
          selectedLayerId: duplicatedLayer.id,
          selectedLayerIds: [duplicatedLayer.id],
          loadError: null,
        })
      }

      const bubbleLayer = selectActiveBubbleLayer(state)
      if (bubbleLayer && !bubbleLayer.locked) {
        const duplicatedLayer: CanvasBubbleLayer = {
          ...bubbleLayer,
          id: createBubbleLayerId(),
          text: `${bubbleLayer.text} copy`,
          x: bubbleLayer.x + 24,
          y: bubbleLayer.y + 24,
        }

        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            bubbleLayers: [...page.bubbleLayers, duplicatedLayer],
          })),
          selectedLayerId: duplicatedLayer.id,
          selectedLayerIds: [duplicatedLayer.id],
          loadError: null,
        })
      }

      const messageWindowLayer = selectActiveMessageWindowLayer(state)
      if (messageWindowLayer && !messageWindowLayer.locked) {
        const duplicatedLayer: CanvasMessageWindowLayer = {
          ...messageWindowLayer,
          id: createMessageWindowLayerId(),
          speaker: `${messageWindowLayer.speaker} copy`,
          x: messageWindowLayer.x + 24,
          y: messageWindowLayer.y + 24,
        }

        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            messageWindowLayers: [...page.messageWindowLayers, duplicatedLayer],
          })),
          selectedLayerId: duplicatedLayer.id,
          selectedLayerIds: [duplicatedLayer.id],
          loadError: null,
        })
      }

      const mosaicLayer = selectActiveMosaicLayer(state)
      if (mosaicLayer && !mosaicLayer.locked) {
        const duplicatedLayer: CanvasMosaicLayer = {
          ...mosaicLayer,
          id: createMosaicLayerId(),
          x: mosaicLayer.x + 24,
          y: mosaicLayer.y + 24,
        }

        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            mosaicLayers: [...page.mosaicLayers, duplicatedLayer],
          })),
          selectedLayerId: duplicatedLayer.id,
          selectedLayerIds: [duplicatedLayer.id],
          loadError: null,
        })
      }

      const overlayLayer = selectActiveOverlayLayer(state)
      if (overlayLayer && !overlayLayer.locked) {
        const duplicatedLayer: CanvasOverlayLayer = {
          ...overlayLayer,
          id: createOverlayLayerId(),
          x: overlayLayer.x + 24,
          y: overlayLayer.y + 24,
        }

        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            overlayLayers: [...page.overlayLayers, duplicatedLayer],
          })),
          selectedLayerId: duplicatedLayer.id,
          selectedLayerIds: [duplicatedLayer.id],
          loadError: null,
        })
      }

      const watermarkLayer = selectActiveWatermarkLayer(state)
      if (watermarkLayer && !watermarkLayer.locked) {
        const duplicatedLayer: CanvasWatermarkLayer = {
          ...watermarkLayer,
          id: createWatermarkLayerId(),
          x: watermarkLayer.x + 24,
          y: watermarkLayer.y + 24,
        }

        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            watermarkLayers: [...page.watermarkLayers, duplicatedLayer],
          })),
          selectedLayerId: duplicatedLayer.id,
          selectedLayerIds: [duplicatedLayer.id],
          loadError: null,
        })
      }

      return state
    }),
  centerSelectedLayer: () =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }

      const centerX = Math.round(INITIAL_IMAGE_TRANSFORM.width)
      const centerY = Math.round(INITIAL_IMAGE_TRANSFORM.height)
      const selectedLayerIds = new Set(getActionableLayerIds(state))

      if (selectedLayerIds.size > 1) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            textLayers: entry.textLayers.map((layer) =>
              selectedLayerIds.has(layer.id) && !layer.locked ? { ...layer, x: centerX, y: centerY } : layer,
            ),
            messageWindowLayers: entry.messageWindowLayers.map((layer) =>
              selectedLayerIds.has(layer.id) && !layer.locked ? { ...layer, x: centerX, y: centerY } : layer,
            ),
            bubbleLayers: entry.bubbleLayers.map((layer) =>
              selectedLayerIds.has(layer.id) && !layer.locked ? { ...layer, x: centerX, y: centerY } : layer,
            ),
            mosaicLayers: entry.mosaicLayers.map((layer) =>
              selectedLayerIds.has(layer.id) && !layer.locked ? { ...layer, x: centerX, y: centerY } : layer,
            ),
            overlayLayers: entry.overlayLayers.map((layer) =>
              selectedLayerIds.has(layer.id) && !layer.locked ? { ...layer, x: centerX, y: centerY } : layer,
            ),
            watermarkLayers: entry.watermarkLayers.map((layer) =>
              selectedLayerIds.has(layer.id) && !layer.locked ? { ...layer, x: centerX, y: centerY } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const textLayer = selectActiveTextLayer(state)
      if (textLayer && !textLayer.locked) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            textLayers: entry.textLayers.map((layer) =>
              layer.id === textLayer.id ? { ...layer, x: centerX, y: centerY } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const bubbleLayer = selectActiveBubbleLayer(state)
      if (bubbleLayer && !bubbleLayer.locked) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            bubbleLayers: entry.bubbleLayers.map((layer) =>
              layer.id === bubbleLayer.id ? { ...layer, x: centerX, y: centerY } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const messageWindowLayer = selectActiveMessageWindowLayer(state)
      if (messageWindowLayer && !messageWindowLayer.locked) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            messageWindowLayers: entry.messageWindowLayers.map((layer) =>
              layer.id === messageWindowLayer.id ? { ...layer, x: centerX, y: centerY } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const mosaicLayer = selectActiveMosaicLayer(state)
      if (mosaicLayer && !mosaicLayer.locked) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            mosaicLayers: entry.mosaicLayers.map((layer) =>
              layer.id === mosaicLayer.id ? { ...layer, x: centerX, y: centerY } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const overlayLayer = selectActiveOverlayLayer(state)
      if (overlayLayer && !overlayLayer.locked) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            overlayLayers: entry.overlayLayers.map((layer) =>
              layer.id === overlayLayer.id ? { ...layer, x: centerX, y: centerY } : layer,
            ),
          })),
          loadError: null,
        })
      }

      const watermarkLayer = selectActiveWatermarkLayer(state)
      if (watermarkLayer && !watermarkLayer.locked) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            watermarkLayers: entry.watermarkLayers.map((layer) =>
              layer.id === watermarkLayer.id ? { ...layer, x: centerX, y: centerY } : layer,
            ),
          })),
          loadError: null,
        })
      }

      return state
    }),
  alignSelectedLayer: (direction) =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }

      const nextX = direction === 'left' ? 0 : direction === 'right' ? 1920 : null
      const nextY = direction === 'top' ? 0 : direction === 'bottom' ? 1080 : null
      const selectedLayerIds = new Set(getActionableLayerIds(state))

      if (selectedLayerIds.size > 1) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            textLayers: entry.textLayers.map((layer) =>
              selectedLayerIds.has(layer.id) && !layer.locked
                ? { ...layer, x: nextX ?? layer.x, y: nextY ?? layer.y }
                : layer,
            ),
            messageWindowLayers: entry.messageWindowLayers.map((layer) =>
              selectedLayerIds.has(layer.id) && !layer.locked
                ? { ...layer, x: nextX ?? layer.x, y: nextY ?? layer.y }
                : layer,
            ),
            bubbleLayers: entry.bubbleLayers.map((layer) =>
              selectedLayerIds.has(layer.id) && !layer.locked
                ? { ...layer, x: nextX ?? layer.x, y: nextY ?? layer.y }
                : layer,
            ),
            mosaicLayers: entry.mosaicLayers.map((layer) =>
              selectedLayerIds.has(layer.id) && !layer.locked
                ? { ...layer, x: nextX ?? layer.x, y: nextY ?? layer.y }
                : layer,
            ),
            overlayLayers: entry.overlayLayers.map((layer) =>
              selectedLayerIds.has(layer.id) && !layer.locked
                ? { ...layer, x: nextX ?? layer.x, y: nextY ?? layer.y }
                : layer,
            ),
            watermarkLayers: entry.watermarkLayers.map((layer) =>
              selectedLayerIds.has(layer.id) && !layer.locked
                ? { ...layer, x: nextX ?? layer.x, y: nextY ?? layer.y }
                : layer,
            ),
          })),
          loadError: null,
        })
      }

      const textLayer = selectActiveTextLayer(state)
      if (textLayer && !textLayer.locked) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            textLayers: entry.textLayers.map((layer) =>
              layer.id === textLayer.id
                ? { ...layer, x: nextX ?? layer.x, y: nextY ?? layer.y }
                : layer,
            ),
          })),
          loadError: null,
        })
      }

      const bubbleLayer = selectActiveBubbleLayer(state)
      if (bubbleLayer && !bubbleLayer.locked) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            bubbleLayers: entry.bubbleLayers.map((layer) =>
              layer.id === bubbleLayer.id
                ? { ...layer, x: nextX ?? layer.x, y: nextY ?? layer.y }
                : layer,
            ),
          })),
          loadError: null,
        })
      }

      const messageWindowLayer = selectActiveMessageWindowLayer(state)
      if (messageWindowLayer && !messageWindowLayer.locked) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            messageWindowLayers: entry.messageWindowLayers.map((layer) =>
              layer.id === messageWindowLayer.id
                ? { ...layer, x: nextX ?? layer.x, y: nextY ?? layer.y }
                : layer,
            ),
          })),
          loadError: null,
        })
      }

      const mosaicLayer = selectActiveMosaicLayer(state)
      if (mosaicLayer && !mosaicLayer.locked) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            mosaicLayers: entry.mosaicLayers.map((layer) =>
              layer.id === mosaicLayer.id
                ? { ...layer, x: nextX ?? layer.x, y: nextY ?? layer.y }
                : layer,
            ),
          })),
          loadError: null,
        })
      }

      const overlayLayer = selectActiveOverlayLayer(state)
      if (overlayLayer && !overlayLayer.locked) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            overlayLayers: entry.overlayLayers.map((layer) =>
              layer.id === overlayLayer.id
                ? { ...layer, x: nextX ?? layer.x, y: nextY ?? layer.y }
                : layer,
            ),
          })),
          loadError: null,
        })
      }

      const watermarkLayer = selectActiveWatermarkLayer(state)
      if (watermarkLayer && !watermarkLayer.locked) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            watermarkLayers: entry.watermarkLayers.map((layer) =>
              layer.id === watermarkLayer.id
                ? { ...layer, x: nextX ?? layer.x, y: nextY ?? layer.y }
                : layer,
            ),
          })),
          loadError: null,
        })
      }

      return state
    }),
  alignSelectedLayersCenter: (axis) =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }

      const nextValue = axis === 'horizontal' ? Math.round(INITIAL_IMAGE_TRANSFORM.width) : Math.round(INITIAL_IMAGE_TRANSFORM.height)
      const selectedLayerIds = new Set(getEffectiveSelectedLayerIds(state))
      if (selectedLayerIds.size === 0) {
        return state
      }

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          textLayers: entry.textLayers.map((layer) =>
            selectedLayerIds.has(layer.id) && !layer.locked
              ? { ...layer, x: axis === 'horizontal' ? nextValue : layer.x, y: axis === 'vertical' ? nextValue : layer.y }
              : layer,
          ),
          messageWindowLayers: entry.messageWindowLayers.map((layer) =>
            selectedLayerIds.has(layer.id) && !layer.locked
              ? { ...layer, x: axis === 'horizontal' ? nextValue : layer.x, y: axis === 'vertical' ? nextValue : layer.y }
              : layer,
          ),
          bubbleLayers: entry.bubbleLayers.map((layer) =>
            selectedLayerIds.has(layer.id) && !layer.locked
              ? { ...layer, x: axis === 'horizontal' ? nextValue : layer.x, y: axis === 'vertical' ? nextValue : layer.y }
              : layer,
          ),
          mosaicLayers: entry.mosaicLayers.map((layer) =>
            selectedLayerIds.has(layer.id) && !layer.locked
              ? { ...layer, x: axis === 'horizontal' ? nextValue : layer.x, y: axis === 'vertical' ? nextValue : layer.y }
              : layer,
          ),
          overlayLayers: entry.overlayLayers.map((layer) =>
            selectedLayerIds.has(layer.id) && !layer.locked
              ? { ...layer, x: axis === 'horizontal' ? nextValue : layer.x, y: axis === 'vertical' ? nextValue : layer.y }
              : layer,
          ),
          watermarkLayers: entry.watermarkLayers.map((layer) =>
            selectedLayerIds.has(layer.id) && !layer.locked
              ? { ...layer, x: axis === 'horizontal' ? nextValue : layer.x, y: axis === 'vertical' ? nextValue : layer.y }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  distributeSelectedLayers: (axis) =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }

      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const selectedLayerIds = new Set(getEffectiveSelectedLayerIds(state))
      if (selectedLayerIds.size < 2) {
        return state
      }

      const selectedPositions = getSelectedPositions(page, selectedLayerIds)
      const unlockedPositions = selectedPositions.filter((layer) => !layer.locked)
      if (unlockedPositions.length < 2) {
        return state
      }

      const sortedUnlocked = [...unlockedPositions].sort((a, b) =>
        axis === 'horizontal' ? a.x - b.x : a.y - b.y,
      )
      const maxValue = axis === 'horizontal' ? 1920 : 1080
      const gap = sortedUnlocked.length > 1 ? maxValue / (sortedUnlocked.length - 1) : 0
      const positionMap = new Map<string, number>()

      sortedUnlocked.forEach((layer, index) => {
        positionMap.set(layer.id, Math.round(gap * index))
      })

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => applyPositionMap(entry, positionMap, axis)),
        loadError: null,
      })
    }),
  matchSelectedLayerSize: (dimension) =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }

      const page = selectActiveImage(state)
      if (!page) {
        return state
      }

      const selectedLayerIds = new Set(getEffectiveSelectedLayerIds(state))
      const resizableLayers = getSelectedResizableLayers(page, selectedLayerIds)
      if (resizableLayers.length < 2) {
        return state
      }

      const sourceLayer =
        resizableLayers.find((layer) => layer.id === state.selectedLayerId) ??
        resizableLayers.find((layer) => !layer.locked) ??
        null
      if (!sourceLayer) {
        return state
      }

      const nextSize = dimension === 'width' ? sourceLayer.width : sourceLayer.height

      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
          ...entry,
          messageWindowLayers: entry.messageWindowLayers.map((layer) =>
            selectedLayerIds.has(layer.id) && layer.id !== sourceLayer.id && !layer.locked
              ? {
                  ...layer,
                  width: dimension === 'width' ? nextSize : layer.width,
                  height: dimension === 'height' ? nextSize : layer.height,
                }
              : layer,
          ),
          bubbleLayers: entry.bubbleLayers.map((layer) =>
            selectedLayerIds.has(layer.id) && layer.id !== sourceLayer.id && !layer.locked
              ? {
                  ...layer,
                  width: dimension === 'width' ? nextSize : layer.width,
                  height: dimension === 'height' ? nextSize : layer.height,
                }
              : layer,
          ),
          mosaicLayers: entry.mosaicLayers.map((layer) =>
            selectedLayerIds.has(layer.id) && layer.id !== sourceLayer.id && !layer.locked
              ? {
                  ...layer,
                  width: dimension === 'width' ? nextSize : layer.width,
                  height: dimension === 'height' ? nextSize : layer.height,
                }
              : layer,
          ),
          overlayLayers: entry.overlayLayers.map((layer) =>
            selectedLayerIds.has(layer.id) && layer.id !== sourceLayer.id && !layer.locked
              ? {
                  ...layer,
                  width: dimension === 'width' ? nextSize : layer.width,
                  height: dimension === 'height' ? nextSize : layer.height,
                }
              : layer,
          ),
        })),
        loadError: null,
      })
    }),
  moveSelectedLayersByDelta: (dx, dy) =>
    set((state) => {
      if (dx === 0 && dy === 0) {
        return state
      }

      return moveSelectedLayers(state, dx, dy)
    }),
  resizeSelectedLayersByDelta: (widthDelta, heightDelta, handle = 'bottom-right', preserveAspectRatio = false) =>
    set((state) => {
      if (widthDelta === 0 && heightDelta === 0) {
        return state
      }

      return resizeSelectedLayers(state, widthDelta, heightDelta, handle, preserveAspectRatio)
    }),
  deleteSelectedLayer: () =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }

      const selectedLayerIds = new Set(getActionableLayerIds(state))
      if (selectedLayerIds.size > 1) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            textLayers: page.textLayers.filter((layer) => !selectedLayerIds.has(layer.id)),
            bubbleLayers: page.bubbleLayers.filter((layer) => !selectedLayerIds.has(layer.id)),
            mosaicLayers: page.mosaicLayers.filter((layer) => !selectedLayerIds.has(layer.id)),
            overlayLayers: page.overlayLayers.filter((layer) => !selectedLayerIds.has(layer.id)),
          })),
          selectedLayerId: null,
          selectedLayerIds: [],
          loadError: null,
        })
      }

      const textLayer = selectActiveTextLayer(state)
      if (textLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            textLayers: page.textLayers.filter((layer) => layer.id !== textLayer.id),
          })),
          selectedLayerId: null,
          selectedLayerIds: [],
          loadError: null,
        })
      }

      const bubbleLayer = selectActiveBubbleLayer(state)
      if (bubbleLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            bubbleLayers: page.bubbleLayers.filter((layer) => layer.id !== bubbleLayer.id),
          })),
          selectedLayerId: null,
          selectedLayerIds: [],
          loadError: null,
        })
      }

      const mosaicLayer = selectActiveMosaicLayer(state)
      if (mosaicLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            mosaicLayers: page.mosaicLayers.filter((layer) => layer.id !== mosaicLayer.id),
          })),
          selectedLayerId: null,
          selectedLayerIds: [],
          loadError: null,
        })
      }

      const overlayLayer = selectActiveOverlayLayer(state)
      if (overlayLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            overlayLayers: page.overlayLayers.filter((layer) => layer.id !== overlayLayer.id),
          })),
          selectedLayerId: null,
          selectedLayerIds: [],
          loadError: null,
        })
      }

      const messageWindowLayer = selectActiveMessageWindowLayer(state)
      if (messageWindowLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            messageWindowLayers: page.messageWindowLayers.filter((layer) => layer.id !== messageWindowLayer.id),
          })),
          selectedLayerId: null,
          selectedLayerIds: [],
          loadError: null,
        })
      }

      const watermarkLayer = selectActiveWatermarkLayer(state)
      if (watermarkLayer) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (page) => ({
            ...page,
            watermarkLayers: page.watermarkLayers.filter((layer) => layer.id !== watermarkLayer.id),
          })),
          selectedLayerId: null,
          selectedLayerIds: [],
          loadError: null,
        })
      }

      return state
    }),
  renameSelectedLayer: (name) =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }

      const nextName = name.trim() || null
      return withHistory(state, {
        pages: updateActivePage(state.pages, state.activePageId, (page) => ({
          ...page,
          textLayers: page.textLayers.map((layer) =>
            layer.id === state.selectedLayerId ? { ...layer, name: nextName } : layer,
          ),
          messageWindowLayers: page.messageWindowLayers.map((layer) =>
            layer.id === state.selectedLayerId ? { ...layer, name: nextName } : layer,
          ),
          bubbleLayers: page.bubbleLayers.map((layer) =>
            layer.id === state.selectedLayerId ? { ...layer, name: nextName } : layer,
          ),
          mosaicLayers: page.mosaicLayers.map((layer) =>
            layer.id === state.selectedLayerId ? { ...layer, name: nextName } : layer,
          ),
          overlayLayers: page.overlayLayers.map((layer) =>
            layer.id === state.selectedLayerId ? { ...layer, name: nextName } : layer,
          ),
          watermarkLayers: page.watermarkLayers.map((layer) =>
            layer.id === state.selectedLayerId ? { ...layer, name: nextName } : layer,
          ),
        })),
        loadError: null,
      })
    }),
  moveSelectedLayerBackward: () =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }

      const page = selectActiveImage(state)
      if (!page) {
        return state
      }
      const selectedLayerIds = new Set(getActionableLayerIds(state))

      if (selectedLayerIds.size > 1) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            textLayers: [...entry.textLayers].sort((a, b) =>
              selectedLayerIds.has(a.id) === selectedLayerIds.has(b.id) ? 0 : selectedLayerIds.has(a.id) ? -1 : 1,
            ),
            messageWindowLayers: [...entry.messageWindowLayers].sort((a, b) =>
              selectedLayerIds.has(a.id) === selectedLayerIds.has(b.id) ? 0 : selectedLayerIds.has(a.id) ? -1 : 1,
            ),
            bubbleLayers: [...entry.bubbleLayers].sort((a, b) =>
              selectedLayerIds.has(a.id) === selectedLayerIds.has(b.id) ? 0 : selectedLayerIds.has(a.id) ? -1 : 1,
            ),
            mosaicLayers: [...entry.mosaicLayers].sort((a, b) =>
              selectedLayerIds.has(a.id) === selectedLayerIds.has(b.id) ? 0 : selectedLayerIds.has(a.id) ? -1 : 1,
            ),
            overlayLayers: [...entry.overlayLayers].sort((a, b) =>
              selectedLayerIds.has(a.id) === selectedLayerIds.has(b.id) ? 0 : selectedLayerIds.has(a.id) ? -1 : 1,
            ),
            watermarkLayers: [...entry.watermarkLayers].sort((a, b) =>
              selectedLayerIds.has(a.id) === selectedLayerIds.has(b.id) ? 0 : selectedLayerIds.has(a.id) ? -1 : 1,
            ),
          })),
          loadError: null,
        })
      }

      const textLayer = selectActiveTextLayer(state)
      if (textLayer && !textLayer.locked) {
        const index = page.textLayers.findIndex((layer) => layer.id === textLayer.id)
        if (index <= 0) {
          return state
        }
        const nextLayers = [...page.textLayers]
        ;[nextLayers[index - 1], nextLayers[index]] = [nextLayers[index], nextLayers[index - 1]]
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            textLayers: nextLayers,
          })),
          loadError: null,
        })
      }

      const bubbleLayer = selectActiveBubbleLayer(state)
      if (bubbleLayer && !bubbleLayer.locked) {
        const index = page.bubbleLayers.findIndex((layer) => layer.id === bubbleLayer.id)
        if (index <= 0) {
          return state
        }
        const nextLayers = [...page.bubbleLayers]
        ;[nextLayers[index - 1], nextLayers[index]] = [nextLayers[index], nextLayers[index - 1]]
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            bubbleLayers: nextLayers,
          })),
          loadError: null,
        })
      }

      const messageWindowLayer = selectActiveMessageWindowLayer(state)
      if (messageWindowLayer && !messageWindowLayer.locked) {
        const index = page.messageWindowLayers.findIndex((layer) => layer.id === messageWindowLayer.id)
        if (index <= 0) {
          return state
        }
        const nextLayers = [...page.messageWindowLayers]
        ;[nextLayers[index - 1], nextLayers[index]] = [nextLayers[index], nextLayers[index - 1]]
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            messageWindowLayers: nextLayers,
          })),
          loadError: null,
        })
      }

      const mosaicLayer = selectActiveMosaicLayer(state)
      if (mosaicLayer && !mosaicLayer.locked) {
        const index = page.mosaicLayers.findIndex((layer) => layer.id === mosaicLayer.id)
        if (index <= 0) {
          return state
        }
        const nextLayers = [...page.mosaicLayers]
        ;[nextLayers[index - 1], nextLayers[index]] = [nextLayers[index], nextLayers[index - 1]]
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            mosaicLayers: nextLayers,
          })),
          loadError: null,
        })
      }

      const overlayLayer = selectActiveOverlayLayer(state)
      if (overlayLayer && !overlayLayer.locked) {
        const index = page.overlayLayers.findIndex((layer) => layer.id === overlayLayer.id)
        if (index <= 0) {
          return state
        }
        const nextLayers = [...page.overlayLayers]
        ;[nextLayers[index - 1], nextLayers[index]] = [nextLayers[index], nextLayers[index - 1]]
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            overlayLayers: nextLayers,
          })),
          loadError: null,
        })
      }

      const watermarkLayer = selectActiveWatermarkLayer(state)
      if (watermarkLayer && !watermarkLayer.locked) {
        const index = page.watermarkLayers.findIndex((layer) => layer.id === watermarkLayer.id)
        if (index <= 0) {
          return state
        }
        const nextLayers = [...page.watermarkLayers]
        ;[nextLayers[index - 1], nextLayers[index]] = [nextLayers[index], nextLayers[index - 1]]
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            watermarkLayers: nextLayers,
          })),
          loadError: null,
        })
      }

      return state
    }),
  moveSelectedLayerForward: () =>
    set((state) => {
      if (!state.activePageId || !state.selectedLayerId || state.selectedLayerId === 'base-image') {
        return state
      }

      const page = selectActiveImage(state)
      if (!page) {
        return state
      }
      const selectedLayerIds = new Set(getActionableLayerIds(state))

      if (selectedLayerIds.size > 1) {
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            textLayers: [...entry.textLayers].sort((a, b) =>
              selectedLayerIds.has(a.id) === selectedLayerIds.has(b.id) ? 0 : selectedLayerIds.has(a.id) ? 1 : -1,
            ),
            messageWindowLayers: [...entry.messageWindowLayers].sort((a, b) =>
              selectedLayerIds.has(a.id) === selectedLayerIds.has(b.id) ? 0 : selectedLayerIds.has(a.id) ? 1 : -1,
            ),
            bubbleLayers: [...entry.bubbleLayers].sort((a, b) =>
              selectedLayerIds.has(a.id) === selectedLayerIds.has(b.id) ? 0 : selectedLayerIds.has(a.id) ? 1 : -1,
            ),
            mosaicLayers: [...entry.mosaicLayers].sort((a, b) =>
              selectedLayerIds.has(a.id) === selectedLayerIds.has(b.id) ? 0 : selectedLayerIds.has(a.id) ? 1 : -1,
            ),
            overlayLayers: [...entry.overlayLayers].sort((a, b) =>
              selectedLayerIds.has(a.id) === selectedLayerIds.has(b.id) ? 0 : selectedLayerIds.has(a.id) ? 1 : -1,
            ),
            watermarkLayers: [...entry.watermarkLayers].sort((a, b) =>
              selectedLayerIds.has(a.id) === selectedLayerIds.has(b.id) ? 0 : selectedLayerIds.has(a.id) ? 1 : -1,
            ),
          })),
          loadError: null,
        })
      }

      const textLayer = selectActiveTextLayer(state)
      if (textLayer && !textLayer.locked) {
        const index = page.textLayers.findIndex((layer) => layer.id === textLayer.id)
        if (index === -1 || index >= page.textLayers.length - 1) {
          return state
        }
        const nextLayers = [...page.textLayers]
        ;[nextLayers[index], nextLayers[index + 1]] = [nextLayers[index + 1], nextLayers[index]]
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            textLayers: nextLayers,
          })),
          loadError: null,
        })
      }

      const bubbleLayer = selectActiveBubbleLayer(state)
      if (bubbleLayer && !bubbleLayer.locked) {
        const index = page.bubbleLayers.findIndex((layer) => layer.id === bubbleLayer.id)
        if (index === -1 || index >= page.bubbleLayers.length - 1) {
          return state
        }
        const nextLayers = [...page.bubbleLayers]
        ;[nextLayers[index], nextLayers[index + 1]] = [nextLayers[index + 1], nextLayers[index]]
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            bubbleLayers: nextLayers,
          })),
          loadError: null,
        })
      }

      const messageWindowLayer = selectActiveMessageWindowLayer(state)
      if (messageWindowLayer && !messageWindowLayer.locked) {
        const index = page.messageWindowLayers.findIndex((layer) => layer.id === messageWindowLayer.id)
        if (index === -1 || index >= page.messageWindowLayers.length - 1) {
          return state
        }
        const nextLayers = [...page.messageWindowLayers]
        ;[nextLayers[index], nextLayers[index + 1]] = [nextLayers[index + 1], nextLayers[index]]
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            messageWindowLayers: nextLayers,
          })),
          loadError: null,
        })
      }

      const mosaicLayer = selectActiveMosaicLayer(state)
      if (mosaicLayer && !mosaicLayer.locked) {
        const index = page.mosaicLayers.findIndex((layer) => layer.id === mosaicLayer.id)
        if (index === -1 || index >= page.mosaicLayers.length - 1) {
          return state
        }
        const nextLayers = [...page.mosaicLayers]
        ;[nextLayers[index], nextLayers[index + 1]] = [nextLayers[index + 1], nextLayers[index]]
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            mosaicLayers: nextLayers,
          })),
          loadError: null,
        })
      }

      const overlayLayer = selectActiveOverlayLayer(state)
      if (overlayLayer && !overlayLayer.locked) {
        const index = page.overlayLayers.findIndex((layer) => layer.id === overlayLayer.id)
        if (index === -1 || index >= page.overlayLayers.length - 1) {
          return state
        }
        const nextLayers = [...page.overlayLayers]
        ;[nextLayers[index], nextLayers[index + 1]] = [nextLayers[index + 1], nextLayers[index]]
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            overlayLayers: nextLayers,
          })),
          loadError: null,
        })
      }

      const watermarkLayer = selectActiveWatermarkLayer(state)
      if (watermarkLayer && !watermarkLayer.locked) {
        const index = page.watermarkLayers.findIndex((layer) => layer.id === watermarkLayer.id)
        if (index === -1 || index >= page.watermarkLayers.length - 1) {
          return state
        }
        const nextLayers = [...page.watermarkLayers]
        ;[nextLayers[index], nextLayers[index + 1]] = [nextLayers[index + 1], nextLayers[index]]
        return withHistory(state, {
          pages: updateActivePage(state.pages, state.activePageId, (entry) => ({
            ...entry,
            watermarkLayers: nextLayers,
          })),
          loadError: null,
        })
      }

      return state
    }),
  nudgeSelectedLayer: (dx, dy) =>
    set((state) => moveSelectedLayers(state, dx, dy)),
  deleteActivePage: () =>
    set((state) => {
      if (!state.activePageId) {
        return state
      }

      const currentIndex = state.pages.findIndex((page) => page.id === state.activePageId)
      if (currentIndex === -1) {
        return state
      }

      const nextPages = state.pages.filter((page) => page.id !== state.activePageId)
      const fallbackPage = nextPages[Math.max(0, currentIndex - 1)] ?? nextPages[0] ?? null

      return withHistory(state, {
        pages: nextPages,
        activePageId: fallbackPage?.id ?? null,
        loadError: null,
        selectedLayerId: null,
        imageTransform: fallbackPage ? { ...INITIAL_IMAGE_TRANSFORM } : null,
      })
    }),
  moveActivePageUp: () =>
    set((state) => {
      if (!state.activePageId) {
        return state
      }

      const index = state.pages.findIndex((page) => page.id === state.activePageId)
      if (index <= 0) {
        return state
      }

      const nextPages = [...state.pages]
      ;[nextPages[index - 1], nextPages[index]] = [nextPages[index], nextPages[index - 1]]
      return withHistory(state, { pages: nextPages })
    }),
  moveActivePageDown: () =>
    set((state) => {
      if (!state.activePageId) {
        return state
      }

      const index = state.pages.findIndex((page) => page.id === state.activePageId)
      if (index === -1 || index >= state.pages.length - 1) {
        return state
      }

      const nextPages = [...state.pages]
      ;[nextPages[index], nextPages[index + 1]] = [nextPages[index + 1], nextPages[index]]
      return withHistory(state, { pages: nextPages })
    }),
  movePageToIndex: (pageId, targetIndex) =>
    set((state) => {
      const index = state.pages.findIndex((page) => page.id === pageId)
      if (index === -1 || index === targetIndex) return state
      const nextPages = [...state.pages]
      const [removed] = nextPages.splice(index, 1)
      nextPages.splice(targetIndex, 0, removed)
      return withHistory(state, { pages: nextPages })
    }),
  moveLayerToIndex: (layerId, targetIndex) =>
    set((state) => {
      if (!state.activePageId) return state
      const pageIndex = state.pages.findIndex((p) => p.id === state.activePageId)
      if (pageIndex === -1) return state
      const page = state.pages[pageIndex]

      // Find which layer array contains this layer
      const layerArrays: (keyof Pick<CanvasImage, 'textLayers' | 'messageWindowLayers' | 'bubbleLayers' | 'mosaicLayers' | 'overlayLayers' | 'watermarkLayers'>)[] = [
        'textLayers', 'messageWindowLayers', 'bubbleLayers', 'mosaicLayers', 'overlayLayers', 'watermarkLayers',
      ]
      for (const key of layerArrays) {
        const arr = page[key] as Array<{ id: string }>
        const idx = arr.findIndex((l) => l.id === layerId)
        if (idx === -1) continue
        if (idx === targetIndex) return state
        const nextArr = [...arr]
        const [removed] = nextArr.splice(idx, 1)
        nextArr.splice(targetIndex, 0, removed)
        const nextPages = [...state.pages]
        nextPages[pageIndex] = { ...page, [key]: nextArr }
        return withHistory(state, { pages: nextPages })
      }
      return state
    }),
  setPageThumbnail: (pageId, dataUrl) =>
    set((state) => ({
      pageThumbnails: { ...state.pageThumbnails, [pageId]: dataUrl },
    })),
  selectPage: (pageId) =>
    set((state) => {
      const page = state.pages.find((entry) => entry.id === pageId)

      if (!page) {
        return state
      }

      return {
        activePageId: pageId,
        loadError: null,
        selectedLayerId: null,
        imageTransform: { ...INITIAL_IMAGE_TRANSFORM },
      }
    }),
  selectBaseImageLayer: () =>
    set((state) =>
      state.activePageId
        ? {
            selectedLayerId: 'base-image',
            selectedLayerIds: ['base-image'],
          }
        : state,
    ),
  moveSelection: (dx, dy) =>
    set((state) =>
      state.selectedLayerId === 'base-image' && state.imageTransform
        ? {
            imageTransform: {
              ...state.imageTransform,
              x: state.imageTransform.x + dx,
              y: state.imageTransform.y + dy,
            },
          }
        : state,
    ),
  scaleSelection: (factor) =>
    set((state) =>
      state.selectedLayerId === 'base-image' && state.imageTransform
        ? {
            imageTransform: {
              ...state.imageTransform,
              width: Math.round(state.imageTransform.width * factor),
              height: Math.round(state.imageTransform.height * factor),
            },
          }
        : state,
    ),
}))

export const resetWorkspaceStore = () => {
  useWorkspaceStore.setState(createInitialState())
}

export const selectActiveImage = (state: Pick<WorkspaceState, 'pages' | 'activePageId'>) =>
  state.pages.find((page) => page.id === state.activePageId) ?? null

export const toolLabels: Array<{ id: Tool; label: string }> = [
  { id: 'select', label: 'Select' },
  { id: 'text', label: 'Text' },
  { id: 'message-window', label: 'Message window' },
  { id: 'bubble', label: 'Bubble' },
  { id: 'mosaic', label: 'Mosaic' },
  { id: 'overlay', label: 'Overlay' },
]
