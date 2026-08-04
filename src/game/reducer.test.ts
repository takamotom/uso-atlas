import { ALL_REGIONS, START_REGION, neighbors } from '../map/regions'
import type { RegionId } from '../map/regions'
import { WORLD_EDGE_LAND_REGIONS } from '../map/world-data'
import { edgeClaim } from '../report/world-edge'
import { reducer } from './reducer'
import {
  TRUTH_ATTEMPT,
  canDispatch,
  dispatchableRegions,
  effectiveEdgeClaim,
  initialState,
  isComplete,
  isConfirmed,
  landAtWorldEdgeConfirmed,
  requiresEdgeCrossing,
} from './state'
import type { GameState } from './state'

const adjacentToStart = neighbors(START_REGION)[0]

function stateInReview(target: RegionId, base = initialState()): GameState {
  const sailing = reducer(base, { type: 'DISPATCH', target })
  return reducer(sailing, { type: 'ARRIVED' })
}

describe('initialState', () => {
  test('初期状態が、生成されたとき、開始海域のみ真実で確定済みであるべき', () => {
    const s = initialState()
    expect(isConfirmed(s, START_REGION)).toBe(true)
    expect(s.regions[START_REGION]?.confirmedAttempt).toBe(TRUTH_ATTEMPT)
    expect(ALL_REGIONS.filter((id) => isConfirmed(s, id))).toEqual([START_REGION])
  })

  test('初期状態で、派遣可能海域を求めたとき、開始海域の4近傍のみであるべき', () => {
    expect(dispatchableRegions(initialState()).sort()).toEqual([...neighbors(START_REGION)].sort())
  })
})

describe('DISPATCH', () => {
  test('未探索かつ確定済み海域に隣接する海域へ派遣したとき、phaseがsailingになるべき', () => {
    const s = reducer(initialState(), { type: 'DISPATCH', target: adjacentToStart })
    expect(s.phase).toEqual({ type: 'sailing', target: adjacentToStart, attempt: 0 })
  })

  test('確定済み海域に隣接しない遠方の海域へ派遣したとき、状態が変わらないべき', () => {
    const s = initialState()
    const far: RegionId = 'r0-4'
    expect(canDispatch(s, far)).toBe(false)
    expect(reducer(s, { type: 'DISPATCH', target: far })).toBe(s)
  })

  test('確定済みの開始海域へ派遣したとき、状態が変わらないべき', () => {
    const s = initialState()
    expect(reducer(s, { type: 'DISPATCH', target: START_REGION })).toBe(s)
  })

  test('sailing中に別の海域へ派遣したとき、状態が変わらないべき', () => {
    const sailing = reducer(initialState(), { type: 'DISPATCH', target: adjacentToStart })
    expect(reducer(sailing, { type: 'DISPATCH', target: neighbors(START_REGION)[1] })).toBe(sailing)
  })
})

describe('ARRIVED', () => {
  test('sailing中に到着したとき、phaseがreviewingになり同じ海域とattemptを保持するべき', () => {
    const s = stateInReview(adjacentToStart)
    expect(s.phase).toEqual({ type: 'reviewing', target: adjacentToStart, attempt: 0 })
  })

  test('idle中に到着イベントが来たとき、状態が変わらないべき', () => {
    const s = initialState()
    expect(reducer(s, { type: 'ARRIVED' })).toBe(s)
  })
})

describe('BELIEVE', () => {
  test('信じるを選んだとき、その海域が確定済みになり隣接海域が派遣可能になるべき', () => {
    const s = reducer(stateInReview(adjacentToStart), { type: 'BELIEVE' })
    expect(isConfirmed(s, adjacentToStart)).toBe(true)
    expect(s.regions[adjacentToStart]?.confirmedAttempt).toBe(0)
    expect(s.phase).toEqual({ type: 'idle' })
    const nowDispatchable = dispatchableRegions(s)
    for (const n of neighbors(adjacentToStart)) {
      if (!isConfirmed(s, n)) expect(nowDispatchable).toContain(n)
    }
  })
})

describe('REJECT', () => {
  test('信じないを選んだとき、attemptsが増えて未確定のままphaseがidleに戻るべき', () => {
    const s = reducer(stateInReview(adjacentToStart), { type: 'REJECT' })
    expect(isConfirmed(s, adjacentToStart)).toBe(false)
    expect(s.regions[adjacentToStart]?.attempts).toBe(1)
    expect(s.phase).toEqual({ type: 'idle' })
  })

  test('信じないを選んだ後に再派遣したとき、attemptが1に進むべき', () => {
    const rejected = reducer(stateInReview(adjacentToStart), { type: 'REJECT' })
    const again = reducer(rejected, { type: 'DISPATCH', target: adjacentToStart })
    expect(again.phase).toEqual({ type: 'sailing', target: adjacentToStart, attempt: 1 })
  })
})

describe('完成判定', () => {
  test('最後の海域を信じたとき、phaseがcompleteになるべき', () => {
    let s = initialState()
    // 開始海域以外をすべて確定済みにした状態を作る（最後の1海域だけ残す）
    const last = adjacentToStart
    for (const id of ALL_REGIONS) {
      if (id === START_REGION || id === last) continue
      s = {
        ...s,
        regions: { ...s.regions, [id]: { attempts: 1, confirmedAttempt: 0 } },
      }
    }
    expect(isComplete(s)).toBe(false)
    const done = reducer(stateInReview(last, s), { type: 'BELIEVE' })
    expect(isComplete(done)).toBe(true)
    expect(done.phase).toEqual({ type: 'complete' })
  })
})

describe('RESET', () => {
  test('リセットしたとき、初期状態に戻るべき', () => {
    const s = reducer(stateInReview(adjacentToStart), { type: 'RESET' })
    expect(s).toEqual(initialState())
  })

  test('レベル指定つきでリセットしたとき、新しいレベルの初期状態になるべき', () => {
    const s = reducer(initialState(), { type: 'RESET', intensity: 'wild' })
    expect(s).toEqual(initialState('wild'))
    expect(s.intensity).toBe('wild')
  })

  test('レベル指定なしでリセットしたとき、現在のレベルが維持されるべき', () => {
    const wildState = initialState('wild')
    const s = reducer(wildState, { type: 'RESET' })
    expect(s.intensity).toBe('wild')
  })

  test('世界のかたちが確定した後にリセットしたとき、世界のかたちが謎に戻るべき', () => {
    const flatState: GameState = { ...initialState(), worldShape: 'flat', shapeAttempts: 3 }
    const s = reducer(flatState, { type: 'RESET' })
    expect(s.worldShape).toBe('unknown')
    expect(s.shapeAttempts).toBe(0)
  })
})

describe('平面世界の探索', () => {
  test('平面世界で東端だけ確定しているとき、西端の海域が、派遣可能にならないべき', () => {
    const base: GameState = { ...initialState(), worldShape: 'flat' }
    const eastConfirmed: GameState = {
      ...base,
      regions: { ...base.regions, 'r11-2': { attempts: 1, confirmedAttempt: 0 } },
    }
    expect(canDispatch(eastConfirmed, 'r0-2')).toBe(false)
    // 球体世界なら同じ状況で派遣可能
    const globeVersion: GameState = { ...eastConfirmed, worldShape: 'globe' }
    expect(canDispatch(globeVersion, 'r0-2')).toBe(true)
  })
})

describe('世界の果ての航海', () => {
  /** 東端r11-2だけ確定 → 西端r0-2への派遣は果て越えになる状態 */
  function edgeTestState(): GameState {
    const base = initialState()
    return {
      ...base,
      regions: { ...base.regions, 'r11-2': { attempts: 1, confirmedAttempt: 0 } },
    }
  }

  const fallsAttempt = [0, 1, 2, 3, 4, 5, 6, 7].find((a) => edgeClaim(a) === 'falls')!
  const passageAttempt = [0, 1, 2, 3, 4, 5, 6, 7].find((a) => edgeClaim(a) === 'passage')!

  test('果て越えが必要な海域の判定が、通常の隣接がある場合と区別されるべき', () => {
    const s = edgeTestState()
    expect(requiresEdgeCrossing(s, 'r0-2')).toBe(true)
    // 通常の隣接（r10-2）はfalse
    expect(requiresEdgeCrossing(s, 'r10-2')).toBe(false)
    // 世界のかたちが確定済みならfalse
    expect(requiresEdgeCrossing({ ...s, worldShape: 'globe' }, 'r0-2')).toBe(false)
  })

  test('果て越えの派遣をしたとき、edgeフラグつきのsailingになりshapeAttemptsをattemptに使うべき', () => {
    const s = { ...edgeTestState(), shapeAttempts: 2 }
    const sailing = reducer(s, { type: 'DISPATCH', target: 'r0-2' })
    expect(sailing.phase).toEqual({ type: 'sailing', target: 'r0-2', attempt: 2, edge: true })
    const arrived = reducer(sailing, { type: 'ARRIVED' })
    expect(arrived.phase).toEqual({ type: 'edgeReviewing', target: 'r0-2', attempt: 2 })
  })

  test('滝の報告を信じたとき、世界が平面と確定し海域は未確定のままであるべき', () => {
    const s = { ...edgeTestState(), shapeAttempts: fallsAttempt }
    const arrived = reducer(reducer(s, { type: 'DISPATCH', target: 'r0-2' }), { type: 'ARRIVED' })
    const believed = reducer(arrived, { type: 'BELIEVE' })
    expect(believed.worldShape).toBe('flat')
    expect(isConfirmed(believed, 'r0-2')).toBe(false)
    expect(believed.phase).toEqual({ type: 'idle' })
    // 平面確定後は果て越えの派遣ができない
    expect(canDispatch(believed, 'r0-2')).toBe(false)
  })

  test('海が続くという報告を信じたとき、世界が球体と確定し果て越えの派遣が可能になるべき', () => {
    const s = { ...edgeTestState(), shapeAttempts: passageAttempt }
    const arrived = reducer(reducer(s, { type: 'DISPATCH', target: 'r0-2' }), { type: 'ARRIVED' })
    const believed = reducer(arrived, { type: 'BELIEVE' })
    expect(believed.worldShape).toBe('globe')
    expect(canDispatch(believed, 'r0-2')).toBe(true)
    // 次の派遣は通常の地形報告になる
    expect(requiresEdgeCrossing(believed, 'r0-2')).toBe(false)
  })

  test('果ての報告を信じないとき、shapeAttemptsが増えて世界のかたちは謎のままであるべき', () => {
    const s = edgeTestState()
    const arrived = reducer(reducer(s, { type: 'DISPATCH', target: 'r0-2' }), { type: 'ARRIVED' })
    const rejected = reducer(arrived, { type: 'REJECT' })
    expect(rejected.worldShape).toBe('unknown')
    expect(rejected.shapeAttempts).toBe(1)
    expect(rejected.phase).toEqual({ type: 'idle' })
  })

  test('果てに接する陸地が確定済みのとき、滝が出るはずの試行でも、海続き（球体）の報告になるべき', () => {
    const edgeLandCell = WORLD_EDGE_LAND_REGIONS[0]
    const s: GameState = {
      ...edgeTestState(),
      shapeAttempts: fallsAttempt,
      regions: {
        ...edgeTestState().regions,
        [edgeLandCell]: { attempts: 1, confirmedAttempt: 0 },
      },
    }
    expect(landAtWorldEdgeConfirmed(s)).toBe(true)
    expect(effectiveEdgeClaim(s, fallsAttempt)).toBe('passage')
    const arrived = reducer(reducer(s, { type: 'DISPATCH', target: 'r0-2' }), { type: 'ARRIVED' })
    const believed = reducer(arrived, { type: 'BELIEVE' })
    expect(believed.worldShape).toBe('globe')
  })

  test('果てに接する陸地が未確定のとき、実効的な主張が、シード通りの主張と一致するべき', () => {
    const s = edgeTestState()
    expect(landAtWorldEdgeConfirmed(s)).toBe(false)
    expect(effectiveEdgeClaim(s, fallsAttempt)).toBe('falls')
    expect(effectiveEdgeClaim(s, passageAttempt)).toBe('passage')
  })
})
