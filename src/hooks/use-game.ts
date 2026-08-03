import { useEffect, useReducer } from 'react'
import { reducer } from '../game/reducer'
import type { Action } from '../game/reducer'
import { loadFromStorage, saveToStorage } from '../game/save'
import type { GameState } from '../game/state'

export function useGame(): [GameState, React.Dispatch<Action>] {
  const [state, dispatch] = useReducer(reducer, undefined, loadFromStorage)
  useEffect(() => {
    saveToStorage(state)
  }, [state])
  return [state, dispatch]
}
