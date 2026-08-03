// ゲーム状態の型定義とセレクタ。DOM非依存。
import { ALL_REGIONS, START_REGION, neighbors } from '../map/regions'
import type { RegionId } from '../map/regions'

/** confirmedAttempt がこの値の海域は「強制的に真実」（開始海域用） */
export const TRUTH_ATTEMPT = -1

export interface RegionProgress {
  /** これまでの派遣回数 = 次回派遣時のattempt番号 */
  attempts: number
  /** 信じた報告のattempt番号。null = 未確定 */
  confirmedAttempt: number | null
}

export type Phase =
  | { type: 'idle' }
  | { type: 'sailing'; target: RegionId; attempt: number }
  | { type: 'reviewing'; target: RegionId; attempt: number }
  | { type: 'complete' }

export interface GameState {
  regions: Partial<Record<RegionId, RegionProgress>>
  phase: Phase
}

export function initialState(): GameState {
  return {
    regions: { [START_REGION]: { attempts: 0, confirmedAttempt: TRUTH_ATTEMPT } },
    phase: { type: 'idle' },
  }
}

export function isConfirmed(state: GameState, id: RegionId): boolean {
  return state.regions[id]?.confirmedAttempt != null
}

/** 派遣可能 = idle中・未確定・4近傍に確定済み海域あり */
export function canDispatch(state: GameState, id: RegionId): boolean {
  if (state.phase.type !== 'idle') return false
  if (isConfirmed(state, id)) return false
  return neighbors(id).some((n) => isConfirmed(state, n))
}

export function dispatchableRegions(state: GameState): RegionId[] {
  return ALL_REGIONS.filter((id) => canDispatch(state, id))
}

export function confirmedCount(state: GameState): number {
  return ALL_REGIONS.filter((id) => isConfirmed(state, id)).length
}

export function isComplete(state: GameState): boolean {
  return confirmedCount(state) === ALL_REGIONS.length
}
