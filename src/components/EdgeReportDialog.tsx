// 世界の果てを跨ぐ航海の特別報告。信じると世界のかたち（球体/平面）が確定する
import { EDGE_CLAIM_TEXT } from '../report/world-edge'
import type { EdgeClaim } from '../report/world-edge'

interface Props {
  claim: EdgeClaim
  attempt: number
  onBelieve: () => void
  onReject: () => void
}

export function EdgeReportDialog({ claim, attempt, onBelieve, onReject }: Props) {
  const text = EDGE_CLAIM_TEXT[claim]
  return (
    <div className="report-dialog report-dialog-edge" role="dialog" aria-label="世界の果ての報告">
      <div className="report-header">
        <span className="report-title">
          {claim === 'falls' ? '🌊 世界の果ての報告' : '🌐 世界の果ての報告'}
        </span>
        <span className="report-attempt">{attempt + 1}度目の挑戦</span>
      </div>
      <p className="report-quote">「{text.quote}」</p>
      <p className="report-hint">{text.hint}</p>
      <div className="report-buttons">
        <button type="button" className="btn-believe" onClick={onBelieve}>
          信じる
        </button>
        <button type="button" className="btn-reject" onClick={onReject}>
          信じない
        </button>
      </div>
    </div>
  )
}
