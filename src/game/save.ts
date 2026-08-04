// セーブ＝シード+履歴方式。ジオメトリは保存せず、attempts/confirmedAttemptのみ保存する。
// SAVE_VERSION は報告生成アルゴリズムやチューニング定数（report/config.ts）、
// 地図データ（world-regions.json）を変更したら必ず上げること。不一致のセーブは破棄される。
import { ALL_REGIONS, isWorldShape } from '../map/regions'
import type { RegionId } from '../map/regions'
import { isLieIntensity } from '../report/config'
import { initialState, isComplete } from './state'
import type { GameState, RegionProgress } from './state'

export const SAVE_VERSION = 5
export const STORAGE_KEY = 'uso-atlas:save'

interface SaveData {
  version: number
  intensity: string
  shape: string
  regions: Record<string, [number, number | null]>
}

export function serialize(state: GameState): string {
  const regions: SaveData['regions'] = {}
  for (const [id, p] of Object.entries(state.regions)) {
    if (p) regions[id] = [p.attempts, p.confirmedAttempt]
  }
  return JSON.stringify({ version: SAVE_VERSION, intensity: state.intensity, shape: state.worldShape, regions })
}

/** セーブJSONを解釈する。壊れたJSON・バージョン不一致・型不正は null（＝破棄）を返す */
export function parseSave(json: string): GameState | null {
  try {
    const data: unknown = JSON.parse(json)
    if (typeof data !== 'object' || data === null) return null
    const save = data as Partial<SaveData>
    if (save.version !== SAVE_VERSION) return null
    if (!isLieIntensity(save.intensity)) return null
    if (!isWorldShape(save.shape)) return null
    if (typeof save.regions !== 'object' || save.regions === null) return null

    const regions: Partial<Record<RegionId, RegionProgress>> = {}
    const validIds = new Set<string>(ALL_REGIONS)
    for (const [id, entry] of Object.entries(save.regions)) {
      if (!validIds.has(id) || !Array.isArray(entry)) return null
      const [attempts, confirmedAttempt] = entry
      if (typeof attempts !== 'number') return null
      if (confirmedAttempt !== null && typeof confirmedAttempt !== 'number') return null
      regions[id as RegionId] = { attempts, confirmedAttempt }
    }
    // 航海・報告確認の途中でセーブされていてもidleに戻す（再派遣すれば同じ報告が出る）
    const state: GameState = {
      regions,
      phase: { type: 'idle' },
      intensity: save.intensity,
      worldShape: save.shape,
    }
    return isComplete(state) ? { ...state, phase: { type: 'complete' } } : state
  } catch {
    return null
  }
}

export function deserialize(json: string | null): GameState {
  if (!json) return initialState()
  return parseSave(json) ?? initialState()
}

/** 破棄されたセーブがあった場合にユーザーへ通知するための読み込み結果 */
export interface LoadResult {
  state: GameState
  /** true = セーブは存在したが古い版式・破損のため破棄して新規開始した */
  discarded: boolean
}

export function loadFromStorageWithNotice(): LoadResult {
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    if (json === null) return { state: initialState(), discarded: false }
    const parsed = parseSave(json)
    if (parsed === null) return { state: initialState(), discarded: true }
    return { state: parsed, discarded: false }
  } catch {
    return { state: initialState(), discarded: false }
  }
}

export function loadFromStorage(): GameState {
  return loadFromStorageWithNotice().state
}

export function saveToStorage(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state))
  } catch {
    // ストレージ不可（プライベートモード等）でもゲーム続行は可能
  }
}
