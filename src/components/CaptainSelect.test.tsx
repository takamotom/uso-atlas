import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CAPTAIN_PROFILES } from '../report/config'
import { CaptainSelect } from './CaptainSelect'

describe('CaptainSelect', () => {
  test('セレクタが、表示されたとき、現在の船長名を示すべき', () => {
    render(<CaptainSelect value="standard" onChange={() => {}} />)
    expect(screen.getByText(CAPTAIN_PROFILES.standard.name)).toBeInTheDocument()
  })

  test('ボタンが、クリックされたとき、3人の船長カードが説明つきで開くべき', async () => {
    render(<CaptainSelect value="standard" onChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /船長/ }))
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(screen.getByText(CAPTAIN_PROFILES.wild.description)).toBeInTheDocument()
  })

  test('別の船長カードが、クリックされたとき、その値でonChangeが呼ばれるべき', async () => {
    const onChange = vi.fn()
    render(<CaptainSelect value="standard" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /船長/ }))
    await userEvent.click(screen.getByRole('option', { name: new RegExp(CAPTAIN_PROFILES.wild.name) }))
    expect(onChange).toHaveBeenCalledWith('wild')
  })
})
