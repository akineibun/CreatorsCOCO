import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasBubbleLayer } from '../../stores/workspaceStore'
import { Button } from '../ui/button'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion'

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
      <Accordion type="multiple" defaultValue={['basic', 'style', 'position']}>

        {/* Basic */}
        <AccordionItem value="basic">
          <AccordionTrigger>吹き出し基本</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3">
              <label className="text-layer-field">
                <span>レイヤー名</span>
                <input type="text" aria-label="Selected layer name" value={activeLayer.name ?? ''} onChange={e => renameSelectedLayer(e.target.value)} />
              </label>
              <label className="text-layer-field">
                <span>テキスト</span>
                <input type="text" aria-label="Selected bubble content" value={activeLayer.text} onChange={e => updateSelectedBubbleLayerText(e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-layer-field color-field">
                  <span>塗り</span>
                  <input type="color" aria-label="Selected bubble fill color" value={activeLayer.fillColor} onChange={e => setSelectedBubbleFillColor(e.target.value)} />
                </label>
                <label className="text-layer-field color-field">
                  <span>枠線</span>
                  <input type="color" aria-label="Selected bubble border color" value={activeLayer.borderColor} onChange={e => setSelectedBubbleBorderColor(e.target.value)} />
                </label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Shape & tail */}
        <AccordionItem value="style">
          <AccordionTrigger>形状・尻尾</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2">
              <div className="flex gap-1 flex-wrap">
                {(['round', 'rounded-rect', 'spiky', 'cloud', 'urchin'] as const).map(shape => (
                  <Button
                    key={shape}
                    size="sm"
                    variant={activeLayer.bubbleShape === shape ? 'active' : 'outline'}
                    className="flex-1"
                    onClick={() => setSelectedBubbleShape(shape)}
                  >
                    {shape === 'round' ? '丸' : shape === 'rounded-rect' ? '角丸' : shape === 'spiky' ? 'トゲ' : shape === 'cloud' ? 'もくもく' : 'ウニ'}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={randomizeSelectedBubbleShape}>
                ランダム形状
              </Button>
              <div className="flex gap-1">
                {(['speech', 'thought'] as const).map(preset => (
                  <Button
                    key={preset}
                    size="sm"
                    variant={activeLayer.stylePreset === preset ? 'active' : 'outline'}
                    className="flex-1"
                    onClick={() => setSelectedBubbleStylePreset(preset)}
                  >
                    {preset === 'speech' ? 'セリフ' : 'ト ー ク'}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1">
                {(['left', 'right', 'bottom'] as const).map(dir => (
                  <Button
                    key={dir}
                    size="sm"
                    variant={activeLayer.tailDirection === dir ? 'active' : 'outline'}
                    className="flex-1"
                    onClick={() => setSelectedBubbleTailDirection(dir)}
                  >
                    {dir === 'left' ? '尻尾←' : dir === 'right' ? '尻尾→' : '尻尾↓'}
                  </Button>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Position & size */}
        <AccordionItem value="position">
          <AccordionTrigger>位置・サイズ</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2">
              <div className="grid grid-cols-3 gap-1">
                <div /><Button size="sm" variant="outline" onClick={() => moveSelectedBubbleLayer(0, -32)}>↑</Button><div />
                <Button size="sm" variant="outline" onClick={() => moveSelectedBubbleLayer(-32, 0)}>←</Button>
                <div />
                <Button size="sm" variant="outline" onClick={() => moveSelectedBubbleLayer(32, 0)}>→</Button>
                <div /><Button size="sm" variant="outline" onClick={() => moveSelectedBubbleLayer(0, 32)}>↓</Button><div />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Button size="sm" variant="outline" onClick={() => resizeSelectedBubbleLayer(-32, 0)}>幅 −</Button>
                <Button size="sm" variant="outline" onClick={() => resizeSelectedBubbleLayer(32, 0)}>幅 +</Button>
                <Button size="sm" variant="outline" onClick={() => resizeSelectedBubbleLayer(0, -32)}>高 −</Button>
                <Button size="sm" variant="outline" onClick={() => resizeSelectedBubbleLayer(0, 32)}>高 +</Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Presets */}
        {bubbleStylePresets.length > 0 && (
          <AccordionItem value="presets">
            <AccordionTrigger>プリセット</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2">
                <Button size="sm" variant="accent" className="w-full" onClick={saveSelectedBubbleStylePreset}>現在の設定を保存</Button>
                {bubbleStylePresets.map(preset => (
                  <Button key={preset.id} size="sm" variant="outline" className="w-full" onClick={() => applyBubbleStylePreset(preset.id)}>
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
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedBubbleLayerBackward}>↓ 前面</Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedBubbleLayerForward}>↑ 背面</Button>
        <Button size="sm" variant="outline" onClick={duplicateSelectedBubbleLayer}>複製</Button>
        <Button size="sm" variant="destructive" onClick={deleteSelectedBubbleLayer}>削除</Button>
      </div>
    </div>
  )
}
