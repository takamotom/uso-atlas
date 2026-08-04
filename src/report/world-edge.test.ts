import { edgeClaim } from './world-edge'

describe('edgeClaim', () => {
  test('同じ試行回数の果ての報告が、複数回生成しても、同じ主張になるべき', () => {
    for (const attempt of [0, 1, 5, 10]) {
      expect(edgeClaim(attempt)).toBe(edgeClaim(attempt))
    }
  })

  test('十分な試行回数の中で、滝と海続きの両方の主張が出現するべき', () => {
    const claims = new Set(Array.from({ length: 20 }, (_, a) => edgeClaim(a)))
    expect(claims).toEqual(new Set(['falls', 'passage']))
  })
})
