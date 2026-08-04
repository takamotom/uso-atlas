import { LAT_CLIP } from '../map/regions'
import {
  DEFAULT_VIEW,
  MAX_ZOOM,
  applyView,
  clampView,
  createViewTransform,
  zoomAt,
} from './transform'

describe('createViewTransform', () => {
  test('幅720pxで作ったとき、1度=2pxのスケールになるべき', () => {
    const vt = createViewTransform(720)
    expect(vt.scale).toBe(2)
    expect(vt.height).toBe((LAT_CLIP.max - LAT_CLIP.min) * 2)
  })

  test('地図の北西端が、変換したとき、キャンバス左上(0,0)になるべき', () => {
    const vt = createViewTransform(720)
    expect(vt.toPx([-180, LAT_CLIP.max])).toEqual([0, 0])
  })

  test('地図座標とピクセルの変換が、往復したとき、元の座標に戻るべき', () => {
    const vt = createViewTransform(720)
    const [px, py] = vt.toPx([-15, 34])
    const [x, y] = vt.toMap(px, py)
    expect(x).toBeCloseTo(-15)
    expect(y).toBeCloseTo(34)
  })
})

describe('ズーム・パン', () => {
  const base = createViewTransform(720)

  test('ズーム1のとき、パンをかけても、原点位置にクランプされるべき', () => {
    const v = clampView({ zoom: 1, panX: 100, panY: 50 }, base)
    expect(v).toEqual({ zoom: 1, panX: 0, panY: 0 })
  })

  test('ズーム2のとき、パンが、地図が画面から外れない範囲にクランプされるべき', () => {
    const v = clampView({ zoom: 2, panX: 99999, panY: 99999 }, base)
    expect(v.panX).toBe(base.width)
    expect(v.panY).toBe(base.height)
  })

  test('ズーム上限を超える倍率が、指定されたとき、MAX_ZOOMに制限されるべき', () => {
    const v = clampView({ zoom: 100, panX: 0, panY: 0 }, base)
    expect(v.zoom).toBe(MAX_ZOOM)
  })

  test('画面上の点を中心にズームしたとき、その点の地図座標が変わらないべき', () => {
    const before = applyView(base, DEFAULT_VIEW)
    const [mx, my] = before.toMap(300, 200)
    const zoomed = zoomAt(DEFAULT_VIEW, base, 2, 300, 200)
    const after = applyView(base, zoomed)
    const [mx2, my2] = after.toMap(300, 200)
    expect(mx2).toBeCloseTo(mx)
    expect(my2).toBeCloseTo(my)
  })

  test('ズーム適用後の変換が、往復したとき、元の地図座標に戻るべき', () => {
    const vt = applyView(base, { zoom: 3, panX: 200, panY: 150 })
    const [px, py] = vt.toPx([-15, 34])
    const [x, y] = vt.toMap(px, py)
    expect(x).toBeCloseTo(-15)
    expect(y).toBeCloseTo(34)
  })
})
