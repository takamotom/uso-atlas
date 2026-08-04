import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportDialog } from './ReportDialog'

describe('ReportDialog', () => {
  test('報告ダイアログが、表示されたとき、信じる/信じないボタンと航海回数を示すべき', () => {
    render(
      <ReportDialog regionId="r6-1" attempt={2} intensity="standard" bridges={[]} onBelieve={() => {}} onReject={() => {}} />,
    )
    expect(screen.getByRole('button', { name: '信じる' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '信じない' })).toBeInTheDocument()
    expect(screen.getByText('3度目の航海')).toBeInTheDocument()
  })

  test('信じるボタンが、クリックされたとき、onBelieveだけが呼ばれるべき', async () => {
    const onBelieve = vi.fn()
    const onReject = vi.fn()
    render(
      <ReportDialog regionId="r6-1" attempt={0} intensity="standard" bridges={[]} onBelieve={onBelieve} onReject={onReject} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '信じる' }))
    expect(onBelieve).toHaveBeenCalledTimes(1)
    expect(onReject).not.toHaveBeenCalled()
  })

  test('信じないボタンが、クリックされたとき、onRejectだけが呼ばれるべき', async () => {
    const onBelieve = vi.fn()
    const onReject = vi.fn()
    render(
      <ReportDialog regionId="r6-1" attempt={0} intensity="standard" bridges={[]} onBelieve={onBelieve} onReject={onReject} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '信じない' }))
    expect(onReject).toHaveBeenCalledTimes(1)
    expect(onBelieve).not.toHaveBeenCalled()
  })

  test('夢見る船長の報告が、多数の試行で表示されたとき、夢見る船長専用の台詞が出現するべき', () => {
    let sawDreamQuote = false
    for (let attempt = 0; attempt < 40 && !sawDreamQuote; attempt++) {
      const view = render(
        <ReportDialog
          regionId="r6-1"
          attempt={attempt}
          intensity="wild"
          bridges={[]}
          onBelieve={() => {}}
          onReject={() => {}}
        />,
      )
      const quote = view.container.querySelector('.report-quote')?.textContent ?? ''
      if (quote.includes('夢に見た大陸') || quote.includes('幻の島') || quote.includes('海の女神')) {
        sawDreamQuote = true
      }
      view.unmount()
    }
    expect(sawDreamQuote).toBe(true)
  })

  test('陸橋つきの報告が、表示されたとき、方角つきの陸橋案内を表示するべき', () => {
    render(
      <ReportDialog
        regionId="r8-2"
        attempt={0}
        intensity="standard"
        bridges={['ve:8:2', 'he:8:1']}
        onBelieve={() => {}}
        onReject={() => {}}
      />,
    )
    expect(screen.getByText(/東・北/)).toBeInTheDocument()
    expect(screen.getByText(/隣の海域にも続きの大地が現れる/)).toBeInTheDocument()
  })

  test('陸橋なしの報告が、表示されたとき、陸橋案内を表示しないべき', () => {
    render(
      <ReportDialog
        regionId="r8-2"
        attempt={0}
        intensity="standard"
        bridges={[]}
        onBelieve={() => {}}
        onReject={() => {}}
      />,
    )
    expect(screen.queryByText(/続きの大地/)).not.toBeInTheDocument()
  })

  test('同じ海域と試行の報告が、再表示されたとき、同じ台詞を表示するべき', () => {
    const first = render(
      <ReportDialog regionId="r3-2" attempt={1} intensity="standard" bridges={[]} onBelieve={() => {}} onReject={() => {}} />,
    )
    const quote1 = first.container.querySelector('.report-quote')?.textContent
    first.unmount()
    const second = render(
      <ReportDialog regionId="r3-2" attempt={1} intensity="standard" bridges={[]} onBelieve={() => {}} onReject={() => {}} />,
    )
    const quote2 = second.container.querySelector('.report-quote')?.textContent
    expect(quote1).toBe(quote2)
  })
})
