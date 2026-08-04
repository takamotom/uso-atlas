import { shiftLon } from './geo'
import {
  ALL_REGIONS,
  CENTRAL_MERIDIAN,
  COLS,
  ROWS,
  START_REGION,
  neighbors,
  regionBBox,
  regionId,
} from './regions'

describe('regionBBox', () => {
  test('r0-0が、bboxを計算したとき、北西端の海域（経度[-180,-150]×緯度[60,90]）になるべき', () => {
    expect(regionBBox('r0-0')).toEqual({ x0: -180, y0: 60, x1: -150, y1: 90 })
  })

  test('r11-5が、bboxを計算したとき、南東端の海域（経度[150,180]×緯度[-90,-60]）になるべき', () => {
    expect(regionBBox('r11-5')).toEqual({ x0: 150, y0: -90, x1: 180, y1: -60 })
  })
})

describe('neighbors', () => {
  test('東端の列の海域が、隣接を求めたとき、西端の列の海域と隣接しているべき', () => {
    expect(neighbors('r11-2')).toContain('r0-2')
  })

  test('平面世界で東端の列の海域が、隣接を求めたとき、西端の列と隣接しないべき', () => {
    const n = neighbors('r11-2', 'flat')
    expect(n).not.toContain('r0-2')
    expect(n).toEqual(expect.arrayContaining(['r10-2', 'r11-1', 'r11-3']))
    expect(n).toHaveLength(3)
  })

  test('平面世界で中央の海域が、隣接を求めたとき、球体と同じ4近傍になるべき', () => {
    expect(neighbors('r5-2', 'flat').sort()).toEqual(neighbors('r5-2', 'globe').sort())
  })

  test('北端の行の海域が、隣接を求めたとき、さらに北の海域を含まないべき', () => {
    const n = neighbors('r3-0')
    expect(n).toHaveLength(3)
    expect(n).toEqual(expect.arrayContaining(['r4-0', 'r2-0', 'r3-1']))
  })

  test('中央の海域が、隣接を求めたとき、上下左右4海域になるべき', () => {
    expect(neighbors('r5-2')).toEqual(expect.arrayContaining(['r6-2', 'r4-2', 'r5-1', 'r5-3']))
  })
})

describe('START_REGION', () => {
  test('日本（東経135〜145・北緯31〜45）が、シフト後座標で判定したとき、開始海域のbbox内にあるべき', () => {
    const bbox = regionBBox(START_REGION)
    for (const [lon, lat] of [
      [135, 35],
      [145, 43],
      [130, 31],
    ]) {
      const x = shiftLon(lon, CENTRAL_MERIDIAN)
      expect(x).toBeGreaterThanOrEqual(bbox.x0)
      expect(x).toBeLessThanOrEqual(bbox.x1)
      expect(lat).toBeGreaterThanOrEqual(bbox.y0)
      expect(lat).toBeLessThanOrEqual(bbox.y1)
    }
  })
})

describe('ALL_REGIONS', () => {
  test('全海域リストが、生成されたとき、12×6=72海域で重複がないべき', () => {
    expect(ALL_REGIONS).toHaveLength(COLS * ROWS)
    expect(new Set(ALL_REGIONS).size).toBe(72)
    expect(ALL_REGIONS[0]).toBe(regionId(0, 0))
    expect(ALL_REGIONS[71]).toBe(regionId(11, ROWS - 1))
  })
})
