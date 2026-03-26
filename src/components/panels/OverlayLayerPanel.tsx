import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasOverlayLayer } from '../../stores/workspaceStore'
import { Button } from '../ui/button'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion'

export function OverlayLayerPanel() {
  const {
    pages,
    activePageId,
    selectedLayerId,
    overlayStylePresets,
    renameSelectedLayer,
    setSelectedOverlayColor,
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
      <Accordion type="multiple" defaultValue={['basic', 'color', 'position']}>

        {/* Basic */}
        <AccordionItem value="basic">
          <AccordionTrigger>オーバーレイ基本</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3">
              <label className="text-layer-field">
                <span>レイヤー名</span>
                <input type="text" aria-label="Selected layer name" value={activeLayer.name ?? ''} onChange={e => renameSelectedLayer(e.target.value)} />
              </label>
              <div className="flex gap-1 flex-wrap">
                {(['full', 'top-half', 'bottom-half', 'center-band'] as const).map(area => (
                  <Button
                    key={area}
                    size="sm"
                    variant={activeLayer.areaPreset === area ? 'active' : 'outline'}
                    className="flex-1"
                    onClick={() => setSelectedOverlayAreaPreset(area)}
                  >
                    {area === 'full' ? '全体' : area === 'top-half' ? '上半分' : area === 'bottom-half' ? '下半分' : '中央帯'}
                  </Button>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Color */}
        <AccordionItem value="color">
          <AccordionTrigger>色・グラデ</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2">
              <div className="grid grid-cols-3 gap-2">
                <label className="text-layer-field color-field">
                  <span>色</span>
                  <input type="color" aria-label="Selected overlay color" value={activeLayer.color} onChange={e => setSelectedOverlayColor(e.target.value)} />
                </label>
                <label className="text-layer-field color-field">
                  <span>グラデ開始</span>
                  <input type="color" aria-label="Selected overlay gradient from" value={activeLayer.gradientFrom} onChange={e => setSelectedOverlayGradientFrom(e.target.value)} />
                </label>
                <label className="text-layer-field color-field">
                  <span>グラデ終了</span>
                  <input type="color" aria-label="Selected overlay gradient to" value={activeLayer.gradientTo} onChange={e => setSelectedOverlayGradientTo(e.target.value)} />
                </label>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant={activeLayer.fillMode === 'solid' ? 'active' : 'outline'} className="flex-1" onClick={toggleSelectedOverlayFillMode}>
                  ソリッド
                </Button>
                <Button size="sm" variant={activeLayer.fillMode === 'gradient' ? 'active' : 'outline'} className="flex-1" onClick={toggleSelectedOverlayFillMode}>
                  グラデ
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={cycleSelectedOverlayGradientDirection}>
                  方向: {activeLayer.gradientDirection === 'vertical' ? '縦' : activeLayer.gradientDirection === 'horizontal' ? '横' : '斜め'}
                </Button>
              </div>
              <div className="text-layer-field">
                <span>{`不透明度: ${Math.round(activeLayer.opacity * 100)}%`}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedOverlayOpacity(-0.1)}>−10%</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedOverlayOpacity(0.1)}>+10%</Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Position */}
        <AccordionItem value="position">
          <AccordionTrigger>位置</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-3 gap-1">
              <div /><Button size="sm" variant="outline" onClick={() => moveSelectedOverlayLayer(0, -32)}>↑</Button><div />
              <Button size="sm" variant="outline" onClick={() => moveSelectedOverlayLayer(-32, 0)}>←</Button>
              <div />
              <Button size="sm" variant="outline" onClick={() => moveSelectedOverlayLayer(32, 0)}>→</Button>
              <div /><Button size="sm" variant="outline" onClick={() => moveSelectedOverlayLayer(0, 32)}>↓</Button><div />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Presets */}
        {overlayStylePresets.length > 0 && (
          <AccordionItem value="presets">
            <AccordionTrigger>プリセット</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2">
                <Button size="sm" variant="accent" className="w-full" onClick={saveSelectedOverlayStylePreset}>現在の設定を保存</Button>
                {overlayStylePresets.map(preset => (
                  <Button key={preset.id} size="sm" variant="outline" className="w-full" onClick={() => applyOverlayStylePreset(preset.id)}>
                    {preset.label}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Layer order & delete */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-[rgba(243,239,230,0.08)]">
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedOverlayLayerBackward}>↓ 前面</Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedOverlayLayerForward}>↑ 背面</Button>
        <Button size="sm" variant="outline" onClick={duplicateSelectedOverlayLayer}>複製</Button>
        <Button size="sm" variant="destructive" onClick={deleteSelectedOverlayLayer}>削除</Button>
      </div>
    </div>
  )
}
