import { confirmedCount } from '../game/state'
import type { GameState } from '../game/state'
import { ALL_REGIONS } from '../map/regions'

interface Props {
  state: GameState
  onExport: () => void
  onReset: () => void
}

export function Hud({ state, onExport, onReset }: Props) {
  const count = confirmedCount(state)
  return (
    <header className="hud">
      <h1 className="hud-title">うそアトラス</h1>
      <p className="hud-progress">
        確定海域 {count} / {ALL_REGIONS.length}
      </p>
      <p className="hud-hint">
        {state.phase.type === 'idle' && '点線の海域をクリックして船を派遣'}
        {state.phase.type === 'sailing' && '航海中……'}
        {state.phase.type === 'reviewing' && '船長の報告を信じますか？'}
        {state.phase.type === 'complete' && '世界地図、完成！'}
      </p>
      <div className="hud-buttons">
        <button type="button" onClick={onExport}>
          地図を保存
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('地図を消して最初からやり直しますか？')) onReset()
          }}
        >
          最初から
        </button>
      </div>
    </header>
  )
}
