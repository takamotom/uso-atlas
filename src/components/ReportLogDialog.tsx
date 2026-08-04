// 報告記録帳: これまでに「信じない」で突き返した報告の一覧。
// 却下履歴は state.regions の attempts から決定的に再構成できるため、新たな保存は不要。
import { ALL_REGIONS } from '../map/regions'
import type { RegionId } from '../map/regions'
import { regionName } from '../map/region-names'
import type { GameState } from '../game/state'
import { ReportThumbnail } from './ReportThumbnail'

const MAX_THUMBS_PER_REGION = 8

interface Props {
  state: GameState
  onClose: () => void
}

interface LogRow {
  id: RegionId
  rejectedAttempts: number[]
  confirmed: boolean
}

function buildRows(state: GameState): LogRow[] {
  const rows: LogRow[] = []
  for (const id of ALL_REGIONS) {
    const p = state.regions[id]
    if (!p || p.attempts === 0) continue
    rows.push({
      id,
      rejectedAttempts: Array.from({ length: p.attempts }, (_, i) => i),
      confirmed: p.confirmedAttempt != null,
    })
  }
  return rows
}

export function ReportLogDialog({ state, onClose }: Props) {
  const rows = buildRows(state)
  const totalRejected = rows.reduce((sum, r) => sum + r.rejectedAttempts.length, 0)
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="log-panel"
        role="dialog"
        aria-label="報告記録帳"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="log-header">
          <h2>報告記録帳</h2>
          <button type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="log-empty">
            まだ突き返した報告はありません。すべての報告を信じてきた、寛容な地図問屋です。
          </p>
        ) : (
          <>
            <p className="log-summary">これまでに {totalRejected} 件の報告を突き返しました。</p>
            <div className="log-rows">
              {rows.map((row) => (
                <section key={row.id} className="log-row">
                  <h3>
                    {regionName(row.id)}
                    <span className="log-status">{row.confirmed ? '（確定済み）' : '（未確定）'}</span>
                  </h3>
                  <div className="log-thumbs">
                    {row.rejectedAttempts.slice(-MAX_THUMBS_PER_REGION).map((attempt) => (
                      <figure key={attempt} className="log-thumb">
                        <ReportThumbnail id={row.id} attempt={attempt} intensity={state.intensity} />
                        <figcaption>{attempt + 1}度目・却下</figcaption>
                      </figure>
                    ))}
                    {row.rejectedAttempts.length > MAX_THUMBS_PER_REGION && (
                      <p className="log-more">
                        …ほか {row.rejectedAttempts.length - MAX_THUMBS_PER_REGION} 件
                      </p>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
