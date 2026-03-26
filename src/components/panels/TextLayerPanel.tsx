import { useState } from 'react'
import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasTextLayer } from '../../stores/workspaceStore'
import { FontPicker } from '../FontPicker'
import { Button } from '../ui/button'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion'

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
    setSelectedTextLayerBackgroundBand,
    setSelectedTextLayerStrokeColor,
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
      <Accordion type="multiple" defaultValue={['basic', 'style', 'position']}>

        {/* Basic */}
        <AccordionItem value="basic">
          <AccordionTrigger>テキスト基本</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3">
              <label className="text-layer-field">
                <span>レイヤー名</span>
                <input type="text" aria-label="Selected layer name" value={activeLayer.name ?? ''} onChange={e => renameSelectedLayer(e.target.value)} />
              </label>
              <label className="text-layer-field">
                <span>テキスト</span>
                <input type="text" aria-label="Selected text content" value={activeLayer.text} onChange={e => updateSelectedTextLayerText(e.target.value)} />
              </label>
              <label className="text-layer-field">
                <span>フォント</span>
                <FontPicker value={activeLayer.fontFamily ?? 'sans-serif'} onChange={setSelectedTextLayerFontFamily} sampleText={activeLayer.text?.slice(0, 8) || 'あAaBb'} />
              </label>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="flex-1" onClick={toggleSelectedTextLayerVertical}>
                  {activeLayer.isVertical ? '横書き' : '縦書き'}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={toggleSelectedTextLayerFillMode}>
                  {activeLayer.fillMode === 'gradient' ? 'ソリッド' : 'グラデ'}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={toggleSelectedTextLayerShadow}>
                  {activeLayer.shadowEnabled ? 'シャドウOFF' : 'シャドウON'}
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Style / color */}
        <AccordionItem value="style">
          <AccordionTrigger>色・スタイル</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3">
              <div className="grid grid-cols-4 gap-2">
                <label className="text-layer-field color-field">
                  <span>色</span>
                  <input type="color" aria-label="Text color" value={activeLayer.color} onChange={e => setSelectedTextLayerColor(e.target.value)} />
                </label>
                <label className="text-layer-field color-field">
                  <span>縁取り色</span>
                  <input type="color" aria-label="Text stroke color" value={activeLayer.strokeColor ?? '#000000'} onChange={e => setSelectedTextLayerStrokeColor(e.target.value)} />
                </label>
                <label className="text-layer-field color-field">
                  <span>グラデ開始</span>
                  <input type="color" aria-label="Gradient from" value={activeLayer.gradientFrom} onChange={e => setSelectedTextLayerGradientFrom(e.target.value)} />
                </label>
                <label className="text-layer-field color-field">
                  <span>グラデ終了</span>
                  <input type="color" aria-label="Gradient to" value={activeLayer.gradientTo} onChange={e => setSelectedTextLayerGradientTo(e.target.value)} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-layer-field">
                  <span>フォントサイズ</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedTextLayerFontSize(-2)}>−</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedTextLayerFontSize(2)}>+</Button>
                  </div>
                </div>
                <div className="text-layer-field">
                  <span>アウトライン</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedTextLayerOutlineWidth(-1)}>−</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedTextLayerOutlineWidth(1)}>+</Button>
                  </div>
                </div>
                <div className="text-layer-field">
                  <span>行間</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedTextLayerLineHeight(-0.1)}>−</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedTextLayerLineHeight(0.1)}>+</Button>
                  </div>
                </div>
                <div className="text-layer-field">
                  <span>字間</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedTextLayerLetterSpacing(-1)}>−</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedTextLayerLetterSpacing(1)}>+</Button>
                  </div>
                </div>
                <div className="text-layer-field col-span-2">
                  <span>折り返し幅</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedTextLayerMaxWidth(-40)}>−40</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedTextLayerMaxWidth(40)}>+40</Button>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Background band */}
        <AccordionItem value="band">
          <AccordionTrigger>背景帯</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2">
              <Button
                size="sm"
                variant={activeLayer.backgroundBand?.enabled ? 'active' : 'outline'}
                className="w-full"
                onClick={() => setSelectedTextLayerBackgroundBand({
                  enabled: !(activeLayer.backgroundBand?.enabled),
                  color: activeLayer.backgroundBand?.color ?? '#000000',
                  opacity: activeLayer.backgroundBand?.opacity ?? 0.6,
                  paddingX: activeLayer.backgroundBand?.paddingX ?? 8,
                  paddingY: activeLayer.backgroundBand?.paddingY ?? 4,
                })}
              >
                {activeLayer.backgroundBand?.enabled ? '背景帯 ON' : '背景帯 OFF'}
              </Button>
              {activeLayer.backgroundBand?.enabled && (
                <div className="grid gap-2">
                  <label className="text-layer-field color-field">
                    <span>背景色</span>
                    <input
                      type="color"
                      aria-label="Background band color"
                      value={activeLayer.backgroundBand.color}
                      onChange={e => setSelectedTextLayerBackgroundBand({ ...activeLayer.backgroundBand!, color: e.target.value })}
                    />
                  </label>
                  <div className="text-layer-field">
                    <span>不透明度</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedTextLayerBackgroundBand({ ...activeLayer.backgroundBand!, opacity: Math.max(0, (activeLayer.backgroundBand?.opacity ?? 0.6) - 0.1) })}>−</Button>
                      <span className="flex items-center px-2 text-xs">{Math.round((activeLayer.backgroundBand.opacity) * 100)}%</span>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedTextLayerBackgroundBand({ ...activeLayer.backgroundBand!, opacity: Math.min(1, (activeLayer.backgroundBand?.opacity ?? 0.6) + 0.1) })}>+</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-layer-field">
                      <span>横P</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedTextLayerBackgroundBand({ ...activeLayer.backgroundBand!, paddingX: Math.max(0, (activeLayer.backgroundBand?.paddingX ?? 8) - 4) })}>−</Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedTextLayerBackgroundBand({ ...activeLayer.backgroundBand!, paddingX: (activeLayer.backgroundBand?.paddingX ?? 8) + 4 })}>+</Button>
                      </div>
                    </div>
                    <div className="text-layer-field">
                      <span>縦P</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedTextLayerBackgroundBand({ ...activeLayer.backgroundBand!, paddingY: Math.max(0, (activeLayer.backgroundBand?.paddingY ?? 4) - 4) })}>−</Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedTextLayerBackgroundBand({ ...activeLayer.backgroundBand!, paddingY: (activeLayer.backgroundBand?.paddingY ?? 4) + 4 })}>+</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Position */}
        <AccordionItem value="position">
          <AccordionTrigger>位置・回転</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-1">
                <div />
                <Button size="sm" variant="outline" onClick={() => moveSelectedTextLayer(0, -32)}>↑</Button>
                <div />
                <Button size="sm" variant="outline" onClick={() => moveSelectedTextLayer(-32, 0)}>←</Button>
                <div />
                <Button size="sm" variant="outline" onClick={() => moveSelectedTextLayer(32, 0)}>→</Button>
                <div />
                <Button size="sm" variant="outline" onClick={() => moveSelectedTextLayer(0, 32)}>↓</Button>
                <div />
              </div>
              <label className="text-layer-field">
                <span>回転 (°)</span>
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
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedTextLayerRotation(-15)}>−15°</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => changeSelectedTextLayerRotation(15)}>+15°</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedTextLayerRotation(0)}>リセット</Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Ruby */}
        <AccordionItem value="ruby">
          <AccordionTrigger>ルビ</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2">
              <label className="text-layer-field">
                <span>ルビ (開始, 終了, テキスト)</span>
                <input type="text" aria-label="Add ruby annotation" placeholder="例: 0,2,ふりがな" value={rubyDraft} onChange={e => setRubyDraft(e.target.value)} />
              </label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={handleAddRuby}>追加</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedTextLayerRuby([])} disabled={!(activeLayer.ruby?.length)}>クリア</Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Presets */}
        {textStylePresets.length > 0 && (
          <AccordionItem value="presets">
            <AccordionTrigger>プリセット</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2">
                <Button size="sm" variant="accent" className="w-full" onClick={saveSelectedTextStylePreset}>現在の設定を保存</Button>
                {textStylePresets.map(preset => (
                  <Button key={preset.id} size="sm" variant="outline" className="w-full" onClick={() => applyTextStylePreset(preset.id)}>
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
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedTextLayerBackward}>↓ 前面</Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedTextLayerForward}>↑ 背面</Button>
        <Button size="sm" variant="destructive" onClick={deleteSelectedTextLayer}>削除</Button>
      </div>
    </div>
  )
}
