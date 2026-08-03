// レイヤ合成描画。海（キャッシュ済みbase）→確定陸地→霧→報告プレビュー→船
import type { Point, Ring } from '../map/geo'
import { ALL_REGIONS, LAT_CLIP, regionBBox } from '../map/regions'
import type { RegionId } from '../map/regions'
import { confirmedGeometry } from '../game/confirmed-geometry'
import { canDispatch, isConfirmed } from '../game/state'
import type { GameState } from '../game/state'
import { createNoise2D } from '../report/noise'
import { PALETTE } from './parchment'
import type { ViewTransform } from './transform'

export function ringsToPath(rings: Ring[], vt: ViewTransform): Path2D {
  const path = new Path2D()
  for (const ring of rings) {
    if (ring.length < 3) continue
    const [sx, sy] = vt.toPx(ring[0])
    path.moveTo(sx, sy)
    for (let i = 1; i < ring.length; i++) {
      const [x, y] = vt.toPx(ring[i])
      path.lineTo(x, y)
    }
    path.closePath()
  }
  return path
}

/** 陸地を古地図調（クリーム塗り＋インク線＋海岸ハッチング）で描く */
export function drawLand(ctx: CanvasRenderingContext2D, rings: Ring[], vt: ViewTransform): void {
  if (rings.length === 0) return
  const path = ringsToPath(rings, vt)
  ctx.save()
  // 海岸ハッチング（輪郭の外側に滲む太い半透明線を先に敷く）
  ctx.strokeStyle = PALETTE.inkFaint
  ctx.lineWidth = Math.max(3, vt.scale * 1.6)
  ctx.stroke(path)
  ctx.fillStyle = PALETTE.land
  ctx.fill(path, 'nonzero')
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = Math.max(1, vt.scale * 0.35)
  ctx.stroke(path)
  ctx.restore()
}

/** 未探索セルの霧の輪郭。縁をセル固有ノイズで波打たせ、少し外側に膨らませる */
export function fogCellPath(id: RegionId, vt: ViewTransform): Path2D {
  const b = regionBBox(id)
  const noise = createNoise2D(`fog:${id}`, 6)
  const grow = 0.8
  const amp = 1.4
  const path = new Path2D()
  const perimeter: Point[] = []
  const step = 2
  for (let x = b.x0 - grow; x < b.x1 + grow; x += step) perimeter.push([x, b.y1 + grow])
  for (let y = b.y1 + grow; y > b.y0 - grow; y -= step) perimeter.push([b.x1 + grow, y])
  for (let x = b.x1 + grow; x > b.x0 - grow; x -= step) perimeter.push([x, b.y0 - grow])
  for (let y = b.y0 - grow; y < b.y1 + grow; y += step) perimeter.push([b.x0 - grow, y])
  perimeter.forEach((p, i) => {
    const [px, py] = vt.toPx([p[0] + noise(p[0], p[1]) * amp, p[1] + noise(p[1], -p[0]) * amp])
    if (i === 0) path.moveTo(px, py)
    else path.lineTo(px, py)
  })
  path.closePath()
  return path
}

export interface SceneOptions {
  vt: ViewTransform
  base: CanvasImageSource
  state: GameState
  hover: RegionId | null
  /** reviewing中の報告プレビュー */
  preview: { region: RegionId; geometry: Ring[] } | null
  shipPos: Point | null
}

export function drawScene(ctx: CanvasRenderingContext2D, o: SceneOptions): void {
  const { vt, state } = o
  ctx.drawImage(o.base, 0, 0, vt.width, vt.height)

  for (const id of ALL_REGIONS) {
    const p = state.regions[id]
    if (p?.confirmedAttempt != null) drawLand(ctx, confirmedGeometry(id, p.confirmedAttempt), vt)
  }

  // 霧（プレビュー対象セルは霧を剥がして見せる）
  for (const id of ALL_REGIONS) {
    if (isConfirmed(state, id) || o.preview?.region === id) continue
    const path = fogCellPath(id, vt)
    ctx.save()
    ctx.fillStyle = PALETTE.fog
    ctx.globalAlpha = 0.92
    ctx.fill(path)
    ctx.restore()
    if (canDispatch(state, id) || (state.phase.type === 'reviewing' && state.phase.target === id)) {
      ctx.save()
      ctx.strokeStyle = PALETTE.fogEdge
      ctx.setLineDash([6, 5])
      ctx.lineWidth = o.hover === id ? 2.5 : 1.2
      ctx.stroke(path)
      if (o.hover === id) {
        ctx.fillStyle = 'rgba(255, 245, 210, 0.18)'
        ctx.fill(path)
      }
      ctx.restore()
    }
  }

  if (o.preview) {
    const path = ringsToPath(o.preview.geometry, vt)
    ctx.save()
    ctx.fillStyle = PALETTE.previewFill
    ctx.fill(path, 'nonzero')
    ctx.strokeStyle = PALETTE.preview
    ctx.setLineDash([7, 4])
    ctx.lineWidth = Math.max(1.5, vt.scale * 0.5)
    ctx.stroke(path)
    ctx.restore()
  }

  if (o.shipPos) {
    const [px, py] = vt.toPx(o.shipPos)
    ctx.save()
    ctx.font = `${Math.max(18, vt.scale * 7)}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⛵', px, py)
    ctx.restore()
  }
}

/** 簡単なコンパスローズ（8方位の星） */
export function drawCompassRose(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
): void {
  ctx.save()
  ctx.strokeStyle = PALETTE.ink
  ctx.fillStyle = PALETTE.ink
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2)
  ctx.stroke()
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const len = i % 2 === 0 ? r : r * 0.55
    const w = i % 2 === 0 ? r * 0.16 : r * 0.1
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
    ctx.lineTo(cx + Math.cos(angle + Math.PI / 2) * w, cy + Math.sin(angle + Math.PI / 2) * w)
    ctx.lineTo(cx + Math.cos(angle - Math.PI / 2) * w, cy + Math.sin(angle - Math.PI / 2) * w)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = PALETTE.ink
  ctx.font = `${r * 0.42}px serif`
  ctx.textAlign = 'center'
  ctx.fillText('N', cx, cy - r * 1.25)
  ctx.restore()
}

/** ビュー緯度範囲の中でのセル可視チェックに使う定数（描画は緯度クリップ内のみ） */
export const VIEW_LAT = LAT_CLIP
