// 前処理済み世界地図データ（真実のジオメトリ）へのアクセス
import worldData from '../assets/world-regions.json'
import type { Ring } from './geo'
import type { RegionId } from './regions'

const regions = worldData.regions as unknown as Record<string, Ring[]>

/** その海域の「真実」の地形。陸地がない海域は空配列 */
export function truthGeometry(id: RegionId): Ring[] {
  return regions[id] ?? []
}
