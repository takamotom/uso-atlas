import { isMuted, playSfx, setMuted } from './sfx'

describe('sfx', () => {
  test('ミュート設定が、切り替えたとき、localStorageに保存されて読み戻せるべき', () => {
    setMuted(true)
    expect(isMuted()).toBe(true)
    setMuted(false)
    expect(isMuted()).toBe(false)
  })

  test('AudioContextが無い環境で、効果音を再生したとき、例外を出さず何もしないべき', () => {
    expect(() => {
      playSfx('sail')
      playSfx('stamp')
      playSfx('reject')
      playSfx('complete')
    }).not.toThrow()
  })
})
