import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasMosaicLayer } from '../../stores/workspaceStore'

export function MosaicLayerPanel() {
  const {
    pages,
    activePageId,
    selectedLayerId,
    mosaicStylePresets,
    renameSelectedLayer,
    moveSelectedMosaicLayer,
    resizeSelectedMosaicLayer,
    changeSelectedMosaicIntensity,
    setSelectedMosaicIntensity,
    cycleSelectedMosaicStyle,
    setSelectedMosaicStyle,
    moveSelectedMosaicLayerBackward,
    moveSelectedMosaicLayerForward,
    duplicateSelectedMosaicLayer,
    saveSelectedMosaicStylePreset,
    applyMosaicStylePreset,
    deleteSelectedMosaicLayer,
  } = useWorkspaceStore()

  const image = selectActiveImage({ pages, activePageId })
  const activeLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? (image.mosaicLayers.find(l => l.id === selectedLayerId) as CanvasMosaicLayer | undefined) ?? null
      : null

  if (!activeLayer) return null

  return (
    <div className="selection-controls text-controls" role="group" aria-label="Mosaic layer controls">
      <label className="text-layer-field"><span>Layer name</span>
        <input type="text" aria-label="Selected layer name" value={activeLayer.name ?? ''} onChange={e => renameSelectedLayer(e.target.value)} />
      </label>
      <button type="button" onClick={() => moveSelectedMosaicLayer(-32, 0)}>Move mosaic left</button>
      <button type="button" onClick={() => moveSelectedMosaicLayer(32, 0)}>Move mosaic right</button>
      <button type="button" onClick={() => moveSelectedMosaicLayer(0, -32)}>Move mosaic up</button>
      <button type="button" onClick={() => moveSelectedMosaicLayer(0, 32)}>Move mosaic down</button>
      <button type="button" onClick={() => resizeSelectedMosaicLayer(-32, 0)}>Decrease mosaic width</button>
      <button type="button" onClick={() => resizeSelectedMosaicLayer(32, 0)}>Increase mosaic width</button>
      <button type="button" onClick={() => resizeSelectedMosaicLayer(0, -32)}>Decrease mosaic height</button>
      <button type="button" onClick={() => resizeSelectedMosaicLayer(0, 32)}>Increase mosaic height</button>
      <button type="button" onClick={() => changeSelectedMosaicIntensity(-4)}>Decrease mosaic intensity</button>
      <button type="button" onClick={() => changeSelectedMosaicIntensity(4)}>Increase mosaic intensity</button>
      <button type="button" onClick={() => setSelectedMosaicIntensity(8)}>Mosaic intensity Small</button>
      <button type="button" onClick={() => setSelectedMosaicIntensity(16)}>Mosaic intensity Medium</button>
      <button type="button" onClick={() => setSelectedMosaicIntensity(24)}>Mosaic intensity Large</button>
      <button type="button" onClick={cycleSelectedMosaicStyle}>Cycle mosaic style</button>
      <button type="button" onClick={() => setSelectedMosaicStyle('pixelate')}>Mosaic pixelate</button>
      <button type="button" onClick={() => setSelectedMosaicStyle('blur')}>Mosaic blur</button>
      <button type="button" onClick={() => setSelectedMosaicStyle('noise')}>Mosaic noise</button>
      <button type="button" onClick={moveSelectedMosaicLayerBackward}>Send mosaic backward</button>
      <button type="button" onClick={moveSelectedMosaicLayerForward}>Bring mosaic forward</button>
      <button type="button" onClick={duplicateSelectedMosaicLayer}>Duplicate mosaic layer</button>
      <button type="button" onClick={saveSelectedMosaicStylePreset}>Save mosaic preset</button>
      {mosaicStylePresets.length > 0 && (
        <div className="selection-controls">
          {mosaicStylePresets.map(preset => (
            <button key={preset.id} type="button" onClick={() => applyMosaicStylePreset(preset.id)}>
              {`Apply mosaic preset: ${preset.label}`}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={deleteSelectedMosaicLayer}>Delete mosaic layer</button>
    </div>
  )
}
