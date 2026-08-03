import { clipRingToRect, distToRectBorder, ringArea, roundRing, shiftLon } from './geo'
import type { BBox, Ring } from './geo'

describe('shiftLon', () => {
  test('経度150が、中央経線150でシフトしたとき、0になるべき', () => {
    expect(shiftLon(150, 150)).toBe(0)
  })

  test('経度-180が、中央経線150でシフトしたとき、30になるべき', () => {
    expect(shiftLon(-180, 150)).toBe(30)
  })

  test('経度-30が、中央経線150でシフトしたとき、-180になるべき', () => {
    expect(shiftLon(-30, 150)).toBe(-180)
  })

  test('経度180が、中央経線150でシフトしたとき、[-180,180)に収まって30になるべき', () => {
    expect(shiftLon(180, 150)).toBe(30)
  })
})

describe('clipRingToRect', () => {
  const rect: BBox = { x0: 0, y0: 0, x1: 10, y1: 10 }

  test('矩形内に完全に含まれる三角形が、クリップしたとき、そのまま返るべき', () => {
    const tri: Ring = [
      [2, 2],
      [8, 2],
      [5, 8],
    ]
    expect(clipRingToRect(tri, rect)).toEqual(tri)
  })

  test('矩形外に完全にある三角形が、クリップしたとき、空配列になるべき', () => {
    const tri: Ring = [
      [20, 20],
      [30, 20],
      [25, 28],
    ]
    expect(clipRingToRect(tri, rect)).toEqual([])
  })

  test('矩形の右辺を跨ぐ三角形が、クリップしたとき、境界x=10上に交点が生成されるべき', () => {
    const tri: Ring = [
      [5, 2],
      [15, 2],
      [5, 8],
    ]
    const clipped = clipRingToRect(tri, rect)
    expect(clipped.length).toBeGreaterThanOrEqual(4)
    const onBorder = clipped.filter(([x]) => x === 10)
    expect(onBorder.length).toBe(2)
    for (const [x, y] of clipped) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(10)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(10)
    }
  })

  test('矩形を完全に覆う大きな四角形が、クリップしたとき、矩形そのものになるべき', () => {
    const big: Ring = [
      [-10, -10],
      [20, -10],
      [20, 20],
      [-10, 20],
    ]
    const clipped = clipRingToRect(big, rect)
    expect(Math.abs(ringArea(clipped))).toBeCloseTo(100)
  })

  test('同じ境界線で隣接矩形にクリップしたとき、境界上の交点座標が両側で一致するべき', () => {
    const left: BBox = { x0: 0, y0: 0, x1: 10, y1: 10 }
    const right: BBox = { x0: 10, y0: 0, x1: 20, y1: 10 }
    const tri: Ring = [
      [5, 3],
      [15, 4],
      [7, 9],
    ]
    const inLeft = clipRingToRect(tri, left).filter(([x]) => x === 10)
    const inRight = clipRingToRect(tri, right).filter(([x]) => x === 10)
    expect(inLeft.length).toBe(2)
    const leftYs = inLeft.map(([, y]) => y).sort((a, b) => a - b)
    const rightYs = inRight.map(([, y]) => y).sort((a, b) => a - b)
    expect(rightYs[0]).toBeCloseTo(leftYs[0], 10)
    expect(rightYs[1]).toBeCloseTo(leftYs[1], 10)
  })
})

describe('ringArea', () => {
  test('反時計回りの単位正方形が、面積を計算したとき、+1になるべき', () => {
    const sq: Ring = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
    expect(ringArea(sq)).toBe(1)
  })
})

describe('roundRing', () => {
  test('丸めで重複した連続頂点が、丸め処理したとき、除去されるべき', () => {
    const ring: Ring = [
      [0.001, 0.001],
      [0.002, 0.002],
      [5, 5],
      [0.004, 0.001],
    ]
    const rounded = roundRing(ring, 2)
    expect(rounded).toEqual([
      [0, 0],
      [5, 5],
    ])
  })
})

describe('distToRectBorder', () => {
  const rect: BBox = { x0: 0, y0: 0, x1: 30, y1: 30 }

  test('矩形中央の点が、境界距離を計算したとき、15になるべき', () => {
    expect(distToRectBorder([15, 15], rect)).toBe(15)
  })

  test('境界上の点が、境界距離を計算したとき、0になるべき', () => {
    expect(distToRectBorder([0, 10], rect)).toBe(0)
  })
})
