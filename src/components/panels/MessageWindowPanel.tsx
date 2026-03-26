import type { ChangeEvent } from 'react'
import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import type { CanvasMessageWindowLayer } from '../../stores/workspaceStore'
import { Button } from '../ui/button'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion'

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
    loadSelectedMessageWindowAsset,
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
    if (file) loadSelectedMessageWindowAsset(file)
  }

  return (
    <div className="selection-controls text-controls" role="group" aria-label="Message window controls">
      <Accordion type="multiple" defaultValue={['basic', 'style', 'position']}>

        {/* Basic */}
        <AccordionItem value="basic">
          <AccordionTrigger>ウィンドウ基本</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3">
              <label className="text-layer-field">
                <span>レイヤー名</span>
                <input type="text" aria-label="Selected layer name" value={activeLayer.name ?? ''} onChange={e => renameSelectedLayer(e.target.value)} />
              </label>
              <label className="text-layer-field">
                <span>話者名</span>
                <input type="text" aria-label="Selected message speaker" value={activeLayer.speaker} onChange={e => updateSelectedMessageWindowSpeaker(e.target.value)} />
              </label>
              <label className="text-layer-field">
                <span>本文</span>
                <input type="text" aria-label="Selected message body" value={activeLayer.body} onChange={e => updateSelectedMessageWindowBody(e.target.value)} />
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Style */}
        <AccordionItem value="style">
          <AccordionTrigger>スタイル</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2">
              <div className="flex gap-1">
                {(['classic', 'soft', 'neon'] as const).map(style => (
                  <Button
                    key={style}
                    size="sm"
                    variant={activeLayer.frameStyle === style ? 'active' : 'outline'}
                    className="flex-1"
                    onClick={cycleSelectedMessageWindowFrameStyle}
                  >
                    {style === 'classic' ? 'クラシック' : style === 'soft' ? 'ソフト' : 'ネオン'}
                  </Button>
                ))}
              </div>
              <label className="file-picker w-full">
                <Button size="sm" variant="outline" className="w-full" asChild>
                  <span>
                    {activeLayer.assetName ? activeLayer.assetName : '9-slice素材を読み込む'}
                    <input type="file" aria-label="Open message window asset" accept=".png,image/png" onChange={handleAssetChange} className="hidden" />
                  </span>
                </Button>
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Position & size */}
        <AccordionItem value="position">
          <AccordionTrigger>位置・サイズ</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2">
              <div className="grid grid-cols-3 gap-1">
                <div /><Button size="sm" variant="outline" onClick={() => moveSelectedMessageWindowLayer(0, -32)}>↑</Button><div />
                <Button size="sm" variant="outline" onClick={() => moveSelectedMessageWindowLayer(-32, 0)}>←</Button>
                <div />
                <Button size="sm" variant="outline" onClick={() => moveSelectedMessageWindowLayer(32, 0)}>→</Button>
                <div /><Button size="sm" variant="outline" onClick={() => moveSelectedMessageWindowLayer(0, 32)}>↓</Button><div />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Button size="sm" variant="outline" onClick={() => resizeSelectedMessageWindowLayer(-32, 0)}>幅 −</Button>
                <Button size="sm" variant="outline" onClick={() => resizeSelectedMessageWindowLayer(32, 0)}>幅 +</Button>
                <Button size="sm" variant="outline" onClick={() => resizeSelectedMessageWindowLayer(0, -32)}>高 −</Button>
                <Button size="sm" variant="outline" onClick={() => resizeSelectedMessageWindowLayer(0, 32)}>高 +</Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Presets */}
        {messageWindowPresets.length > 0 && (
          <AccordionItem value="presets">
            <AccordionTrigger>プリセット</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2">
                <Button size="sm" variant="accent" className="w-full" onClick={saveSelectedMessageWindowPreset}>現在の設定を保存</Button>
                {messageWindowPresets.map(preset => (
                  <Button key={preset.id} size="sm" variant="outline" className="w-full" onClick={() => applyMessageWindowPreset(preset.id)}>
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
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedLayerBackward}>↓ 前面</Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={moveSelectedLayerForward}>↑ 背面</Button>
        <Button size="sm" variant="outline" onClick={duplicateSelectedLayer}>複製</Button>
        <Button size="sm" variant="destructive" onClick={deleteSelectedLayer}>削除</Button>
      </div>
    </div>
  )
}
