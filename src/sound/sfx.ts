// WebAudioで合成する効果音（外部アセット不要）。AudioContextは初回再生時に生成する。
// jsdomやAudioContext非対応環境では静かに何もしない。

export type SfxName = 'sail' | 'stamp' | 'reject' | 'complete'

const MUTE_KEY = 'uso-atlas:muted'

let ctx: AudioContext | null = null

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // 保存できなくても再生可否には影響しない
  }
}

function getContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noiseBuffer(ac: AudioContext, seconds: number): AudioBuffer {
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function playNoise(
  ac: AudioContext,
  seconds: number,
  filterType: BiquadFilterType,
  frequency: number,
  peakGain: number,
  when = 0,
): void {
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac, seconds)
  const filter = ac.createBiquadFilter()
  filter.type = filterType
  filter.frequency.value = frequency
  const gain = ac.createGain()
  const t = ac.currentTime + when
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(peakGain, t + seconds * 0.2)
  gain.gain.exponentialRampToValueAtTime(0.001, t + seconds)
  src.connect(filter).connect(gain).connect(ac.destination)
  src.start(t)
}

function playTone(
  ac: AudioContext,
  type: OscillatorType,
  frequency: number,
  seconds: number,
  peakGain: number,
  when = 0,
): void {
  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.value = frequency
  const gain = ac.createGain()
  const t = ac.currentTime + when
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(peakGain, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, t + seconds)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + seconds + 0.05)
}

export function playSfx(name: SfxName): void {
  if (isMuted()) return
  const ac = getContext()
  if (!ac) return
  switch (name) {
    case 'sail':
      // 出航: 波しぶきの「ざぱっ」
      playNoise(ac, 0.5, 'bandpass', 700, 0.18)
      playNoise(ac, 0.35, 'lowpass', 300, 0.12, 0.05)
      break
    case 'stamp':
      // 信じる: 判子の「ドン」
      playTone(ac, 'sine', 85, 0.18, 0.5)
      playNoise(ac, 0.06, 'lowpass', 1200, 0.25)
      break
    case 'reject':
      // 信じない: 紙を突き返す「サッ」
      playNoise(ac, 0.14, 'highpass', 1800, 0.15)
      break
    case 'complete':
      // 完成: 簡素なファンファーレ
      playTone(ac, 'triangle', 523, 0.22, 0.25)
      playTone(ac, 'triangle', 659, 0.22, 0.25, 0.16)
      playTone(ac, 'triangle', 784, 0.35, 0.25, 0.32)
      playTone(ac, 'triangle', 1047, 0.5, 0.22, 0.5)
      break
  }
}
