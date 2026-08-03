import { distToRectBorder, distToRingOutline } from '../map/geo'
import type { BBox, Ring } from '../map/geo'
import { createRng } from './random'
import {
  distortRings,
  fabricateIslands,
  marginOf,
  resampleRing,
  touchesBorder,
  vanishRings,
} from './transforms'

const bbox: BBox = { x0: 0, y0: 0, x1: 30, y1: 30 }
const margin = marginOf(bbox) // 3

/** 境界に接する陸塊（左辺に接続） */
const borderLand: Ring = [
  [0, 10],
  [8, 10],
  [10, 15],
  [8, 20],
  [0, 20],
]

/** 内陸の島（境界からmargin以上離れている） */
const interiorIsland: Ring = [
  [14, 14],
  [18, 14],
  [18, 18],
  [14, 18],
]

describe('resampleRing', () => {
  test('長い辺を持つリングが、間隔1でリサンプルしたとき、元頂点を保持しつつ辺が細分されるべき', () => {
    const square: Ring = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]
    const resampled = resampleRing(square, 1)
    for (const p of square) {
      expect(resampled).toContainEqual(p)
    }
    expect(resampled.length).toBeGreaterThan(30)
    for (let i = 0; i < resampled.length; i++) {
      const a = resampled[i]
      const b = resampled[(i + 1) % resampled.length]
      expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeLessThanOrEqual(1 + 1e-9)
    }
  })
})

describe('distortRings', () => {
  test('歪み変換が、同じシードで2回適用したとき、同一の結果になるべき', () => {
    const a = distortRings([borderLand], bbox, createRng('s'), 'seed-x')
    const b = distortRings([borderLand], bbox, createRng('s'), 'seed-x')
    expect(a).toEqual(b)
  })

  test('歪み変換の全頂点が、適用後もセルbbox内に収まるべき', () => {
    const out = distortRings([borderLand, interiorIsland], bbox, createRng('s2'), 'seed-y')
    for (const ring of out) {
      for (const p of ring) {
        expect(p[0]).toBeGreaterThanOrEqual(bbox.x0)
        expect(p[0]).toBeLessThanOrEqual(bbox.x1)
        expect(p[1]).toBeGreaterThanOrEqual(bbox.y0)
        expect(p[1]).toBeLessThanOrEqual(bbox.y1)
      }
    }
  })

  test('境界帯（margin/2以内）の頂点が、歪み適用後も元の輪郭線上にあるべき', () => {
    const out = distortRings([borderLand], bbox, createRng('s3'), 'seed-z')
    for (const ring of out) {
      for (const p of ring) {
        if (distToRectBorder(p, bbox) <= margin / 2) {
          expect(distToRingOutline(p, borderLand)).toBeLessThan(1e-9)
        }
      }
    }
  })

  test('内陸部の頂点が、歪み適用後、少なくとも一部は移動しているべき', () => {
    const out = distortRings([interiorIsland], bbox, createRng('s4'), 'seed-w')
    const moved = out[0].filter((p) => distToRingOutline(p, interiorIsland) > 0.01)
    expect(moved.length).toBeGreaterThan(0)
  })
})

describe('fabricateIslands', () => {
  test('捏造された島の全頂点が、セル境界からmargin以上離れているべき', () => {
    for (let trial = 0; trial < 20; trial++) {
      const out = fabricateIslands([], bbox, createRng(`fab-${trial}`))
      expect(out.length).toBeGreaterThanOrEqual(1)
      for (const ring of out) {
        for (const p of ring) {
          expect(distToRectBorder(p, bbox)).toBeGreaterThanOrEqual(margin - 1e-9)
        }
      }
    }
  })

  test('捏造変換が、既存の陸地に島を追加したとき、元のリングを変更しないべき', () => {
    const out = fabricateIslands([borderLand], bbox, createRng('fab-keep'))
    expect(out[0]).toEqual(borderLand)
    expect(out.length).toBeGreaterThan(1)
  })
})

describe('touchesBorder', () => {
  test('境界に接する陸塊が、判定したとき、trueになるべき', () => {
    expect(touchesBorder(borderLand, bbox)).toBe(true)
  })

  test('内陸の島が、判定したとき、falseになるべき', () => {
    expect(touchesBorder(interiorIsland, bbox)).toBe(false)
  })
})

describe('vanishRings', () => {
  test('境界に接するリングが、消失変換を適用したとき、削除されないべき', () => {
    for (let trial = 0; trial < 10; trial++) {
      const out = vanishRings([borderLand, interiorIsland], bbox, createRng(`van-${trial}`))
      const stillTouching = out.filter((r) => touchesBorder(r, bbox))
      expect(stillTouching.length).toBe(1)
    }
  })

  test('境界に接するリングの境界帯頂点が、痩せ変換後も元の輪郭線上にあるべき', () => {
    const out = vanishRings([borderLand], bbox, createRng('van-erode'))
    for (const ring of out) {
      for (const p of ring) {
        if (distToRectBorder(p, bbox) <= margin / 2) {
          expect(distToRingOutline(p, borderLand)).toBeLessThan(1e-9)
        }
      }
    }
  })

  test('内陸の島が、多数回の消失変換で、削除される場合があるべき', () => {
    const deleted = Array.from({ length: 20 }, (_, i) =>
      vanishRings([interiorIsland], bbox, createRng(`van-del-${i}`)),
    ).filter((out) => out.length === 0)
    expect(deleted.length).toBeGreaterThan(0)
  })
})
