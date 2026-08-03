// 羊皮紙風の背景・質感。オフスクリーンに1回描いてキャッシュする前提。
import { createRng } from '../report/random'

export const PALETTE = {
  sea: '#e7d7ae',
  seaDeep: '#dcc794',
  land: '#efe3bd',
  ink: '#5b4a2f',
  inkFaint: 'rgba(91, 74, 47, 0.35)',
  fog: '#cdb98d',
  fogEdge: 'rgba(91, 74, 47, 0.45)',
  preview: 'rgba(140, 60, 40, 0.85)',
  previewFill: 'rgba(170, 90, 60, 0.25)',
} as const

/** 低アルファのノイズタイルを生成（紙の質感用） */
export function createNoiseTile(size = 128, seed = 'parchment-noise'): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  const rng = createRng(seed)
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 80 + Math.floor(rng() * 120)
    image.data[i] = v
    image.data[i + 1] = v * 0.92
    image.data[i + 2] = v * 0.75
    image.data[i + 3] = Math.floor(rng() * 22)
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

/** 羊皮紙の海ベースを描く（ビネット＋質感＋染み） */
export function drawParchmentSea(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75)
  grad.addColorStop(0, PALETTE.sea)
  grad.addColorStop(1, PALETTE.seaDeep)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  const tile = createNoiseTile()
  const pattern = ctx.createPattern(tile, 'repeat')
  if (pattern) {
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, w, h)
  }

  const rng = createRng('parchment-blotches')
  ctx.save()
  for (let i = 0; i < 7; i++) {
    const x = rng() * w
    const y = rng() * h
    const r = (0.04 + rng() * 0.08) * Math.min(w, h)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(120, 95, 50, 0.05)')
    g.addColorStop(1, 'rgba(120, 95, 50, 0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  ctx.restore()
}
