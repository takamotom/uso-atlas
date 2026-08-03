// Natural Earth 110m land GeoJSON → 海域別クリップ済みJSON前処理
// 実行: npm run preprocess （開発時のみ。出力はコミットする）
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { clipRingToRect, ringArea, roundRing } from '../src/map/geo.ts'
import type { Ring } from '../src/map/geo.ts'
import {
  ALL_REGIONS,
  CENTRAL_MERIDIAN,
  COLS,
  LAT_CLIP,
  LAT_STEP,
  LON_STEP,
  ROWS,
  regionBBox,
} from '../src/map/regions.ts'

const here = dirname(fileURLToPath(import.meta.url))

interface GeoJson {
  features: Array<{
    geometry:
      | { type: 'Polygon'; coordinates: number[][][] }
      | { type: 'MultiPolygon'; coordinates: number[][][][] }
  }>
}

const raw: GeoJson = JSON.parse(readFileSync(join(here, 'ne_110m_land.geojson'), 'utf8'))

const sourceRings: Ring[] = []
for (const f of raw.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  for (const poly of polys) {
    // 110m landレイヤは穴を実質持たないため外周リングのみ使用
    sourceRings.push(poly[0].map(([lon, lat]) => [lon, lat] as const))
  }
}

// 中央経線150°Eシフト。シフト後の[-180,180)の切れ目は元経度-30°線。
// 元座標で2矩形に分割クリップしてからそれぞれ平行移動すれば、跨ぐポリゴンも正しく分断される。
const shifted: Ring[] = []
for (const ring of sourceRings) {
  const west = clipRingToRect(ring, { x0: -180, y0: -90, x1: -30, y1: 90 })
  if (west.length >= 3) shifted.push(west.map(([x, y]) => [x + 360 - CENTRAL_MERIDIAN, y]))
  const east = clipRingToRect(ring, { x0: -30, y0: -90, x1: 180, y1: 90 })
  if (east.length >= 3) shifted.push(east.map(([x, y]) => [x - CENTRAL_MERIDIAN, y]))
}

// 緯度クリップ（高緯度の歪み帯を除外）
const clipped: Ring[] = shifted
  .map((r) => clipRingToRect(r, { x0: -180, y0: LAT_CLIP.min, x1: 180, y1: LAT_CLIP.max }))
  .filter((r) => r.length >= 3)

// 海域別クリップ
const MIN_AREA = 1e-4 // 縮退スライバ除去（deg²）
const regions: Record<string, Ring[]> = {}
let vertexCount = 0
for (const id of ALL_REGIONS) {
  const bbox = regionBBox(id)
  const rings: Ring[] = []
  for (const ring of clipped) {
    const c = clipRingToRect(ring, bbox)
    if (c.length < 3) continue
    const rounded = roundRing(c, 2)
    if (rounded.length < 3 || Math.abs(ringArea(rounded)) < MIN_AREA) continue
    rings.push(rounded)
    vertexCount += rounded.length
  }
  if (rings.length > 0) regions[id] = rings
}

const out = {
  grid: { cols: COLS, rows: ROWS, lonStep: LON_STEP, latStep: LAT_STEP },
  regions,
}
const outPath = join(here, '..', 'src', 'assets', 'world-regions.json')
writeFileSync(outPath, JSON.stringify(out))

const kb = (JSON.stringify(out).length / 1024).toFixed(0)
console.log(
  `完了: ${Object.keys(regions).length}/${ALL_REGIONS.length}海域に陸地, 総頂点${vertexCount}, ${kb}KB → ${outPath}`,
)
