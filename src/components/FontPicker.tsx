import { useEffect, useMemo, useRef, useState } from 'react'

// ── Common font list ──────────────────────────────────────────────────────────
// Japanese + universal fonts commonly available on Windows / macOS / Linux

export const FONT_CATEGORIES = {
  sans: 'ゴシック / Sans-serif',
  serif: '明朝 / Serif',
  mono: '等幅 / Monospace',
  handwriting: '手書き / Handwriting',
  display: '装飾 / Display',
} as const

export type FontCategory = keyof typeof FONT_CATEGORIES

type FontEntry = {
  family: string
  category: FontCategory
  sample?: string
}

const BUILT_IN_FONTS: FontEntry[] = [
  // Sans-serif (ゴシック)
  { family: 'sans-serif', category: 'sans' },
  { family: 'Noto Sans JP', category: 'sans', sample: 'あいうえおABCabc' },
  { family: 'Yu Gothic', category: 'sans', sample: 'あいうえおABCabc' },
  { family: 'Meiryo', category: 'sans', sample: 'あいうえおABCabc' },
  { family: 'Hiragino Kaku Gothic Pro', category: 'sans', sample: 'あいうえおABCabc' },
  { family: 'MS Gothic', category: 'sans', sample: 'あいうえおABCabc' },
  { family: 'Arial', category: 'sans' },
  { family: 'Segoe UI', category: 'sans' },
  { family: 'Helvetica Neue', category: 'sans' },
  { family: 'Roboto', category: 'sans' },
  // Serif (明朝)
  { family: 'serif', category: 'serif' },
  { family: 'Noto Serif JP', category: 'serif', sample: 'あいうえおABCabc' },
  { family: 'Yu Mincho', category: 'serif', sample: 'あいうえおABCabc' },
  { family: 'MS Mincho', category: 'serif', sample: 'あいうえおABCabc' },
  { family: 'Hiragino Mincho Pro', category: 'serif', sample: 'あいうえおABCabc' },
  { family: 'Georgia', category: 'serif' },
  { family: 'Times New Roman', category: 'serif' },
  // Monospace
  { family: 'monospace', category: 'mono' },
  { family: 'Consolas', category: 'mono' },
  { family: 'Courier New', category: 'mono' },
  { family: 'Source Code Pro', category: 'mono' },
  // Handwriting / Script
  { family: 'cursive', category: 'handwriting' },
  { family: 'Comic Sans MS', category: 'handwriting' },
  { family: 'Segoe Script', category: 'handwriting' },
  { family: 'Dancing Script', category: 'handwriting' },
  // Display / Decorative
  { family: 'fantasy', category: 'display' },
  { family: 'Impact', category: 'display' },
  { family: 'Bebas Neue', category: 'display' },
  { family: 'Pacifico', category: 'display' },
]

const FAVORITE_FONTS_KEY = 'creators-coco.favorite-fonts'

const loadFavorites = (): Set<string> => {
  try {
    const stored = window.localStorage.getItem(FAVORITE_FONTS_KEY)
    if (stored) return new Set(JSON.parse(stored) as string[])
  } catch {}
  return new Set()
}

const saveFavorites = (favorites: Set<string>) => {
  window.localStorage.setItem(FAVORITE_FONTS_KEY, JSON.stringify([...favorites]))
}

/** Detect which built-in fonts are available in the browser using Canvas measurement. */
const detectAvailableFonts = (candidates: string[]): Set<string> => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return new Set(candidates)

  // Reference width using a known generic fallback
  ctx.font = '72px monospace'
  const refW = ctx.measureText('mmmmmmmmmmli').width

  const available = new Set<string>()
  for (const family of candidates) {
    if (['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'].includes(family)) {
      available.add(family)
      continue
    }
    ctx.font = `72px "${family}", monospace`
    const w = ctx.measureText('mmmmmmmmmmli').width
    if (w !== refW) available.add(family)
  }
  return available
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  value: string
  onChange: (fontFamily: string) => void
  sampleText?: string
  disabled?: boolean
}

export function FontPicker({ value, onChange, sampleText = 'あAaBb123', disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<FontCategory | 'all' | 'favorites'>('all')
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)
  const [availableFonts, setAvailableFonts] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect available fonts once
  useEffect(() => {
    const candidates = BUILT_IN_FONTS.map((f) => f.family)
    // Use document.fonts for browser-loaded fonts if available
    const detected = detectAvailableFonts(candidates)
    // Add currently loaded web fonts
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        document.fonts.forEach((face) => detected.add(face.family))
        setAvailableFonts(new Set(detected))
      })
    } else {
      setAvailableFonts(detected)
    }
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return BUILT_IN_FONTS.filter((f) => {
      if (category === 'favorites' && !favorites.has(f.family)) return false
      if (category !== 'all' && category !== 'favorites' && f.category !== category) return false
      if (q && !f.family.toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => {
      // Favorites first, then available, then others
      const aFav = favorites.has(a.family) ? 0 : 1
      const bFav = favorites.has(b.family) ? 0 : 1
      if (aFav !== bFav) return aFav - bFav
      const aAvail = availableFonts.has(a.family) ? 0 : 1
      const bAvail = availableFonts.has(b.family) ? 0 : 1
      return aAvail - bAvail
    })
  }, [search, category, favorites, availableFonts])

  const toggleFavorite = (family: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(family)) next.delete(family)
      else next.add(family)
      saveFavorites(next)
      return next
    })
  }

  const select = (family: string) => {
    onChange(family)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="font-picker" aria-label="Font picker">
      <button
        type="button"
        className="font-picker-trigger"
        style={{ fontFamily: value }}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{value}</span>
        <span className="font-picker-sample" style={{ fontFamily: value }}>{sampleText}</span>
        <span className="font-picker-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="font-picker-dropdown" role="listbox" aria-label="Font list">
          {/* Search */}
          <input
            autoFocus
            type="text"
            className="font-picker-search"
            placeholder="Search fonts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search fonts"
          />

          {/* Category tabs */}
          <div className="font-picker-tabs" role="tablist">
            {([['all', 'すべて'], ['favorites', '★'], ...Object.entries(FONT_CATEGORIES)] as Array<[string, string]>).map(
              ([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={category === key}
                  className={category === key ? 'font-picker-tab active' : 'font-picker-tab'}
                  onClick={() => setCategory(key as FontCategory | 'all' | 'favorites')}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          {/* Font list */}
          <ul className="font-picker-list">
            {filtered.length === 0 && (
              <li className="font-picker-empty">No fonts found</li>
            )}
            {filtered.map((font) => {
              const isAvail = availableFonts.has(font.family) || ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'].includes(font.family)
              const isFav = favorites.has(font.family)
              const isSelected = font.family === value
              return (
                <li
                  key={font.family}
                  className={[
                    'font-picker-item',
                    isSelected ? 'selected' : '',
                    !isAvail ? 'unavailable' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    className="font-picker-item-btn"
                    onClick={() => select(font.family)}
                  >
                    <span className="font-picker-name">{font.family}</span>
                    <span
                      className="font-picker-preview"
                      style={{ fontFamily: font.family }}
                    >
                      {font.sample ?? sampleText}
                    </span>
                    {!isAvail && <span className="font-picker-unavail">N/A</span>}
                  </button>
                  <button
                    type="button"
                    className={isFav ? 'font-picker-fav active' : 'font-picker-fav'}
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(font.family) }}
                    aria-label={isFav ? `Unpin ${font.family}` : `Pin ${font.family}`}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
