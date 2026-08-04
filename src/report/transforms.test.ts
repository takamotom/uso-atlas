import { distToRectBorder, distToRingOutline } from '../map/geo'
import type { BBox, Ring } from '../map/geo'
import { INTENSITY_PRESETS } from './config'
import { createRng } from './random'
import {
  distortRings,
  fabricateIslands,
  marginOf,
  resampleRing,
  sinkRingToBorderStrips,
  touchesBorder,
  vanishRings,
} from './transforms'

const preset = INTENSITY_PRESETS.standard
const bbox: BBox = { x0: 0, y0: 0, x1: 30, y1: 30 }
const margin = marginOf(bbox, preset) // 3

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
    const a = distortRings([borderLand], bbox, createRng('s'), 'seed-x', preset)
    const b = distortRings([borderLand], bbox, createRng('s'), 'seed-x', preset)
    expect(a).toEqual(b)
  })

  test('歪み変換の全頂点が、適用後もセルbbox内に収まるべき', () => {
    const out = distortRings([borderLand, interiorIsland], bbox, createRng('s2'), 'seed-y', preset)
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
    const out = distortRings([borderLand], bbox, createRng('s3'), 'seed-z', preset)
    for (const ring of out) {
      for (const p of ring) {
        if (distToRectBorder(p, bbox) <= margin / 2) {
          expect(distToRingOutline(p, borderLand)).toBeLessThan(1e-9)
        }
      }
    }
  })

  test('内陸部の頂点が、歪み適用後、少なくとも一部は移動しているべき', () => {
    const out = distortRings([interiorIsland], bbox, createRng('s4'), 'seed-w', preset)
    const moved = out[0].filter((p) => distToRingOutline(p, interiorIsland) > 0.01)
    expect(moved.length).toBeGreaterThan(0)
  })
})

describe('fabricateIslands', () => {
  test('捏造された島の全頂点が、セル境界からmargin以上離れているべき', () => {
    for (let trial = 0; trial < 20; trial++) {
      const out = fabricateIslands([], bbox, createRng(`fab-${trial}`), preset)
      expect(out.length).toBeGreaterThanOrEqual(1)
      for (const ring of out) {
        for (const p of ring) {
          expect(distToRectBorder(p, bbox)).toBeGreaterThanOrEqual(margin - 1e-9)
        }
      }
    }
  })

  test('捏造変換が、既存の陸地に島を追加したとき、元のリングを変更しないべき', () => {
    const out = fabricateIslands([borderLand], bbox, createRng('fab-keep'), preset)
    expect(out[0]).toEqual(borderLand)
    expect(out.length).toBeGreaterThan(1)
  })

  test('大ボラプリセットの捏造が、多数回試行したとき、大陸級（セル幅の3割半径）の島を生成する場合があるべき', () => {
    const wild = INTENSITY_PRESETS.wild
    const wildMargin = marginOf(bbox, wild)
    let sawContinent = false
    for (let trial = 0; trial < 40; trial++) {
      const out = fabricateIslands([], bbox, createRng(`wild-fab-${trial}`), wild)
      for (const ring of out) {
        const xs = ring.map(([x]) => x)
        const width = Math.max(...xs) - Math.min(...xs)
        if (width > 30 * wild.continentRadius) sawContinent = true
        for (const p of ring) {
          expect(distToRectBorder(p, bbox)).toBeGreaterThanOrEqual(wildMargin - 1e-9)
        }
      }
    }
    expect(sawContinent).toBe(true)
  })
})

describe('touchesBorder', () => {
  test('境界に接する陸塊が、判定したとき、trueになるべき', () => {
    expect(touchesBorder(borderLand, bbox, margin)).toBe(true)
  })

  test('内陸の島が、判定したとき、falseになるべき', () => {
    expect(touchesBorder(interiorIsland, bbox, margin)).toBe(false)
  })
})

describe('sinkRingToBorderStrips', () => {
  test('境界を跨ぐ大陸が、沈没したとき、境界帯内の残骸だけが残るべき', () => {
    const stubs = sinkRingToBorderStrips(borderLand, bbox, margin)
    expect(stubs.length).toBeGreaterThan(0)
    for (const ring of stubs) {
      for (const p of ring) {
        expect(distToRectBorder(p, bbox)).toBeLessThanOrEqual(margin + 1e-9)
      }
    }
  })

  test('沈没後の残骸の全頂点が、元の輪郭線上にあるべき（クリップの切り口も辺上）', () => {
    const stubs = sinkRingToBorderStrips(borderLand, bbox, margin)
    for (const ring of stubs) {
      for (const p of ring) {
        expect(distToRingOutline(p, borderLand)).toBeLessThan(1e-9)
      }
    }
  })

  test('内陸の島が、沈没したとき、何も残らないべき', () => {
    expect(sinkRingToBorderStrips(interiorIsland, bbox, margin)).toEqual([])
  })
})

describe('vanishRings', () => {
  test('境界に接するリングが、消失変換を適用したとき、境界帯の地形が保たれるべき', () => {
    for (let trial = 0; trial < 10; trial++) {
      const out = vanishRings([borderLand, interiorIsland], bbox, createRng(`van-${trial}`), preset)
      const stillTouching = out.filter((r) => touchesBorder(r, bbox, margin))
      expect(stillTouching.length).toBeGreaterThanOrEqual(1)
    }
  })

  test('境界に接するリングの境界帯頂点が、痩せ変換後も元の輪郭線上にあるべき', () => {
    const out = vanishRings([borderLand], bbox, createRng('van-erode'), preset)
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
      vanishRings([interiorIsland], bbox, createRng(`van-del-${i}`), preset),
    ).filter((out) => out.length === 0)
    expect(deleted.length).toBeGreaterThan(0)
  })

  test('大ボラプリセットの消失が、多数回試行したとき、境界接続の大陸を沈没させる場合があるべき', () => {
    const wild = INTENSITY_PRESETS.wild
    const wildMargin = marginOf(bbox, wild)
    let sawSink = false
    for (let trial = 0; trial < 30; trial++) {
      const out = vanishRings([borderLand], bbox, createRng(`wild-van-${trial}`), wild)
      // 沈没 = すべての残存リングが境界帯内に収まっている
      const allInBand = out.every((ring) =>
        ring.every((p) => distToRectBorder(p, bbox) <= wildMargin + 1e-9),
      )
      if (out.length > 0 && allInBand) sawSink = true
    }
    expect(sawSink).toBe(true)
  })
})
