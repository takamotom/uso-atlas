// 前処理済み世界地図データ（真実のジオメトリ）へのアクセス
import worldData from '../assets/world-regions.json'
import { ringArea } from './geo'
import type { Ring } from './geo'
import { LAT_CLIP, regionBBox } from './regions'
import type { RegionId } from './regions'

const regions = worldData.regions as unknown as Record<string, Ring[]>

/** その海域の「真実」の地形。陸地がない海域は空配列 */
export function truthGeometry(id: RegionId): Ring[] {
  return regions[id] ?? []
}

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
