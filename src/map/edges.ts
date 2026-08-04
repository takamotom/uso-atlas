// セル間の共有辺と「陸橋」プロファイル。
// 陸橋 = 捏造大陸が隣のセルへ跨ぐための、両セルが共有する境界帯内の陸の矩形。
// プロファイルは辺IDから決定的に導かれるため、両側のセルで必ず一致する。
import type { BBox } from './geo'
import { COLS, ROWS, parseRegionId, regionBBox, regionId } from './regions'
import type { RegionId } from './regions'
import { createRng, rollRange } from '../report/random'

/** `ve:{col}:{row}` = そのセルの東辺、`he:{col}:{row}` = そのセルの南辺 */
export type EdgeId = `ve:${number}:${number}` | `he:${number}:${number}`

/**
 * セルが持つ陸橋可能な辺。東西ラップの辺（世界の果て）は除外する
 * （平面世界の隠し要素と矛盾させないため）
 */
export function cellEdges(id: RegionId): EdgeId[] {
  const { col, row } = parseRegionId(id)
  const out: EdgeId[] = []
  if (col < COLS - 1) out.push(`ve:${col}:${row}`)
  if (col > 0) out.push(`ve:${col - 1}:${row}`)
  if (row < ROWS - 1) out.push(`he:${col}:${row}`)
  if (row > 0) out.push(`he:${col}:${row - 1}`)
  return out
}

/** 辺の向こう側のセル。辺がそのセルに属さない場合はnull */
export function neighborAcross(id: RegionId, edge: EdgeId): RegionId | null {
  const { col, row } = parseRegionId(id)
  const m = /^(ve|he):(\d+):(\d+)$/.exec(edge)
  if (!m) return null
  const [, kind, cs, rs] = m
  const ecol = Number(cs)
  const erow = Number(rs)
  if (kind === 've') {
    if (erow !== row) return null
    if (ecol === col) return regionId(col + 1, row)
    if (ecol === col - 1) return regionId(col - 1, row)
    return null
  }
  if (ecol !== col) return null
  if (erow === row) return regionId(col, row + 1)
  if (erow === row - 1) return regionId(col, row - 1)
  return null
}

export interface BridgeProfile {
  /** 辺に沿った中心座標（垂直辺なら緯度、水平辺なら経度） */
  center: number
  halfWidth: number
}

/** 辺IDから決定的に陸橋の位置・幅を導く（両側のセルで必ず同じ値になる） */
export function bridgeProfile(edge: EdgeId): BridgeProfile {
  const m = /^(ve|he):(\d+):(\d+)$/.exec(edge)!
  const [, kind, cs, rs] = m
  const col = Number(cs)
  const row = Number(rs)
  const bbox = regionBBox(regionId(col, row))
  const rng = createRng(`bridge-profile:${edge}`)
  const halfWidth = rollRange(rng, 2, 4.5)
  // 辺の端（セルの角）に寄ると隣接する直交方向の境界帯を侵すため、内側40%の範囲に置く
  const t = rollRange(rng, 0.3, 0.7)
  const center =
    kind === 've' ? bbox.y0 + t * (bbox.y1 - bbox.y0) : bbox.x0 + t * (bbox.x1 - bbox.x0)
  return { center, halfWidth }
}

/**
 * 指定セル側から見た、陸橋の境界帯内の矩形。
 * 両側のセルでこの矩形は境界線を挟んで正確に接する（帯内はこの矩形のみ＝継ぎ目保証）
 */
export function bridgeBandRect(id: RegionId, edge: EdgeId, margin: number): BBox | null {
  const bbox = regionBBox(id)
  const { center, halfWidth } = bridgeProfile(edge)
  const m = /^(ve|he):(\d+):(\d+)$/.exec(edge)
  if (!m) return null
  const [, kind, cs, rs] = m
  const ecol = Number(cs)
  const erow = Number(rs)
  const { col, row } = parseRegionId(id)
  if (kind === 've') {
    const y0 = center - halfWidth
    const y1 = center + halfWidth
    if (ecol === col && erow === row) return { x0: bbox.x1 - margin, y0, x1: bbox.x1, y1 }
    if (ecol === col - 1 && erow === row) return { x0: bbox.x0, y0, x1: bbox.x0 + margin, y1 }
    return null
  }
  const x0 = center - halfWidth
  const x1 = center + halfWidth
  if (ecol === col && erow === row) return { x0, y0: bbox.y0, x1, y1: bbox.y0 + margin }
  if (ecol === col && erow === row - 1) return { x0, y0: bbox.y1 - margin, x1, y1: bbox.y1 }
  return null
}
