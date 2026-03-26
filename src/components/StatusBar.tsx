import { ZoomIn, Maximize2, Save, MousePointer2 } from 'lucide-react'

type StatusBarProps = {
  zoomPercent: number
  imageWidth: number | null
  imageHeight: number | null
  cursorX: number
  cursorY: number
  saveStatusLabel: string
  exportMessage: string
}

export function StatusBar({
  zoomPercent,
  imageWidth,
  imageHeight,
  cursorX,
  cursorY,
  saveStatusLabel,
  exportMessage,
}: StatusBarProps) {
  return (
    <footer
      aria-label="Status bar"
      className="flex items-center justify-between gap-4 px-4 py-1.5 border-t border-[rgba(243,239,230,0.08)] bg-[rgba(12,9,8,0.72)] text-[rgba(243,239,230,0.66)] text-xs select-none"
    >
      {/* Left: zoom + image size */}
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <ZoomIn className="w-3.5 h-3.5 opacity-60" />
          {zoomPercent}%
        </span>
        <span className="flex items-center gap-1.5">
          <Maximize2 className="w-3.5 h-3.5 opacity-60" />
          {imageWidth != null && imageHeight != null
            ? `${imageWidth} × ${imageHeight} px`
            : 'No image'}
        </span>
      </div>

      {/* Center: cursor coordinates */}
      <span className="flex items-center gap-1.5">
        <MousePointer2 className="w-3.5 h-3.5 opacity-60" />
        {`X: ${Math.round(cursorX)}  Y: ${Math.round(cursorY)}`}
      </span>

      {/* Right: save status + export message */}
      <div className="flex items-center gap-4">
        {exportMessage && (
          <span className="text-[#d7b48a]">{exportMessage}</span>
        )}
        <span className="flex items-center gap-1.5">
          <Save className="w-3.5 h-3.5 opacity-60" />
          {saveStatusLabel}
        </span>
      </div>
    </footer>
  )
}
