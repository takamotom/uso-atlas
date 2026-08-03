// シード付き2D値ノイズ（格子ハッシュ + smoothstep補間）。海岸線の歪み・霧の縁に使う。
import { seedToInt } from './random'

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function hash2(seed: number, ix: number, iy: number): number {
  let h = seed ^ Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/**
 * [-1, 1] の連続な2Dノイズを返す。wavelength = 格子1マスの空間サイズ。
 * 同じシードからは常に同じノイズ場が得られる（決定的）。
 */
export function createNoise2D(seed: string, wavelength: number): (x: number, y: number) => number {
  const s = seedToInt(seed)
  return (x, y) => {
    const gx = x / wavelength
    const gy = y / wavelength
    const ix = Math.floor(gx)
    const iy = Math.floor(gy)
    const u = smoothstep(0, 1, gx - ix)
    const v = smoothstep(0, 1, gy - iy)
    const a = hash2(s, ix, iy)
    const b = hash2(s, ix + 1, iy)
    const c = hash2(s, ix, iy + 1)
    const d = hash2(s, ix + 1, iy + 1)
    const value = a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
    return value * 2 - 1
  }
}
