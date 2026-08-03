// 確定済み海域のジオメトリはstateに持たず、シードから再生成してキャッシュする
import type { Ring } from '../map/geo'
import type { RegionId } from '../map/regions'
import { generateReport } from '../report/generate'

const cache = new Map<string, Ring[]>()

export function confirmedGeometry(id: RegionId, attempt: number): Ring[] {
  const key = `${id}:${attempt}`
  const hit = cache.get(key)
  if (hit) return hit
  const geometry = generateReport(id, attempt).geometry
  cache.set(key, geometry)
  return geometry
}
