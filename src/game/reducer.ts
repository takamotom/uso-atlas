// 探索フローの純関数reducer。不正な遷移は状態をそのまま返す。
import type { RegionId } from '../map/regions'
import type { LieIntensity } from '../report/config'
import { generateReport } from '../report/generate'
import {
  bridgeContext,
  canDispatch,
  effectiveEdgeClaim,
  initialState,
  isComplete,
  requiresEdgeCrossing,
} from './state'
import type { GameState, RegionProgress } from './state'

export type Action =
  | { type: 'DISPATCH'; target: RegionId }
  | { type: 'ARRIVED' }
  | { type: 'BELIEVE' }
  | { type: 'REJECT' }
  | { type: 'RESET'; intensity?: LieIntensity }

function progressOf(state: GameState, id: RegionId): RegionProgress {
  return state.regions[id] ?? { attempts: 0, confirmedAttempt: null }
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'DISPATCH': {
      if (!canDispatch(state, action.target)) return state
      // 世界の果てを跨ぐ航海: 地形ではなく世界のかたちの報告になる
      if (requiresEdgeCrossing(state, action.target)) {
        return {
          ...state,
          phase: { type: 'sailing', target: action.target, attempt: state.shapeAttempts, edge: true },
        }
      }
      const attempt = progressOf(state, action.target).attempts
      return { ...state, phase: { type: 'sailing', target: action.target, attempt } }
    }
    case 'ARRIVED': {
      if (state.phase.type !== 'sailing') return state
      const { target, attempt, edge } = state.phase
      if (edge) return { ...state, phase: { type: 'edgeReviewing', target, attempt } }
      return { ...state, phase: { type: 'reviewing', target, attempt } }
    }
    case 'BELIEVE': {
      if (state.phase.type === 'edgeReviewing') {
        // 果ての報告を信じる = 世界のかたちが確定する（海域はまだ確定しない）
        const claim = effectiveEdgeClaim(state, state.phase.attempt)
        return {
          ...state,
          worldShape: claim === 'falls' ? 'flat' : 'globe',
          phase: { type: 'idle' },
        }
      }
      if (state.phase.type !== 'reviewing') return state
      const { target, attempt } = state.phase
      const prev = progressOf(state, target)
      // 信じた報告の陸橋セットを記録する（確定ジオメトリの再現と、隣セルへの伝播に必要）
      const report = generateReport(target, attempt, state.intensity, bridgeContext(state, target))
      const next: GameState = {
        ...state,
        regions: {
          ...state.regions,
          [target]: { attempts: prev.attempts, confirmedAttempt: attempt, bridges: report.bridges },
        },
        phase: { type: 'idle' },
      }
      return isComplete(next) ? { ...next, phase: { type: 'complete' } } : next
    }
    case 'REJECT': {
      if (state.phase.type === 'edgeReviewing') {
        return { ...state, shapeAttempts: state.phase.attempt + 1, phase: { type: 'idle' } }
      }
      if (state.phase.type !== 'reviewing') return state
      const { target, attempt } = state.phase
      return {
        ...state,
        regions: {
          ...state.regions,
          [target]: { attempts: attempt + 1, confirmedAttempt: null },
        },
        phase: { type: 'idle' },
      }
    }
    case 'RESET':
      return initialState(action.intensity ?? state.intensity)
  }
}
