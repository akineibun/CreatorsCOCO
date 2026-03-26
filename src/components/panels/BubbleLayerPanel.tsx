import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasBubbleLayer } from '../../stores/workspaceStore'

export function BubbleLayerPanel() {
  const {
    pages,
    activePageId,
    selectedLayerId,
    bubbleStylePresets,
    renameSelectedLayer,
    updateSelectedBubbleLayerText,
    setSelectedBubbleFillColor,
    setSelectedBubbleBorderColor,
    moveSelectedBubbleLayer,
    resizeSelectedBubbleLayer,
    setSelectedBubbleTailDirection,
    setSelectedBubbleStylePreset,
    setSelectedBubbleShape,
    randomizeSelectedBubbleShape,
    moveSelectedBubbleLayerBackward,
    moveSelectedBubbleLayerForward,
    duplicateSelectedBubbleLayer,
    saveSelectedBubbleStylePreset,
    applyBubbleStylePreset,
    deleteSelectedBubbleLayer,
  } = useWorkspaceStore()

  const image = selectActiveImage({ pages, activePageId })
  const activeLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? (image.bubbleLayers.find(l => l.id === selectedLayerId) as CanvasBubbleLayer | undefined) ?? null
      : null

  if (!activeLayer) return null

  return (
    <div className="selection-controls text-controls" role="group" aria-label="Bubble layer controls">
      <label className="text-layer-field"><span>Layer name</span>
        <input type="text" aria-label="Selected layer name" value={activeLayer.name ?? ''} onChange={e => renameSelectedLayer(e.target.value)} />
      </label>
      <label className="text-layer-field"><span>Bubble</span>
        <input type="text" aria-label="Selected bubble content" value={activeLayer.text} onChange={e => updateSelectedBubbleLayerText(e.target.value)} />
      </label>
      <label className="text-layer-field color-field"><span>Fill</span>
        <input type="color" aria-label="Selected bubble fill color" value={activeLayer.fillColor} onChange={e => setSelectedBubbleFillColor(e.target.value)} />
      </label>
      <label className="text-layer-field color-field"><span>Border</span>
        <input type="color" aria-label="Selected bubble border color" value={activeLayer.borderColor} onChange={e => setSelectedBubbleBorderColor(e.target.value)} />
      </label>
      <button type="button" onClick={() => moveSelectedBubbleLayer(-32, 0)}>Move bubble left</button>
      <button type="button" onClick={() => moveSelectedBubbleLayer(32, 0)}>Move bubble right</button>
      <button type="button" onClick={() => moveSelectedBubbleLayer(0, -32)}>Move bubble up</button>
      <button type="button" onClick={() => moveSelectedBubbleLayer(0, 32)}>Move bubble down</button>
      <button type="button" onClick={() => resizeSelectedBubbleLayer(-32, 0)}>Decrease bubble width</button>
      <button type="button" onClick={() => resizeSelectedBubbleLayer(32, 0)}>Increase bubble width</button>
      <button type="button" onClick={() => resizeSelectedBubbleLayer(0, -32)}>Decrease bubble height</button>
      <button type="button" onClick={() => resizeSelectedBubbleLayer(0, 32)}>Increase bubble height</button>
      <button type="button" onClick={() => setSelectedBubbleTailDirection('left')}>Tail left</button>
      <button type="button" onClick={() => setSelectedBubbleTailDirection('right')}>Tail right</button>
      <button type="button" onClick={() => setSelectedBubbleTailDirection('bottom')}>Tail bottom</button>
      <button type="button" onClick={() => setSelectedBubbleStylePreset('speech')}>Style speech</button>
      <button type="button" onClick={() => setSelectedBubbleStylePreset('thought')}>Style thought</button>
      <button type="button" onClick={() => setSelectedBubbleShape('round')}>Shape round</button>
      <button type="button" onClick={() => setSelectedBubbleShape('rounded-rect')}>Shape rounded rect</button>
      <button type="button" onClick={() => setSelectedBubbleShape('spiky')}>Shape spiky</button>
      <button type="button" onClick={() => setSelectedBubbleShape('cloud')}>Shape cloud</button>
      <button type="button" onClick={() => setSelectedBubbleShape('urchin')}>Shape urchin</button>
      <button type="button" onClick={randomizeSelectedBubbleShape}>Randomize bubble shape</button>
      <button type="button" onClick={moveSelectedBubbleLayerBackward}>Send bubble backward</button>
      <button type="button" onClick={moveSelectedBubbleLayerForward}>Bring bubble forward</button>
      <button type="button" onClick={duplicateSelectedBubbleLayer}>Duplicate bubble layer</button>
      <button type="button" onClick={saveSelectedBubbleStylePreset}>Save bubble preset</button>
      {bubbleStylePresets.length > 0 && (
        <div className="selection-controls">
          {bubbleStylePresets.map(preset => (
            <button key={preset.id} type="button" onClick={() => applyBubbleStylePreset(preset.id)}>
              {`Apply bubble preset: ${preset.label}`}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={deleteSelectedBubbleLayer}>Delete bubble layer</button>
    </div>
  )
}
