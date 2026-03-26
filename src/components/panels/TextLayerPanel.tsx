import { useState } from 'react'
import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasTextLayer } from '../../stores/workspaceStore'
import { FontPicker } from '../FontPicker'

export function TextLayerPanel() {
  const [rubyDraft, setRubyDraft] = useState('')

  const {
    pages,
    activePageId,
    selectedLayerId,
    textStylePresets,
    renameSelectedLayer,
    updateSelectedTextLayerText,
    setSelectedTextLayerColor,
    setSelectedTextLayerGradientFrom,
    setSelectedTextLayerGradientTo,
    setSelectedTextLayerFontFamily,
    moveSelectedTextLayer,
    changeSelectedTextLayerFontSize,
    changeSelectedTextLayerLineHeight,
    changeSelectedTextLayerLetterSpacing,
    changeSelectedTextLayerMaxWidth,
    toggleSelectedTextLayerFillMode,
    toggleSelectedTextLayerVertical,
    changeSelectedTextLayerOutlineWidth,
    toggleSelectedTextLayerShadow,
    setSelectedTextLayerRuby,
    saveSelectedTextStylePreset,
    applyTextStylePreset,
    moveSelectedTextLayerBackward,
    moveSelectedTextLayerForward,
    deleteSelectedTextLayer,
    setSelectedTextLayerRotation,
    changeSelectedTextLayerRotation,
  } = useWorkspaceStore()

  const image = selectActiveImage({ pages, activePageId })
  const activeLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? (image.textLayers.find(l => l.id === selectedLayerId) as CanvasTextLayer | undefined) ?? null
      : null

  if (!activeLayer) return null

  const handleAddRuby = () => {
    const parts = rubyDraft.split(',')
    if (parts.length < 3) return
    const start = parseInt(parts[0].trim(), 10)
    const end = parseInt(parts[1].trim(), 10)
    const text = parts.slice(2).join(',').trim()
    if (isNaN(start) || isNaN(end) || !text) return
    setSelectedTextLayerRuby([...(activeLayer.ruby ?? []), { start, end, text }])
    setRubyDraft('')
  }

  return (
    <div className="selection-controls text-controls" role="group" aria-label="Text layer controls">
      <label className="text-layer-field">
        <span>Layer name</span>
        <input type="text" aria-label="Selected layer name" value={activeLayer.name ?? ''} onChange={e => renameSelectedLayer(e.target.value)} />
      </label>
      <label className="text-layer-field">
        <span>Text</span>
        <input type="text" aria-label="Selected text content" value={activeLayer.text} onChange={e => updateSelectedTextLayerText(e.target.value)} />
      </label>
      <label className="text-layer-field color-field">
        <span>Color</span>
        <input type="color" aria-label="Selected text color" value={activeLayer.color} onChange={e => setSelectedTextLayerColor(e.target.value)} />
      </label>
      <label className="text-layer-field color-field">
        <span>Gradient from</span>
        <input type="color" aria-label="Selected text gradient from" value={activeLayer.gradientFrom} onChange={e => setSelectedTextLayerGradientFrom(e.target.value)} />
      </label>
      <label className="text-layer-field color-field">
        <span>Gradient to</span>
        <input type="color" aria-label="Selected text gradient to" value={activeLayer.gradientTo} onChange={e => setSelectedTextLayerGradientTo(e.target.value)} />
      </label>
      <label className="text-layer-field">
        <span>Font</span>
        <FontPicker value={activeLayer.fontFamily ?? 'sans-serif'} onChange={setSelectedTextLayerFontFamily} sampleText={activeLayer.text?.slice(0, 8) || 'あAaBb'} />
      </label>
      <button type="button" onClick={() => moveSelectedTextLayer(-32, 0)}>Move text left</button>
      <button type="button" onClick={() => moveSelectedTextLayer(32, 0)}>Move text right</button>
      <button type="button" onClick={() => moveSelectedTextLayer(0, -32)}>Move text up</button>
      <button type="button" onClick={() => moveSelectedTextLayer(0, 32)}>Move text down</button>
      <button type="button" onClick={() => changeSelectedTextLayerFontSize(-2)}>Decrease text size</button>
      <button type="button" onClick={() => changeSelectedTextLayerFontSize(2)}>Increase text size</button>
      <button type="button" onClick={() => changeSelectedTextLayerLineHeight(-0.1)}>Decrease line height</button>
      <button type="button" onClick={() => changeSelectedTextLayerLineHeight(0.1)}>Increase line height</button>
      <button type="button" onClick={() => changeSelectedTextLayerLetterSpacing(-1)}>Decrease letter spacing</button>
      <button type="button" onClick={() => changeSelectedTextLayerLetterSpacing(1)}>Increase letter spacing</button>
      <button type="button" onClick={() => changeSelectedTextLayerMaxWidth(-40)}>Narrow text wrap</button>
      <button type="button" onClick={() => changeSelectedTextLayerMaxWidth(40)}>Widen text wrap</button>
      <button type="button" onClick={toggleSelectedTextLayerFillMode}>Toggle gradient fill</button>
      <button type="button" onClick={toggleSelectedTextLayerVertical}>Toggle vertical text</button>
      <button type="button" onClick={() => changeSelectedTextLayerOutlineWidth(-1)}>Decrease outline</button>
      <button type="button" onClick={() => changeSelectedTextLayerOutlineWidth(1)}>Increase outline</button>
      <button type="button" onClick={toggleSelectedTextLayerShadow}>Toggle text shadow</button>
      <label className="text-layer-field">
        <span>Rotation (°)</span>
        <input
          type="number"
          aria-label="Text rotation degrees"
          value={activeLayer.rotation ?? 0}
          min={0}
          max={359}
          step={15}
          onChange={e => setSelectedTextLayerRotation(Number(e.target.value))}
        />
      </label>
      <button type="button" onClick={() => changeSelectedTextLayerRotation(15)}>Rotate +15°</button>
      <button type="button" onClick={() => changeSelectedTextLayerRotation(-15)}>Rotate −15°</button>
      <button type="button" onClick={() => setSelectedTextLayerRotation(0)}>Reset rotation</button>
      <label className="text-layer-field">
        <span>Ruby (start,end,text)</span>
        <input type="text" aria-label="Add ruby annotation" placeholder="e.g. 0,2,ふりがな" value={rubyDraft} onChange={e => setRubyDraft(e.target.value)} />
      </label>
      <button type="button" onClick={handleAddRuby}>Add ruby</button>
      <button type="button" onClick={() => setSelectedTextLayerRuby([])} disabled={!(activeLayer.ruby?.length)}>Clear ruby</button>
      <button type="button" onClick={saveSelectedTextStylePreset}>Save text preset</button>
      {textStylePresets.map(preset => (
        <button key={preset.id} type="button" onClick={() => applyTextStylePreset(preset.id)}>
          {`Apply text preset: ${preset.label}`}
        </button>
      ))}
      <button type="button" onClick={moveSelectedTextLayerBackward}>Send text backward</button>
      <button type="button" onClick={moveSelectedTextLayerForward}>Bring text forward</button>
      <button type="button" onClick={deleteSelectedTextLayer}>Delete text layer</button>
    </div>
  )
}
