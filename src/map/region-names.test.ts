import { ALL_REGIONS, START_REGION } from './regions'
import { regionName } from './region-names'

describe('regionName', () => {
  test('開始海域が、名前を求めたとき、母港の海になるべき', () => {
    expect(regionName(START_REGION)).toBe('母港の海')
  })

  test('開始海域の東隣が、名前を求めたとき、東で始まるべき', () => {
    expect(regionName('r6-1')).toMatch(/^東・/)
  })

  test('開始海域の真北が、名前を求めたとき、北で始まるべき', () => {
    expect(regionName('r5-0')).toMatch(/^北・/)
  })

  test('西へラップした最短方向の海域が、名前を求めたとき、東ではなく西と判定されるべき', () => {
    // r5-1から見てcol 1は西回りで-4（東回りだと+8）
    expect(regionName('r1-1')).toMatch(/^西・/)
  })

  test('全海域の名前が、生成したとき、空でなく決定的であるべき', () => {
    for (const id of ALL_REGIONS) {
      const name = regionName(id)
      expect(name.length).toBeGreaterThan(0)
      expect(regionName(id)).toBe(name)
    }
  })
})
