import { createRng, pick, rollInt, rollRange } from './random'

describe('createRng', () => {
  test('同じシードで作った乱数列が、複数回生成したとき、完全に一致するべき', () => {
    const a = createRng('r5-1:3')
    const b = createRng('r5-1:3')
    const seqA = Array.from({ length: 20 }, () => a())
    const seqB = Array.from({ length: 20 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  test('異なるシードで作った乱数列が、生成したとき、異なるべき', () => {
    const a = createRng('r5-1:3')
    const b = createRng('r5-1:4')
    const seqA = Array.from({ length: 5 }, () => a())
    const seqB = Array.from({ length: 5 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })

  test('乱数値が、1000回生成したとき、すべて[0,1)に収まるべき', () => {
    const rng = createRng('range-check')
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('rollInt', () => {
  test('1から3の整数ロールが、多数回試行したとき、全値が出現し範囲外が出ないべき', () => {
    const rng = createRng('roll-int')
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const v = rollInt(rng, 1, 3)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(3)
      seen.add(v)
    }
    expect(seen.size).toBe(3)
  })
})

describe('rollRange', () => {
  test('実数ロールが、生成したとき、指定範囲に収まるべき', () => {
    const rng = createRng('roll-range')
    for (let i = 0; i < 100; i++) {
      const v = rollRange(rng, -2.5, 2.5)
      expect(v).toBeGreaterThanOrEqual(-2.5)
      expect(v).toBeLessThan(2.5)
    }
  })
})

describe('pick', () => {
  test('配列からの選択が、多数回試行したとき、常に配列要素のいずれかを返すべき', () => {
    const rng = createRng('pick')
    const items = ['a', 'b', 'c'] as const
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(pick(rng, items))
    }
  })
})
