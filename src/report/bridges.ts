// 陸橋スタブ: セル境界を跨ぐ捏造大陸の、このセル側の陸片。
// 境界帯内は辺プロファイル由来の正確な矩形（両側のセルで一致＝継ぎ目保証）、
// 帯より内側は報告ごとにロールされる有機的なローブになる。
import { bridgeBandRect, bridgeProfile } from '../map/edges'
import type { EdgeId } from '../map/edges'
import { ringArea } from '../map/geo'
import type { Point, Ring } from '../map/geo'
import { regionBBox } from '../map/regions'
import type { RegionId } from '../map/regions'
import { createRng, rollRange } from './random'

/** 辺がセルのどちら側かを返す: [内向きX方向, 内向きY方向]（どちらかが0） */
function inwardDirection(id: RegionId, edge: EdgeId): [number, number] | null {
  const bbox = regionBBox(id)
  const rect = bridgeBandRect(id, edge, 1)
  if (!rect) return null
  if (rect.x1 === bbox.x1) return [-1, 0]
  if (rect.x0 === bbox.x0) return [1, 0]
  if (rect.y1 === bbox.y1) return [0, -1]
  return [0, 1]
}

/**
 * 陸橋スタブのリングを生成する。
 * 境界帯内の頂点は矩形の角のみ（プロファイル由来＝両側一致）、
 * ローブは帯の内側だけで波打ち、他の境界帯へは入らない。
 */
export function bridgeStubRing(
  id: RegionId,
  edge: EdgeId,
  margin: number,
  seed: string,
): Ring | null {
  const bbox = regionBBox(id)
  const dir = inwardDirection(id, edge)
  const rect = bridgeBandRect(id, edge, margin)
  if (!dir || !rect) return null
  const { center, halfWidth } = bridgeProfile(edge)
  const rng = createRng(seed)
  const depth = rollRange(rng, 5, 13)
  const harmonics = [1, 2, 3].map((k) => ({
    k,
    amp: rollRange(rng, 0, 0.3 / k),
    phase: rollRange(rng, 0, Math.PI * 2),
  }))

  const [dx, dy] = dir
  const vertical = dx !== 0
  // 境界線上の座標と、帯の内縁の座標
  const border = vertical ? (dx < 0 ? bbox.x1 : bbox.x0) : dy < 0 ? bbox.y1 : bbox.y0
  const inner = border + (vertical ? dx : dy) * margin

  const ring: Point[] = []
  const push = (along: number, deep: number) => {
    ring.push(vertical ? [deep, along] : [along, deep])
  }
  // 境界線上 → 帯の内縁（矩形部分。この4点が両側で一致する）
  push(center - halfWidth, border)
  push(center - halfWidth, inner)
  // ローブ: 内縁からさらに内側へ膨らむ弧
  const n = 24
  for (let i = 1; i < n; i++) {
    const theta = (i / n) * Math.PI
    let wobble = 1
    for (const h of harmonics) wobble += h.amp * Math.sin(h.k * theta + h.phase)
    const deepAmount = Math.max(0, depth * Math.sin(theta) * wobble)
    const along = center - halfWidth + (i / n) * halfWidth * 2
    // 他の境界帯を侵さないようクランプ
    const rawDeep = inner + (vertical ? dx : dy) * deepAmount
    const deep = vertical
      ? Math.max(bbox.x0 + margin, Math.min(bbox.x1 - margin, rawDeep))
      : Math.max(bbox.y0 + margin, Math.min(bbox.y1 - margin, rawDeep))
    push(along, deep)
  }
  push(center + halfWidth, inner)
  push(center + halfWidth, border)
  return ring
}

/** ジオメトリに陸橋スタブ群を追加する。巻き方向は既存の陸に合わせる（穴化の防止） */
export function applyBridges(
  geometry: Ring[],
  id: RegionId,
  bridges: EdgeId[],
  margin: number,
  seedBase: string,
): Ring[] {
  if (bridges.length === 0) return geometry
  let landOrientation = 1
  if (geometry.length > 0) {
    const largest = geometry.reduce((best, r) =>
      Math.abs(ringArea(r)) > Math.abs(ringArea(best)) ? r : best,
    )
    landOrientation = Math.sign(ringArea(largest)) || 1
  }
  const stubs: Ring[] = []
  for (const edge of bridges) {
    const ring = bridgeStubRing(id, edge, margin, `${seedBase}:stub:${edge}`)
    if (!ring) continue
    stubs.push(Math.sign(ringArea(ring)) === landOrientation ? ring : [...ring].reverse())
  }
  return [...geometry, ...stubs]
}
