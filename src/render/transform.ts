// 地図座標 → Canvasピクセル変換。投影の差し替えはこのファイルに閉じる。
import type { Point } from '../map/geo'
import { LAT_CLIP } from '../map/regions'

export interface ViewTransform {
  /** CSSピクセル単位の描画領域 */
  width: number
  height: number
  /** 1度あたりのピクセル数 */
  scale: number
  toPx(p: Point): [number, number]
  toMap(px: number, py: number): Point
}

/** equirectangular: 経度[-180,180]×緯度[LAT_CLIP.min, LAT_CLIP.max] を幅widthに収める */
export function createViewTransform(width: number): ViewTransform {
  const scale = width / 360
  const height = (LAT_CLIP.max - LAT_CLIP.min) * scale
  return {
    width,
    height,
    scale,
    toPx: ([x, y]) => [(x + 180) * scale, (LAT_CLIP.max - y) * scale],
    toMap: (px, py) => [px / scale - 180, LAT_CLIP.max - py / scale],
  }
}
