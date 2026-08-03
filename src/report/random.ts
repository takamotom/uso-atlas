// シード付き決定的乱数。同じシード文字列からは常に同じ乱数列が得られる。
// これがセーブデータ（シード+履歴方式）の再現性の要。

/** [0, 1) の一様乱数を返す関数 */
export type Rng = () => number

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

function mulberry32(a: number): Rng {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createRng(seed: string): Rng {
  return mulberry32(xmur3(seed)())
}

/** 32bit整数シードを文字列シードから作る（ノイズ格子ハッシュ用） */
export function seedToInt(seed: string): number {
  return xmur3(seed)()
}

/** min以上max以下の整数 */
export function rollInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

/** min以上max未満の実数 */
export function rollRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min)
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}
