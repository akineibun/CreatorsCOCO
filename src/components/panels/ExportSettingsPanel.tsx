import { useCallback, useEffect, useState } from 'react'
import {
  createPdfExportName,
  createPngExportName,
  createZipEntryName,
  createZipExportName,
} from '../../lib/export/fileNames'
import { EXPORT_METADATA_POLICY_LABEL } from '../../lib/export/metadata'
import { exportPageAsPdf } from '../../lib/export/pdfExporter'
import { exportPageAsPng } from '../../lib/export/pngExporter'
import { exportPagesAsZip } from '../../lib/export/zipExporter'
import { outputPresets, selectActiveImage, useWorkspaceStore } from '../../stores/workspaceStore'

// ── Types ────────────────────────────────────────────────────────────────────

type ExportHistoryEntry = {
  format: 'PNG' | 'PDF' | 'ZIP'
  label: string
}

type ExportPreviewLayout = {
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
  cropLabel: string
}

type Props = {
  onExportComplete?: (message: string) => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const EXPORT_HISTORY_STORAGE_KEY = 'creators-coco.export-history'

function getExportPreviewLayout(
  image: { width: number; height: number } | null,
  outputSettings: { width: number; height: number; resizeFitMode: 'contain' | 'cover' | 'stretch' },
): ExportPreviewLayout | null {
  if (!image) return null

  if (outputSettings.resizeFitMode === 'stretch') {
    return { xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100, cropLabel: 'Stretched to fill' }
  }

  const scale =
    outputSettings.resizeFitMode === 'cover'
      ? Math.max(outputSettings.width / image.width, outputSettings.height / image.height)
      : Math.min(outputSettings.width / image.width, outputSettings.height / image.height)
  const width = image.width * scale
  const height = image.height * scale

  return {
    xPercent: ((outputSettings.width - width) / 2 / outputSettings.width) * 100,
    yPercent: ((outputSettings.height - height) / 2 / outputSettings.height) * 100,
    widthPercent: (width / outputSettings.width) * 100,
    heightPercent: (height / outputSettings.height) * 100,
    cropLabel: outputSettings.resizeFitMode === 'cover' ? 'Center cropped to fill' : 'Contained with margins',
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function ExportSettingsPanel({ onExportComplete }: Props) {
  const {
    pages,
    activePageId,
    imageTransform,
    outputSettings,
    setOutputPreset,
    setCustomOutputWidth,
    setCustomOutputHeight,
    setResizeBackgroundMode,
    setResizeFitMode,
    setExportQualityMode,
    setFileNamePrefix,
    setStartNumber,
    setNumberPadding,
  } = useWorkspaceStore()

  const image = selectActiveImage({ pages, activePageId })
  const activePageIndex = activePageId ? Math.max(0, pages.findIndex((p) => p.id === activePageId)) : 0

  const [recentExports, setRecentExports] = useState<ExportHistoryEntry[]>([])
  const [widthDraft, setWidthDraft] = useState(String(outputSettings.width))
  const [heightDraft, setHeightDraft] = useState(String(outputSettings.height))
  const [prefixDraft, setPrefixDraft] = useState(outputSettings.fileNamePrefix)
  const [startNumberDraft, setStartNumberDraft] = useState(String(outputSettings.startNumber))
  const [numberPaddingDraft, setNumberPaddingDraft] = useState(String(outputSettings.numberPadding))

  // Sync drafts when store changes
  useEffect(() => {
    setWidthDraft(String(outputSettings.width))
    setHeightDraft(String(outputSettings.height))
    setPrefixDraft(outputSettings.fileNamePrefix)
    setStartNumberDraft(String(outputSettings.startNumber))
    setNumberPaddingDraft(String(outputSettings.numberPadding))
  }, [
    outputSettings.width,
    outputSettings.height,
    outputSettings.fileNamePrefix,
    outputSettings.startNumber,
    outputSettings.numberPadding,
  ])

  // Persist export history in localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(EXPORT_HISTORY_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ExportHistoryEntry[]
        if (Array.isArray(parsed)) setRecentExports(parsed.slice(0, 5))
      }
    } catch {
      window.localStorage.removeItem(EXPORT_HISTORY_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(EXPORT_HISTORY_STORAGE_KEY, JSON.stringify(recentExports))
  }, [recentExports])

  const pushExport = (entry: ExportHistoryEntry) =>
    setRecentExports((prev) => [entry, ...prev].slice(0, 5))

  const handleExportPng = useCallback(async () => {
    if (!image) return
    await exportPageAsPng(image, imageTransform, outputSettings, activePageIndex)
    const msg = `Exported ${image.name} as PNG`
    pushExport({ format: 'PNG', label: image.name })
    onExportComplete?.(msg)
  }, [image, imageTransform, outputSettings, activePageIndex, onExportComplete])

  const handleExportZip = useCallback(async () => {
    if (pages.length === 0) return
    await exportPagesAsZip(pages, outputSettings)
    const msg = `Exported ${pages.length} pages as ZIP`
    pushExport({ format: 'ZIP', label: `${pages.length} pages` })
    onExportComplete?.(msg)
  }, [pages, outputSettings, onExportComplete])

  const handleExportPdf = useCallback(async () => {
    if (!image) return
    await exportPageAsPdf(image, imageTransform, outputSettings, activePageIndex)
    const msg = `Exported ${image.name} as PDF`
    pushExport({ format: 'PDF', label: image.name })
    onExportComplete?.(msg)
  }, [image, imageTransform, outputSettings, activePageIndex, onExportComplete])

  const commitWidthDraft = () => {
    if (widthDraft === '') { setWidthDraft(String(outputSettings.width)); return }
    setCustomOutputWidth(Number(widthDraft))
  }
  const commitHeightDraft = () => {
    if (heightDraft === '') { setHeightDraft(String(outputSettings.height)); return }
    setCustomOutputHeight(Number(heightDraft))
  }
  const commitPrefixDraft = () => setFileNamePrefix(prefixDraft)
  const commitStartNumberDraft = () => {
    if (startNumberDraft === '') { setStartNumberDraft(String(outputSettings.startNumber)); return }
    setStartNumber(Number(startNumberDraft))
  }
  const commitNumberPaddingDraft = () => {
    if (numberPaddingDraft === '') { setNumberPaddingDraft(String(outputSettings.numberPadding)); return }
    setNumberPadding(Number(numberPaddingDraft))
  }

  const pngPreviewName = image ? createPngExportName(image.name, outputSettings, activePageIndex) : 'No active page'
  const pdfPreviewName = image ? createPdfExportName(image.name, outputSettings, activePageIndex) : 'No active page'
  const zipPreviewName = pages.length > 0 ? createZipExportName(outputSettings, pages.length) : 'No pages loaded'
  const zipEntryPreviewNames = pages.map((page, index) => createZipEntryName(page.name, outputSettings, index))
  const exportPreviewLayout = getExportPreviewLayout(image, outputSettings)

  return (
    <section aria-label="Export settings" className="sidebar-card">
      <div className="panel-title">Export settings</div>
      <div className="page-list">
        {/* Output presets */}
        {outputPresets.map((preset) => (
          <button
            key={preset.presetId}
            type="button"
            className={preset.presetId === outputSettings.presetId ? 'page-card current page-button' : 'page-card page-button'}
            onClick={() => setOutputPreset(preset.presetId)}
            aria-label={`Preset ${preset.label}`}
            aria-pressed={preset.presetId === outputSettings.presetId}
          >
            <strong>{preset.label}</strong>
            <span>{preset.width} x {preset.height}</span>
          </button>
        ))}
      </div>

      {/* Dimensions & file naming */}
      <div className="export-dimensions">
        <label className="export-prefix">
          <span>Prefix</span>
          <input aria-label="Export filename prefix" type="text" value={prefixDraft}
            onChange={(e) => setPrefixDraft(e.target.value)} onBlur={commitPrefixDraft} />
        </label>
        <label>
          <span>Start</span>
          <input aria-label="Export start number" type="number" min={1} max={9999} step={1}
            value={startNumberDraft} onChange={(e) => setStartNumberDraft(e.target.value)} onBlur={commitStartNumberDraft} />
        </label>
        <label>
          <span>Padding</span>
          <input aria-label="Export number padding" type="number" min={2} max={6} step={1}
            value={numberPaddingDraft} onChange={(e) => setNumberPaddingDraft(e.target.value)} onBlur={commitNumberPaddingDraft} />
        </label>
        <label>
          <span>Width</span>
          <input aria-label="Output width" type="number" min={256} max={4096} step={1}
            value={widthDraft} onChange={(e) => setWidthDraft(e.target.value)} onBlur={commitWidthDraft} />
        </label>
        <label>
          <span>Height</span>
          <input aria-label="Output height" type="number" min={256} max={4096} step={1}
            value={heightDraft} onChange={(e) => setHeightDraft(e.target.value)} onBlur={commitHeightDraft} />
        </label>
      </div>

      {/* SNS presets */}
      <div className="selection-controls">
        {([
          { label: 'Twitter', w: 1200, h: 675 },
          { label: 'IG 1:1', w: 1080, h: 1080 },
          { label: 'IG 4:5', w: 1080, h: 1350 },
          { label: 'Story', w: 1080, h: 1920 },
          { label: 'FANZA', w: 1280, h: 960 },
          { label: '4K', w: 3840, h: 2160 },
        ] as const).map(({ label, w, h }) => (
          <button
            key={label}
            type="button"
            className="page-card page-button"
            onClick={() => { setCustomOutputWidth(w); setCustomOutputHeight(h); setWidthDraft(String(w)); setHeightDraft(String(h)) }}
            aria-label={`SNS preset ${label} ${w}x${h}`}
          >
            {`${label} ${w}×${h}`}
          </button>
        ))}
      </div>

      {/* Quality mode */}
      <div className="selection-controls">
        {(['high', 'medium', 'low', 'platform'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={outputSettings.qualityMode === mode ? 'page-card current page-button' : 'page-card page-button'}
            onClick={() => setExportQualityMode(mode)}
            aria-label={`Export quality ${mode}`}
            aria-pressed={outputSettings.qualityMode === mode}
          >
            {mode === 'high' ? 'High quality' : mode === 'medium' ? 'Medium quality' : mode === 'low' ? 'Low quality' : 'Platform preset'}
          </button>
        ))}
      </div>

      {/* Resize fit mode */}
      <div className="selection-controls">
        {(['contain', 'cover', 'stretch'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={outputSettings.resizeFitMode === mode ? 'page-card current page-button' : 'page-card page-button'}
            onClick={() => setResizeFitMode(mode)}
            aria-label={`Resize fit ${mode}`}
            aria-pressed={outputSettings.resizeFitMode === mode}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Resize background mode */}
      <div className="selection-controls">
        {([
          ['white', 'White margin'],
          ['black', 'Black margin'],
          ['blurred-art', 'Blurred art'],
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            className={outputSettings.resizeBackgroundMode === mode ? 'page-card current page-button' : 'page-card page-button'}
            onClick={() => setResizeBackgroundMode(mode)}
            aria-label={`Resize background ${label}`}
            aria-pressed={outputSettings.resizeBackgroundMode === mode}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Status labels */}
      <div className="page-meta">Output preset {outputSettings.label}</div>
      <div className="page-meta">
        Export quality{' '}
        {outputSettings.qualityMode === 'platform' ? 'Platform preset'
          : outputSettings.qualityMode === 'medium' ? 'Medium'
          : outputSettings.qualityMode === 'low' ? 'Low'
          : 'High'}
      </div>
      <div className="page-meta">
        Resize fit{' '}
        {outputSettings.resizeFitMode === 'cover' ? 'Cover'
          : outputSettings.resizeFitMode === 'stretch' ? 'Stretch'
          : 'Contain'}
      </div>
      <div className="page-meta">
        Resize background{' '}
        {outputSettings.resizeBackgroundMode === 'blurred-art' ? 'Blurred art'
          : outputSettings.resizeBackgroundMode === 'black' ? 'Black'
          : 'White'}
      </div>
      <div className="page-meta">Export prefix {outputSettings.fileNamePrefix}</div>
      <div className="page-meta">Export numbering {outputSettings.startNumber} / pad {outputSettings.numberPadding}</div>
      <div className="page-meta">{EXPORT_METADATA_POLICY_LABEL}</div>

      {/* Export buttons */}
      <div className="selection-controls">
        <button type="button" className="page-button flex-1" onClick={handleExportPng} disabled={!image}>Export PNG</button>
        <button type="button" className="page-button flex-1" onClick={handleExportZip} disabled={pages.length === 0}>Export ZIP</button>
        <button type="button" className="page-button flex-1" onClick={handleExportPdf} disabled={!image}>Export PDF</button>
      </div>

      {/* Export preview */}
      <div className="export-preview">
        <div className="panel-title">Export preview</div>
        <div className="page-meta">PNG {pngPreviewName}</div>
        <div className="page-meta">PDF {pdfPreviewName}</div>
        <div className="page-meta">ZIP {zipPreviewName}</div>
        <div
          aria-label="Resize preview frame"
          className={`resize-preview-frame resize-preview-${outputSettings.resizeBackgroundMode}`}
        >
          {exportPreviewLayout ? (
            <>
              <div
                className="resize-preview-art"
                style={{
                  left: `${exportPreviewLayout.xPercent}%`,
                  top: `${exportPreviewLayout.yPercent}%`,
                  width: `${exportPreviewLayout.widthPercent}%`,
                  height: `${exportPreviewLayout.heightPercent}%`,
                }}
              >
                <span className="resize-preview-art-label">{`Preview art: ${image?.name ?? 'Active image'}`}</span>
              </div>
              <div className="resize-preview-caption">
                <strong>{exportPreviewLayout.cropLabel}</strong>
                <span>{`${outputSettings.width} x ${outputSettings.height} / ${outputSettings.resizeFitMode}`}</span>
              </div>
            </>
          ) : (
            <div className="resize-preview-empty">
              <strong>No active page</strong>
              <span>Load an image to preview size unification.</span>
            </div>
          )}
        </div>
        <div className="page-list export-entry-list">
          {zipEntryPreviewNames.length === 0 ? (
            <div className="page-card empty"><strong>No ZIP entries yet</strong></div>
          ) : (
            zipEntryPreviewNames.map((entryName) => (
              <div key={entryName} className="page-card"><strong>{entryName}</strong></div>
            ))
          )}
        </div>
      </div>

      {/* Recent exports */}
      <div className="export-preview">
        <div className="panel-title">Recent exports</div>
        <div className="page-list export-entry-list">
          {recentExports.length === 0 ? (
            <div className="page-card empty"><strong>No exports yet</strong></div>
          ) : (
            recentExports.map((entry, index) => (
              <div key={`${entry.format}-${entry.label}-${index}`} className="page-card">
                <strong>{entry.format} {entry.label}</strong>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
