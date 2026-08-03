// 海域グリッドの定義。DOM非依存の純関数のみ。
import type { BBox, Point } from './geo'

export const COLS = 12
export const ROWS = 6
export const LON_STEP = 30
export const LAT_STEP = 30
export const CENTRAL_MERIDIAN = 150
/** equirectangular投影で描画する緯度範囲（高緯度の極端な歪みを除外） */
export const LAT_CLIP = { min: -75, max: 80 }

export type RegionId = `r${number}-${number}`

export function regionId(col: number, row: number): RegionId {
  return `r${col}-${row}`
}

export function parseRegionId(id: RegionId): { col: number; row: number } {
  const m = /^r(\d+)-(\d+)$/.exec(id)
  if (!m) throw new Error(`不正なRegionId: ${id}`)
  return { col: Number(m[1]), row: Number(m[2]) }
}

/** row 0 が北端（緯度[60,90]）、row 5 が南端（緯度[-90,-60]） */
export function regionBBox(id: RegionId): BBox {
  const { col, row } = parseRegionId(id)
  const x0 = -180 + col * LON_STEP
  const y1 = 90 - row * LAT_STEP
  return { x0, y0: y1 - LAT_STEP, x1: x0 + LON_STEP, y1 }
}

/** 上下左右の4近傍。東西はmod 12でラップ（地球一周可）、南北はラップなし */
export function neighbors(id: RegionId): RegionId[] {
  const { col, row } = parseRegionId(id)
  const out: RegionId[] = [
    regionId((col + 1) % COLS, row),
    regionId((col + COLS - 1) % COLS, row),
  ]
  if (row > 0) out.push(regionId(col, row - 1))
  if (row < ROWS - 1) out.push(regionId(col, row + 1))
  return out
}

export const ALL_REGIONS: RegionId[] = Array.from({ length: COLS * ROWS }, (_, i) =>
  regionId(i % COLS, Math.floor(i / COLS)),
)

/** 地図座標が属する海域。範囲外はnull */
export function regionAt(x: number, y: number): RegionId | null {
  if (x < -180 || x >= 180 || y < -90 || y > 90) return null
  const col = Math.min(COLS - 1, Math.floor((x + 180) / LON_STEP))
  const row = Math.min(ROWS - 1, Math.floor((90 - y) / LAT_STEP))
  return regionId(col, row)
}

export function regionCenter(id: RegionId): Point {
  const b = regionBBox(id)
  return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]
}

/** 日本を含む開始海域: シフト後経度[-30,0]×緯度[30,60] */
export const START_REGION: RegionId = 'r5-1'

/** 母港（日本・瀬戸内あたり）。シフト後座標 [135E-150, 34N] */
export const HOME_PORT: Point = [-15, 34]
