// 前処理出力（world-regions.json）のデータ検査テスト
import worldData from '../assets/world-regions.json'
import type { Ring } from './geo'
import { COLS, LAT_STEP, LON_STEP, ROWS, START_REGION, parseRegionId, regionBBox } from './regions'
import type { RegionId } from './regions'
import { WORLD_EDGE_LAND_REGIONS } from './world-data'

const regions = worldData.regions as unknown as Record<RegionId, Ring[]>

describe('world-regions.json', () => {
  test('グリッド定義が、定数と一致するべき', () => {
    expect(worldData.grid).toEqual({ cols: COLS, rows: ROWS, lonStep: LON_STEP, latStep: LAT_STEP })
  })

  test('全海域のジオメトリの全頂点が、当該海域のbbox内（丸め誤差込み）に収まっているべき', () => {
    const TOL = 0.01
    for (const [id, rings] of Object.entries(regions)) {
      const bbox = regionBBox(id as RegionId)
      for (const ring of rings) {
        for (const [x, y] of ring) {
          expect(x).toBeGreaterThanOrEqual(bbox.x0 - TOL)
          expect(x).toBeLessThanOrEqual(bbox.x1 + TOL)
          expect(y).toBeGreaterThanOrEqual(bbox.y0 - TOL)
          expect(y).toBeLessThanOrEqual(bbox.y1 + TOL)
        }
      }
    }
  })

  test('日本を含む開始海域に、陸地が存在するべき', () => {
    expect(regions[START_REGION]).toBeDefined()
    expect(regions[START_REGION].length).toBeGreaterThan(0)
  })

  test('全リングが、3頂点以上を持つべき', () => {
    for (const rings of Object.values(regions)) {
      for (const ring of rings) {
        expect(ring.length).toBeGreaterThanOrEqual(3)
      }
    }
  })
})

describe('WORLD_EDGE_LAND_REGIONS', () => {
  test('果て接地セルが、抽出されたとき、東西の端の列だけを含み空でないべき', () => {
    // 地図の切れ目（元の西経30度線）はグリーンランド等を跨ぐため必ず存在する
    expect(WORLD_EDGE_LAND_REGIONS.length).toBeGreaterThan(0)
    for (const id of WORLD_EDGE_LAND_REGIONS) {
      const { col } = parseRegionId(id)
      expect([0, COLS - 1]).toContain(col)
    }
  })
})
