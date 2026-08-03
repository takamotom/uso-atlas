// 完成地図（または途中経過）のPNGエクスポート
import { ALL_REGIONS } from '../map/regions'
import { confirmedGeometry } from '../game/confirmed-geometry'
import { isConfirmed } from '../game/state'
import type { GameState } from '../game/state'
import { drawCompassRose, drawLand, fogCellPath } from './draw'
import { PALETTE, drawParchmentSea } from './parchment'
import { createViewTransform } from './transform'

const EXPORT_WIDTH = 2400

export function renderExportCanvas(state: GameState): HTMLCanvasElement {
  const vt = createViewTransform(EXPORT_WIDTH)
  const canvas = document.createElement('canvas')
  canvas.width = vt.width
  canvas.height = vt.height
  const ctx = canvas.getContext('2d')!

  drawParchmentSea(ctx, vt.width, vt.height)
  for (const id of ALL_REGIONS) {
    const p = state.regions[id]
    if (p?.confirmedAttempt != null) drawLand(ctx, confirmedGeometry(id, p.confirmedAttempt), vt)
  }
  for (const id of ALL_REGIONS) {
    if (isConfirmed(state, id)) continue
    ctx.save()
    ctx.fillStyle = PALETTE.fog
    ctx.globalAlpha = 0.92
    ctx.fill(fogCellPath(id, vt))
    ctx.restore()
  }

  // カルトゥーシュ（題字枠）
  const cw = vt.width * 0.24
  const ch = vt.height * 0.12
  const cx = vt.width * 0.035
  const cy = vt.height * 0.045
  ctx.save()
  ctx.fillStyle = 'rgba(240, 228, 190, 0.9)'
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = 3
  ctx.fillRect(cx, cy, cw, ch)
  ctx.strokeRect(cx, cy, cw, ch)
  ctx.strokeRect(cx + 8, cy + 8, cw - 16, ch - 16)
  ctx.fillStyle = PALETTE.ink
  ctx.textAlign = 'center'
  ctx.font = `bold ${ch * 0.3}px Georgia, 'Yu Mincho', serif`
  ctx.fillText('うそアトラス', cx + cw / 2, cy + ch * 0.45)
  ctx.font = `${ch * 0.16}px Georgia, 'Yu Mincho', serif`
  const date = new Date()
  ctx.fillText(
    `船団の記録 ${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`,
    cx + cw / 2,
    cy + ch * 0.75,
  )
  ctx.restore()

  drawCompassRose(ctx, vt.width * 0.93, vt.height * 0.85, vt.width * 0.035)
  return canvas
}

export function exportMapPng(state: GameState): void {
  const canvas = renderExportCanvas(state)
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uso-atlas-${Date.now()}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
