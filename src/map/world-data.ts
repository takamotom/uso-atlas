// 前処理済み世界地図データ（真実のジオメトリ）へのアクセス
import worldData from '../assets/world-regions.json'
import { ringArea } from './geo'
import type { Ring } from './geo'
import { ALL_REGIONS, COLS, LAT_CLIP, parseRegionId, regionBBox } from './regions'
import type { RegionId } from './regions'

const regions = worldData.regions as unknown as Record<string, Ring[]>

/** その海域の「真実」の地形。陸地がない海域は空配列 */
export function truthGeometry(id: RegionId): Ring[] {
  return regions[id] ?? []
}

const EDGE_EPS = 0.01

/**
 * 真実の陸地が世界の東西の果て（経度±180=地図の左右端）に接している海域。
 * 地図の切れ目を跨ぐ大陸（グリーンランド等）が千切れて両端に現れるセル。
 * これらが確定済みの場合、「果ては滝」という報告は成立しない（陸が続いている証拠になるため）
 */
export const WORLD_EDGE_LAND_REGIONS: RegionId[] = ALL_REGIONS.filter((id) => {
  const { col } = parseRegionId(id)
  if (col !== 0 && col !== COLS - 1) return false
  const atEdge = col === 0 ? (x: number) => x <= -180 + EDGE_EPS : (x: number) => x >= 180 - EDGE_EPS
  return truthGeometry(id).some((ring) => ring.some(([x]) => atEdge(x)))
})

/**
 * 海域の有効面積（緯度クリップ内）に対する陸地の割合 [0,1]。
 * 内陸セル判定（湖変換への切り替え）に使う
 */
export function landRatio(id: RegionId): number {
  const b = regionBBox(id)
  const y0 = Math.max(b.y0, LAT_CLIP.min)
  const y1 = Math.min(b.y1, LAT_CLIP.max)
  const effective = (b.x1 - b.x0) * Math.max(0, y1 - y0)
  if (effective === 0) return 0
  const land = truthGeometry(id).reduce((sum, ring) => sum + Math.abs(ringArea(ring)), 0)
  return Math.min(1, land / effective)
}
