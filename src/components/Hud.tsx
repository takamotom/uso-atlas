import { confirmedCount } from '../game/state'
import type { GameState } from '../game/state'
import { ALL_REGIONS } from '../map/regions'
import { INTENSITY_LABELS } from '../report/config'
import type { LieIntensity } from '../report/config'

interface Props {
  state: GameState
  onExport: () => void
  onReset: () => void
  onIntensityChange: (intensity: LieIntensity) => void
}

export function Hud({ state, onExport, onReset, onIntensityChange }: Props) {
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
      <label className="hud-intensity">
        ホラ吹きレベル:
        <select
          value={state.intensity}
          onChange={(e) => onIntensityChange(e.target.value as LieIntensity)}
        >
          {(Object.entries(INTENSITY_LABELS) as [LieIntensity, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
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
