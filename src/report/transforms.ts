// 嘘の3変換（歪み・捏造・消失）。すべて純関数。
//
// 絶対不変条件（継ぎ目保証）:
//   すべての変換は、セル境界から MARGIN/2 以内の帯では地形を変えない。
//   真実ジオメトリは隣接セルと同一境界線でクリップ済みなので、
//   この不変条件を守る限りどの報告を信じても海岸線は途切れない。
import type { BBox, Point, Ring } from '../map/geo'
import { distToRectBorder, ringCentroid } from '../map/geo'
import {
  CONTINENT_PROBABILITY,
  CONTINENT_RADIUS,
  DISTORT_AMP,
  DISTORT_WAVELENGTH_RATIO,
  ERODE_STRENGTH,
  FABRICATE_COUNT,
  ISLAND_RADIUS,
  MARGIN_RATIO,
  RESAMPLE_RATIO,
  VANISH_PROBABILITY,
} from './config'
import { createNoise2D, smoothstep } from './noise'
import type { Rng } from './random'
import { rollInt, rollRange } from './random'

function cellWidth(bbox: BBox): number {
  return bbox.x1 - bbox.x0
}

export function marginOf(bbox: BBox): number {
  return cellWidth(bbox) * MARGIN_RATIO
}

/** 境界エンベロープ: 境界からMARGIN/2まで0（恒等）、MARGINで1（フル適用） */
function envelope(p: Point, bbox: BBox): number {
  const margin = marginOf(bbox)
  return smoothstep(margin / 2, margin, distToRectBorder(p, bbox))
}

/**
 * 辺を等間隔で細分し、滑らかな変形に耐える頂点密度にする（元頂点は保持）。
 * keepNew を渡すと、条件を満たさない新頂点は追加しない（辺上の点なので形状は不変）。
 */
export function resampleRing(ring: Ring, spacing: number, keepNew?: (p: Point) => boolean): Ring {
  const out: Point[] = []
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    out.push(a)
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const n = Math.floor(len / spacing)
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1)
      const q: Point = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
      if (!keepNew || keepNew(q)) out.push(q)
    }
  }
  return out
}

/**
 * 境界帯内に新頂点を作らないリサンプル。変換を合成した2回目以降のリサンプルで、
 * 変位済みの辺（＝真実の輪郭線上にない辺）上の新頂点が境界帯へ落ちて
 * 継ぎ目不変条件を破るのを防ぐ。帯内の点はエンベロープ0でどうせ変位しない。
 */
function resampleOutsideBand(ring: Ring, spacing: number, bbox: BBox): Ring {
  const halfBand = marginOf(bbox) / 2
  return resampleRing(ring, spacing, (p) => distToRectBorder(p, bbox) > halfBand)
}

/**
 * 変位後の点が境界帯（margin/2以内）へ入り込まないよう変位量を制限する。
 * これにより「帯内の頂点＝元の輪郭線上の無変換頂点」が変換後も厳密に成り立つ。
 */
function displaceWithin(p: Point, dx: number, dy: number, bbox: BBox): Point {
  const len = Math.hypot(dx, dy)
  if (len === 0) return p
  const room = (distToRectBorder(p, bbox) - marginOf(bbox) / 2) * 0.9
  if (room <= 0) return p
  const scale = len > room ? room / len : 1
  return [p[0] + dx * scale, p[1] + dy * scale]
}

/** (a) 歪み: 海岸線への滑らかな変位ノイズ */
export function distortRings(rings: Ring[], bbox: BBox, rng: Rng, seed: string): Ring[] {
  const w = cellWidth(bbox)
  const amp = rollRange(rng, DISTORT_AMP.min, DISTORT_AMP.max) * w
  const wavelength = w * DISTORT_WAVELENGTH_RATIO
  const noiseX = createNoise2D(`${seed}:dx`, wavelength)
  const noiseY = createNoise2D(`${seed}:dy`, wavelength)
  const spacing = w * RESAMPLE_RATIO
  return rings.map((ring) =>
    resampleOutsideBand(ring, spacing, bbox).map((p) => {
      const e = envelope(p, bbox)
      if (e === 0) return p
      return displaceWithin(p, e * amp * noiseX(p[0], p[1]), e * amp * noiseY(p[0], p[1]), bbox)
    }),
  )
}

/** 有機的なブロブ島を1つ生成する。全頂点は中心から半径1.5R以内 */
function blobIsland(center: Point, radius: number, rng: Rng): Ring {
  const harmonics = [2, 3, 5, 7].map((k) => ({
    k,
    amp: rollRange(rng, 0, 0.5 / Math.sqrt(k)),
    phase: rollRange(rng, 0, Math.PI * 2),
  }))
  const n = 40
  const ring: Point[] = []
  for (let i = 0; i < n; i++) {
    const theta = (i / n) * Math.PI * 2
    let r = 1
    for (const h of harmonics) r += h.amp * Math.sin(h.k * theta + h.phase)
    r = Math.min(1.5, Math.max(0.25, r)) * radius
    ring.push([center[0] + r * Math.cos(theta), center[1] + r * Math.sin(theta)])
  }
  return ring
}

/** (b) 捏造: 存在しない島（まれに大陸級）を追加。境界帯には配置しない */
export function fabricateIslands(rings: Ring[], bbox: BBox, rng: Rng): Ring[] {
  const w = cellWidth(bbox)
  const margin = marginOf(bbox)
  const continent = rng() < CONTINENT_PROBABILITY
  const count = continent ? 1 : rollInt(rng, FABRICATE_COUNT.min, FABRICATE_COUNT.max)
  const added: Ring[] = []
  for (let i = 0; i < count; i++) {
    const radius = continent
      ? CONTINENT_RADIUS * w
      : rollRange(rng, ISLAND_RADIUS.min, ISLAND_RADIUS.max) * w
    const clearance = margin + radius * 1.5
    const cx = rollRange(rng, bbox.x0 + clearance, bbox.x1 - clearance)
    const cy = rollRange(rng, bbox.y0 + clearance, bbox.y1 - clearance)
    added.push(blobIsland([cx, cy], radius, rng))
  }
  return [...rings, ...added]
}

/** リングが境界帯（margin以内）に接しているか */
export function touchesBorder(ring: Ring, bbox: BBox): boolean {
  const margin = marginOf(bbox)
  return ring.some((p) => distToRectBorder(p, bbox) < margin)
}

/** (c) 消失: 境界に接しない陸地を消す。境界接続の陸塊は内向きに痩せさせる */
export function vanishRings(rings: Ring[], bbox: BBox, rng: Rng): Ring[] {
  const w = cellWidth(bbox)
  const interior = rings.filter((r) => !touchesBorder(r, bbox))
  const bordering = rings.filter((r) => touchesBorder(r, bbox))

  const survivors = interior.filter(() => rng() >= VANISH_PROBABILITY)
  const strength = rollRange(rng, ERODE_STRENGTH.min, ERODE_STRENGTH.max)
  const spacing = w * RESAMPLE_RATIO
  const eroded = bordering.map((ring) => {
    const centroid = ringCentroid(ring)
    return resampleOutsideBand(ring, spacing, bbox).map((p): Point => {
      const e = envelope(p, bbox)
      if (e === 0) return p
      const t = e * strength
      return displaceWithin(p, t * (centroid[0] - p[0]), t * (centroid[1] - p[1]), bbox)
    })
  })
  return [...eroded, ...survivors]
}
