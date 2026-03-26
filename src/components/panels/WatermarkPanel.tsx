import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasWatermarkLayer } from '../../stores/workspaceStore'

export function WatermarkPanel() {
  const {
    pages,
    activePageId,
    selectedLayerId,
    watermarkStylePresets,
    renameSelectedLayer,
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
    duplicateSelectedLayer,
    moveSelectedLayerBackward,
    moveSelectedLayerForward,
    deleteSelectedLayer,
  } = useWorkspaceStore()

  const image = selectActiveImage({ pages, activePageId })
  const activeLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? (image.watermarkLayers.find(l => l.id === selectedLayerId) as CanvasWatermarkLayer | undefined) ?? null
      : null

  if (!activeLayer) return null

  return (
    <div className="selection-controls text-controls" role="group" aria-label="Watermark layer controls">
      <label className="text-layer-field"><span>Layer name</span>
        <input type="text" aria-label="Selected layer name" value={activeLayer.name ?? ''} onChange={e => renameSelectedLayer(e.target.value)} />
      </label>
      <label className="text-layer-field"><span>Watermark</span>
        <input type="text" aria-label="Selected watermark text" value={activeLayer.text} onChange={e => updateSelectedWatermarkText(e.target.value)} />
      </label>
      <button type="button" onClick={() => changeSelectedWatermarkOpacity(-0.1)}>Decrease watermark opacity</button>
      <button type="button" onClick={() => changeSelectedWatermarkOpacity(0.1)}>Increase watermark opacity</button>
      <button type="button" onClick={toggleSelectedWatermarkPattern}>Toggle watermark pattern</button>
      <button type="button" onClick={() => setSelectedWatermarkPreset('patreon')}>Apply Patreon CTA watermark</button>
      <button type="button" onClick={() => setSelectedWatermarkPreset('discord')}>Apply Discord CTA watermark</button>
      <button type="button" onClick={() => changeSelectedWatermarkAngle(-8)}>Rotate watermark less</button>
      <button type="button" onClick={() => changeSelectedWatermarkAngle(8)}>Rotate watermark more</button>
      <button type="button" onClick={() => changeSelectedWatermarkDensity(-1)}>Decrease watermark density</button>
      <button type="button" onClick={() => changeSelectedWatermarkDensity(1)}>Increase watermark density</button>
      <button type="button" onClick={() => moveSelectedWatermarkLayer(-96, 0)}>Move watermark left</button>
      <button type="button" onClick={() => moveSelectedWatermarkLayer(96, 0)}>Move watermark right</button>
      <button type="button" onClick={() => moveSelectedWatermarkLayer(0, -64)}>Move watermark up</button>
      <button type="button" onClick={() => moveSelectedWatermarkLayer(0, 64)}>Move watermark down</button>
      <button type="button" onClick={() => changeSelectedWatermarkScale(-0.2)}>Decrease watermark scale</button>
      <button type="button" onClick={() => changeSelectedWatermarkScale(0.2)}>Increase watermark scale</button>
      <button type="button" onClick={toggleSelectedWatermarkTileLayout}>Toggle watermark tile layout</button>
      <button type="button" onClick={saveSelectedWatermarkStylePreset}>Save watermark preset</button>
      {watermarkStylePresets.length > 0 && (
        <div className="selection-controls">
          {watermarkStylePresets.map(preset => (
            <button key={preset.id} type="button" onClick={() => applyWatermarkStylePreset(preset.id)}>
              {`Apply watermark preset: ${preset.label}`}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={duplicateSelectedLayer}>Duplicate watermark layer</button>
      <button type="button" onClick={moveSelectedLayerBackward}>Send watermark backward</button>
      <button type="button" onClick={moveSelectedLayerForward}>Bring watermark forward</button>
      <button type="button" onClick={deleteSelectedLayer}>Delete watermark layer</button>
    </div>
  )
}
