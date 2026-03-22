export type BubbleShape = 'round' | 'rounded-rect' | 'spiky' | 'cloud' | 'urchin'

export const bubbleShapeOptions: BubbleShape[] = ['round', 'rounded-rect', 'spiky', 'cloud', 'urchin']

const bubbleShapeLabels: Record<BubbleShape, string> = {
  round: 'Round',
  'rounded-rect': 'Rounded rect',
  spiky: 'Spiky',
  cloud: 'Cloud',
  urchin: 'Urchin',
}

const createSeededRandom = (seed: number) => {
  let value = (seed >>> 0) + 0x6d2b79f5
  return () => {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export const getBubbleShapeLabel = (shape: BubbleShape) => bubbleShapeLabels[shape]

export const getBubbleShapeVariantNumber = (seed: number) => ((Math.abs(seed) % 7) + 1)

type BubbleShapeProfile = {
  spikes: number
  amplitude: number
  pinch: number
  twist: number
}

const getBubbleShapeProfile = (shape: BubbleShape, seed: number): BubbleShapeProfile => {
  const random = createSeededRandom(seed + shape.length * 13)

  if (shape === 'spiky') {
    return {
      spikes: 8 + Math.floor(random() * 4),
      amplitude: 0.12 + random() * 0.05,
      pinch: 0.28 + random() * 0.08,
      twist: random() * Math.PI * 2,
    }
  }

  if (shape === 'urchin') {
    return {
      spikes: 14 + Math.floor(random() * 6),
      amplitude: 0.18 + random() * 0.06,
      pinch: 0.18 + random() * 0.06,
      twist: random() * Math.PI * 2,
    }
  }

  if (shape === 'cloud') {
    return {
      spikes: 7 + Math.floor(random() * 4),
      amplitude: 0.08 + random() * 0.04,
      pinch: 0.46 + random() * 0.08,
      twist: random() * Math.PI * 2,
    }
  }

  return {
    spikes: 0,
    amplitude: 0,
    pinch: 0.5,
    twist: 0,
  }
}

export const getBubblePolygonPoints = (
  shape: BubbleShape,
  seed: number,
  pointCount = 36,
): Array<{ x: number; y: number }> => {
  const profile = getBubbleShapeProfile(shape, seed)
  const points = Array.from({ length: pointCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / pointCount
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const ellipseX = 0.48
    const ellipseY = shape === 'cloud' ? 0.4 : 0.42

    let radiusX = ellipseX
    let radiusY = ellipseY

    if (shape === 'spiky' || shape === 'urchin') {
      const wave = Math.max(0, Math.sin(angle * profile.spikes + profile.twist))
      const pinch = profile.pinch + (1 - profile.pinch) * wave
      radiusX *= pinch + profile.amplitude
      radiusY *= pinch + profile.amplitude
    } else if (shape === 'cloud') {
      const softWave =
        1 +
        Math.sin(angle * profile.spikes + profile.twist) * profile.amplitude +
        Math.sin(angle * Math.max(3, Math.floor(profile.spikes / 2)) - profile.twist / 2) * (profile.amplitude / 2)
      radiusX *= softWave
      radiusY *= softWave
    }

    return {
      x: 0.5 + cos * radiusX,
      y: 0.5 + sin * radiusY,
    }
  })

  return points
}

export const getBubbleClipPath = (shape: BubbleShape, seed: number) => {
  if (shape === 'round' || shape === 'rounded-rect') {
    return undefined
  }

  return `polygon(${getBubblePolygonPoints(shape, seed)
    .map((point) => `${(point.x * 100).toFixed(2)}% ${(point.y * 100).toFixed(2)}%`)
    .join(', ')})`
}
