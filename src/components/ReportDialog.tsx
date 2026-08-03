import { createRng, pick } from '../report/random'

const CAPTAIN_QUOTES = [
  '間違いありません、この目でしかと見ました！',
  '嵐の合間に見えたのです……たぶん、こんな形でした。',
  '乗組員全員が同じものを見ました。信じてください！',
  '海図に描き写す手が震えるほどの光景でした。',
  '正直、酒は入っていましたが……見たものは見たのです。',
  '現地の漁師も同じことを言っていました。確かです。',
  '三日三晩かけて海岸線をなぞりました。自信があります。',
  '……信じるかどうかは、あなた次第です。',
]

interface Props {
  regionLabel: string
  attempt: number
  onBelieve: () => void
  onReject: () => void
}

export function ReportDialog({ regionLabel, attempt, onBelieve, onReject }: Props) {
  const quote = pick(createRng(`quote:${regionLabel}:${attempt}`), CAPTAIN_QUOTES)
  return (
    <div className="report-dialog" role="dialog" aria-label="船長の報告">
      <div className="report-header">
        <span className="report-title">船長の報告</span>
        <span className="report-attempt">{attempt + 1}度目の航海</span>
      </div>
      <p className="report-quote">「{quote}」</p>
      <p className="report-hint">地図上の赤い破線が、船長の主張する新しい地形です。</p>
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
