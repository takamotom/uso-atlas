import { sailDurationMs } from './use-ship-animation'

describe('sailDurationMs', () => {
  test('隣の海域（30度）への航海が、時間を計算したとき、1秒未満で済むべき', () => {
    expect(sailDurationMs([0, 0], [30, 0])).toBeLessThan(1000)
  })

  test('地球の裏側（180度超）への航海が、時間を計算したとき、上限1.2秒に収まるべき', () => {
    expect(sailDurationMs([-15, 34], [165, -75])).toBe(1200)
  })

  test('近い海域より遠い海域のほうが、時間を計算したとき、航海時間が長いべき', () => {
    const near = sailDurationMs([0, 0], [30, 0])
    const far = sailDurationMs([0, 0], [120, 0])
    expect(far).toBeGreaterThan(near)
  })
})
