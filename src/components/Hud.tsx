import { confirmedCount } from '../game/state'
import type { GameState } from '../game/state'
import { ALL_REGIONS } from '../map/regions'
import type { LieIntensity } from '../report/config'
import { CaptainSelect } from './CaptainSelect'

interface Props {
  state: GameState
  truthOverlay: boolean
  onToggleTruthOverlay: () => void
  onExport: () => void
  onReset: () => void
  onIntensityChange: (intensity: LieIntensity) => void
}

export function Hud({
  state,
  truthOverlay,
  onToggleTruthOverlay,
  onExport,
  onReset,
  onIntensityChange,
}: Props) {
  const count = confirmedCount(state)
  const complete = state.phase.type === 'complete'
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
        {complete && '世界地図、完成！'}
      </p>
      <CaptainSelect value={state.intensity} onChange={onIntensityChange} />
      <div className="hud-buttons">
        {complete && (
          <button type="button" onClick={onToggleTruthOverlay}>
            {truthOverlay ? '答え合わせを消す' : '実際の地図と重ねる'}
          </button>
        )}
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
