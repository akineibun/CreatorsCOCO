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
}

const TOOL_LABEL_JA_BY_ID: Record<Tool, string> = {
  select: '選択',
  text: '文字',
  'message-window': '会話枠',
  bubble: '吹き出し',
  mosaic: 'モザイク',
  'freehand-mosaic': '投げ縄',
  overlay: 'オーバーレイ',
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
    loadSampleImage,
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
        <nav aria-label="Primary navigation">
          <button type="button">File</button>
          <button type="button">Edit</button>
          <button type="button">View</button>
          <button type="button">Tools</button>
          <button type="button">Help</button>
        </nav>
      </header>

      <div className="workspace-grid">
        <aside aria-label="Tool palette" className="tool-palette">
          <div className="panel-title">ツール</div>
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
              <button type="button" onClick={loadSampleImage}>
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
              <button type="button" onClick={saveNow} disabled={!isDirty}>
                Save now
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
          <div className="canvas-surface">
            {image ? (
              <div className="canvas-stack">
                <KonvaCanvas
                  image={image}
                  imageTransform={imageTransform}
                  selectedLayerId={selectedLayerId}
                  selectedLayerIds={selectedLayerIds}
                  onSelectLayers={(ids, additive) => setSelectedLayerIds(ids, additive)}
                  onMoveSelectedLayers={(dx, dy) => moveSelectedLayersByDelta(dx, dy)}
                  onResizeSelectedLayers={(dx, dy, handle, preserveAspectRatio) =>
                    resizeSelectedLayersByDelta(dx, dy, handle, preserveAspectRatio)
                  }
                  onCursorMove={handleCursorMove}
                  className={selectedLayerId === 'base-image' ? 'canvas-frame loaded selected' : 'canvas-frame loaded'}
                />

                <div className="selection-controls" role="group" aria-label="Selection controls">
                  <button type="button" onClick={selectBaseImageLayer}>
                    Select base image layer
                  </button>
                  <button
                    type="button"
                    onClick={toggleSelectedLayerVisibility}
                    disabled={noLayerSelected}
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
                    disabled={noLayerSelected}
                  >
                    Duplicate selected layer
                  </button>
                  <button
                    type="button"
                    onClick={centerSelectedLayer}
                    disabled={noLayerSelected}
                  >
                    Center selected layer
                  </button>
                  <button
                    type="button"
                    onClick={moveSelectedLayerBackward}
                    disabled={noLayerSelected}
                  >
                    Move selected layer backward
                  </button>
                  <button
                    type="button"
                    onClick={moveSelectedLayerForward}
                    disabled={noLayerSelected}
                  >
                    Move selected layer forward
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedLayer}
                    disabled={noLayerSelected}
                  >
                    Delete selected layer
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayer('left')}
                    disabled={noLayerSelected}
                  >
                    Align selected layer left
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayer('right')}
                    disabled={noLayerSelected}
                  >
                    Align selected layer right
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayer('top')}
                    disabled={noLayerSelected}
                  >
                    Align selected layer top
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayer('bottom')}
                    disabled={noLayerSelected}
                  >
                    Align selected layer bottom
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayersCenter('horizontal')}
                    disabled={noLayerSelected}
                  >
                    Align selected layers center horizontally
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayersCenter('vertical')}
                    disabled={noLayerSelected}
                  >
                    Align selected layers center vertically
                  </button>
                  <button
                    type="button"
                    onClick={() => distributeSelectedLayers('horizontal')}
                    disabled={noLayerSelected}
                  >
                    Distribute selected layers horizontally
                  </button>
                  <button
                    type="button"
                    onClick={() => distributeSelectedLayers('vertical')}
                    disabled={noLayerSelected}
                  >
                    Distribute selected layers vertically
                  </button>
                  <button
                    type="button"
                    onClick={() => matchSelectedLayerSize('width')}
                    disabled={noLayerSelected}
                  >
                    Match selected layer widths
                  </button>
                  <button
                    type="button"
                    onClick={() => matchSelectedLayerSize('height')}
                    disabled={noLayerSelected}
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
                <TextLayerPanel />
                <MessageWindowPanel />
                <WatermarkPanel />
                <BubbleLayerPanel />
                <MosaicLayerPanel />
                <OverlayLayerPanel />
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
                      <PageThumb page={page} isActive={isActive} className="mb-1" />
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
              {!noLayerSelected ? (
                <div>
                  <dt>Visibility</dt>
                  <dd>{visibilityLabel}</dd>
                </div>
              ) : null}
              {!noLayerSelected ? (
                <div>
                  <dt>Lock</dt>
                  <dd>{lockLabel}</dd>
                </div>
              ) : null}
              <InspectorLayerDetails />
            </dl>
          </section>

          <LayersPanel />

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

          <BackendPanel />

          <PresetLibraryPanel />
          <ExportSettingsPanel onExportComplete={setExportMessage} />
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
