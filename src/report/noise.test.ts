import { createNoise2D, smoothstep } from './noise'

describe('smoothstep', () => {
  test('端点で評価したとき、0と1になるべき', () => {
    expect(smoothstep(0, 10, 0)).toBe(0)
    expect(smoothstep(0, 10, 10)).toBe(1)
    expect(smoothstep(0, 10, 5)).toBe(0.5)
  })

  test('範囲外の入力が、評価したとき、0-1にクランプされるべき', () => {
    expect(smoothstep(0, 10, -5)).toBe(0)
    expect(smoothstep(0, 10, 15)).toBe(1)
  })
})

describe('createNoise2D', () => {
  test('同じシードのノイズ場が、同じ座標を評価したとき、同じ値を返すべき', () => {
    const a = createNoise2D('seed-a', 10)
    const b = createNoise2D('seed-a', 10)
    for (const [x, y] of [
      [0, 0],
      [3.7, -12.2],
      [100.5, 42.1],
    ]) {
      expect(a(x, y)).toBe(b(x, y))
    }
  })

  test('異なるシードのノイズ場が、同じ座標を評価したとき、異なる値を返すべき', () => {
    const a = createNoise2D('seed-a', 10)
    const b = createNoise2D('seed-b', 10)
    const diffs = [
      [0.5, 0.5],
      [5.3, 8.8],
      [-3.2, 14.9],
    ].filter(([x, y]) => a(x, y) !== b(x, y))
    expect(diffs.length).toBeGreaterThan(0)
  })

  test('ノイズ値が、格子点上を含む多数の座標で評価したとき、[-1,1]に収まるべき', () => {
    const noise = createNoise2D('range', 5)
    for (let i = 0; i < 500; i++) {
      const v = noise(i * 0.37 - 90, (i * 0.73) % 60 - 30)
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  test('近接した2点が、評価したとき、値も近いべき（連続性）', () => {
    const noise = createNoise2D('continuity', 10)
    for (let i = 0; i < 100; i++) {
      const x = i * 1.7 - 80
      const y = i * 0.9 - 40
      expect(Math.abs(noise(x, y) - noise(x + 0.01, y + 0.01))).toBeLessThan(0.05)
    }
  })
})
