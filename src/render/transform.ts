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

/** ズーム・パン状態（スマホのピンチ操作やホイールズーム用） */
export interface ViewState {
  zoom: number
  panX: number
  panY: number
}

export const DEFAULT_VIEW: ViewState = { zoom: 1, panX: 0, panY: 0 }
export const MAX_ZOOM = 6

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** ズームを[1, MAX_ZOOM]、パンを地図が画面から外れない範囲に収める */
export function clampView(view: ViewState, base: ViewTransform): ViewState {
  const zoom = clamp(view.zoom, 1, MAX_ZOOM)
  return {
    zoom,
    panX: clamp(view.panX, 0, base.width * (zoom - 1)),
    panY: clamp(view.panY, 0, base.height * (zoom - 1)),
  }
}

/** 画面上の点(cx, cy)を固定したままズーム倍率をfactor倍する */
export function zoomAt(
  view: ViewState,
  base: ViewTransform,
  factor: number,
  cx: number,
  cy: number,
): ViewState {
  const zoom = clamp(view.zoom * factor, 1, MAX_ZOOM)
  const applied = zoom / view.zoom
  return clampView(
    {
      zoom,
      panX: (view.panX + cx) * applied - cx,
      panY: (view.panY + cy) * applied - cy,
    },
    base,
  )
}

/** ベース変換にズーム・パンを適用した変換を返す */
export function applyView(base: ViewTransform, view: ViewState): ViewTransform {
  const scale = base.scale * view.zoom
  return {
    width: base.width,
    height: base.height,
    scale,
    toPx: ([x, y]) => [(x + 180) * scale - view.panX, (LAT_CLIP.max - y) * scale - view.panY],
    toMap: (px, py) => [(px + view.panX) / scale - 180, LAT_CLIP.max - (py + view.panY) / scale],
  }
}
