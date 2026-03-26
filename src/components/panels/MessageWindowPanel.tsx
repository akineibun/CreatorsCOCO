import type { ChangeEvent } from 'react'
import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasMessageWindowLayer } from '../../stores/workspaceStore'

export function MessageWindowPanel() {
  const {
    pages,
    activePageId,
    selectedLayerId,
    messageWindowPresets,
    renameSelectedLayer,
    updateSelectedMessageWindowSpeaker,
    updateSelectedMessageWindowBody,
    moveSelectedMessageWindowLayer,
    resizeSelectedMessageWindowLayer,
    cycleSelectedMessageWindowFrameStyle,
    loadMessageWindowAsset,
    saveSelectedMessageWindowPreset,
    applyMessageWindowPreset,
    duplicateSelectedLayer,
    moveSelectedLayerBackward,
    moveSelectedLayerForward,
    deleteSelectedLayer,
  } = useWorkspaceStore()

  const image = selectActiveImage({ pages, activePageId })
  const activeLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? (image.messageWindowLayers.find(l => l.id === selectedLayerId) as CanvasMessageWindowLayer | undefined) ?? null
      : null

  if (!activeLayer) return null

  const handleAssetChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadMessageWindowAsset(file)
  }

  return (
    <div className="selection-controls text-controls" role="group" aria-label="Message window controls">
      <label className="text-layer-field"><span>Layer name</span>
        <input type="text" aria-label="Selected layer name" value={activeLayer.name ?? ''} onChange={e => renameSelectedLayer(e.target.value)} />
      </label>
      <label className="text-layer-field"><span>Speaker</span>
        <input type="text" aria-label="Selected message speaker" value={activeLayer.speaker} onChange={e => updateSelectedMessageWindowSpeaker(e.target.value)} />
      </label>
      <label className="text-layer-field"><span>Body</span>
        <input type="text" aria-label="Selected message body" value={activeLayer.body} onChange={e => updateSelectedMessageWindowBody(e.target.value)} />
      </label>
      <button type="button" onClick={() => moveSelectedMessageWindowLayer(-32, 0)}>Move message window left</button>
      <button type="button" onClick={() => moveSelectedMessageWindowLayer(32, 0)}>Move message window right</button>
      <button type="button" onClick={() => moveSelectedMessageWindowLayer(0, -32)}>Move message window up</button>
      <button type="button" onClick={() => moveSelectedMessageWindowLayer(0, 32)}>Move message window down</button>
      <button type="button" onClick={() => resizeSelectedMessageWindowLayer(-32, 0)}>Decrease message window width</button>
      <button type="button" onClick={() => resizeSelectedMessageWindowLayer(32, 0)}>Increase message window width</button>
      <button type="button" onClick={() => resizeSelectedMessageWindowLayer(0, -32)}>Decrease message window height</button>
      <button type="button" onClick={() => resizeSelectedMessageWindowLayer(0, 32)}>Increase message window height</button>
      <button type="button" onClick={cycleSelectedMessageWindowFrameStyle}>Cycle message window frame</button>
      <label className="file-picker"><span>Load window asset</span>
        <input type="file" aria-label="Open message window asset" accept=".png,image/png" onChange={handleAssetChange} />
      </label>
      <button type="button" onClick={saveSelectedMessageWindowPreset}>Save message preset</button>
      {messageWindowPresets.map(preset => (
        <button key={preset.id} type="button" onClick={() => applyMessageWindowPreset(preset.id)}>
          {`Apply message preset: ${preset.label}`}
        </button>
      ))}
      <button type="button" onClick={duplicateSelectedLayer}>Duplicate message window</button>
      <button type="button" onClick={moveSelectedLayerBackward}>Send message window backward</button>
      <button type="button" onClick={moveSelectedLayerForward}>Bring message window forward</button>
      <button type="button" onClick={deleteSelectedLayer}>Delete message window</button>
    </div>
  )
}
