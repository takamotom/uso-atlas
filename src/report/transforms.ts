// 嘘の変換（歪み・捏造・消失/沈没）。すべて純関数。
//
// 絶対不変条件（継ぎ目保証）:
//   すべての変換は、セル境界から margin/2 以内の帯では地形を変えない。
//   真実ジオメトリは隣接セルと同一境界線でクリップ済みなので、
//   この不変条件を守る限りどの報告を信じても海岸線は途切れない。
import type { BBox, Point, Ring } from '../map/geo'
import { clipRingToRect, distToRectBorder, ringArea, ringCentroid } from '../map/geo'
import type { LiePreset } from './config'
import { createNoise2D, smoothstep } from './noise'
import type { Rng } from './random'
import { rollInt, rollRange } from './random'

function cellWidth(bbox: BBox): number {
  return bbox.x1 - bbox.x0
}

export function marginOf(bbox: BBox, preset: LiePreset): number {
  return cellWidth(bbox) * preset.marginRatio
}

/** 境界エンベロープ: 境界からmargin/2まで0（恒等）、marginで1（フル適用） */
function envelope(p: Point, bbox: BBox, margin: number): number {
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
function resampleOutsideBand(ring: Ring, spacing: number, bbox: BBox, margin: number): Ring {
  return resampleRing(ring, spacing, (p) => distToRectBorder(p, bbox) > margin / 2)
}

/**
 * 変位後の点が境界帯（margin/2以内）へ入り込まないよう変位量を制限する。
 * これにより「帯内の頂点＝元の輪郭線上の無変換頂点」が変換後も厳密に成り立つ。
 */
function displaceWithin(p: Point, dx: number, dy: number, bbox: BBox, margin: number): Point {
  const len = Math.hypot(dx, dy)
  if (len === 0) return p
  const room = (distToRectBorder(p, bbox) - margin / 2) * 0.9
  if (room <= 0) return p
  const scale = len > room ? room / len : 1
  return [p[0] + dx * scale, p[1] + dy * scale]
}

/** (a) 歪み: 海岸線への滑らかな変位ノイズ */
export function distortRings(
  rings: Ring[],
  bbox: BBox,
  rng: Rng,
  seed: string,
  preset: LiePreset,
): Ring[] {
  const w = cellWidth(bbox)
  const margin = marginOf(bbox, preset)
  const amp = rollRange(rng, preset.distortAmp.min, preset.distortAmp.max) * w
  const wavelength = w * preset.distortWavelengthRatio
  const noiseX = createNoise2D(`${seed}:dx`, wavelength)
  const noiseY = createNoise2D(`${seed}:dy`, wavelength)
  const spacing = w * preset.resampleRatio
  return rings.map((ring) =>
    resampleOutsideBand(ring, spacing, bbox, margin).map((p) => {
      const e = envelope(p, bbox, margin)
      if (e === 0) return p
      return displaceWithin(
        p,
        e * amp * noiseX(p[0], p[1]),
        e * amp * noiseY(p[0], p[1]),
        bbox,
        margin,
      )
    }),
  )
}

/** 有機的なブロブ島を1つ生成する。全頂点は中心から半径 clamp*R 以内 */
function blobIsland(center: Point, radius: number, clamp: number, rng: Rng): Ring {
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
    r = Math.min(clamp, Math.max(0.25, r)) * radius
    ring.push([center[0] + r * Math.cos(theta), center[1] + r * Math.sin(theta)])
  }
  return ring
}

/** (b) 捏造: 存在しない島（まれにムー大陸級）を追加。境界帯には配置しない */
export function fabricateIslands(
  rings: Ring[],
  bbox: BBox,
  rng: Rng,
  preset: LiePreset,
): Ring[] {
  const w = cellWidth(bbox)
  const margin = marginOf(bbox, preset)
  const continent = rng() < preset.continentProbability
  const count = continent ? 1 : rollInt(rng, preset.fabricateCount.min, preset.fabricateCount.max)
  const added: Ring[] = []
  for (let i = 0; i < count; i++) {
    const clamp = continent ? preset.continentClamp : 1.5
    const radius = continent
      ? preset.continentRadius * w
      : rollRange(rng, preset.islandRadius.min, preset.islandRadius.max) * w
    const clearance = margin + radius * clamp
    const cx = rollRange(rng, bbox.x0 + clearance, bbox.x1 - clearance)
    const cy = rollRange(rng, bbox.y0 + clearance, bbox.y1 - clearance)
    added.push(blobIsland([cx, cy], radius, clamp, rng))
  }
  return [...rings, ...added]
}

/** リングが境界帯（margin以内）に接しているか */
export function touchesBorder(ring: Ring, bbox: BBox, margin: number): boolean {
  return ring.some((p) => distToRectBorder(p, bbox) < margin)
}

/**
 * 沈没: リングをセル境界沿いの帯（幅margin）だけ残してクリップする。
 * 大陸の本体が海に沈み、境界を跨ぐ部分の残骸（岩礁）だけが残る。
 * 帯内の頂点は元の輪郭線上（クリップの切り口は帯の内縁=margin線上）なので継ぎ目保証を満たす。
 */
export function sinkRingToBorderStrips(ring: Ring, bbox: BBox, margin: number): Ring[] {
  const strips: BBox[] = [
    { x0: bbox.x0, y0: bbox.y0, x1: bbox.x0 + margin, y1: bbox.y1 },
    { x0: bbox.x1 - margin, y0: bbox.y0, x1: bbox.x1, y1: bbox.y1 },
    { x0: bbox.x0 + margin, y0: bbox.y0, x1: bbox.x1 - margin, y1: bbox.y0 + margin },
    { x0: bbox.x0 + margin, y0: bbox.y1 - margin, x1: bbox.x1 - margin, y1: bbox.y1 },
  ]
  const out: Ring[] = []
  for (const strip of strips) {
    const clipped = clipRingToRect(ring, strip)
    if (clipped.length >= 3 && Math.abs(ringArea(clipped)) > 1e-6) out.push(clipped)
  }
  return out
}

/** (c) 消失: 内陸の陸地を消し、境界接続の陸塊は痩せさせるか沈没させる */
export function vanishRings(rings: Ring[], bbox: BBox, rng: Rng, preset: LiePreset): Ring[] {
  const w = cellWidth(bbox)
  const margin = marginOf(bbox, preset)
  const interior = rings.filter((r) => !touchesBorder(r, bbox, margin))
  const bordering = rings.filter((r) => touchesBorder(r, bbox, margin))

  const survivors = interior.filter(() => rng() >= preset.vanishProbability)
  const strength = rollRange(rng, preset.erodeStrength.min, preset.erodeStrength.max)
  const spacing = w * preset.resampleRatio
  const transformed: Ring[] = []
  for (const ring of bordering) {
    if (rng() < preset.totalVanishProbability) {
      transformed.push(...sinkRingToBorderStrips(ring, bbox, margin))
      continue
    }
    const centroid = ringCentroid(ring)
    transformed.push(
      resampleOutsideBand(ring, spacing, bbox, margin).map((p): Point => {
        const e = envelope(p, bbox, margin)
        if (e === 0) return p
        return displaceWithin(
          p,
          e * strength * (centroid[0] - p[0]),
          e * strength * (centroid[1] - p[1]),
          bbox,
          margin,
        )
      }),
    )
  }
  return [...transformed, ...survivors]
}
