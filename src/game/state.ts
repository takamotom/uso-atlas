// ゲーム状態の型定義とセレクタ。DOM非依存。
import { ALL_REGIONS, START_REGION, neighbors } from '../map/regions'
import type { RegionId, WorldShape } from '../map/regions'
import { DEFAULT_INTENSITY } from '../report/config'
import type { LieIntensity } from '../report/config'

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
  | { type: 'sailing'; target: RegionId; attempt: number; edge?: boolean }
  | { type: 'reviewing'; target: RegionId; attempt: number }
  /** 世界の果てを跨ぐ航海の報告（世界のかたちが決まる） */
  | { type: 'edgeReviewing'; target: RegionId; attempt: number }
  | { type: 'complete' }

/** 世界のかたちの認識。unknown = まだ誰も果てを確かめていない */
export type WorldKnowledge = 'unknown' | WorldShape

export interface GameState {
  regions: Partial<Record<RegionId, RegionProgress>>
  phase: Phase
  /** 船長のタイプ。確定地形の再現に関わるため航海の途中では変更できない */
  intensity: LieIntensity
  /**
   * 世界のかたち。事前設定ではなく、東西の果てを跨ぐ航海の報告を
   * 信じることでプレイ中に確定する（確かめなければ謎のまま）
   */
  worldShape: WorldKnowledge
  /** 果ての報告を突き返した回数（次の果て報告のシードに使う） */
  shapeAttempts: number
}

export function initialState(intensity: LieIntensity = DEFAULT_INTENSITY): GameState {
  return {
    regions: { [START_REGION]: { attempts: 0, confirmedAttempt: TRUTH_ATTEMPT } },
    phase: { type: 'idle' },
    intensity,
    worldShape: 'unknown',
    shapeAttempts: 0,
  }
}

export function isConfirmed(state: GameState, id: RegionId): boolean {
  return state.regions[id]?.confirmedAttempt != null
}

/** 派遣可能 = idle中・未確定・近傍（世界のかたちに応じた）に確定済み海域あり */
export function canDispatch(state: GameState, id: RegionId): boolean {
  if (state.phase.type !== 'idle') return false
  if (isConfirmed(state, id)) return false
  // 平面と確定するまでは果てを跨ぐ航海も試みられる（その航海が世界のかたちを決める）
  const shape: WorldShape = state.worldShape === 'flat' ? 'flat' : 'globe'
  return neighbors(id, shape).some((n) => isConfirmed(state, n))
}

/**
 * この海域への派遣が「世界の果てを跨ぐ航海」になるか。
 * 世界のかたちが謎のままで、確定済みの隣接がすべて果て越し（東西ラップ）の場合にtrue。
 * その航海では地形ではなく世界の果ての報告が持ち帰られる
 */
export function requiresEdgeCrossing(state: GameState, id: RegionId): boolean {
  if (state.worldShape !== 'unknown') return false
  const flatNeighbors = new Set(neighbors(id, 'flat'))
  const globeNeighbors = neighbors(id, 'globe')
  const confirmedFlat = [...flatNeighbors].some((n) => isConfirmed(state, n))
  const confirmedWrap = globeNeighbors.some((n) => !flatNeighbors.has(n) && isConfirmed(state, n))
  return confirmedWrap && !confirmedFlat
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
