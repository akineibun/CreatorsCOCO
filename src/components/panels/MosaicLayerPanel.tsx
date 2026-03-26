import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasMosaicLayer } from '../../stores/workspaceStore'
import { Button } from '../ui/button'

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
      <label className="text-layer-field">
        <span>レイヤー名</span>
        <input type="text" aria-label="Selected layer name" value={activeLayer.name ?? ''} onChange={e => renameSelectedLayer(e.target.value)} />
      </label>

      {/* Style selector */}
      <div className="flex gap-1 mt-2">
        {(['pixelate', 'blur', 'noise'] as const).map(style => (
          <Button
            key={style}
            size="sm"
            variant={activeLayer.style === style ? 'active' : 'outline'}
            className="flex-1"
            onClick={() => setSelectedMosaicStyle(style)}
          >
            {style === 'pixelate' ? 'ピクセル' : style === 'blur' ? 'ぼかし' : 'ノイズ'}
          </Button>
        ))}
      </div>

      {/* Intensity */}
      <div className="text-layer-field mt-2">
        <span>強度</span>
        <div className="flex gap-1 mt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedMosaicIntensity(8)}>小</Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedMosaicIntensity(16)}>中</Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedMosaicIntensity(24)}>大</Button>
          <Button size="sm" variant="outline" onClick={() => changeSelectedMosaicIntensity(-4)}>−</Button>
          <Button size="sm" variant="outline" onClick={() => changeSelectedMosaicIntensity(4)}>+</Button>
        </div>
      </div>

      {/* Move */}
      <div className="grid grid-cols-3 gap-1 mt-2">
        <div /><Button size="sm" variant="outline" onClick={() => moveSelectedMosaicLayer(0, -32)}>↑</Button><div />
        <Button size="sm" variant="outline" onClick={() => moveSelectedMosaicLayer(-32, 0)}>←</Button>
        <div />
        <Button size="sm" variant="outline" onClick={() => moveSelectedMosaicLayer(32, 0)}>→</Button>
        <div /><Button size="sm" variant="outline" onClick={() => moveSelectedMosaicLayer(0, 32)}>↓</Button><div />
      </div>

      {/* Resize */}
      <div className="grid grid-cols-2 gap-1 mt-1">
        <Button size="sm" variant="outline" onClick={() => resizeSelectedMosaicLayer(-32, 0)}>幅 −</Button>
        <Button size="sm" variant="outline" onClick={() => resizeSelectedMosaicLayer(32, 0)}>幅 +</Button>
        <Button size="sm" variant="outline" onClick={() => resizeSelectedMosaicLayer(0, -32)}>高 −</Button>
        <Button size="sm" variant="outline" onClick={() => resizeSelectedMosaicLayer(0, 32)}>高 +</Button>
      </div>

      {/* Presets */}
      {mosaicStylePresets.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[rgba(243,239,230,0.08)] grid gap-1">
          <Button size="sm" variant="accent" className="w-full" onClick={saveSelectedMosaicStylePreset}>プリセット保存</Button>
          {mosaicStylePresets.map(preset => (
            <Button key={preset.id} size="sm" variant="outline" className="w-full" onClick={() => applyMosaicStylePreset(preset.id)}>
              {preset.label}
            </Button>
          ))}
        </div>
      )}

      {/* Layer order & delete */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-[rgba(243,239,230,0.08)]">
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedMosaicLayerBackward}>↓ 前面</Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedMosaicLayerForward}>↑ 背面</Button>
        <Button size="sm" variant="outline" onClick={duplicateSelectedMosaicLayer}>複製</Button>
        <Button size="sm" variant="destructive" onClick={deleteSelectedMosaicLayer}>削除</Button>
      </div>
    </div>
  )
}
