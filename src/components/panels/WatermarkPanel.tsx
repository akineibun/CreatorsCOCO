import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasWatermarkLayer } from '../../stores/workspaceStore'
import { Button } from '../ui/button'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion'

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
      <Accordion type="multiple" defaultValue={['basic', 'style', 'position']}>

        {/* Basic */}
        <AccordionItem value="basic">
          <AccordionTrigger>ウォーターマーク基本</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3">
              <label className="text-layer-field">
                <span>レイヤー名</span>
                <input type="text" aria-label="Selected layer name" value={activeLayer.name ?? ''} onChange={e => renameSelectedLayer(e.target.value)} />
              </label>
              <label className="text-layer-field">
                <span>テキスト</span>
                <input type="text" aria-label="Selected watermark text" value={activeLayer.text} onChange={e => updateSelectedWatermarkText(e.target.value)} />
              </label>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={toggleSelectedWatermarkPattern}>
                  {activeLayer.repeated ? '繰り返し ON' : '繰り返し OFF'}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={toggleSelectedWatermarkTileLayout}>
                  {activeLayer.tiled ? 'タイル ON' : 'タイル OFF'}
                </Button>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedWatermarkPreset('patreon')}>
                  Patreon CTA
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedWatermarkPreset('discord')}>
                  Discord CTA
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Style */}
        <AccordionItem value="style">
          <AccordionTrigger>スタイル</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2">
              <div className="text-layer-field">
                <span>{`不透明度: ${Math.round(activeLayer.opacity * 100)}%`}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedWatermarkOpacity(-0.1)}>−10%</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedWatermarkOpacity(0.1)}>+10%</Button>
                </div>
              </div>
              <div className="text-layer-field">
                <span>{`角度: ${activeLayer.angle ?? 0}°`}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedWatermarkAngle(-8)}>−8°</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedWatermarkAngle(8)}>+8°</Button>
                </div>
              </div>
              <div className="text-layer-field">
                <span>密度</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedWatermarkDensity(-1)}>−</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedWatermarkDensity(1)}>+</Button>
                </div>
              </div>
              <div className="text-layer-field">
                <span>スケール</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedWatermarkScale(-0.2)}>−</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedWatermarkScale(0.2)}>+</Button>
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
              <div /><Button size="sm" variant="outline" onClick={() => moveSelectedWatermarkLayer(0, -64)}>↑</Button><div />
              <Button size="sm" variant="outline" onClick={() => moveSelectedWatermarkLayer(-96, 0)}>←</Button>
              <div />
              <Button size="sm" variant="outline" onClick={() => moveSelectedWatermarkLayer(96, 0)}>→</Button>
              <div /><Button size="sm" variant="outline" onClick={() => moveSelectedWatermarkLayer(0, 64)}>↓</Button><div />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Presets */}
        {watermarkStylePresets.length > 0 && (
          <AccordionItem value="presets">
            <AccordionTrigger>プリセット</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2">
                <Button size="sm" variant="accent" className="w-full" onClick={saveSelectedWatermarkStylePreset}>現在の設定を保存</Button>
                {watermarkStylePresets.map(preset => (
                  <Button key={preset.id} size="sm" variant="outline" className="w-full" onClick={() => applyWatermarkStylePreset(preset.id)}>
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
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedLayerForward}>↑ 前面</Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedLayerBackward}>↓ 背面</Button>
        <Button size="sm" variant="outline" onClick={duplicateSelectedLayer}>複製</Button>
        <Button size="sm" variant="destructive" onClick={deleteSelectedLayer}>削除</Button>
      </div>
    </div>
  )
}
