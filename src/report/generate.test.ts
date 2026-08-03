import { distToRectBorder, distToRingOutline } from '../map/geo'
import type { Point, Ring } from '../map/geo'
import { ALL_REGIONS, START_REGION, regionBBox } from '../map/regions'
import { truthGeometry } from '../map/world-data'
import { FORCED_TRUTH_ATTEMPT, generateReport } from './generate'
import { marginOf } from './transforms'

describe('generateReport', () => {
  test('同じ海域と試行回数で生成した報告が、2回生成しても同一のジオメトリになるべき', () => {
    for (const attempt of [0, 1, 5]) {
      const a = generateReport('r6-1', attempt)
      const b = generateReport('r6-1', attempt)
      expect(a).toEqual(b)
    }
  })

  test('強制真実attemptで生成したとき、真実のジオメトリそのものが返るべき', () => {
    const report = generateReport(START_REGION, FORCED_TRUTH_ATTEMPT)
    expect(report.kind).toBe('truth')
    expect(report.geometry).toEqual(truthGeometry(START_REGION))
  })

  test('多数の試行で生成したとき、真実と嘘の両方の報告が出現するべき', () => {
    const kinds = new Set(
      Array.from({ length: 30 }, (_, attempt) => generateReport('r6-1', attempt).kind),
    )
    expect(kinds).toEqual(new Set(['truth', 'lie']))
  })

  test('陸地のない海域の嘘報告が、生成されたとき、捏造のみで構成されるべき', () => {
    const emptyRegion = ALL_REGIONS.find((id) => truthGeometry(id).length === 0)
    expect(emptyRegion).toBeDefined()
    for (let attempt = 0; attempt < 20; attempt++) {
      const report = generateReport(emptyRegion!, attempt)
      if (report.kind === 'lie') {
        expect(report.lieOps).toEqual(['fabricate'])
        expect(report.geometry.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('境界不変条件（プロパティテスト）', () => {
  test('全海域×8試行の嘘報告で、境界帯内の頂点が真実の輪郭線上にあり、全頂点がbbox内にあるべき', () => {
    for (const id of ALL_REGIONS) {
      const bbox = regionBBox(id)
      const margin = marginOf(bbox)
      const truth = truthGeometry(id)
      for (let attempt = 0; attempt < 8; attempt++) {
        const report = generateReport(id, attempt)
        if (report.kind !== 'lie') continue
        for (const ring of report.geometry) {
          for (const p of ring) {
            expect(p[0]).toBeGreaterThanOrEqual(bbox.x0 - 1e-9)
            expect(p[0]).toBeLessThanOrEqual(bbox.x1 + 1e-9)
            expect(p[1]).toBeGreaterThanOrEqual(bbox.y0 - 1e-9)
            expect(p[1]).toBeLessThanOrEqual(bbox.y1 + 1e-9)
            if (distToRectBorder(p, bbox) <= margin / 2) {
              expect(minDistToOutlines(p, truth)).toBeLessThan(1e-6)
            }
          }
        }
      }
    }
  })
})

function minDistToOutlines(p: Point, rings: Ring[]): number {
  let min = Infinity
  for (const ring of rings) {
    const d = distToRingOutline(p, ring)
    if (d < min) min = d
  }
  return min
}
