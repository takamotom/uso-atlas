// セーブ＝シード+履歴方式。ジオメトリは保存せず、attempts/confirmedAttemptのみ保存する。
// SAVE_VERSION は報告生成アルゴリズムやチューニング定数（report/config.ts）、
// 地図データ（world-regions.json）を変更したら必ず上げること。不一致のセーブは破棄される。
import { ALL_REGIONS } from '../map/regions'
import type { RegionId } from '../map/regions'
import { initialState, isComplete } from './state'
import type { GameState, RegionProgress } from './state'

export const SAVE_VERSION = 1
export const STORAGE_KEY = 'uso-atlas:save'

interface SaveData {
  version: number
  regions: Record<string, [number, number | null]>
}

export function serialize(state: GameState): string {
  const regions: SaveData['regions'] = {}
  for (const [id, p] of Object.entries(state.regions)) {
    if (p) regions[id] = [p.attempts, p.confirmedAttempt]
  }
  return JSON.stringify({ version: SAVE_VERSION, regions })
}

/** 壊れたJSON・バージョン不一致・型不正は初期状態にフォールバックする */
export function deserialize(json: string | null): GameState {
  if (!json) return initialState()
  try {
    const data: unknown = JSON.parse(json)
    if (typeof data !== 'object' || data === null) return initialState()
    const save = data as Partial<SaveData>
    if (save.version !== SAVE_VERSION) return initialState()
    if (typeof save.regions !== 'object' || save.regions === null) return initialState()

    const regions: Partial<Record<RegionId, RegionProgress>> = {}
    const validIds = new Set<string>(ALL_REGIONS)
    for (const [id, entry] of Object.entries(save.regions)) {
      if (!validIds.has(id) || !Array.isArray(entry)) return initialState()
      const [attempts, confirmedAttempt] = entry
      if (typeof attempts !== 'number') return initialState()
      if (confirmedAttempt !== null && typeof confirmedAttempt !== 'number') return initialState()
      regions[id as RegionId] = { attempts, confirmedAttempt }
    }
    // 航海・報告確認の途中でセーブされていてもidleに戻す（再派遣すれば同じ報告が出る）
    const state: GameState = { regions, phase: { type: 'idle' } }
    return isComplete(state) ? { ...state, phase: { type: 'complete' } } : state
  } catch {
    return initialState()
  }
}

export function loadFromStorage(): GameState {
  try {
    return deserialize(localStorage.getItem(STORAGE_KEY))
  } catch {
    return initialState()
  }
}

export function saveToStorage(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state))
  } catch {
    // ストレージ不可（プライベートモード等）でもゲーム続行は可能
  }
}
