import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, MouseEvent as ReactMouseEvent } from 'react'
import {
  MousePointer2,
  Type,
  MessageSquare,
  MessageCircle,
  Grid2X2,
  Layers,
  Droplets,
  Undo2,
  Redo2,
  Save,
  Download,
  FileImage,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  FolderOpen,
  Stamp,
  GripVertical,
  PenLine,
  BookOpen,
  Brain,
  LayoutGrid,
} from 'lucide-react'
import { KonvaCanvas } from './components/KonvaCanvas'
import { PageThumb } from './components/PageThumb'
import { StatusBar } from './components/StatusBar'
import { TextLayerPanel } from './components/panels/TextLayerPanel'
import { MessageWindowPanel } from './components/panels/MessageWindowPanel'
import { WatermarkPanel } from './components/panels/WatermarkPanel'
import { BubbleLayerPanel } from './components/panels/BubbleLayerPanel'
import { MosaicLayerPanel } from './components/panels/MosaicLayerPanel'
import { OverlayLayerPanel } from './components/panels/OverlayLayerPanel'
import { LayersPanel } from './components/panels/LayersPanel'
import { InspectorLayerDetails } from './components/panels/InspectorLayerDetails'
import { BackendPanel } from './components/panels/BackendPanel'
import { PresetLibraryPanel } from './components/panels/PresetLibraryPanel'
import { ExportSettingsPanel } from './components/panels/ExportSettingsPanel'
import { Button } from './components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip'
import type { ResizeHandle, Tool } from './stores/workspaceStore'
import { selectActiveImage, toolLabels, useWorkspaceStore } from './stores/workspaceStore'

const TOOL_ICON_BY_ID: Record<Tool, React.ReactNode> = {
  select: <MousePointer2 className="w-5 h-5" />,
  text: <Type className="w-5 h-5" />,
  'message-window': <MessageSquare className="w-5 h-5" />,
  bubble: <MessageCircle className="w-5 h-5" />,
  mosaic: <Grid2X2 className="w-5 h-5" />,
  'freehand-mosaic': <PenLine className="w-5 h-5" />,
  overlay: <Layers className="w-5 h-5" />,
  library: <BookOpen className="w-5 h-5" />,
  backend: <Brain className="w-5 h-5" />,
  export: <Download className="w-5 h-5" />,
}

const TOOL_LABEL_JA_BY_ID: Record<Tool, string> = {
  select: '選択',
  text: '文字',
  'message-window': '会話枠',
  bubble: '吹き出し',
  mosaic: 'モザイク',
  'freehand-mosaic': '投げ縄',
  overlay: 'オーバーレイ',
  library: 'プリセット',
  backend: 'バックエンド',
  export: '書き出し',
}

const LAYER_TOOLS: Tool[] = ['text', 'message-window', 'bubble', 'mosaic', 'freehand-mosaic', 'overlay', 'watermark' as Tool]

const getToolbarBg = (tool: Tool): string => {
  if (LAYER_TOOLS.includes(tool)) return '#2d4a3e'
  if (tool === 'export') return '#3a2d1a'
  if (tool === 'library') return '#2d1a3a'
  if (tool === 'backend') return '#1a2d3a'
  return '#1a1a2e'
}

const getCanvasBorderColor = (tool: Tool): string => {
  if (LAYER_TOOLS.includes(tool)) return '#4a8c6a'
  if (tool === 'export') return '#c8882a'
  if (tool === 'library') return '#8a4ac8'
  if (tool === 'backend') return '#2a7ec8'
  return '#3a3a5e'
}

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

function App() {
  const [exportMessage, setExportMessage] = useState('Export idle')
  const [cursorX, setCursorX] = useState(0)
  const [cursorY, setCursorY] = useState(0)
  const handleCursorMove = useCallback((x: number, y: number) => {
    setCursorX(x)
    setCursorY(y)
  }, [])
  const [projectNameDraft, setProjectNameDraft] = useState('Untitled project')
  const [widthDraft, setWidthDraft] = useState('1920')
  const [heightDraft, setHeightDraft] = useState('1080')
  const [prefixDraft, setPrefixDraft] = useState('creators-coco')
  const [startNumberDraft, setStartNumberDraft] = useState('1')
  const [numberPaddingDraft, setNumberPaddingDraft] = useState('2')
  const [duplicatePageTextDraft, setDuplicatePageTextDraft] = useState('Variant line')
  const [variantBatchDraft, setVariantBatchDraft] = useState('Variant A\nVariant B')
  const [showGallery, setShowGallery] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLElement>(null)
  const [quickTextDraft, setQuickTextDraft] = useState('')
  const [bottomTab, setBottomTab] = useState<'text' | 'variant'>('text')
  const [marqueeSelection, setMarqueeSelection] = useState<MarqueeSelection | null>(null)
  const [layerDragState, setLayerDragState] = useState<LayerDragState | null>(null)
  const [layerResizeState, setLayerResizeState] = useState<LayerResizeState | null>(null)
  const dragPageId = useRef<string | null>(null)
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
    loadImageFile,
    loadImageFiles,
    selectPage,
    duplicateActivePage,
    duplicateActivePageWithTextSwap,
    duplicateActivePageWithTextVariants,
    setActivePageVariantLabel,
    addTextLayer,
    addWatermarkLayer,
    loadWatermarkImageFile,
    addBubbleLayer,
    addMessageWindowLayer,
    addMosaicLayer,
    addOverlayLayer,
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
    undo,
    redo,
    selectBaseImageLayer,
    moveSelection,
    scaleSelection,
    zoomIn,
    zoomOut,
    pageThumbnails,
    movePageToIndex,
  } = useWorkspaceStore()
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
  const activePageVariantLabel = image?.variantLabel?.trim() ?? ''
  const activePageVariantSourceLabel =
    image?.variantSourcePageId && image.variantSourcePageId !== image.id ? image.variantSourcePageId : null
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
  const _activeAnyLayer =
    activeTextLayer ?? activeMessageWindowLayer ?? activeBubbleLayer ?? activeMosaicLayer ?? activeOverlayLayer ?? activeWatermarkLayer
  const visibilityLabel = _activeAnyLayer
    ? `Visibility ${_activeAnyLayer.visible ? 'Visible' : 'Hidden'}`
    : 'Visibility -'
  const lockLabel = _activeAnyLayer
    ? `Lock ${_activeAnyLayer.locked ? 'Locked' : 'Unlocked'}`
    : 'Lock -'

  const noLayerSelected =
    !activeTextLayer &&
    !activeMessageWindowLayer &&
    !activeBubbleLayer &&
    !activeMosaicLayer &&
    !activeOverlayLayer &&
    !activeWatermarkLayer
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
  }, [projectName])

  const getCanvasCoordinatesFromRect = (clientX: number, clientY: number, rect: DOMRect | Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>) => {
    const relativeX = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
    const relativeY = rect.height > 0 ? (clientY - rect.top) / rect.height : 0

    return {
      x: Math.max(0, Math.min(1920, Math.round(relativeX * 1920))),
      y: Math.max(0, Math.min(1080, Math.round(relativeY * 1080))),
    }
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

  const commitProjectNameDraft = () => {
    setProjectName(projectNameDraft)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    if (files.length === 0) {
      return
    }

    if (files.length === 1 && files[0]) {
      loadImageFile(files[0])
    } else {
      loadImageFiles(files)
    }
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
  }, [restoreSavedProject])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isDirty) {
      return
    }

    const timer = window.setTimeout(() => {
      saveNow()
    }, 300000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isDirty, saveNow])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const target = event.target as HTMLElement
      const isEditing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

      if (!(event.ctrlKey || event.metaKey)) {
        if (!isEditing && event.key === 'ArrowLeft') {
          event.preventDefault()
          nudgeSelectedLayer(-32, 0)
        } else if (!isEditing && event.key === 'ArrowRight') {
          event.preventDefault()
          nudgeSelectedLayer(32, 0)
        } else if (!isEditing && event.key === 'ArrowUp') {
          event.preventDefault()
          nudgeSelectedLayer(0, -32)
        } else if (!isEditing && event.key === 'ArrowDown') {
          event.preventDefault()
          nudgeSelectedLayer(0, 32)
        } else if (!isEditing) {
          if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault()
            deleteSelectedLayer()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            setSelectedLayerIds([])
          } else if (key === 'v') {
            event.preventDefault()
            setActiveTool('select')
          } else if (key === 't') {
            event.preventDefault()
            setActiveTool('text')
          } else if (key === 'w') {
            event.preventDefault()
            setActiveTool('message-window')
          } else if (key === 'b') {
            event.preventDefault()
            setActiveTool('bubble')
          } else if (key === 'm') {
            event.preventDefault()
            setActiveTool('mosaic')
          } else if (key === 'p') {
            event.preventDefault()
            setActiveTool('freehand-mosaic')
          } else if (key === 'l') {
            event.preventDefault()
            setActiveTool('overlay')
          }
        }
        return
      }

      if (key === 's') {
        event.preventDefault()
        saveNow()
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
        return
      }

      if (key === 'd') {
        event.preventDefault()
        duplicateActivePage()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [nudgeSelectedLayer, redo, saveNow, undo, deleteSelectedLayer, setSelectedLayerIds, setActiveTool, duplicateActivePage])

  return (
    <div className="app-shell">
      <header aria-label="Main menu" className="menu-bar">
        <div className="brand">
          <strong>CreatorsCOCO</strong>
          <span>{projectName}</span>
        </div>
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
      </header>

      <div className="workspace-grid" data-active-tool={activeTool}>
        <aside aria-label="Tool palette" className="tool-palette" style={{background: getToolbarBg(activeTool)}}>
          {/* ── Side menus ── */}
          <nav aria-label="Primary navigation" className="side-menu-nav" ref={menuBarRef}>
            {/* ファイル */}
            <div>
              <button type="button" className={menuOpen === 'file' ? 'open' : ''} onClick={() => setMenuOpen(menuOpen === 'file' ? null : 'file')}>ファイル</button>
              {menuOpen === 'file' && (
                <div className="side-menu-dropdown">
                  <label>
                    画像を開く
                    <input aria-label="画像ファイルを開く" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" multiple style={{display:'none'}} onChange={(e) => { handleFileChange(e); setMenuOpen(null) }} />
                  </label>
                  <label>
                    ウォーターマーク素材
                    <input aria-label="ウォーターマーク画像を開く" type="file" accept=".png,image/png" style={{display:'none'}} onChange={(e) => { handleWatermarkFileChange(e); setMenuOpen(null) }} />
                  </label>
                  <hr />
                  <button type="button" onClick={() => { saveNow(); setMenuOpen(null) }} disabled={!isDirty}>今すぐ保存</button>
                </div>
              )}
            </div>

            {/* 編集 */}
            <div>
              <button type="button" className={menuOpen === 'edit' ? 'open' : ''} onClick={() => setMenuOpen(menuOpen === 'edit' ? null : 'edit')}>編集</button>
              {menuOpen === 'edit' && (
                <div className="side-menu-dropdown">
                  <button type="button" onClick={() => { undo(); setMenuOpen(null) }} disabled={undoStack.length === 0}>元に戻す</button>
                  <button type="button" onClick={() => { redo(); setMenuOpen(null) }} disabled={redoStack.length === 0}>やり直す</button>
                  <hr />
                  <button type="button" onClick={() => { selectAllVisibleLayers(); setMenuOpen(null) }} disabled={!image}>表示レイヤーをすべて選択</button>
                  <button type="button" onClick={() => { selectVisibleLayersByType('text'); setMenuOpen(null) }} disabled={!image}>テキストレイヤーを選択</button>
                  <button type="button" onClick={() => { selectVisibleLayersByType('message-window'); setMenuOpen(null) }} disabled={!image}>会話枠レイヤーを選択</button>
                  <button type="button" onClick={() => { selectVisibleLayersByType('bubble'); setMenuOpen(null) }} disabled={!image}>吹き出しレイヤーを選択</button>
                  <button type="button" onClick={() => { selectVisibleLayersByType('mosaic'); setMenuOpen(null) }} disabled={!image}>モザイクレイヤーを選択</button>
                  <button type="button" onClick={() => { selectVisibleLayersByType('overlay'); setMenuOpen(null) }} disabled={!image}>オーバーレイレイヤーを選択</button>
                  <button type="button" onClick={() => { selectVisibleLayersByType('watermark'); setMenuOpen(null) }} disabled={!image}>ウォーターマークレイヤーを選択</button>
                  <hr />
                  <button type="button" onClick={() => { invertLayerSelection(); setMenuOpen(null) }} disabled={!image}>選択を反転</button>
                  <button type="button" onClick={() => { clearLayerSelection(); setMenuOpen(null) }} disabled={!selectedLayerId}>選択を解除</button>
                </div>
              )}
            </div>

            {/* ページ */}
            <div>
              <button type="button" className={menuOpen === 'page' ? 'open' : ''} onClick={() => setMenuOpen(menuOpen === 'page' ? null : 'page')}>ページ</button>
              {menuOpen === 'page' && (
                <div className="side-menu-dropdown">
                  <button type="button" onClick={() => { duplicateActivePage(); setMenuOpen(null) }} disabled={!image}>このページを複製</button>
                  <button type="button" onClick={() => { deleteActivePage(); setMenuOpen(null) }} disabled={!image}>このページを削除</button>
                </div>
              )}
            </div>

            {/* レイヤー */}
            <div>
              <button type="button" className={menuOpen === 'layer' ? 'open' : ''} onClick={() => setMenuOpen(menuOpen === 'layer' ? null : 'layer')}>レイヤー</button>
              {menuOpen === 'layer' && (
                <div className="side-menu-dropdown">
                  {/* 追加 */}
                  <button type="button" onClick={() => { addTextLayer(); setMenuOpen(null) }} disabled={!image}>テキストを追加</button>
                  <button type="button" onClick={() => { addMessageWindowLayer(); setMenuOpen(null) }} disabled={!image}>会話枠を追加</button>
                  <button type="button" onClick={() => { addBubbleLayer(); setMenuOpen(null) }} disabled={!image}>吹き出しを追加</button>
                  <button type="button" onClick={() => { addMosaicLayer(); setMenuOpen(null) }} disabled={!image}>モザイクを追加</button>
                  <button type="button" onClick={() => { addOverlayLayer(); setMenuOpen(null) }} disabled={!image}>オーバーレイを追加</button>
                  <button type="button" onClick={() => { addWatermarkLayer(); setMenuOpen(null) }} disabled={!image}>ウォーターマークを追加</button>
                  <hr />
                  {/* 選択対象 */}
                  <button type="button" onClick={() => { selectBaseImageLayer(); setMenuOpen(null) }} disabled={!image}>ベース画像を選択</button>
                  <button type="button" onClick={() => { toggleSelectedLayerVisibility(); setMenuOpen(null) }} disabled={noLayerSelected}>表示／非表示を切り替え</button>
                  <button type="button" onClick={() => { toggleSelectedLayerLock(); setMenuOpen(null) }} disabled={noLayerSelected}>ロック／解除を切り替え</button>
                  <hr />
                  {/* グループ */}
                  <button type="button" onClick={() => { groupSelectedLayers(); setMenuOpen(null) }} disabled={selectedLayerCount < 2}>レイヤーをグループ化</button>
                  <button type="button" onClick={() => { selectGroupedLayers(); setMenuOpen(null) }} disabled={!activeLayerGroupId}>グループ内を全選択</button>
                  <button type="button" onClick={() => { ungroupSelectedLayers(); setMenuOpen(null) }} disabled={!activeLayerGroupId && selectedLayerCount < 2}>グループを解除</button>
                  <hr />
                  {/* 操作 */}
                  <button type="button" onClick={() => { duplicateSelectedLayer(); setMenuOpen(null) }} disabled={noLayerSelected}>レイヤーを複製</button>
                  <button type="button" onClick={() => { centerSelectedLayer(); setMenuOpen(null) }} disabled={noLayerSelected}>中央に配置</button>
                  <button type="button" onClick={() => { moveSelectedLayerBackward(); setMenuOpen(null) }} disabled={noLayerSelected}>背面へ移動</button>
                  <button type="button" onClick={() => { moveSelectedLayerForward(); setMenuOpen(null) }} disabled={noLayerSelected}>前面へ移動</button>
                  <button type="button" onClick={() => { deleteSelectedLayer(); setMenuOpen(null) }} disabled={noLayerSelected}>レイヤーを削除</button>
                  <hr />
                  {/* 揃え */}
                  <button type="button" onClick={() => { alignSelectedLayer('left'); setMenuOpen(null) }} disabled={noLayerSelected}>左揃え</button>
                  <button type="button" onClick={() => { alignSelectedLayer('right'); setMenuOpen(null) }} disabled={noLayerSelected}>右揃え</button>
                  <button type="button" onClick={() => { alignSelectedLayer('top'); setMenuOpen(null) }} disabled={noLayerSelected}>上揃え</button>
                  <button type="button" onClick={() => { alignSelectedLayer('bottom'); setMenuOpen(null) }} disabled={noLayerSelected}>下揃え</button>
                  <button type="button" onClick={() => { alignSelectedLayersCenter('horizontal'); setMenuOpen(null) }} disabled={noLayerSelected}>水平方向に中央揃え</button>
                  <button type="button" onClick={() => { alignSelectedLayersCenter('vertical'); setMenuOpen(null) }} disabled={noLayerSelected}>垂直方向に中央揃え</button>
                  <button type="button" onClick={() => { distributeSelectedLayers('horizontal'); setMenuOpen(null) }} disabled={noLayerSelected}>水平方向に等間隔配置</button>
                  <button type="button" onClick={() => { distributeSelectedLayers('vertical'); setMenuOpen(null) }} disabled={noLayerSelected}>垂直方向に等間隔配置</button>
                  <button type="button" onClick={() => { matchSelectedLayerSize('width'); setMenuOpen(null) }} disabled={noLayerSelected}>幅を揃える</button>
                  <button type="button" onClick={() => { matchSelectedLayerSize('height'); setMenuOpen(null) }} disabled={noLayerSelected}>高さを揃える</button>
                  <hr />
                  {/* 移動・スケール */}
                  <button type="button" onClick={() => { moveSelection(-32, 0); setMenuOpen(null) }} disabled={noLayerSelected}>左へ移動</button>
                  <button type="button" onClick={() => { moveSelection(32, 0); setMenuOpen(null) }} disabled={noLayerSelected}>右へ移動</button>
                  <button type="button" onClick={() => { moveSelection(0, -32); setMenuOpen(null) }} disabled={noLayerSelected}>上へ移動</button>
                  <button type="button" onClick={() => { moveSelection(0, 32); setMenuOpen(null) }} disabled={noLayerSelected}>下へ移動</button>
                  <button type="button" onClick={() => { scaleSelection(0.9); setMenuOpen(null) }} disabled={noLayerSelected}>縮小</button>
                  <button type="button" onClick={() => { scaleSelection(1.125); setMenuOpen(null) }} disabled={noLayerSelected}>拡大</button>
                </div>
              )}
            </div>
          </nav>

          {/* ── Scrollable inner area ── */}
          <div className="tool-palette-inner">
            <div className="panel-title" style={{fontSize:11, opacity:0.6, marginBottom:6}}>ツール</div>
            <TooltipProvider delayDuration={400}>
              <div className="tool-stack" role="toolbar" aria-label="Tool palette">
                {toolLabels.map((tool) => (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={tool.id === activeTool ? 'tool-button active' : 'tool-button'}
                        aria-label={tool.label}
                        aria-pressed={tool.id === activeTool}
                        onClick={() => setActiveTool(tool.id)}
                      >
                        <span className="tool-button-icon" aria-hidden="true">{TOOL_ICON_BY_ID[tool.id]}</span>
                        <span className="tool-button-label">{TOOL_LABEL_JA_BY_ID[tool.id]}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{TOOL_LABEL_JA_BY_ID[tool.id]}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>

            {/* ── Layer property panels ── */}
            <div className="left-panels">
              <TextLayerPanel />
              <MessageWindowPanel />
              <WatermarkPanel />
              <BubbleLayerPanel />
              <MosaicLayerPanel />
              <OverlayLayerPanel />
            </div>
          </div>

          <div className="tool-palette-bottom" style={{flexShrink:0, padding:'6px', borderTop:'1px solid rgba(255,255,255,0.1)'}}>
            <div style={{display:'flex', gap:2, marginBottom:4}}>
              <button
                type="button"
                style={{flex:1, fontSize:10, padding:'2px', background: bottomTab === 'text' ? '#2d4a3e' : '#1a1a2e', border:'1px solid #333', color:'#e8d5c0', borderRadius:3, cursor:'pointer'}}
                onClick={() => setBottomTab('text')}
              >テキスト</button>
              <button
                type="button"
                style={{flex:1, fontSize:10, padding:'2px', background: bottomTab === 'variant' ? '#2d4a3e' : '#1a1a2e', border:'1px solid #333', color:'#e8d5c0', borderRadius:3, cursor:'pointer'}}
                onClick={() => setBottomTab('variant')}
              >差し替え</button>
            </div>
            {bottomTab === 'text' && (
              <div>
                <input
                  type="text"
                  placeholder="テキスト入力..."
                  value={quickTextDraft}
                  onChange={(e) => setQuickTextDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && image) { addTextLayer(); setQuickTextDraft('') } }}
                  disabled={!image}
                  style={{width:'100%', fontSize:11, padding:'3px 5px', background:'#1a1a2e', border:'1px solid #333', color:'#e8d5c0', borderRadius:3, marginBottom:4, boxSizing:'border-box'}}
                />
                <button
                  type="button"
                  onClick={() => { if (image) { addTextLayer(); setQuickTextDraft('') } }}
                  disabled={!image}
                  style={{width:'100%', fontSize:11, padding:'4px', background:'#2d4a3e', border:'none', color:'#e8d5c0', borderRadius:3, cursor: image ? 'pointer' : 'default', opacity: image ? 1 : 0.5}}
                >
                  テキスト追加
                </button>
              </div>
            )}
            {bottomTab === 'variant' && (
              <div style={{display:'flex', flexDirection:'column', gap:4}}>
                <input
                  aria-label="ページ複製時のテキスト差し替え"
                  type="text"
                  placeholder="差し替えテキスト..."
                  value={duplicatePageTextDraft}
                  onChange={(e) => setDuplicatePageTextDraft(e.target.value)}
                  style={{width:'100%', fontSize:11, padding:'3px 5px', background:'#1a1a2e', border:'1px solid #333', color:'#e8d5c0', borderRadius:3, boxSizing:'border-box'}}
                />
                <button
                  type="button"
                  onClick={() => duplicateActivePageWithTextSwap(duplicatePageTextDraft)}
                  disabled={!image}
                  style={{width:'100%', fontSize:11, padding:'4px', background:'#2d4a3e', border:'none', color:'#e8d5c0', borderRadius:3, cursor: image ? 'pointer' : 'default', opacity: image ? 1 : 0.5}}
                >
                  テキスト差し替えで複製
                </button>
                <textarea
                  aria-label="ページ複製バリアント一括入力"
                  placeholder="バリアント一括..."
                  value={variantBatchDraft}
                  onChange={(e) => setVariantBatchDraft(e.target.value)}
                  rows={3}
                  style={{width:'100%', fontSize:11, padding:'3px 5px', background:'#1a1a2e', border:'1px solid #333', color:'#e8d5c0', borderRadius:3, boxSizing:'border-box', resize:'vertical'}}
                />
                <button
                  type="button"
                  onClick={() => duplicateActivePageWithTextVariants(variantBatchDraft.split('\n'))}
                  disabled={!image}
                  style={{width:'100%', fontSize:11, padding:'4px', background:'#2d4a3e', border:'none', color:'#e8d5c0', borderRadius:3, cursor: image ? 'pointer' : 'default', opacity: image ? 1 : 0.5}}
                >
                  バリアントを一括複製
                </button>
                <input
                  aria-label="アクティブページのバリアントラベル"
                  type="text"
                  placeholder="バリアントラベル..."
                  value={image?.variantLabel ?? ''}
                  onChange={(e) => setActivePageVariantLabel(e.target.value)}
                  disabled={!image}
                  style={{width:'100%', fontSize:11, padding:'3px 5px', background:'#1a1a2e', border:'1px solid #333', color:'#e8d5c0', borderRadius:3, boxSizing:'border-box'}}
                />
              </div>
            )}
          </div>
        </aside>

        <main
          aria-label="Canvas workspace"
          className="canvas-panel"
          style={{borderLeft: `3px solid ${getCanvasBorderColor(activeTool)}`}}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
          onDrop={(e) => {
            e.preventDefault()
            const files = Array.from(e.dataTransfer.files ?? [])
            if (files.length > 0) loadImageFiles(files)
          }}
        >
          <div className="panel-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 8px'}}>
            <div className="panel-title">メインキャンバス</div>
            <div style={{display:'flex', alignItems:'center', gap:4}}>
              <button type="button" onClick={zoomOut} style={{padding:'2px 8px', fontSize:12}}>縮小</button>
              <span style={{fontSize:12, minWidth:40, textAlign:'center'}}>{zoomPercent}%</span>
              <button type="button" onClick={zoomIn} style={{padding:'2px 8px', fontSize:12}}>拡大</button>
            </div>
          </div>
          <div className="canvas-surface">
            {showGallery ? (
              <div style={{display:'flex',flexWrap:'wrap',gap:'16px',padding:'16px',overflowY:'auto',height:'100%',alignContent:'flex-start'}}>
                {pages.map((page, index) => {
                  const thumb = pageThumbnails[page.id]
                  const isActive = page.id === activePageId
                  return (
                    <div
                      key={page.id}
                      style={{
                        display:'flex',flexDirection:'column',alignItems:'center',gap:'6px',cursor:'pointer',
                        border: isActive ? '3px solid #bf8f52' : '2px solid rgba(255,255,255,0.15)',
                        borderRadius:'6px',padding:'8px',background: isActive ? 'rgba(191,143,82,0.1)' : 'rgba(255,255,255,0.04)',
                        minWidth:'180px',maxWidth:'220px',
                      }}
                      onClick={() => { selectPage(page.id); setShowGallery(false) }}
                    >
                      {thumb ? (
                        <img src={thumb} alt={page.name} style={{width:'200px',height:'auto',borderRadius:'3px',objectFit:'contain'}} />
                      ) : (
                        <div style={{width:'200px',height:'113px',background:'rgba(255,255,255,0.08)',borderRadius:'3px',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.3)',fontSize:'12px'}}>
                          No preview
                        </div>
                      )}
                      <span style={{fontSize:'11px',opacity:0.6}}>{`${index + 1}`.padStart(2,'0')}</span>
                      <strong style={{fontSize:'12px',textAlign:'center',wordBreak:'break-word'}}>{page.name}</strong>
                    </div>
                  )
                })}
              </div>
            ) : image ? (
              <KonvaCanvas
                image={image}
                imageTransform={imageTransform}
                selectedLayerId={selectedLayerId}
                selectedLayerIds={selectedLayerIds}
                zoomPercent={zoomPercent}
                onSelectLayers={(ids, additive) => setSelectedLayerIds(ids, additive)}
                onMoveSelectedLayers={(dx, dy) => moveSelectedLayersByDelta(dx, dy)}
                onResizeSelectedLayers={(dx, dy, handle, preserveAspectRatio) =>
                  resizeSelectedLayersByDelta(dx, dy, handle, preserveAspectRatio)
                }
                onCursorMove={handleCursorMove}
                className={selectedLayerId === 'base-image' ? 'canvas-frame loaded selected' : 'canvas-frame loaded'}
              />
            ) : (
              <button
                type="button"
                className="canvas-empty-state drop-zone-button"
                aria-label="Canvas drop zone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleCanvasDrop}
              >
                <strong>画像をドロップするか、ファイルを選択してください</strong>
                <span>ズーム・パン操作はページが読み込まれると有効になります。</span>
                {loadError ? <span className="error-text">{loadError}</span> : null}
              </button>
            )}
          </div>
        </main>

        <div className="right-sidebar">
          <aside aria-label="ページ一覧" className="sidebar-card">
            <div className="panel-title" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <span>ページ</span>
              <button
                type="button"
                title={showGallery ? 'ギャラリーを閉じる' : 'ギャラリー表示'}
                style={{fontSize:'0.75em', padding:'2px 6px', opacity: 0.8}}
                onClick={() => setShowGallery((v) => !v)}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <div className="page-list">
              {pages.length === 0 ? (
                <div className="page-card current empty">
                  <span>01</span>
                  <strong>表紙（下書き）</strong>
                </div>
              ) : (
                pages.map((page, index) => {
                  const pageNumber = `${index + 1}`.padStart(2, '0')
                  const isActive = page.id === activePageId

                  return (
                    <div
                      key={page.id}
                      className={isActive ? 'page-card current page-card-dnd' : 'page-card page-card-dnd'}
                      draggable
                      onDragStart={() => { dragPageId.current = page.id }}
                      onDragOver={(e) => { e.preventDefault() }}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (dragPageId.current && dragPageId.current !== page.id) {
                          movePageToIndex(dragPageId.current, index)
                          dragPageId.current = null
                        }
                      }}
                    >
                      <div style={{cursor:'pointer'}} onClick={() => selectPage(page.id)}>
                        <PageThumb page={page} isActive={isActive} className="mb-1" />
                      </div>
                      <button
                        type="button"
                        className="page-card-info page-button"
                        aria-pressed={isActive}
                        onClick={() => selectPage(page.id)}
                        aria-label={`Open page ${pageNumber}: ${page.name}`}
                      >
                        <GripVertical className="w-3 h-3 opacity-30 shrink-0" />
                        <span>{pageNumber}</span>
                        <strong className="truncate">{page.name}</strong>
                        {page.variantLabel ? <small>{`V${page.variantLabel}`}</small> : null}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            <div className="page-meta">
              {pageCount === 1 ? '1 ページ読み込み済み' : `${pageCount} ページ読み込み済み`}
            </div>
            {loadError ? <div className="page-meta error-text">{loadError}</div> : null}
          </aside>

          {activeTool !== 'export' && activeTool !== 'library' && activeTool !== 'backend' ? (
            <section aria-label="プロパティインスペクター" className="sidebar-card">
              <div className="panel-title">インスペクター</div>
              <dl className="inspector-grid">
                <div>
                  <dt>選択</dt>
                  <dd>{selectedLayerCount > 1 ? `${selectedLayerCount} 個のレイヤーを選択中` : selectionLabel}</dd>
                </div>
                <div>
                  <dt>ツール</dt>
                  <dd>{activeTool}</dd>
                </div>
                <div>
                  <dt>出力</dt>
                  <dd>{`${outputSettings.width} x ${outputSettings.height} ${outputSettings.format.toUpperCase()}`}</dd>
                </div>
                {activePageVariantLabel ? (
                  <div>
                    <dt>バリアント</dt>
                    <dd>{`バリアント ${activePageVariantLabel}`}</dd>
                  </div>
                ) : null}
                {activePageVariantSourceLabel ? (
                  <div>
                    <dt>元バリアント</dt>
                    <dd>{`元 ${activePageVariantSourceLabel}`}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>位置</dt>
                  <dd>{positionLabel}</dd>
                </div>
                <div>
                  <dt>サイズ</dt>
                  <dd>{sizeLabel}</dd>
                </div>
                {selectionBoundsLabel ? (
                  <div>
                    <dt>選択範囲</dt>
                    <dd>{selectionBoundsLabel}</dd>
                  </div>
                ) : null}
                {selectedLayerTypeLabel ? (
                  <div>
                    <dt>選択タイプ</dt>
                    <dd>{selectedLayerTypeLabel}</dd>
                  </div>
                ) : null}
                {multiSelectionActionLabel ? (
                  <div>
                    <dt>共通操作</dt>
                    <dd>{multiSelectionActionLabel}</dd>
                  </div>
                ) : null}
                {activeLayerGroupId ? (
                  <div>
                    <dt>グループ</dt>
                    <dd>{`グループ内 ${activeLayerGroupCount} レイヤー`}</dd>
                  </div>
                ) : null}
                {!noLayerSelected ? (
                  <div>
                    <dt>表示</dt>
                    <dd>{visibilityLabel}</dd>
                  </div>
                ) : null}
                {!noLayerSelected ? (
                  <div>
                    <dt>ロック</dt>
                    <dd>{lockLabel}</dd>
                  </div>
                ) : null}
                <InspectorLayerDetails />
              </dl>
            </section>
          ) : null}

          {activeTool !== 'export' && activeTool !== 'library' && activeTool !== 'backend' ? (
            <LayersPanel />
          ) : null}

          {activeTool === 'select' ? (
            <section aria-label="最近のプロジェクト" className="sidebar-card">
              <div className="panel-title">最近のプロジェクト</div>
              <div className="page-list">
                {recentProjects.length === 0 ? (
                  <div className="page-card empty">
                    <strong>保存済みプロジェクトはありません</strong>
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
          ) : null}

          {activeTool === 'backend' ? <BackendPanel /> : null}

          {activeTool === 'library' ? <PresetLibraryPanel /> : null}
          {activeTool === 'export' ? <ExportSettingsPanel onExportComplete={setExportMessage} /> : null}
        </div>
      </div>

      <StatusBar
        zoomPercent={zoomPercent}
        imageWidth={image?.width ?? null}
        imageHeight={image?.height ?? null}
        cursorX={cursorX}
        cursorY={cursorY}
        saveStatusLabel={saveStatusLabel}
        exportMessage={exportMessage}
      />

    </div>
  )
}

export default App
