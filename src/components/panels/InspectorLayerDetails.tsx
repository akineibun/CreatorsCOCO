import { useWorkspaceStore, selectActiveImage } from '../../stores/workspaceStore'
import { getBubbleShapeLabel, getBubbleShapeVariantNumber } from '../../lib/bubbleShapes'

const getTextLayerLabel = (layer: { name?: string | null; text: string }) =>
  layer.name?.trim() || layer.text
const getBubbleLayerLabel = (layer: { name?: string | null; text: string }) =>
  layer.name?.trim() || layer.text
const getMessageWindowLayerLabel = (layer: { name?: string | null; speaker: string }) =>
  layer.name?.trim() || layer.speaker
const getMosaicLayerLabel = (layer: { name?: string | null; style: string; intensity: number }) =>
  layer.name?.trim() || `${layer.style} ${layer.intensity}`
const getOverlayLayerLabel = (layer: { name?: string | null; opacity: number }) =>
  layer.name?.trim() || layer.opacity.toFixed(1)
const getWatermarkLayerLabel = (layer: {
  name?: string | null
  assetName?: string | null
  text: string
}) => layer.name?.trim() || layer.assetName || layer.text

/** Renders the layer-type-specific details rows inside the Property Inspector <dl>. */
export function InspectorLayerDetails() {
  const { pages, activePageId, selectedLayerId } = useWorkspaceStore()
  const image = selectActiveImage({ pages, activePageId })

  if (!image || !selectedLayerId || selectedLayerId === 'base-image') return null

  const activeTextLayer = image.textLayers.find((l) => l.id === selectedLayerId) ?? null
  const activeMessageWindowLayer =
    image.messageWindowLayers.find((l) => l.id === selectedLayerId) ?? null
  const activeBubbleLayer = image.bubbleLayers.find((l) => l.id === selectedLayerId) ?? null
  const activeMosaicLayer = image.mosaicLayers.find((l) => l.id === selectedLayerId) ?? null
  const activeOverlayLayer = image.overlayLayers.find((l) => l.id === selectedLayerId) ?? null
  const activeWatermarkLayer = image.watermarkLayers.find((l) => l.id === selectedLayerId) ?? null

  if (
    !activeTextLayer &&
    !activeMessageWindowLayer &&
    !activeBubbleLayer &&
    !activeMosaicLayer &&
    !activeOverlayLayer &&
    !activeWatermarkLayer
  ) {
    return null
  }

  const activeBubbleShape = activeBubbleLayer?.bubbleShape ?? 'round'
  const activeBubbleShapeVariant = getBubbleShapeVariantNumber(activeBubbleLayer?.shapeSeed ?? 0)

  return (
    <>
      {activeTextLayer ? (
        <>
          <div>
            <dt>Name</dt>
            <dd>{`Name ${getTextLayerLabel(activeTextLayer)}`}</dd>
          </div>
          <div>
            <dt>Color</dt>
            <dd>{`Color ${activeTextLayer.color}`}</dd>
          </div>
          <div>
            <dt>Fill</dt>
            <dd>
              {activeTextLayer.fillMode === 'gradient'
                ? `Fill Gradient ${activeTextLayer.gradientFrom} to ${activeTextLayer.gradientTo}`
                : 'Fill Solid'}
            </dd>
          </div>
          <div>
            <dt>Direction</dt>
            <dd>{`Direction ${activeTextLayer.isVertical ? 'Vertical' : 'Horizontal'}`}</dd>
          </div>
          <div>
            <dt>Layout</dt>
            <dd>{`Line height ${activeTextLayer.lineHeight.toFixed(1)} / Letter spacing ${activeTextLayer.letterSpacing}px / Wrap ${activeTextLayer.maxWidth}px`}</dd>
          </div>
          <div>
            <dt>Outline</dt>
            <dd>{`Outline ${activeTextLayer.strokeWidth} px`}</dd>
          </div>
          <div>
            <dt>Shadow</dt>
            <dd>{`Shadow ${activeTextLayer.shadowEnabled ? 'On' : 'Off'}`}</dd>
          </div>
          {(activeTextLayer.rotation ?? 0) !== 0 ? (
            <div>
              <dt>Rotation</dt>
              <dd>{`Rotation ${activeTextLayer.rotation ?? 0}°`}</dd>
            </div>
          ) : null}
          <div>
            <dt>Order</dt>
            <dd>{`Order ${image.textLayers.findIndex((l) => l.id === activeTextLayer.id) + 1} of ${image.textLayers.length}`}</dd>
          </div>
        </>
      ) : null}
      {activeMessageWindowLayer ? (
        <>
          <div>
            <dt>Name</dt>
            <dd>{`Name ${getMessageWindowLayerLabel(activeMessageWindowLayer)}`}</dd>
          </div>
          <div>
            <dt>Window</dt>
            <dd>{`Window: ${activeMessageWindowLayer.speaker}`}</dd>
          </div>
          <div>
            <dt>Frame</dt>
            <dd>{`Frame ${activeMessageWindowLayer.frameStyle}${activeMessageWindowLayer.assetName ? ` / Asset ${activeMessageWindowLayer.assetName}` : ''}`}</dd>
          </div>
          <div>
            <dt>Render</dt>
            <dd>{activeMessageWindowLayer.assetName ? 'Render 9-slice asset' : 'Render Frame only'}</dd>
          </div>
          <div>
            <dt>Body</dt>
            <dd>{`Body ${activeMessageWindowLayer.body}`}</dd>
          </div>
          <div>
            <dt>Opacity</dt>
            <dd>{`Window opacity ${activeMessageWindowLayer.opacity.toFixed(1)}`}</dd>
          </div>
          <div>
            <dt>Order</dt>
            <dd>{`Order ${image.messageWindowLayers.findIndex((l) => l.id === activeMessageWindowLayer.id) + 1} of ${image.messageWindowLayers.length}`}</dd>
          </div>
        </>
      ) : null}
      {activeBubbleLayer ? (
        <>
          <div>
            <dt>Name</dt>
            <dd>{`Name ${getBubbleLayerLabel(activeBubbleLayer)}`}</dd>
          </div>
          <div>
            <dt>Bubble</dt>
            <dd>{`Bubble: ${activeBubbleLayer.text}`}</dd>
          </div>
          <div>
            <dt>Tail</dt>
            <dd>{`Tail ${activeBubbleLayer.tailDirection.charAt(0).toUpperCase()}${activeBubbleLayer.tailDirection.slice(1)}`}</dd>
          </div>
          <div>
            <dt>Style</dt>
            <dd>{`Style ${activeBubbleLayer.stylePreset.charAt(0).toUpperCase()}${activeBubbleLayer.stylePreset.slice(1)}`}</dd>
          </div>
          <div>
            <dt>Shape</dt>
            <dd>{`Shape ${getBubbleShapeLabel(activeBubbleShape)} / Variant ${activeBubbleShapeVariant}`}</dd>
          </div>
          <div>
            <dt>Fill</dt>
            <dd>{`Fill ${activeBubbleLayer.fillColor}`}</dd>
          </div>
          <div>
            <dt>Border</dt>
            <dd>{`Border ${activeBubbleLayer.borderColor}`}</dd>
          </div>
          <div>
            <dt>Order</dt>
            <dd>{`Order ${image.bubbleLayers.findIndex((l) => l.id === activeBubbleLayer.id) + 1} of ${image.bubbleLayers.length}`}</dd>
          </div>
        </>
      ) : null}
      {activeMosaicLayer ? (
        <>
          <div>
            <dt>Name</dt>
            <dd>{`Name ${getMosaicLayerLabel(activeMosaicLayer)}`}</dd>
          </div>
          <div>
            <dt>Mosaic</dt>
            <dd>{`Mosaic intensity ${activeMosaicLayer.intensity}`}</dd>
          </div>
          <div>
            <dt>Style</dt>
            <dd>{`Mosaic style ${activeMosaicLayer.style}`}</dd>
          </div>
          <div>
            <dt>Order</dt>
            <dd>{`Order ${image.mosaicLayers.findIndex((l) => l.id === activeMosaicLayer.id) + 1} of ${image.mosaicLayers.length}`}</dd>
          </div>
        </>
      ) : null}
      {activeOverlayLayer ? (
        <>
          <div>
            <dt>Name</dt>
            <dd>{`Name ${getOverlayLayerLabel(activeOverlayLayer)}`}</dd>
          </div>
          <div>
            <dt>Overlay</dt>
            <dd>{`Overlay opacity ${activeOverlayLayer.opacity.toFixed(1)}`}</dd>
          </div>
          <div>
            <dt>Tint</dt>
            <dd>{`Tint ${activeOverlayLayer.color}`}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>{`Overlay area ${activeOverlayLayer.areaPreset}`}</dd>
          </div>
          <div>
            <dt>Fill</dt>
            <dd>
              {activeOverlayLayer.fillMode === 'gradient'
                ? `Overlay fill Gradient ${activeOverlayLayer.gradientFrom} to ${activeOverlayLayer.gradientTo}`
                : 'Overlay fill Solid'}
            </dd>
          </div>
          <div>
            <dt>Direction</dt>
            <dd>{`Gradient direction ${activeOverlayLayer.gradientDirection}`}</dd>
          </div>
          <div>
            <dt>Order</dt>
            <dd>{`Order ${image.overlayLayers.findIndex((l) => l.id === activeOverlayLayer.id) + 1} of ${image.overlayLayers.length}`}</dd>
          </div>
        </>
      ) : null}
      {activeWatermarkLayer ? (
        <>
          <div>
            <dt>Name</dt>
            <dd>{`Name ${getWatermarkLayerLabel(activeWatermarkLayer)}`}</dd>
          </div>
          <div>
            <dt>Watermark</dt>
            <dd>{`Watermark: ${activeWatermarkLayer.assetName ?? activeWatermarkLayer.text}`}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{`Mode ${activeWatermarkLayer.mode === 'image' ? 'Image' : 'Text'}`}</dd>
          </div>
          <div>
            <dt>Opacity</dt>
            <dd>{`Watermark opacity ${activeWatermarkLayer.opacity.toFixed(1)}`}</dd>
          </div>
          <div>
            <dt>Pattern</dt>
            <dd>{`Pattern ${activeWatermarkLayer.repeated ? 'Repeated' : 'Single'}`}</dd>
          </div>
          <div>
            <dt>Angle</dt>
            <dd>{`Angle ${activeWatermarkLayer.angle} deg`}</dd>
          </div>
          <div>
            <dt>Density</dt>
            <dd>{`Density ${activeWatermarkLayer.density}x`}</dd>
          </div>
          <div>
            <dt>Scale</dt>
            <dd>{`Scale ${activeWatermarkLayer.scale.toFixed(1)}x`}</dd>
          </div>
          <div>
            <dt>Layout</dt>
            <dd>{`Layout ${activeWatermarkLayer.tiled ? 'Tiled' : 'Single'}`}</dd>
          </div>
          <div>
            <dt>Order</dt>
            <dd>{`Order ${image.watermarkLayers.findIndex((l) => l.id === activeWatermarkLayer.id) + 1} of ${image.watermarkLayers.length}`}</dd>
          </div>
        </>
      ) : null}
    </>
  )
}
