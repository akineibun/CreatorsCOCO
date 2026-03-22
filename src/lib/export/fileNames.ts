import type { OutputSettings } from '../../stores/workspaceStore'

export const formatExportNumber = (index: number, outputSettings: OutputSettings) =>
  String(outputSettings.startNumber + index).padStart(outputSettings.numberPadding, '0')

export const createExportFileStem = (
  _sourceName: string,
  outputSettings: OutputSettings,
  index = 0,
) => `${outputSettings.fileNamePrefix}-${formatExportNumber(index, outputSettings)}`

export const createExportBundleName = (outputSettings: OutputSettings, pageCount: number) => {
  const start = formatExportNumber(0, outputSettings)
  const end = formatExportNumber(Math.max(0, pageCount - 1), outputSettings)
  return `${outputSettings.fileNamePrefix}-export-${start}-${end}`
}

export const createPngExportName = (
  sourceName: string,
  outputSettings: OutputSettings,
  index = 0,
) => `${createExportFileStem(sourceName, outputSettings, index)}.png`

export const createPdfExportName = (
  sourceName: string,
  outputSettings: OutputSettings,
  index = 0,
) => `${createExportFileStem(sourceName, outputSettings, index)}.pdf`

export const createZipExportName = (outputSettings: OutputSettings, pageCount: number) =>
  `${createExportBundleName(outputSettings, pageCount)}.zip`

export const createZipEntryName = (
  sourceName: string,
  outputSettings: OutputSettings,
  index: number,
) => `${String(index + 1).padStart(2, '0')}-${createExportFileStem(sourceName, outputSettings, index)}.txt`
