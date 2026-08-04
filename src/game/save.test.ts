import { ALL_REGIONS, START_REGION } from '../map/regions'
import { SAVE_VERSION, STORAGE_KEY, deserialize, loadFromStorageWithNotice, serialize } from './save'
import { TRUTH_ATTEMPT, initialState, isComplete } from './state'
import type { GameState } from './state'

describe('serialize/deserialize', () => {
  test('進行中の状態が、シリアライズして復元したとき、regionsが完全に一致するべき', () => {
    const state: GameState = {
      regions: {
        [START_REGION]: { attempts: 0, confirmedAttempt: TRUTH_ATTEMPT },
        'r6-1': { attempts: 3, confirmedAttempt: 2 },
        'r4-1': { attempts: 1, confirmedAttempt: null },
      },
      phase: { type: 'idle' },
      intensity: 'standard',
      worldShape: 'globe',
    }
    const restored = deserialize(serialize(state))
    expect(restored.regions).toEqual(state.regions)
    expect(restored.phase).toEqual({ type: 'idle' })
  })

  test('大ボラレベルの状態が、シリアライズして復元したとき、レベルが保持されるべき', () => {
    const state: GameState = {
      regions: { [START_REGION]: { attempts: 0, confirmedAttempt: TRUTH_ATTEMPT } },
      phase: { type: 'idle' },
      intensity: 'wild',
      worldShape: 'flat',
    }
    expect(deserialize(serialize(state)).intensity).toBe('wild')
  })

  test('不正なレベルを含むセーブを読み込んだとき、初期状態を返すべき', () => {
    const bad = JSON.stringify({ version: SAVE_VERSION, intensity: 'insane', shape: 'globe', regions: {} })
    expect(deserialize(bad)).toEqual(initialState())
  })

  test('報告確認の途中でセーブされた状態が、復元したとき、idleに戻るべき', () => {
    const state: GameState = {
      regions: { [START_REGION]: { attempts: 0, confirmedAttempt: TRUTH_ATTEMPT } },
      phase: { type: 'reviewing', target: 'r6-1', attempt: 0 },
      intensity: 'standard',
      worldShape: 'globe',
    }
    expect(deserialize(serialize(state)).phase).toEqual({ type: 'idle' })
  })

  test('全海域確定済みの状態が、復元したとき、phaseがcompleteになるべき', () => {
    const state: GameState = {
      regions: Object.fromEntries(
        ALL_REGIONS.map((id) => [id, { attempts: 1, confirmedAttempt: 0 }]),
      ),
      phase: { type: 'idle' },
      intensity: 'standard',
      worldShape: 'globe',
    }
    const restored = deserialize(serialize(state))
    expect(isComplete(restored)).toBe(true)
    expect(restored.phase).toEqual({ type: 'complete' })
  })

  test('不正なJSONを読み込んだとき、初期状態を返すべき', () => {
    expect(deserialize('{"broken')).toEqual(initialState())
    expect(deserialize('null')).toEqual(initialState())
    expect(deserialize(null)).toEqual(initialState())
  })

  test('バージョンが異なるセーブを読み込んだとき、初期状態を返すべき', () => {
    const old = JSON.stringify({ version: SAVE_VERSION + 1, intensity: 'standard', shape: 'globe', regions: {} })
    expect(deserialize(old)).toEqual(initialState())
  })

  test('不正な世界のかたちを含むセーブを読み込んだとき、初期状態を返すべき', () => {
    const bad = JSON.stringify({
      version: SAVE_VERSION,
      intensity: 'standard',
      shape: 'donut',
      regions: {},
    })
    expect(deserialize(bad)).toEqual(initialState())
  })

  test('存在しない海域IDを含むセーブを読み込んだとき、初期状態を返すべき', () => {
    const bad = JSON.stringify({
      version: SAVE_VERSION,
      intensity: 'standard',
      shape: 'globe',
      regions: { 'r99-99': [1, 0] },
    })
    expect(deserialize(bad)).toEqual(initialState())
  })
})

describe('loadFromStorageWithNotice', () => {
  afterEach(() => localStorage.removeItem(STORAGE_KEY))

  test('セーブが存在しないとき、読み込んだら、破棄通知なしで初期状態になるべき', () => {
    localStorage.removeItem(STORAGE_KEY)
    const result = loadFromStorageWithNotice()
    expect(result.state).toEqual(initialState())
    expect(result.discarded).toBe(false)
  })

  test('古いバージョンのセーブがあるとき、読み込んだら、破棄通知つきで初期状態になるべき', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SAVE_VERSION - 1, intensity: 'standard', shape: 'globe', regions: {} }),
    )
    const result = loadFromStorageWithNotice()
    expect(result.state).toEqual(initialState())
    expect(result.discarded).toBe(true)
  })

  test('有効なセーブがあるとき、読み込んだら、破棄通知なしで復元されるべき', () => {
    const state: GameState = {
      regions: { [START_REGION]: { attempts: 0, confirmedAttempt: TRUTH_ATTEMPT } },
      phase: { type: 'idle' },
      intensity: 'wild',
      worldShape: 'flat',
    }
    localStorage.setItem(STORAGE_KEY, serialize(state))
    const result = loadFromStorageWithNotice()
    expect(result.discarded).toBe(false)
    expect(result.state.intensity).toBe('wild')
    expect(result.state.worldShape).toBe('flat')
  })
})
