// 確定済み海域のジオメトリはstateに持たず、シード+記録済み陸橋から再生成してキャッシュする
import type { EdgeId } from '../map/edges'
import type { Ring } from '../map/geo'
import type { RegionId } from '../map/regions'
import type { LieIntensity } from '../report/config'
import { reportGeometryWithBridges } from '../report/generate'

const cache = new Map<string, Ring[]>()

export function confirmedGeometry(
  id: RegionId,
  attempt: number,
  intensity: LieIntensity,
  bridges: EdgeId[] = [],
): Ring[] {
  const key = `${intensity}:${id}:${attempt}:${bridges.join(',')}`
  const hit = cache.get(key)
  if (hit) return hit
  const geometry = reportGeometryWithBridges(id, attempt, intensity, bridges)
  cache.set(key, geometry)
  return geometry
}
