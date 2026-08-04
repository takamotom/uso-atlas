import { distToRectBorder, distToRingOutline } from '../map/geo'
import type { Point, Ring } from '../map/geo'
import { ALL_REGIONS, START_REGION, regionBBox } from '../map/regions'
import { truthGeometry } from '../map/world-data'
import { INTENSITY_PRESETS } from './config'
import type { LieIntensity } from './config'
import { FORCED_TRUTH_ATTEMPT, generateReport } from './generate'
import { marginOf } from './transforms'

const INTENSITIES: LieIntensity[] = ['mild', 'standard', 'wild']

describe('generateReport', () => {
  test('同じ海域・試行回数・レベルで生成した報告が、2回生成しても同一のジオメトリになるべき', () => {
    for (const intensity of INTENSITIES) {
      for (const attempt of [0, 5]) {
        const a = generateReport('r6-1', attempt, intensity)
        const b = generateReport('r6-1', attempt, intensity)
        expect(a).toEqual(b)
      }
    }
  })

  test('異なるレベルで生成した報告が、同じ海域と試行回数でも、異なる乱数列から生成されるべき', () => {
    const results = INTENSITIES.map((i) =>
      JSON.stringify(Array.from({ length: 5 }, (_, a) => generateReport('r6-1', a, i).kind)),
    )
    expect(new Set(results).size).toBeGreaterThan(1)
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
  test.each(INTENSITIES)(
    'レベル%sの全海域×6試行の嘘報告で、境界帯内の頂点が真実の輪郭線上にあり、全頂点がbbox内にあるべき',
    (intensity) => {
      const preset = INTENSITY_PRESETS[intensity]
      for (const id of ALL_REGIONS) {
        const bbox = regionBBox(id)
        const margin = marginOf(bbox, preset)
        const truth = truthGeometry(id)
        for (let attempt = 0; attempt < 6; attempt++) {
          const report = generateReport(id, attempt, intensity)
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
    },
  )
})

function minDistToOutlines(p: Point, rings: Ring[]): number {
  let min = Infinity
  for (const ring of rings) {
    const d = distToRingOutline(p, ring)
    if (d < min) min = d
  }
  return min
}
