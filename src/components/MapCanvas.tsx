import { useEffect, useMemo, useRef, useState } from 'react'
import type { Point, Ring } from '../map/geo'
import { regionAt } from '../map/regions'
import type { RegionId } from '../map/regions'
import { canDispatch } from '../game/state'
import type { GameState } from '../game/state'
import { drawScene } from '../render/draw'
import { drawParchmentSea } from '../render/parchment'
import {
  DEFAULT_VIEW,
  applyView,
  clampView,
  createViewTransform,
  zoomAt,
} from '../render/transform'
import type { ViewState } from '../render/transform'

interface Props {
  state: GameState
  preview: { region: RegionId; geometry: Ring[] } | null
  shipPos: Point | null
  truthOverlay: boolean
  onRegionClick: (id: RegionId) => void
}

const TAP_SLOP_PX = 8

export function MapCanvas({ state, preview, shipPos, truthOverlay, onRegionClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseRef = useRef<HTMLCanvasElement | null>(null)
  const [width, setWidth] = useState(960)
  const [hover, setHover] = useState<RegionId | null>(null)
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW)

  // ピンチ・パン用のポインタ追跡（描画に影響しないのでref）
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const movedRef = useRef(false)

  const baseVt = useMemo(() => createViewTransform(width), [width])
  const vt = useMemo(() => applyView(baseVt, view), [baseVt, view])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width)
      if (w > 0) setWidth(w)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(vt.width * dpr)
    canvas.height = Math.round(vt.height * dpr)
    canvas.style.width = `${vt.width}px`
    canvas.style.height = `${vt.height}px`

    // 羊皮紙ベースはサイズ変更時のみ再生成
    if (!baseRef.current || baseRef.current.width !== canvas.width) {
      const base = document.createElement('canvas')
      base.width = canvas.width
      base.height = canvas.height
      const bctx = base.getContext('2d')!
      bctx.scale(dpr, dpr)
      drawParchmentSea(bctx, vt.width, vt.height)
      baseRef.current = base
    }

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawScene(ctx, { vt, base: baseRef.current, state, hover, preview, shipPos, truthOverlay })
  }, [vt, state, hover, preview, shipPos, truthOverlay])

  // ホイールズーム（React経由だとpassiveでpreventDefaultできないため直接登録）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      setView((v) => zoomAt(v, baseVt, factor, e.clientX - rect.left, e.clientY - rect.top))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [baseVt])

  function localPos(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, localPos(e))
    if (pointersRef.current.size === 1) movedRef.current = false
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const pointers = pointersRef.current
    const prev = pointers.get(e.pointerId)
    const pos = localPos(e)
    if (!prev) {
      // ボタンを押していないマウス移動: ホバー判定のみ
      const [mx, my] = vt.toMap(pos.x, pos.y)
      setHover(regionAt(mx, my))
      return
    }
    pointers.set(e.pointerId, pos)

    if (pointers.size === 1) {
      const dx = pos.x - prev.x
      const dy = pos.y - prev.y
      if (Math.hypot(dx, dy) > 0 && view.zoom > 1) {
        setView((v) => clampView({ ...v, panX: v.panX - dx, panY: v.panY - dy }, baseVt))
      }
      if (Math.hypot(dx, dy) > TAP_SLOP_PX / 2) movedRef.current = true
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)?.[1]
      if (!other) return
      const prevDist = Math.hypot(prev.x - other.x, prev.y - other.y)
      const newDist = Math.hypot(pos.x - other.x, pos.y - other.y)
      if (prevDist > 0) {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        setView((v) => zoomAt(v, baseVt, newDist / prevDist, mid.x, mid.y))
      }
      movedRef.current = true
    }
  }

  function onPointerEnd(e: React.PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(e.pointerId)
  }

  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (movedRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const [mx, my] = vt.toMap(e.clientX - rect.left, e.clientY - rect.top)
    const id = regionAt(mx, my)
    if (id && canDispatch(state, id)) onRegionClick(id)
  }

  return (
    <div ref={containerRef} className="map-container">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="世界地図"
        style={{
          cursor: hover && canDispatch(state, hover) ? 'pointer' : 'default',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onMouseLeave={() => setHover(null)}
        onClick={onClick}
        onDoubleClick={() => setView(DEFAULT_VIEW)}
      />
      {view.zoom > 1 && (
        <button type="button" className="zoom-reset" onClick={() => setView(DEFAULT_VIEW)}>
          全体表示に戻す
        </button>
      )}
    </div>
  )
}
