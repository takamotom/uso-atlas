import { useMemo } from 'react'
import { ALL_REGIONS } from '../map/regions'
import type { GameState } from '../game/state'
import { generateReport } from '../report/generate'

interface Props {
  state: GameState
  onExport: () => void
  onReset: () => void
  onClose: () => void
  onCompare: () => void
}

export function CompleteScreen({ state, onExport, onReset, onClose, onCompare }: Props) {
  const lieCount = useMemo(
    () =>
      ALL_REGIONS.filter((id) => {
        const attempt = state.regions[id]?.confirmedAttempt
        return (
          attempt != null &&
          attempt >= 0 &&
          generateReport(id, attempt, state.intensity).kind === 'lie'
        )
      }).length,
    [state],
  )
  return (
    <div className="overlay">
      <div className="complete-panel" role="dialog" aria-label="世界地図完成">
        <h2>世界地図、完成！</h2>
        <p>
          あなたが信じた報告のうち、
          <strong>{lieCount}海域</strong>
          は船長の嘘（またはホラ話）でした。
        </p>
        <p className="complete-sub">
          {lieCount === 0
            ? '一点の曇りもない、正確無比な世界地図です。'
            : lieCount >= 30
              ? 'もはや別の惑星。素晴らしい荒唐無稽っぷりです。'
              : '現実と嘘が入り混じった、あなただけの世界です。'}
        </p>
        <p className="complete-sub">
          {state.worldShape === 'flat' && 'そしてこの世界は、海が縁から流れ落ちる平面の盤でした。'}
          {state.worldShape === 'globe' && 'そしてこの世界は、ぐるりと一周できる球体でした。'}
          {state.worldShape === 'unknown' && 'そして世界のかたちは——誰も果てを確かめないまま、謎として残されました。'}
        </p>
        <div className="report-buttons">
          <button type="button" onClick={onCompare}>
            実際の地図と見比べる
          </button>
          <button type="button" onClick={onExport}>
            地図をPNGで保存
          </button>
          <button type="button" onClick={onClose}>
            地図を眺める
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('地図を消して最初からやり直しますか？')) onReset()
            }}
          >
            新しい世界へ
          </button>
        </div>
      </div>
    </div>
  )
}
