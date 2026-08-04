import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { START_REGION } from '../map/regions'
import { regionName } from '../map/region-names'
import { TRUTH_ATTEMPT } from '../game/state'
import type { GameState } from '../game/state'
import { ReportLogDialog } from './ReportLogDialog'

function makeState(regions: GameState['regions']): GameState {
  return { regions, phase: { type: 'idle' }, intensity: 'standard', worldShape: 'unknown', shapeAttempts: 0 }
}

describe('ReportLogDialog', () => {
  test('却下履歴がないとき、記録帳を開くと、空メッセージを表示するべき', () => {
    const state = makeState({
      [START_REGION]: { attempts: 0, confirmedAttempt: TRUTH_ATTEMPT },
    })
    render(<ReportLogDialog state={state} onClose={() => {}} />)
    expect(screen.getByText(/まだ突き返した報告はありません/)).toBeInTheDocument()
  })

  test('却下した海域があるとき、記録帳を開くと、海域名と却下件数を表示するべき', () => {
    const state = makeState({
      [START_REGION]: { attempts: 0, confirmedAttempt: TRUTH_ATTEMPT },
      'r6-1': { attempts: 3, confirmedAttempt: 3 },
      'r4-1': { attempts: 1, confirmedAttempt: null },
    })
    render(<ReportLogDialog state={state} onClose={() => {}} />)
    expect(screen.getByText(/4 件の報告を突き返しました/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(regionName('r6-1')))).toBeInTheDocument()
    expect(screen.getByText('（確定済み）')).toBeInTheDocument()
    expect(screen.getByText('（未確定）')).toBeInTheDocument()
    expect(screen.getAllByText(/度目・却下/)).toHaveLength(4)
  })

  test('閉じるボタンが、クリックされたとき、onCloseが呼ばれるべき', async () => {
    const onClose = vi.fn()
    const state = makeState({
      [START_REGION]: { attempts: 0, confirmedAttempt: TRUTH_ATTEMPT },
    })
    render(<ReportLogDialog state={state} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
