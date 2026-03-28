import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasMosaicLayer } from '../../stores/workspaceStore'
import { useBackendStore } from '../../stores/backendStore'
import { Button } from '../ui/button'

export function MosaicLayerPanel() {
  const {
    pages,
    activePageId,
    selectedLayerId,
    mosaicStylePresets,
    activeTool,
    setActiveTool,
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

  const { backendLassoRegionMode, setBackendLassoRegionMode } = useBackendStore()

  const image = selectActiveImage({ pages, activePageId })
  const activeLayer =
    image && selectedLayerId && selectedLayerId !== 'base-image'
      ? (image.mosaicLayers.find(l => l.id === selectedLayerId) as CanvasMosaicLayer | undefined) ?? null
      : null

  return (
    <div className="selection-controls text-controls" role="group" aria-label="Mosaic layer controls">
      {/* Mode selector */}
      <div style={{display:'flex', gap:4, marginBottom:8}}>
        <button
          type="button"
          onClick={() => setActiveTool('mosaic')}
          style={{flex:1, padding:'4px', fontSize:11, background: activeTool === 'mosaic' ? '#2d4a3e' : 'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', color:'#e8d5c0', borderRadius:4, cursor:'pointer'}}
        >矩形</button>
        <button
          type="button"
          onClick={() => setActiveTool('freehand-mosaic')}
          style={{flex:1, padding:'4px', fontSize:11, background: activeTool === 'freehand-mosaic' ? '#2d4a3e' : 'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', color:'#e8d5c0', borderRadius:4, cursor:'pointer'}}
        >投げ縄</button>
        <button
          type="button"
          onClick={() => setActiveTool('backend')}
          style={{flex:1, padding:'4px', fontSize:11, background: activeTool === 'backend' ? '#2d4a3e' : 'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', color:'#e8d5c0', borderRadius:4, cursor:'pointer'}}
        >SAM3</button>
      </div>
      {activeTool === 'backend' && (
        <button
          type="button"
          onClick={() => {
            setBackendLassoRegionMode(!backendLassoRegionMode)
          }}
          style={{
            width: '100%',
            marginBottom: 8,
            padding: '4px 8px',
            fontSize: 11,
            background: backendLassoRegionMode ? '#4a2d1a' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${backendLassoRegionMode ? '#c07840' : 'rgba(255,255,255,0.15)'}`,
            color: backendLassoRegionMode ? '#ffa060' : '#e8d5c0',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          {backendLassoRegionMode ? '✏️ 範囲をドローして検出 (キャンセル)' : '投げ縄で検出範囲を指定 →SAM3'}
        </button>
      )}
      {activeLayer && (<>
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
        <span>{`強度: ${activeLayer.intensity}`}</span>
        <div className="flex gap-1 mt-1">
          <Button size="sm" variant={activeLayer.intensity === 10 ? 'active' : 'outline'} className="flex-1" onClick={() => setSelectedMosaicIntensity(10)}>Pixiv</Button>
          <Button size="sm" variant={activeLayer.intensity === 8 ? 'active' : 'outline'} className="flex-1" onClick={() => setSelectedMosaicIntensity(8)}>小</Button>
          <Button size="sm" variant={activeLayer.intensity === 16 ? 'active' : 'outline'} className="flex-1" onClick={() => setSelectedMosaicIntensity(16)}>中</Button>
          <Button size="sm" variant={activeLayer.intensity === 24 ? 'active' : 'outline'} className="flex-1" onClick={() => setSelectedMosaicIntensity(24)}>大</Button>
        </div>
        <div className="flex gap-1 mt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedMosaicIntensity(-2)}>−2</Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedMosaicIntensity(-1)}>−1</Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedMosaicIntensity(1)}>+1</Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedMosaicIntensity(2)}>+2</Button>
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
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedMosaicLayerForward}>↑ 前面</Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedMosaicLayerBackward}>↓ 背面</Button>
        <Button size="sm" variant="outline" onClick={duplicateSelectedMosaicLayer}>複製</Button>
        <Button size="sm" variant="destructive" onClick={deleteSelectedMosaicLayer}>削除</Button>
      </div>
      </>)}
    </div>
  )
}
