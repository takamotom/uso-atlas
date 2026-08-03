import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportDialog } from './ReportDialog'

describe('ReportDialog', () => {
  test('報告ダイアログが、表示されたとき、信じる/信じないボタンと航海回数を示すべき', () => {
    render(
      <ReportDialog regionLabel="r6-1" attempt={2} onBelieve={() => {}} onReject={() => {}} />,
    )
    expect(screen.getByRole('button', { name: '信じる' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '信じない' })).toBeInTheDocument()
    expect(screen.getByText('3度目の航海')).toBeInTheDocument()
  })

  test('信じるボタンが、クリックされたとき、onBelieveだけが呼ばれるべき', async () => {
    const onBelieve = vi.fn()
    const onReject = vi.fn()
    render(
      <ReportDialog regionLabel="r6-1" attempt={0} onBelieve={onBelieve} onReject={onReject} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '信じる' }))
    expect(onBelieve).toHaveBeenCalledTimes(1)
    expect(onReject).not.toHaveBeenCalled()
  })

  test('信じないボタンが、クリックされたとき、onRejectだけが呼ばれるべき', async () => {
    const onBelieve = vi.fn()
    const onReject = vi.fn()
    render(
      <ReportDialog regionLabel="r6-1" attempt={0} onBelieve={onBelieve} onReject={onReject} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '信じない' }))
    expect(onReject).toHaveBeenCalledTimes(1)
    expect(onBelieve).not.toHaveBeenCalled()
  })

  test('同じ海域と試行の報告が、再表示されたとき、同じ台詞を表示するべき', () => {
    const first = render(
      <ReportDialog regionLabel="r3-2" attempt={1} onBelieve={() => {}} onReject={() => {}} />,
    )
    const quote1 = first.container.querySelector('.report-quote')?.textContent
    first.unmount()
    const second = render(
      <ReportDialog regionLabel="r3-2" attempt={1} onBelieve={() => {}} onReject={() => {}} />,
    )
    const quote2 = second.container.querySelector('.report-quote')?.textContent
    expect(quote1).toBe(quote2)
  })
})
