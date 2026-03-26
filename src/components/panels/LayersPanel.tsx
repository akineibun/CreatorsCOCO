import type { MouseEvent } from 'react'
import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'

export function LayersPanel() {
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
    <section aria-label="Layer panel" className="sidebar-card">
      <div className="panel-title">Layers</div>
      <ul className="layer-list">
        <li className={selectedLayerId === 'base-image' ? 'selected-layer' : undefined}>
          <button
            type="button"
            className="layer-visibility-btn"
            aria-label="Base image visibility"
            onClick={() => selectBaseImageLayer()}
          >
            👁
          </button>
          <span className="layer-type-badge">IMG</span>
          <button
            type="button"
            className="layer-select-button"
            onClick={() => selectBaseImageLayer()}
          >
            {image ? 'Base image' : 'No image'}
          </button>
        </li>
        {allLayers.map((layer) => {
          const isSelected = selectedLayerId === layer.id
          const isVisible = layer.visible !== false
          return (
            <li
              key={layer.id}
              className={isSelected ? 'selected-layer' : undefined}
            >
              <button
                type="button"
                className={`layer-visibility-btn${isVisible ? '' : ' layer-hidden'}`}
                aria-label={`Toggle visibility: ${getLabel(layer)}`}
                title={isVisible ? 'Hide layer' : 'Show layer'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLayerVisibilityById(layer.id)
                }}
              >
                {isVisible ? '👁' : '🚫'}
              </button>
              <button
                type="button"
                className={`layer-lock-btn${layer.locked ? ' layer-locked' : ''}`}
                aria-label={`Toggle lock: ${getLabel(layer)}`}
                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLayerLockById(layer.id)
                }}
              >
                {layer.locked ? '🔒' : '🔓'}
              </button>
              <span className="layer-type-badge">{TYPE_LABEL[layer.type]}</span>
              <button
                type="button"
                className={`layer-select-button${isVisible ? '' : ' layer-name-hidden'}`}
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
