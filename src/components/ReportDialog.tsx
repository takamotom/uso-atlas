import { edgeDirection } from '../map/edges'
import type { EdgeId } from '../map/edges'
import { regionName } from '../map/region-names'
import type { RegionId } from '../map/regions'
import type { LieIntensity } from '../report/config'
import { createRng, pick } from '../report/random'

/** どの船長でも出る台詞 */
const COMMON_QUOTES = [
  '間違いありません、この目でしかと見ました！',
  '嵐の合間に見えたのです……たぶん、こんな形でした。',
  '乗組員全員が同じものを見ました。信じてください！',
  '海図に描き写す手が震えるほどの光景でした。',
  '現地の漁師も同じことを言っていました。確かです。',
  '三日三晩かけて海岸線をなぞりました。自信があります。',
  '……信じるかどうかは、あなた次第です。',
  '帰りの航海のあいだ、ずっとこの形を復唱していました。',
  '見張り台の若いのが最初に見つけました。目のいい奴です。',
  '正直、疲れてはいましたが……描いた線に嘘はありません。',
  '磁針が狂う海域でしたが、星を頼りに測りました。',
  '一度は霧で見失いましたが、二日後に同じ岸へ戻れました。',
]

/** 船長タイプごとの持ち味が出る台詞 */
const CAPTAIN_FLAVOR_QUOTES: Record<LieIntensity, string[]> = {
  mild: [
    '測量具で三点から確認しました。誤差は少ないはずです。',
    '前任の海図と照合済みです。修正点は報告のとおり。',
    '確証のない部分は描いておりません。描いた分は確かです。',
    '水深も併せて測りました。岸の形はこれで正しい。',
    '派手さはありませんが、事実だけをお持ちしました。',
    '二度測り、二度とも同じ形でした。ご安心を。',
  ],
  standard: [
    '正直、酒は入っていましたが……見たものは見たのです。',
    '賭けてもいい。まあ、賭けたら負けたこともありますが。',
    '半分は確信、半分は勘です。しかし儂の勘は当たる。',
    '嵐の夜でした。だが稲光のたびに、確かに見えたのです。',
    '乗組員の半分は違う形だったと言いますが、奴らは素人です。',
    '前に見た海と似ていた気もしますが……いや、これは新しい海です。',
  ],
  wild: [
    '夢に見た大陸と寸分違わぬ姿でした。これは運命です！',
    '古の海図にあった幻の島……ついに、ついに見つけたのです！',
    '海の女神が波間から指し示したのです。疑う余地はありません！',
    'あの岬の形、詩に詠まれた通りでした。世界は詩人の味方です！',
    '確かに見たのです……いや、見えたと思うのです……いや、見ました！',
    '沈んだはずの王国の尖塔が、水面下に光っていました！',
  ],
}

interface Props {
  regionId: RegionId
  attempt: number
  intensity: LieIntensity
  /** 報告に含まれる陸橋。信じると隣の海域へ大陸が続く */
  bridges: EdgeId[]
  onBelieve: () => void
  onReject: () => void
}

export function ReportDialog({ regionId, attempt, intensity, bridges, onBelieve, onReject }: Props) {
  const pool = [...COMMON_QUOTES, ...CAPTAIN_FLAVOR_QUOTES[intensity]]
  const quote = pick(createRng(`quote:${regionId}:${attempt}`), pool)
  const directions = bridges
    .map((edge) => edgeDirection(regionId, edge))
    .filter((d): d is NonNullable<typeof d> => d !== null)
  return (
    <div className="report-dialog" role="dialog" aria-label="船長の報告">
      <div className="report-header">
        <span className="report-title">船長の報告 — {regionName(regionId)}</span>
        <span className="report-attempt">{attempt + 1}度目の航海</span>
      </div>
      <p className="report-quote">「{quote}」</p>
      {directions.length > 0 && (
        <p className="report-bridges">
          ⚓ 船長曰く、この陸地は<strong>{directions.join('・')}</strong>
          の海の先へまだ続いているとのこと。信じれば、隣の海域にも続きの大地が現れる。
        </p>
      )}
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
