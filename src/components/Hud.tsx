import { confirmedCount } from '../game/state'
import type { GameState } from '../game/state'
import { ALL_REGIONS } from '../map/regions'
import type { LieIntensity } from '../report/config'
import { CaptainSelect } from './CaptainSelect'

// 世界のかたちは隠し要素: 果ての報告で確定するまでバッジ自体を出さない
const WORLD_BADGES = {
  globe: { icon: '🌐', label: '世界のかたち: 球体' },
  flat: { icon: '🫓', label: '世界のかたち: 平面' },
} as const

interface Props {
  state: GameState
  truthOverlay: boolean
  muted: boolean
  onToggleMute: () => void
  onOpenLog: () => void
  onToggleTruthOverlay: () => void
  onExport: () => void
  onReset: () => void
  onIntensityChange: (intensity: LieIntensity) => void
}

export function Hud({
  state,
  truthOverlay,
  muted,
  onToggleMute,
  onOpenLog,
  onToggleTruthOverlay,
  onExport,
  onReset,
  onIntensityChange,
}: Props) {
  const count = confirmedCount(state)
  const complete = state.phase.type === 'complete'
  const worldBadge = state.worldShape === 'unknown' ? null : WORLD_BADGES[state.worldShape]
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
        {state.phase.type === 'edgeReviewing' && '世界の果ての報告を信じますか？'}
        {complete && '世界地図、完成！'}
      </p>
      {worldBadge && (
        <span className="world-badge">
          {worldBadge.icon} {worldBadge.label}
        </span>
      )}
      <CaptainSelect value={state.intensity} onChange={onIntensityChange} />
      <div className="hud-buttons">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? '効果音をオンにする' : '効果音をオフにする'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button type="button" onClick={onOpenLog}>
          記録帳
        </button>
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
