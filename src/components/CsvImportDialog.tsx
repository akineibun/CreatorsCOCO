import { useRef, useState } from 'react'
import { Button } from './ui/button'

type CsvRow = Record<string, string>

type FieldMapEntry = {
  csvColumn: string
  targetLayerName: string
}

type Props = {
  onImport: (rows: CsvRow[], fieldMap: Record<string, string>) => void
  onClose: () => void
  layerNames: string[]
}

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current)
    return result
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map((line) => {
    const values = parseRow(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
  return { headers, rows }
}

export function CsvImportDialog({ onImport, onClose, layerNames }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<CsvRow[]>([])
  const [fieldMap, setFieldMap] = useState<FieldMapEntry[]>([])
  const [fileName, setFileName] = useState('')

  const handleFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers: h, rows: r } = parseCsv(text)
      setHeaders(h)
      setRows(r)
      setFieldMap(h.map((col) => ({ csvColumn: col, targetLayerName: '' })))
    }
    reader.readAsText(file, 'utf-8')
  }

  const updateFieldMap = (index: number, targetLayerName: string) => {
    setFieldMap((prev) => prev.map((entry, i) => (i === index ? { ...entry, targetLayerName } : entry)))
  }

  const handleImport = () => {
    const map: Record<string, string> = {}
    for (const entry of fieldMap) {
      if (entry.targetLayerName) map[entry.csvColumn] = entry.targetLayerName
    }
    onImport(rows, map)
    onClose()
  }

  const mappedCount = fieldMap.filter((e) => e.targetLayerName).length
  const allLayerTargets = [
    ...layerNames,
    ...layerNames.map((n) => `${n}:body`),
    ...layerNames.map((n) => `${n}:speaker`),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#14110f] border border-[rgba(243,239,230,0.12)] rounded-xl p-5 w-[560px] max-h-[80vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">CSVセリフ一括流し込み</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
        </div>

        {/* File select */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
          />
          <Button size="sm" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
            {fileName || 'CSVファイルを選択...'}
          </Button>
        </div>

        {headers.length > 0 && (
          <>
            {/* Field mapping */}
            <div className="mb-4">
              <p className="text-xs text-[rgba(243,239,230,0.5)] mb-2">
                {`${rows.length}行 / ${headers.length}列 — 各CSVカラムを対応するレイヤー名にマッピング`}
              </p>
              <div className="grid gap-2">
                {fieldMap.map((entry, i) => (
                  <div key={entry.csvColumn} className="grid grid-cols-2 gap-2 items-center">
                    <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded truncate">{entry.csvColumn}</span>
                    <select
                      className="text-xs bg-[#1a1714] border border-[rgba(243,239,230,0.12)] rounded px-2 py-1"
                      value={entry.targetLayerName}
                      onChange={(e) => updateFieldMap(i, e.target.value)}
                    >
                      <option value="">— マッピングなし —</option>
                      {allLayerTargets.map((ln) => (
                        <option key={ln} value={ln}>{ln}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            {rows.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-[rgba(243,239,230,0.5)] mb-2">プレビュー（先頭3行）</p>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-left border border-[rgba(243,239,230,0.08)]">#</th>
                        {headers.map((h) => (
                          <th key={h} className="px-2 py-1 text-left border border-[rgba(243,239,230,0.08)] max-w-[120px] truncate">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1 border border-[rgba(243,239,230,0.08)]">{i + 1}</td>
                          {headers.map((h) => (
                            <td key={h} className="px-2 py-1 border border-[rgba(243,239,230,0.08)] max-w-[120px] truncate">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={onClose}>キャンセル</Button>
              <Button
                size="sm"
                variant="default"
                onClick={handleImport}
                disabled={mappedCount === 0}
              >
                {`インポート (${rows.length}行, ${mappedCount}マッピング)`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
