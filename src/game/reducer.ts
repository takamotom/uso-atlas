// 探索フローの純関数reducer。不正な遷移は状態をそのまま返す。
import type { RegionId } from '../map/regions'
import { canDispatch, initialState, isComplete } from './state'
import type { GameState, RegionProgress } from './state'

export type Action =
  | { type: 'DISPATCH'; target: RegionId }
  | { type: 'ARRIVED' }
  | { type: 'BELIEVE' }
  | { type: 'REJECT' }
  | { type: 'RESET' }

function progressOf(state: GameState, id: RegionId): RegionProgress {
  return state.regions[id] ?? { attempts: 0, confirmedAttempt: null }
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'DISPATCH': {
      if (!canDispatch(state, action.target)) return state
      const attempt = progressOf(state, action.target).attempts
      return { ...state, phase: { type: 'sailing', target: action.target, attempt } }
    }
    case 'ARRIVED': {
      if (state.phase.type !== 'sailing') return state
      const { target, attempt } = state.phase
      return { ...state, phase: { type: 'reviewing', target, attempt } }
    }
    case 'BELIEVE': {
      if (state.phase.type !== 'reviewing') return state
      const { target, attempt } = state.phase
      const prev = progressOf(state, target)
      const next: GameState = {
        regions: {
          ...state.regions,
          [target]: { attempts: prev.attempts, confirmedAttempt: attempt },
        },
        phase: { type: 'idle' },
      }
      return isComplete(next) ? { ...next, phase: { type: 'complete' } } : next
    }
    case 'REJECT': {
      if (state.phase.type !== 'reviewing') return state
      const { target, attempt } = state.phase
      return {
        regions: {
          ...state.regions,
          [target]: { attempts: attempt + 1, confirmedAttempt: null },
        },
        phase: { type: 'idle' },
      }
    }
    case 'RESET':
      return initialState()
  }
}
