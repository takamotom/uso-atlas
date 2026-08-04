import { useEffect, useReducer, useState } from 'react'
import { reducer } from '../game/reducer'
import type { Action } from '../game/reducer'
import { loadFromStorageWithNotice, saveToStorage } from '../game/save'
import type { GameState } from '../game/state'

/** 戻り値の第3要素: 旧版式のセーブを破棄して新規開始した場合にtrue */
export function useGame(): [GameState, React.Dispatch<Action>, boolean] {
  const [loaded] = useState(loadFromStorageWithNotice)
  const [state, dispatch] = useReducer(reducer, loaded.state)
  useEffect(() => {
    saveToStorage(state)
  }, [state])
  return [state, dispatch, loaded.discarded]
}
