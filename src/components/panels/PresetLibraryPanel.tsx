import { useState } from 'react'
import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import { TemplateThumb } from '../TemplateThumb'
import { CsvImportDialog } from '../CsvImportDialog'

// ── Helper preview functions (moved from App.tsx) ───────────────────────────

function getTemplatePreviewLines(template: {
  textLayers: Array<{ text: string }>
  messageWindowLayers: Array<{ speaker: string }>
  bubbleLayers: Array<{ text: string }>
  mosaicLayers: Array<{ style: string }>
  overlayLayers: Array<{ fillMode: string }>
  watermarkLayers: Array<{ assetName: string | null; text: string }>
}): string[] {
  return [
    template.textLayers[0]?.text ? `Text ${template.textLayers[0].text}` : null,
    template.messageWindowLayers[0]?.speaker ? `Window ${template.messageWindowLayers[0].speaker}` : null,
    template.bubbleLayers[0]?.text ? `Bubble ${template.bubbleLayers[0].text}` : null,
    template.mosaicLayers[0]?.style ? `Mosaic ${template.mosaicLayers[0].style}` : null,
    template.overlayLayers[0]?.fillMode ? `Overlay ${template.overlayLayers[0].fillMode}` : null,
    template.watermarkLayers[0]
      ? `Watermark ${template.watermarkLayers[0].assetName ?? template.watermarkLayers[0].text}`
      : null,
  ].filter(Boolean) as string[]
}

function getMessagePresetPreviewLines(preset: {
  speaker: string; body: string; frameStyle: string; assetName: string | null
}): string[] {
  return [
    preset.speaker ? `Speaker ${preset.speaker}` : null,
    preset.body ? `Body ${preset.body}` : null,
    `Frame ${preset.frameStyle}`,
    preset.assetName ? `Asset ${preset.assetName}` : null,
  ].filter(Boolean) as string[]
}

function getTextPresetPreviewLines(preset: {
  text: string; fontSize: number; fillMode: string; isVertical: boolean; shadowEnabled: boolean
}): string[] {
  return [
    preset.text ? `Text ${preset.text}` : null,
    `Size ${preset.fontSize}px`,
    `Fill ${preset.fillMode}`,
    `Direction ${preset.isVertical ? 'vertical' : 'horizontal'}`,
    `Shadow ${preset.shadowEnabled ? 'on' : 'off'}`,
  ].filter(Boolean) as string[]
}

function getWatermarkPresetPreviewLines(preset: {
  text: string; assetName: string | null; opacity: number; angle: number; density: number; tiled: boolean
}): string[] {
  return [
    preset.assetName ? `Asset ${preset.assetName}` : preset.text ? `Watermark ${preset.text}` : null,
    `Opacity ${preset.opacity.toFixed(1)}`,
    `Angle ${preset.angle} deg`,
    `Density ${preset.density}x`,
    `Layout ${preset.tiled ? 'tiled' : 'single'}`,
  ].filter(Boolean) as string[]
}

function getBubblePresetPreviewLines(preset: {
  text: string; stylePreset: string; bubbleShape: string; tailDirection: string
}): string[] {
  return [
    preset.text ? `Bubble ${preset.text}` : null,
    `Style ${preset.stylePreset}`,
    `Shape ${preset.bubbleShape}`,
    `Tail ${preset.tailDirection}`,
  ].filter(Boolean) as string[]
}

function getOverlayPresetPreviewLines(preset: {
  areaPreset: string; fillMode: string; gradientDirection: string; opacity: number
}): string[] {
  return [
    `Area ${preset.areaPreset}`,
    `Fill ${preset.fillMode}`,
    `Direction ${preset.gradientDirection}`,
    `Opacity ${preset.opacity.toFixed(1)}`,
  ].filter(Boolean) as string[]
}

function getMosaicPresetPreviewLines(preset: {
  style: string; intensity: number; width: number; height: number
}): string[] {
  return [
    `Style ${preset.style}`,
    `Intensity ${preset.intensity}`,
    `Size ${preset.width} x ${preset.height}`,
  ].filter(Boolean) as string[]
}

// ── Types ────────────────────────────────────────────────────────────────────

type PresetFilter =
  | 'all' | 'text' | 'message' | 'watermark' | 'bubble'
  | 'overlay' | 'mosaic' | 'template' | 'asset'

// ── Component ────────────────────────────────────────────────────────────────

export function PresetLibraryPanel() {
  const [filter, setFilter] = useState<PresetFilter>('all')
  const [search, setSearch] = useState('')
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [batchTemplateState, setBatchTemplateState] = useState<{
    templateId: string
    pageIds: Record<string, boolean>
  } | null>(null)

  const {
    pages,
    activePageId,
    textStylePresets,
    messageWindowPresets,
    watermarkStylePresets,
    bubbleStylePresets,
    overlayStylePresets,
    mosaicStylePresets,
    templates,
    reusableAssets,
    importDialogueFromCsv,
    saveCurrentPageAsTemplate,
    saveCurrentPageAsReusableAsset,
    applyTextStylePreset,
    renameTextStylePreset,
    duplicateTextStylePreset,
    deleteTextStylePreset,
    applyMessageWindowPreset,
    renameMessageWindowPreset,
    duplicateMessageWindowPreset,
    deleteMessageWindowPreset,
    applyWatermarkStylePreset,
    renameWatermarkStylePreset,
    duplicateWatermarkStylePreset,
    deleteWatermarkStylePreset,
    applyBubbleStylePreset,
    renameBubbleStylePreset,
    duplicateBubbleStylePreset,
    deleteBubbleStylePreset,
    applyOverlayStylePreset,
    renameOverlayStylePreset,
    duplicateOverlayStylePreset,
    deleteOverlayStylePreset,
    applyMosaicStylePreset,
    renameMosaicStylePreset,
    duplicateMosaicStylePreset,
    deleteMosaicStylePreset,
    applyTemplateToActivePage,
    applyTemplatePreservingText,
    applyTemplateToAllPages,
    applyTemplateToSelectedPages,
    renameTemplate,
    duplicateTemplate,
    deleteTemplate,
    applyReusableAssetToActivePage,
    renameReusableAsset,
    duplicateReusableAsset,
    deleteReusableAsset,
  } = useWorkspaceStore()

  const image = selectActiveImage({ pages, activePageId })

  const q = search.trim().toLowerCase()
  const matches = (...values: Array<string | null | undefined>) =>
    q.length === 0 || values.some((v) => v?.toLowerCase().includes(q))
  const show = (type: PresetFilter) => filter === 'all' || filter === type

  const FILTER_TABS: Array<[PresetFilter, string]> = [
    ['all', 'All'],
    ['text', 'Text'],
    ['message', 'Msg'],
    ['watermark', 'WM'],
    ['bubble', 'Bbl'],
    ['overlay', 'Ovl'],
    ['mosaic', 'Msc'],
    ['template', 'Tmpl'],
    ['asset', 'Asset'],
  ]

  return (
    <>
      <section aria-label="プリセットライブラリ" className="sidebar-card">
        <div className="panel-title">プリセットライブラリ</div>
        <div className="page-list">
          <div className="page-card">
            <strong>{`${messageWindowPresets.length} 会話枠 / ${textStylePresets.length} テキスト / ${watermarkStylePresets.length} WM / ${bubbleStylePresets.length} 吹き出し / ${overlayStylePresets.length} OVL / ${mosaicStylePresets.length} モザイク`}</strong>
            <span>{`${templates.length} テンプレート / ${reusableAssets.length} アセット`}</span>
          </div>

          <label className="text-layer-field">
            <span>検索</span>
            <input
              aria-label="プリセット検索"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <div className="selection-controls">
            {FILTER_TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={filter === key ? 'page-card current page-button' : 'page-card page-button'}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="selection-controls">
            <button type="button" className="page-button flex-1" onClick={saveCurrentPageAsTemplate} disabled={!image}>
              テンプレート保存
            </button>
            <button type="button" className="page-button flex-1" onClick={saveCurrentPageAsReusableAsset} disabled={!image}>
              アセット保存
            </button>
            <button type="button" className="page-button flex-1" onClick={() => setCsvImportOpen(true)} disabled={pages.length === 0}>
              CSV 読み込み
            </button>
          </div>

          {/* ── Text presets ──────────────────────────────────────────── */}
          {show('text') && (
            textStylePresets.length === 0 ? (
              <div className="page-card empty"><strong>テキストプリセットがありません</strong></div>
            ) : (
              textStylePresets.filter((p) => matches(p.label, p.text)).map((preset) => {
                const label = preset.label.trim() || '名称未設定テキストプリセット'
                return (
                  <div key={preset.id} className="page-card">
                    <label className="text-layer-field">
                      <span>テキストプリセット</span>
                      <input type="text" aria-label={`Text preset name: ${label}`} value={preset.label}
                        onChange={(e) => renameTextStylePreset(preset.id, e.target.value)} />
                    </label>
                    <div className="template-preview" aria-label={`Text preset preview: ${label}`}>
                      {getTextPresetPreviewLines(preset).slice(0, 3).map((line) => <small key={line}>{`Preview ${line}`}</small>)}
                    </div>
                    <div className="selection-controls">
                      <button type="button" className="page-button" onClick={() => applyTextStylePreset(preset.id)} aria-label={`テキストプリセットを適用: ${label}`}>選択テキストに適用</button>
                      <button type="button" className="page-button" onClick={() => duplicateTextStylePreset(preset.id)} aria-label={`テキストプリセットを複製: ${label}`}>複製</button>
                      <button type="button" className="page-button" onClick={() => deleteTextStylePreset(preset.id)} aria-label={`テキストプリセットを削除: ${label}`}>削除</button>
                    </div>
                  </div>
                )
              })
            )
          )}

          {/* ── Message presets ───────────────────────────────────────── */}
          {show('message') && (
            messageWindowPresets.length === 0 ? (
              <div className="page-card empty"><strong>会話枠プリセットがありません</strong></div>
            ) : (
              messageWindowPresets.filter((p) => matches(p.label, p.speaker, p.body)).map((preset) => {
                const label = preset.label.trim() || '名称未設定プリセット'
                return (
                  <div key={preset.id} className="page-card">
                    <label className="text-layer-field">
                      <span>会話枠プリセット</span>
                      <input type="text" aria-label={`Message preset name: ${label}`} value={preset.label}
                        onChange={(e) => renameMessageWindowPreset(preset.id, e.target.value)} />
                    </label>
                    <div className="template-preview" aria-label={`Message preset preview: ${label}`}>
                      {getMessagePresetPreviewLines(preset).slice(0, 3).map((line) => <small key={line}>{`Preview ${line}`}</small>)}
                    </div>
                    <div className="selection-controls">
                      <button type="button" className="page-button" onClick={() => applyMessageWindowPreset(preset.id)} aria-label={`会話枠プリセットを適用: ${label}`}>選択会話枠に適用</button>
                      <button type="button" className="page-button" onClick={() => duplicateMessageWindowPreset(preset.id)} aria-label={`会話枠プリセットを複製: ${label}`}>複製</button>
                      <button type="button" className="page-button" onClick={() => deleteMessageWindowPreset(preset.id)} aria-label={`会話枠プリセットを削除: ${label}`}>削除</button>
                    </div>
                  </div>
                )
              })
            )
          )}

          {/* ── Bubble presets ────────────────────────────────────────── */}
          {show('bubble') && (
            bubbleStylePresets.length === 0 ? (
              <div className="page-card empty"><strong>吹き出しプリセットがありません</strong></div>
            ) : (
              bubbleStylePresets.filter((p) => matches(p.label, p.text, p.stylePreset, p.bubbleShape)).map((preset) => {
                const label = preset.label.trim() || '名称未設定吹き出しプリセット'
                return (
                  <div key={preset.id} className="page-card">
                    <label className="text-layer-field">
                      <span>吹き出しプリセット</span>
                      <input type="text" aria-label={`Bubble preset name: ${label}`} value={preset.label}
                        onChange={(e) => renameBubbleStylePreset(preset.id, e.target.value)} />
                    </label>
                    <div className="template-preview" aria-label={`Bubble preset preview: ${label}`}>
                      {getBubblePresetPreviewLines(preset).slice(0, 3).map((line) => <small key={line}>{`Preview ${line}`}</small>)}
                    </div>
                    <div className="selection-controls">
                      <button type="button" className="page-button" onClick={() => applyBubbleStylePreset(preset.id)} aria-label={`吹き出しプリセットを適用: ${label}`}>選択吹き出しに適用</button>
                      <button type="button" className="page-button" onClick={() => duplicateBubbleStylePreset(preset.id)} aria-label={`吹き出しプリセットを複製: ${label}`}>複製</button>
                      <button type="button" className="page-button" onClick={() => deleteBubbleStylePreset(preset.id)} aria-label={`吹き出しプリセットを削除: ${label}`}>削除</button>
                    </div>
                  </div>
                )
              })
            )
          )}

          {/* ── Overlay presets ───────────────────────────────────────── */}
          {show('overlay') && (
            overlayStylePresets.length === 0 ? (
              <div className="page-card empty"><strong>オーバーレイプリセットがありません</strong></div>
            ) : (
              overlayStylePresets.filter((p) => matches(p.label, p.areaPreset, p.fillMode, p.gradientDirection)).map((preset) => {
                const label = preset.label.trim() || '名称未設定オーバーレイプリセット'
                return (
                  <div key={preset.id} className="page-card">
                    <label className="text-layer-field">
                      <span>オーバーレイプリセット</span>
                      <input type="text" aria-label={`Overlay preset name: ${label}`} value={preset.label}
                        onChange={(e) => renameOverlayStylePreset(preset.id, e.target.value)} />
                    </label>
                    <div className="template-preview" aria-label={`Overlay preset preview: ${label}`}>
                      {getOverlayPresetPreviewLines(preset).slice(0, 3).map((line) => <small key={line}>{`Preview ${line}`}</small>)}
                    </div>
                    <div className="selection-controls">
                      <button type="button" className="page-button" onClick={() => applyOverlayStylePreset(preset.id)} aria-label={`オーバーレイプリセットを適用: ${label}`}>選択オーバーレイに適用</button>
                      <button type="button" className="page-button" onClick={() => duplicateOverlayStylePreset(preset.id)} aria-label={`オーバーレイプリセットを複製: ${label}`}>複製</button>
                      <button type="button" className="page-button" onClick={() => deleteOverlayStylePreset(preset.id)} aria-label={`オーバーレイプリセットを削除: ${label}`}>削除</button>
                    </div>
                  </div>
                )
              })
            )
          )}

          {/* ── Mosaic presets ────────────────────────────────────────── */}
          {show('mosaic') && (
            mosaicStylePresets.length === 0 ? (
              <div className="page-card empty"><strong>モザイクプリセットがありません</strong></div>
            ) : (
              mosaicStylePresets.filter((p) => matches(p.label, p.style)).map((preset) => {
                const label = preset.label.trim() || '名称未設定モザイクプリセット'
                return (
                  <div key={preset.id} className="page-card">
                    <label className="text-layer-field">
                      <span>モザイクプリセット</span>
                      <input type="text" aria-label={`Mosaic preset name: ${label}`} value={preset.label}
                        onChange={(e) => renameMosaicStylePreset(preset.id, e.target.value)} />
                    </label>
                    <div className="template-preview" aria-label={`Mosaic preset preview: ${label}`}>
                      {getMosaicPresetPreviewLines(preset).slice(0, 3).map((line) => <small key={line}>{`Preview ${line}`}</small>)}
                    </div>
                    <div className="selection-controls">
                      <button type="button" className="page-button" onClick={() => applyMosaicStylePreset(preset.id)} aria-label={`モザイクプリセットを適用: ${label}`}>選択モザイクに適用</button>
                      <button type="button" className="page-button" onClick={() => duplicateMosaicStylePreset(preset.id)} aria-label={`モザイクプリセットを複製: ${label}`}>複製</button>
                      <button type="button" className="page-button" onClick={() => deleteMosaicStylePreset(preset.id)} aria-label={`モザイクプリセットを削除: ${label}`}>削除</button>
                    </div>
                  </div>
                )
              })
            )
          )}

          {/* ── Watermark presets ─────────────────────────────────────── */}
          {show('watermark') && (
            watermarkStylePresets.length === 0 ? (
              <div className="page-card empty"><strong>ウォーターマークプリセットがありません</strong></div>
            ) : (
              watermarkStylePresets.filter((p) => matches(p.label, p.text, p.assetName)).map((preset) => {
                const label = preset.label.trim() || '名称未設定ウォーターマークプリセット'
                return (
                  <div key={preset.id} className="page-card">
                    <label className="text-layer-field">
                      <span>ウォーターマークプリセット</span>
                      <input type="text" aria-label={`Watermark preset name: ${label}`} value={preset.label}
                        onChange={(e) => renameWatermarkStylePreset(preset.id, e.target.value)} />
                    </label>
                    <div className="template-preview" aria-label={`Watermark preset preview: ${label}`}>
                      {getWatermarkPresetPreviewLines(preset).slice(0, 3).map((line) => <small key={line}>{`Preview ${line}`}</small>)}
                    </div>
                    <div className="selection-controls">
                      <button type="button" className="page-button" onClick={() => applyWatermarkStylePreset(preset.id)} aria-label={`ウォーターマークプリセットを適用: ${label}`}>選択WMに適用</button>
                      <button type="button" className="page-button" onClick={() => duplicateWatermarkStylePreset(preset.id)} aria-label={`ウォーターマークプリセットを複製: ${label}`}>複製</button>
                      <button type="button" className="page-button" onClick={() => deleteWatermarkStylePreset(preset.id)} aria-label={`ウォーターマークプリセットを削除: ${label}`}>削除</button>
                    </div>
                  </div>
                )
              })
            )
          )}

          {/* ── Templates ─────────────────────────────────────────────── */}
          {show('template') && (
            templates.length === 0 ? (
              <div className="page-card empty"><strong>テンプレートがありません</strong></div>
            ) : (
              templates.filter((t) => matches(t.label, ...getTemplatePreviewLines(t))).map((template) => {
                const label = template.label.trim() || '名称未設定テンプレート'
                const layerCount =
                  template.textLayers.length + template.messageWindowLayers.length +
                  template.bubbleLayers.length + template.mosaicLayers.length +
                  template.overlayLayers.length + template.watermarkLayers.length
                return (
                  <div key={template.id} className="page-card">
                    <label className="text-layer-field">
                      <span>テンプレート</span>
                      <input type="text" aria-label={`テンプレート名: ${label}`} value={template.label}
                        onChange={(e) => renameTemplate(template.id, e.target.value)} />
                    </label>
                    <span>{`${layerCount} レイヤー`}</span>
                    <TemplateThumb template={template} />
                    <div className="selection-controls">
                      <button type="button" className="page-button" onClick={() => applyTemplateToActivePage(template.id)} aria-label={`テンプレートを適用: ${label}`}>ページに適用</button>
                      <button type="button" className="page-button" onClick={() => applyTemplatePreservingText(template.id)} disabled={!image} aria-label={`テンプレートをテキスト保持で適用: ${label}`}>適用（テキスト保持）</button>
                      <button type="button" className="page-button" onClick={() => applyTemplateToAllPages(template.id)} aria-label={`全ページにテンプレートを適用: ${label}`}>全ページに適用</button>
                      <button type="button" className="page-button" onClick={() => setBatchTemplateState({ templateId: template.id, pageIds: Object.fromEntries(pages.map((p) => [p.id, true])) })} aria-label={`選択ページにテンプレートを適用: ${label}`}>選択ページに適用...</button>
                      <button type="button" className="page-button" onClick={() => duplicateTemplate(template.id)} aria-label={`テンプレートを複製: ${label}`}>複製</button>
                      <button type="button" className="page-button" onClick={() => deleteTemplate(template.id)} aria-label={`テンプレートを削除: ${label}`}>削除</button>
                    </div>
                  </div>
                )
              })
            )
          )}

          {/* ── Reusable assets ───────────────────────────────────────── */}
          {show('asset') && (
            reusableAssets.length === 0 ? (
              <div className="page-card empty"><strong>再利用アセットがありません</strong></div>
            ) : (
              reusableAssets.filter((a) => matches(a.label, a.assetName, a.summary)).map((asset) => {
                const label = asset.label.trim() || '名称未設定アセット'
                return (
                  <div key={asset.id} className="page-card">
                    <label className="text-layer-field">
                      <span>アセット</span>
                      <input type="text" aria-label={`アセット名: ${label}`} value={asset.label}
                        onChange={(e) => renameReusableAsset(asset.id, e.target.value)} />
                    </label>
                    <div className="template-preview" aria-label={`アセットプレビュー: ${label}`}>
                      <small>{`アセット: ${asset.assetName}`}</small>
                      <small>{`内容: ${asset.summary}`}</small>
                    </div>
                    <div className="selection-controls">
                      <button type="button" className="page-button" onClick={() => applyReusableAssetToActivePage(asset.id)} aria-label={`アセットをアクティブページに適用: ${label}`}>アクティブページに適用</button>
                      <button type="button" className="page-button" onClick={() => duplicateReusableAsset(asset.id)} aria-label={`アセットを複製: ${label}`}>複製</button>
                      <button type="button" className="page-button" onClick={() => deleteReusableAsset(asset.id)} aria-label={`アセットを削除: ${label}`}>削除</button>
                    </div>
                  </div>
                )
              })
            )
          )}
        </div>
      </section>

      {/* ── CSV Import Dialog ──────────────────────────────────────────── */}
      {csvImportOpen && (
        <CsvImportDialog
          onClose={() => setCsvImportOpen(false)}
          onImport={(rows, fieldMap) => importDialogueFromCsv(rows, fieldMap)}
          layerNames={[
            ...(image?.textLayers.map((l) => l.name).filter(Boolean) ?? []),
            ...(image?.messageWindowLayers.map((l) => l.name).filter(Boolean) ?? []),
            ...(image?.bubbleLayers.map((l) => l.name).filter(Boolean) ?? []),
          ] as string[]}
        />
      )}

      {/* ── Batch template apply dialog ───────────────────────────────── */}
      {batchTemplateState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setBatchTemplateState(null)}
        >
          <div
            className="bg-[#14110f] border border-[rgba(243,239,230,0.12)] rounded-xl p-5 w-80 max-h-[70vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">適用ページを選択</h2>
              <button type="button" className="page-button" onClick={() => setBatchTemplateState(null)}>✕</button>
            </div>
            <div className="flex gap-2 mb-2">
              <button type="button" className="page-button flex-1" onClick={() => setBatchTemplateState((s) => s ? { ...s, pageIds: Object.fromEntries(pages.map((p) => [p.id, true])) } : s)}>全選択</button>
              <button type="button" className="page-button flex-1" onClick={() => setBatchTemplateState((s) => s ? { ...s, pageIds: {} } : s)}>全解除</button>
            </div>
            <div className="grid gap-1 mb-3">
              {pages.map((page, index) => (
                <label key={page.id} className="flex items-center gap-2 text-xs px-2 py-1 rounded cursor-pointer hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={batchTemplateState.pageIds[page.id] ?? false}
                    onChange={(e) => setBatchTemplateState((s) => s ? { ...s, pageIds: { ...s.pageIds, [page.id]: e.target.checked } } : s)}
                  />
                  <span className="truncate">{`${index + 1}. ${page.name}`}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" className="page-button flex-1" onClick={() => setBatchTemplateState(null)}>キャンセル</button>
              <button
                type="button"
                className="page-button flex-1"
                onClick={() => {
                  const selectedIds = Object.entries(batchTemplateState.pageIds).filter(([, v]) => v).map(([id]) => id)
                  applyTemplateToSelectedPages(batchTemplateState.templateId, selectedIds)
                  setBatchTemplateState(null)
                }}
                disabled={Object.values(batchTemplateState.pageIds).every((v) => !v)}
              >
                {`適用 (${Object.values(batchTemplateState.pageIds).filter(Boolean).length}ページ)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
