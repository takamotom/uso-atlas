import { useEffect, useMemo, useRef, useState } from 'react'
import type { Point, Ring } from '../map/geo'
import { regionAt } from '../map/regions'
import type { RegionId } from '../map/regions'
import { canDispatch } from '../game/state'
import type { GameState } from '../game/state'
import { drawScene } from '../render/draw'
import { drawParchmentSea } from '../render/parchment'
import { createViewTransform } from '../render/transform'

interface Props {
  state: GameState
  preview: { region: RegionId; geometry: Ring[] } | null
  shipPos: Point | null
  truthOverlay: boolean
  onRegionClick: (id: RegionId) => void
}

export function MapCanvas({ state, preview, shipPos, truthOverlay, onRegionClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseRef = useRef<HTMLCanvasElement | null>(null)
  const [width, setWidth] = useState(960)
  const [hover, setHover] = useState<RegionId | null>(null)

  const vt = useMemo(() => createViewTransform(width), [width])

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

  function regionFromEvent(e: React.MouseEvent<HTMLCanvasElement>): RegionId | null {
    const rect = e.currentTarget.getBoundingClientRect()
    const [x, y] = vt.toMap(e.clientX - rect.left, e.clientY - rect.top)
    return regionAt(x, y)
  }

  return (
    <div ref={containerRef} className="map-container">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="世界地図"
        style={{ cursor: hover && canDispatch(state, hover) ? 'pointer' : 'default' }}
        onMouseMove={(e) => setHover(regionFromEvent(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const id = regionFromEvent(e)
          if (id && canDispatch(state, id)) onRegionClick(id)
        }}
      />
    </div>
  )
}
