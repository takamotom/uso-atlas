import { bridgeBandRect, cellEdges } from '../map/edges'
import { distToRectBorder, distToRingOutline } from '../map/geo'
import type { BBox, Point, Ring } from '../map/geo'
import { ALL_REGIONS, START_REGION, regionBBox } from '../map/regions'
import type { RegionId } from '../map/regions'
import { landRatio, truthGeometry } from '../map/world-data'
import { INLAND_LAND_RATIO, INTENSITY_PRESETS } from './config'
import type { LieIntensity } from './config'
import { FORCED_TRUTH_ATTEMPT, generateReport, reportGeometryWithBridges } from './generate'
import { marginOf } from './transforms'

function inRect(p: Point, rect: BBox, eps = 1e-6): boolean {
  return (
    p[0] >= rect.x0 - eps && p[0] <= rect.x1 + eps && p[1] >= rect.y0 - eps && p[1] <= rect.y1 + eps
  )
}

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

  test('内陸の海域の嘘報告が、生成されたとき、湖変換のみで構成されるべき（四角い海の防止）', () => {
    const inland = ALL_REGIONS.find((id) => landRatio(id) > INLAND_LAND_RATIO)
    expect(inland).toBeDefined()
    let sawLie = false
    for (let attempt = 0; attempt < 20; attempt++) {
      const report = generateReport(inland!, attempt)
      if (report.kind === 'lie') {
        sawLie = true
        expect(report.lieOps).toEqual(['lake'])
        expect(report.geometry.length).toBeGreaterThan(truthGeometry(inland!).length)
      }
    }
    expect(sawLie).toBe(true)
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

describe('陸橋', () => {
  test('陸橋のロールが、同じ海域・試行・レベルで、決定的であるべき', () => {
    const a = generateReport('r8-2', 3, 'wild')
    const b = generateReport('r8-2', 3, 'wild')
    expect(a.bridges).toEqual(b.bridges)
  })

  test('夢見る船長の嘘報告が、多数の試行で、陸橋を含む場合があるべき', () => {
    let sawBridge = false
    for (let attempt = 0; attempt < 20 && !sawBridge; attempt++) {
      const report = generateReport('r8-2', attempt, 'wild')
      if (report.kind === 'lie' && report.bridges.length > 0) sawBridge = true
    }
    expect(sawBridge).toBe(true)
  })

  test('必須の陸橋が、真実の報告でも、続きの陸として含まれるべき', () => {
    const id: RegionId = 'r8-2'
    const edge = cellEdges(id)[0]
    // 真実になるattemptを探す
    let truthAttempt = -999
    for (let attempt = 0; attempt < 30; attempt++) {
      if (generateReport(id, attempt, 'standard').kind === 'truth') {
        truthAttempt = attempt
        break
      }
    }
    expect(truthAttempt).not.toBe(-999)
    const report = generateReport(id, truthAttempt, 'standard', {
      required: [edge],
      allowed: [],
    })
    expect(report.kind).toBe('truth')
    expect(report.bridges).toContain(edge)
    expect(report.geometry.length).toBeGreaterThan(truthGeometry(id).length)
  })

  test('記録済み陸橋からの再現が、同じ陸橋つき報告のジオメトリと一致するべき', () => {
    const id: RegionId = 'r8-2'
    const edge = cellEdges(id)[0]
    const report = generateReport(id, 2, 'standard', { required: [edge], allowed: [] })
    const rebuilt = reportGeometryWithBridges(id, 2, 'standard', report.bridges)
    expect(rebuilt).toEqual(report.geometry)
  })

  test('陸橋スタブの帯内頂点が、宣言された陸橋の帯矩形に収まっているべき', () => {
    const id: RegionId = 'r8-2'
    const margin = marginOf(regionBBox(id), INTENSITY_PRESETS.standard)
    for (const edge of cellEdges(id)) {
      const report = generateReport(id, 0, 'standard', { required: [edge], allowed: [] })
      const rect = bridgeBandRect(id, edge, margin)!
      const bandVertices = report.geometry
        .flat()
        .filter((p) => distToRectBorder(p, regionBBox(id)) <= margin / 2)
      expect(bandVertices.length).toBeGreaterThan(0)
      for (const p of bandVertices) {
        expect(inRect(p, rect)).toBe(true)
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
                // 帯内の頂点は真実の輪郭上か、報告が宣言した陸橋の帯矩形内でなければならない
                const onTruth = minDistToOutlines(p, truth) < 1e-6
                const onBridge = report.bridges.some((e) => {
                  const rect = bridgeBandRect(id, e, margin)
                  return rect !== null && inRect(p, rect)
                })
                expect(onTruth || onBridge).toBe(true)
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
