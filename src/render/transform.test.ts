import { LAT_CLIP } from '../map/regions'
import { createViewTransform } from './transform'

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
