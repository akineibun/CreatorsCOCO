export const EXPORT_METADATA_POLICY_LABEL = 'EXIF and metadata removed'

export const createMetadataRemovalSummary = () => ({
  exif: 'removed',
  metadata: 'removed',
  label: EXPORT_METADATA_POLICY_LABEL,
})

export const sanitizeRenderedExportBlob = async (blob: Blob, mimeType: string): Promise<Blob> => {
  const buffer = await blob.arrayBuffer()
  return new Blob([buffer], { type: mimeType })
}
