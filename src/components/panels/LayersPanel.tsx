import type { MouseEvent } from 'react'
import { useRef } from 'react'
import type React from 'react'
import { Eye, EyeOff, Lock, Unlock, ImageIcon, Type, MessageSquare, MessageCircle, Grid2X2, Layers, Stamp, GripVertical } from 'lucide-react'
import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'

export function LayersPanel() {
  const dragLayerId = useRef<string | null>(null)

  const {
    pages,
    activePageId,
    selectedLayerId,
    selectTextLayer,
    selectBubbleLayer,
    selectMessageWindowLayer,
    selectMosaicLayer,
    selectOverlayLayer,
    selectWatermarkLayer,
    selectBaseImageLayer,
    toggleLayerVisibilityById,
    toggleLayerLockById,
    moveLayerToIndex,
    setAllLayersVisible,
  } = useWorkspaceStore()

  const image = selectActiveImage({ pages, activePageId })

  // helper: is event additive selection (ctrl/cmd)
  const isAdditive = (e: MouseEvent) => e.ctrlKey || e.metaKey || e.shiftKey

  const allLayers = [
    ...(image?.textLayers ?? []).map(l => ({ ...l, type: 'text' as const })),
    ...(image?.messageWindowLayers ?? []).map(l => ({ ...l, type: 'message' as const })),
    ...(image?.bubbleLayers ?? []).map(l => ({ ...l, type: 'bubble' as const })),
    ...(image?.mosaicLayers ?? []).map(l => ({ ...l, type: 'mosaic' as const })),
    ...(image?.overlayLayers ?? []).map(l => ({ ...l, type: 'overlay' as const })),
    ...(image?.watermarkLayers ?? []).map(l => ({ ...l, type: 'watermark' as const })),
  ]

  const TYPE_ICON: Record<string, React.ReactNode> = {
    text: <Type className="w-3 h-3" />,
    message: <MessageSquare className="w-3 h-3" />,
    bubble: <MessageCircle className="w-3 h-3" />,
    mosaic: <Grid2X2 className="w-3 h-3" />,
    overlay: <Layers className="w-3 h-3" />,
    watermark: <Stamp className="w-3 h-3" />,
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const TYPE_LABEL: Record<string, string> = {
    text: 'T',
    message: 'W',
    bubble: 'B',
    mosaic: 'M',
    overlay: 'O',
    watermark: 'WM',
  }

  const getLabel = (layer: typeof allLayers[number]): string => {
    if (layer.name?.trim()) return layer.name.trim()
    if ('text' in layer && layer.text) return (layer.text as string).slice(0, 20)
    if ('speaker' in layer && layer.speaker) return (layer.speaker as string).slice(0, 20)
    return layer.id.slice(-6)
  }

  const handleSelect = (layer: typeof allLayers[number], e: MouseEvent) => {
    const additive = isAdditive(e)
    switch (layer.type) {
      case 'text': selectTextLayer(layer.id, additive); break
      case 'message': selectMessageWindowLayer(layer.id, additive); break
      case 'bubble': selectBubbleLayer(layer.id, additive); break
      case 'mosaic': selectMosaicLayer(layer.id, additive); break
      case 'overlay': selectOverlayLayer(layer.id, additive); break
      case 'watermark': selectWatermarkLayer(layer.id, additive); break
    }
  }

  return (
    <section aria-label="レイヤーパネル" className="sidebar-card">
      <div className="panel-title flex items-center justify-between">
        <span>レイヤー</span>
        <div className="flex gap-1">
          <button type="button" className="layer-visibility" title="全レイヤーを表示" aria-label="Show all layers" onClick={() => setAllLayersVisible(true)}>
            <Eye className="w-3 h-3" />
          </button>
          <button type="button" className="layer-visibility" title="全レイヤーを非表示" aria-label="Hide all layers" onClick={() => setAllLayersVisible(false)}>
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>
      <ul className="layer-list">
        <li className={selectedLayerId === 'base-image' ? 'selected-layer' : undefined}>
          <button
            type="button"
            className="layer-visibility"
            aria-label="Base image"
            onClick={() => selectBaseImageLayer()}
          >
            <ImageIcon className="w-3 h-3" />
          </button>
          <button
            type="button"
            className="layer-select-button"
            onClick={() => selectBaseImageLayer()}
          >
            {image ? 'ベース画像' : '画像なし'}
          </button>
        </li>
        {allLayers.map((layer, index) => {
          const isSelected = selectedLayerId === layer.id
          const isVisible = layer.visible !== false
          return (
            <li
              key={layer.id}
              className={isSelected ? 'selected-layer' : undefined}
              draggable
              onDragStart={() => { dragLayerId.current = layer.id }}
              onDragOver={(e) => { e.preventDefault() }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragLayerId.current && dragLayerId.current !== layer.id) {
                  moveLayerToIndex(dragLayerId.current, index)
                  dragLayerId.current = null
                }
              }}
            >
              <button
                type="button"
                className="layer-visibility"
                aria-label={`Toggle visibility: ${getLabel(layer)}`}
                title={isVisible ? 'レイヤーを隠す' : 'レイヤーを表示'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLayerVisibilityById(layer.id)
                }}
              >
                {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-40" />}
              </button>
              <button
                type="button"
                className="layer-visibility"
                aria-label={`Toggle lock: ${getLabel(layer)}`}
                title={layer.locked ? 'ロック解除' : 'レイヤーをロック'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLayerLockById(layer.id)
                }}
              >
                {layer.locked ? <Lock className="w-3 h-3 text-[#d7b48a]" /> : <Unlock className="w-3 h-3 opacity-40" />}
              </button>
              <span className="layer-visibility text-[rgba(215,180,138,0.8)]">
                {TYPE_ICON[layer.type]}
              </span>
              <span className="layer-visibility opacity-30 cursor-grab" aria-hidden="true">
                <GripVertical className="w-3 h-3" />
              </span>
              <button
                type="button"
                className={`layer-select-button${isVisible ? '' : ' opacity-40'}`}
                onClick={(e) => handleSelect(layer, e)}
                aria-label={`Select ${layer.type} layer: ${getLabel(layer)}`}
              >
                {getLabel(layer)}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
