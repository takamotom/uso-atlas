import { bridgeBandRect, bridgeProfile, cellEdges, neighborAcross } from './edges'
import { regionBBox } from './regions'

describe('cellEdges', () => {
  test('内陸の中央セルが、辺を求めたとき、4辺を持つべき', () => {
    expect(cellEdges('r5-2')).toHaveLength(4)
  })

  test('西端の列のセルが、辺を求めたとき、世界の果ての辺を含まず3辺になるべき', () => {
    const edges = cellEdges('r0-2')
    expect(edges).toHaveLength(3)
    expect(edges).toContain('ve:0:2')
  })

  test('東端の列のセルが、辺を求めたとき、世界の果ての辺を含まず3辺になるべき', () => {
    expect(cellEdges('r11-2')).toHaveLength(3)
  })
})

describe('neighborAcross', () => {
  test('共有辺の両側のセルが、辺を渡ったとき、互いに行き来できるべき', () => {
    expect(neighborAcross('r5-2', 've:5:2')).toBe('r6-2')
    expect(neighborAcross('r6-2', 've:5:2')).toBe('r5-2')
    expect(neighborAcross('r5-2', 'he:5:2')).toBe('r5-3')
    expect(neighborAcross('r5-3', 'he:5:2')).toBe('r5-2')
  })

  test('セルに属さない辺が、渡ろうとしたとき、nullを返すべき', () => {
    expect(neighborAcross('r5-2', 've:8:2')).toBeNull()
  })
})

describe('bridgeProfile', () => {
  test('同じ辺のプロファイルが、複数回求めても、同一であるべき', () => {
    expect(bridgeProfile('ve:5:2')).toEqual(bridgeProfile('ve:5:2'))
  })

  test('プロファイルの範囲が、辺の内側40%かつ幅2.5〜5.5度に収まるべき', () => {
    for (const edge of ['ve:3:1', 've:7:4', 'he:2:2', 'he:10:0'] as const) {
      const { center, halfWidth } = bridgeProfile(edge)
      expect(halfWidth).toBeGreaterThanOrEqual(2.5)
      expect(halfWidth).toBeLessThanOrEqual(5.5)
      // 中心は辺の内側30%〜70%
      expect(center % 30).not.toBe(0)
    }
  })
})

describe('bridgeBandRect', () => {
  test('共有辺の両側の帯矩形が、境界線を挟んで正確に接するべき', () => {
    const margin = 3
    const east = bridgeBandRect('r5-2', 've:5:2', margin)!
    const west = bridgeBandRect('r6-2', 've:5:2', margin)!
    expect(east.x1).toBe(regionBBox('r5-2').x1)
    expect(west.x0).toBe(regionBBox('r6-2').x0)
    expect(east.x1).toBe(west.x0)
    expect(east.y0).toBe(west.y0)
    expect(east.y1).toBe(west.y1)
  })

  test('南北の共有辺の両側の帯矩形が、境界線を挟んで正確に接するべき', () => {
    const margin = 3
    const south = bridgeBandRect('r5-2', 'he:5:2', margin)!
    const north = bridgeBandRect('r5-3', 'he:5:2', margin)!
    expect(south.y0).toBe(north.y1)
    expect(south.x0).toBe(north.x0)
    expect(south.x1).toBe(north.x1)
  })
})
