import { useEffect, useState } from 'react'
import type { ChangeEvent, DragEvent, MouseEvent as ReactMouseEvent } from 'react'
import {
  createPdfExportName,
  createPngExportName,
  createZipEntryName,
  createZipExportName,
} from './lib/export/fileNames'
import { exportPageAsPdf } from './lib/export/pdfExporter'
import { exportPageAsPng } from './lib/export/pngExporter'
import { exportPagesAsZip } from './lib/export/zipExporter'
import type { ResizeHandle } from './stores/workspaceStore'
import { outputPresets, selectActiveImage, toolLabels, useWorkspaceStore } from './stores/workspaceStore'

const EXPORT_HISTORY_STORAGE_KEY = 'creators-coco.export-history'

type ExportHistoryEntry = {
  format: 'PNG' | 'PDF' | 'ZIP'
  label: string
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
  const [recentExports, setRecentExports] = useState<ExportHistoryEntry[]>([])
  const [projectNameDraft, setProjectNameDraft] = useState('Untitled project')
  const [widthDraft, setWidthDraft] = useState('1920')
  const [heightDraft, setHeightDraft] = useState('1080')
  const [prefixDraft, setPrefixDraft] = useState('creators-coco')
  const [startNumberDraft, setStartNumberDraft] = useState('1')
  const [numberPaddingDraft, setNumberPaddingDraft] = useState('2')
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
    setFileNamePrefix,
    setStartNumber,
    setNumberPadding,
    loadSampleImage,
    loadImageFile,
    loadImageFiles,
    selectPage,
    addTextLayer,
    addBubbleLayer,
    selectTextLayer,
    selectBubbleLayer,
    updateSelectedTextLayerText,
    moveSelectedTextLayer,
    changeSelectedTextLayerFontSize,
    setSelectedTextLayerColor,
    deleteSelectedTextLayer,
    moveSelectedTextLayerBackward,
    moveSelectedTextLayerForward,
    toggleSelectedTextLayerVertical,
    changeSelectedTextLayerOutlineWidth,
    toggleSelectedTextLayerShadow,
    updateSelectedBubbleLayerText,
    moveSelectedBubbleLayer,
    deleteSelectedBubbleLayer,
    resizeSelectedBubbleLayer,
    setSelectedBubbleTailDirection,
    setSelectedBubbleStylePreset,
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
    duplicateSelectedMosaicLayer,
    moveSelectedMosaicLayerBackward,
    moveSelectedMosaicLayerForward,
    deleteSelectedMosaicLayer,
    addOverlayLayer,
    selectOverlayLayer,
    moveSelectedOverlayLayer,
    changeSelectedOverlayOpacity,
    setSelectedOverlayColor,
    duplicateSelectedOverlayLayer,
    moveSelectedOverlayLayerBackward,
    moveSelectedOverlayLayerForward,
    deleteSelectedOverlayLayer,
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
  const activeMosaicLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? image.mosaicLayers.find((layer) => layer.id === selectedLayerId) ?? null
      : null
  const activeOverlayLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? image.overlayLayers.find((layer) => layer.id === selectedLayerId) ?? null
      : null
  const activeLayerGroupId =
    activeTextLayer?.groupId ??
    activeBubbleLayer?.groupId ??
    activeMosaicLayer?.groupId ??
    activeOverlayLayer?.groupId ??
    null
  const activeLayerGroupCount =
    image && activeLayerGroupId
      ? [
          ...image.textLayers.filter((layer) => layer.groupId === activeLayerGroupId),
          ...image.bubbleLayers.filter((layer) => layer.groupId === activeLayerGroupId),
          ...image.mosaicLayers.filter((layer) => layer.groupId === activeLayerGroupId),
          ...image.overlayLayers.filter((layer) => layer.groupId === activeLayerGroupId),
        ].length
      : 0
  const pageCount = pages.length
  const activePageIndex = activePageId ? Math.max(0, pages.findIndex((page) => page.id === activePageId)) : 0
  const pngPreviewName = image ? createPngExportName(image.name, outputSettings, activePageIndex) : 'No active page'
  const pdfPreviewName = image ? createPdfExportName(image.name, outputSettings, activePageIndex) : 'No active page'
  const zipPreviewName = pageCount > 0 ? createZipExportName(outputSettings, pageCount) : 'No pages loaded'
  const zipEntryPreviewNames = pages.map((page, index) => createZipEntryName(page.name, outputSettings, index))
  const activeTextLayerOrder =
    image && activeTextLayer
      ? image.textLayers.findIndex((layer) => layer.id === activeTextLayer.id) + 1
      : 0
  const selectedLayerCount = selectedLayerIds.filter((id) => id !== 'base-image').length
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
        : activeBubbleLayer
          ? 'Bubble layer'
          : activeMosaicLayer
            ? 'Mosaic layer'
            : activeOverlayLayer
              ? 'Overlay layer'
          : 'None'
  const positionLabel =
    selectedLayerId === 'base-image' && imageTransform
      ? `Position ${imageTransform.x}, ${imageTransform.y}`
      : activeTextLayer
        ? `Position ${activeTextLayer.x}, ${activeTextLayer.y}`
        : activeBubbleLayer
          ? `Position ${activeBubbleLayer.x}, ${activeBubbleLayer.y}`
          : activeMosaicLayer
            ? `Position ${activeMosaicLayer.x}, ${activeMosaicLayer.y}`
            : activeOverlayLayer
              ? `Position ${activeOverlayLayer.x}, ${activeOverlayLayer.y}`
        : 'Position -'
  const sizeLabel =
    selectedLayerId === 'base-image' && imageTransform
      ? `Size ${imageTransform.width} x ${imageTransform.height}`
      : activeTextLayer
        ? `Font ${activeTextLayer.fontSize} px`
        : activeBubbleLayer
          ? `Size ${activeBubbleLayer.width} x ${activeBubbleLayer.height}`
          : activeMosaicLayer
            ? `Size ${activeMosaicLayer.width} x ${activeMosaicLayer.height}`
            : activeOverlayLayer
              ? `Size ${activeOverlayLayer.width} x ${activeOverlayLayer.height}`
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

  const pushExportHistory = (entry: ExportHistoryEntry) => {
    setRecentExports((current) => [entry, ...current].slice(0, 5))
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

  const handleExportPng = async () => {
    if (!image) {
      return
    }

    await exportPageAsPng(image, imageTransform, outputSettings, activePageIndex)
    setExportMessage(`Exported ${image.name} as PNG`)
    pushExportHistory({ format: 'PNG', label: image.name })
  }

  const handleExportZip = async () => {
    if (pages.length === 0) {
      return
    }

    await exportPagesAsZip(pages, outputSettings)
    setExportMessage(`Exported ${pages.length} pages as ZIP`)
    pushExportHistory({ format: 'ZIP', label: `${pages.length} pages` })
  }

  const handleExportPdf = async () => {
    if (!image) {
      return
    }

    await exportPageAsPdf(image, imageTransform, outputSettings, activePageIndex)
    setExportMessage(`Exported ${image.name} as PDF`)
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

  const handleCanvasDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files ?? [])
    if (files.length > 0) {
      loadImageFiles(files)
    }
  }

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
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [nudgeSelectedLayer, redo, saveNow, undo])

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
              <button type="button" onClick={loadSampleImage}>
                Load sample image
              </button>
              <button type="button" onClick={selectAllVisibleLayers} disabled={!image}>
                Select all visible layers
              </button>
              <button type="button" onClick={() => selectVisibleLayersByType('text')} disabled={!image}>
                Select text layers
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
              <button type="button" onClick={invertLayerSelection} disabled={!image}>
                Invert layer selection
              </button>
              <button type="button" onClick={clearLayerSelection} disabled={!selectedLayerId}>
                Clear layer selection
              </button>
              <button type="button" onClick={addTextLayer} disabled={!image}>
                Add text layer
              </button>
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
                <div
                  aria-label="Canvas frame"
                  className={selectedLayerId === 'base-image' ? 'canvas-frame loaded selected' : 'canvas-frame loaded'}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                >
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
                  {image.textLayers.filter((layer) => layer.visible).map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      className={selectedLayerId === layer.id ? 'text-layer-chip selected' : 'text-layer-chip'}
                      style={{
                        left: `${layer.x / 10}%`,
                        top: `${layer.y / 10}%`,
                        fontSize: `${Math.max(14, Math.round(layer.fontSize * 0.65))}px`,
                        color: layer.color,
                        writingMode: layer.isVertical ? 'vertical-rl' : 'horizontal-tb',
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
                        borderRadius: layer.stylePreset === 'thought' ? '40%' : '999px',
                        background: layer.fillColor,
                        borderColor: layer.borderColor,
                      }}
                      onClick={(event) => selectBubbleLayer(layer.id, isAdditiveSelection(event))}
                      onMouseDown={(event) => handleLayerMouseDown(event, layer.id)}
                      aria-label={`Select bubble layer: ${layer.text}`}
                    >
                      {layer.text}
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
                        backgroundSize: `${Math.max(6, layer.intensity)}px ${Math.max(6, layer.intensity)}px`,
                      }}
                      onClick={(event) => selectMosaicLayer(layer.id, isAdditiveSelection(event))}
                      onMouseDown={(event) => handleLayerMouseDown(event, layer.id)}
                      aria-label={`Select mosaic layer ${layer.intensity}`}
                    >
                      Mosaic
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
                        background: layer.color,
                        opacity: layer.opacity,
                      }}
                      onClick={(event) => selectOverlayLayer(layer.id, isAdditiveSelection(event))}
                      onMouseDown={(event) => handleLayerMouseDown(event, layer.id)}
                      aria-label={`Select overlay layer ${layer.opacity}`}
                    >
                      Overlay
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
                    disabled={!activeTextLayer && !activeBubbleLayer && !activeMosaicLayer && !activeOverlayLayer}
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
                    <button type="button" onClick={() => moveSelectedTextLayer(32, 0)}>
                      Move text right
                    </button>
                    <button type="button" onClick={() => moveSelectedTextLayer(0, 32)}>
                      Move text down
                    </button>
                    <button type="button" onClick={() => changeSelectedTextLayerFontSize(2)}>
                      Increase text size
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
                {activeBubbleLayer ? (
                  <div className="selection-controls text-controls" role="group" aria-label="Bubble layer controls">
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
                    <button type="button" onClick={moveSelectedBubbleLayerBackward}>
                      Send bubble backward
                    </button>
                    <button type="button" onClick={moveSelectedBubbleLayerForward}>
                      Bring bubble forward
                    </button>
                    <button type="button" onClick={duplicateSelectedBubbleLayer}>
                      Duplicate bubble layer
                    </button>
                    <button type="button" onClick={deleteSelectedBubbleLayer}>
                      Delete bubble layer
                    </button>
                  </div>
                ) : null}
                {activeMosaicLayer ? (
                  <div className="selection-controls text-controls" role="group" aria-label="Mosaic layer controls">
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
                    <button type="button" onClick={moveSelectedMosaicLayerBackward}>
                      Send mosaic backward
                    </button>
                    <button type="button" onClick={moveSelectedMosaicLayerForward}>
                      Bring mosaic forward
                    </button>
                    <button type="button" onClick={duplicateSelectedMosaicLayer}>
                      Duplicate mosaic layer
                    </button>
                    <button type="button" onClick={deleteSelectedMosaicLayer}>
                      Delete mosaic layer
                    </button>
                  </div>
                ) : null}
                {activeOverlayLayer ? (
                  <div className="selection-controls text-controls" role="group" aria-label="Overlay layer controls">
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
                    <dt>Color</dt>
                    <dd>{`Color ${activeTextLayer.color}`}</dd>
                  </div>
                  <div>
                    <dt>Direction</dt>
                    <dd>{`Direction ${activeTextLayer.isVertical ? 'Vertical' : 'Horizontal'}`}</dd>
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
              {activeBubbleLayer ? (
                <>
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
                    <dt>Mosaic</dt>
                    <dd>{`Mosaic intensity ${activeMosaicLayer.intensity}`}</dd>
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
                    <dt>Overlay</dt>
                    <dd>{`Overlay opacity ${activeOverlayLayer.opacity.toFixed(1)}`}</dd>
                  </div>
                  <div>
                    <dt>Tint</dt>
                    <dd>{`Tint ${activeOverlayLayer.color}`}</dd>
                  </div>
                  <div>
                    <dt>Order</dt>
                    <dd>{`Order ${(image?.overlayLayers.findIndex((layer) => layer.id === activeOverlayLayer.id) ?? -1) + 1} of ${image?.overlayLayers.length ?? 0}`}</dd>
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
                      aria-label={`Layer text: ${layer.text}${layer.groupId ? ' grouped' : ''} (${image.textLayers.findIndex((entry) => entry.id === layer.id) + 1})`}
                    >
                      Text: {layer.text}{layer.groupId ? ' [Group]' : ''}
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
                    Bubble layer: {layer.text}{layer.groupId ? ' [Group]' : ''}
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
                      aria-label={`Mosaic layer ${layer.intensity} (${image.mosaicLayers.findIndex((entry) => entry.id === layer.id) + 1})`}
                    >
                      Mosaic: {layer.intensity}{layer.groupId ? ' [Group]' : ''}
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
                      aria-label={`Overlay layer ${layer.opacity.toFixed(1)}${layer.groupId ? ' grouped' : ''} (${image.overlayLayers.findIndex((entry) => entry.id === layer.id) + 1})`}
                    >
                      Overlay: {layer.opacity.toFixed(1)}{layer.groupId ? ' [Group]' : ''}
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
            <div className="page-meta">Output preset {outputSettings.label}</div>
            <div className="page-meta">Export prefix {outputSettings.fileNamePrefix}</div>
            <div className="page-meta">
              Export numbering {outputSettings.startNumber} / pad {outputSettings.numberPadding}
            </div>
            <div className="export-preview">
              <div className="panel-title">Export preview</div>
              <div className="page-meta">PNG {pngPreviewName}</div>
              <div className="page-meta">PDF {pdfPreviewName}</div>
              <div className="page-meta">ZIP {zipPreviewName}</div>
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
        <span>Cursor 0, 0</span>
      </footer>
    </div>
  )
}

export default App
