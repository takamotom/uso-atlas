// 地図ジオメトリの基本型と純関数。DOM非依存。
// 座標系: x = 中央経線150°Eシフト後の経度 [-180, 180), y = 緯度 [-90, 90]

export type Point = readonly [number, number]
export type Ring = Point[]
/** y0 = 南端, y1 = 北端 (y0 < y1) */
export interface BBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** 経度を中央経線基準にシフトし [-180, 180) に正規化する */
export function shiftLon(lon: number, centralMeridian: number): number {
  let x = lon - centralMeridian
  while (x < -180) x += 360
  while (x >= 180) x -= 360
  return x
}

interface ClipEdge {
  axis: 0 | 1
  sign: 1 | -1
  value: number
}

function isInside(p: Point, e: ClipEdge): boolean {
  return e.sign * (p[e.axis] - e.value) >= 0
}

function intersect(a: Point, b: Point, e: ClipEdge): Point {
  const t = (e.value - a[e.axis]) / (b[e.axis] - a[e.axis])
  return e.axis === 0
    ? [e.value, a[1] + t * (b[1] - a[1])]
    : [a[0] + t * (b[0] - a[0]), e.value]
}

function clipAgainstEdge(ring: Ring, e: ClipEdge): Ring {
  const out: Point[] = []
  for (let i = 0; i < ring.length; i++) {
    const cur = ring[i]
    const prev = ring[(i + ring.length - 1) % ring.length]
    const curIn = isInside(cur, e)
    const prevIn = isInside(prev, e)
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur, e))
      out.push(cur)
    } else if (prevIn) {
      out.push(intersect(prev, cur, e))
    }
  }
  return out
}

/**
 * Sutherland–Hodgman法でリングを矩形にクリップする。
 * リングは暗黙的に閉じている（末尾→先頭の辺を含む）扱い。結果が空なら空配列。
 */
export function clipRingToRect(ring: Ring, bbox: BBox): Ring {
  const edges: ClipEdge[] = [
    { axis: 0, sign: 1, value: bbox.x0 },
    { axis: 0, sign: -1, value: bbox.x1 },
    { axis: 1, sign: 1, value: bbox.y0 },
    { axis: 1, sign: -1, value: bbox.y1 },
  ]
  let result = ring
  for (const e of edges) {
    result = clipAgainstEdge(result, e)
    if (result.length === 0) return []
  }
  return result
}

/** 符号付き面積（反時計回りが正） */
export function ringArea(ring: Ring): number {
  let sum = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

/** 座標を丸め、丸めで一致した連続頂点を除去する */
export function roundRing(ring: Ring, decimals: number): Ring {
  const f = 10 ** decimals
  const out: Point[] = []
  for (const [x, y] of ring) {
    const p: Point = [Math.round(x * f) / f, Math.round(y * f) / f]
    const last = out[out.length - 1]
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p)
  }
  const first = out[0]
  const last = out[out.length - 1]
  if (out.length > 1 && first[0] === last[0] && first[1] === last[1]) out.pop()
  return out
}

/** 点から矩形境界（内側基準）までの最短距離。矩形外は0 */
export function distToRectBorder(p: Point, bbox: BBox): number {
  const d = Math.min(p[0] - bbox.x0, bbox.x1 - p[0], p[1] - bbox.y0, bbox.y1 - p[1])
  return Math.max(0, d)
}

export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lenSq = dx * dx + dy * dy
  const t = lenSq === 0 ? 0 : Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq))
  const qx = a[0] + t * dx
  const qy = a[1] + t * dy
  return Math.hypot(p[0] - qx, p[1] - qy)
}

/** 点から閉リングの輪郭線までの最短距離 */
export function distToRingOutline(p: Point, ring: Ring): number {
  let min = Infinity
  for (let i = 0; i < ring.length; i++) {
    const d = distToSegment(p, ring[i], ring[(i + 1) % ring.length])
    if (d < min) min = d
  }
  return min
}

export function ringCentroid(ring: Ring): Point {
  let sx = 0
  let sy = 0
  for (const [x, y] of ring) {
    sx += x
    sy += y
  }
  return [sx / ring.length, sy / ring.length]
}
