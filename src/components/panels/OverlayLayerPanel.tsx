import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasOverlayLayer } from '../../stores/workspaceStore'

export function OverlayLayerPanel() {
  const {
    pages,
    activePageId,
    selectedLayerId,
    overlayStylePresets,
    renameSelectedLayer,
    setSelectedOverlayColor,
    cycleSelectedOverlayAreaPreset,
    setSelectedOverlayAreaPreset,
    toggleSelectedOverlayFillMode,
    setSelectedOverlayGradientFrom,
    setSelectedOverlayGradientTo,
    cycleSelectedOverlayGradientDirection,
    moveSelectedOverlayLayer,
    changeSelectedOverlayOpacity,
    moveSelectedOverlayLayerBackward,
    moveSelectedOverlayLayerForward,
    duplicateSelectedOverlayLayer,
    saveSelectedOverlayStylePreset,
    applyOverlayStylePreset,
    deleteSelectedOverlayLayer,
  } = useWorkspaceStore()

  const image = selectActiveImage({ pages, activePageId })
  const activeLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? (image.overlayLayers.find(l => l.id === selectedLayerId) as CanvasOverlayLayer | undefined) ?? null
      : null

  if (!activeLayer) return null

  return (
    <div className="selection-controls text-controls" role="group" aria-label="Overlay layer controls">
      <label className="text-layer-field"><span>Layer name</span>
        <input type="text" aria-label="Selected layer name" value={activeLayer.name ?? ''} onChange={e => renameSelectedLayer(e.target.value)} />
      </label>
      <label className="text-layer-field color-field"><span>Tint</span>
        <input type="color" aria-label="Selected overlay color" value={activeLayer.color} onChange={e => setSelectedOverlayColor(e.target.value)} />
      </label>
      <button type="button" onClick={cycleSelectedOverlayAreaPreset}>Cycle overlay area</button>
      <button type="button" onClick={() => setSelectedOverlayAreaPreset('full')}>Overlay full</button>
      <button type="button" onClick={() => setSelectedOverlayAreaPreset('top-half')}>Overlay top half</button>
      <button type="button" onClick={() => setSelectedOverlayAreaPreset('bottom-half')}>Overlay bottom half</button>
      <button type="button" onClick={() => setSelectedOverlayAreaPreset('center-band')}>Overlay center band</button>
      <button type="button" onClick={toggleSelectedOverlayFillMode}>Toggle overlay gradient</button>
      <label className="text-layer-field color-field"><span>Gradient from</span>
        <input type="color" aria-label="Selected overlay gradient from" value={activeLayer.gradientFrom} onChange={e => setSelectedOverlayGradientFrom(e.target.value)} />
      </label>
      <label className="text-layer-field color-field"><span>Gradient to</span>
        <input type="color" aria-label="Selected overlay gradient to" value={activeLayer.gradientTo} onChange={e => setSelectedOverlayGradientTo(e.target.value)} />
      </label>
      <button type="button" onClick={cycleSelectedOverlayGradientDirection}>Cycle overlay gradient direction</button>
      <button type="button" onClick={() => moveSelectedOverlayLayer(-32, 0)}>Move overlay left</button>
      <button type="button" onClick={() => moveSelectedOverlayLayer(32, 0)}>Move overlay right</button>
      <button type="button" onClick={() => changeSelectedOverlayOpacity(-0.1)}>Decrease overlay opacity</button>
      <button type="button" onClick={() => changeSelectedOverlayOpacity(0.1)}>Increase overlay opacity</button>
      <button type="button" onClick={moveSelectedOverlayLayerBackward}>Send overlay backward</button>
      <button type="button" onClick={moveSelectedOverlayLayerForward}>Bring overlay forward</button>
      <button type="button" onClick={duplicateSelectedOverlayLayer}>Duplicate overlay layer</button>
      <button type="button" onClick={saveSelectedOverlayStylePreset}>Save overlay preset</button>
      {overlayStylePresets.length > 0 && (
        <div className="selection-controls">
          {overlayStylePresets.map(preset => (
            <button key={preset.id} type="button" onClick={() => applyOverlayStylePreset(preset.id)}>
              {`Apply overlay preset: ${preset.label}`}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={deleteSelectedOverlayLayer}>Delete overlay layer</button>
    </div>
  )
}
