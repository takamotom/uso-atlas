// 報告地形のミニサムネイル（記録帳用）。シードから決定的に再生成して描く
import { useEffect, useRef } from 'react'
import { regionBBox } from '../map/regions'
import type { RegionId } from '../map/regions'
import type { LieIntensity } from '../report/config'
import { generateReport } from '../report/generate'
import { PALETTE } from '../render/parchment'

interface Props {
  id: RegionId
  attempt: number
  intensity: LieIntensity
  size?: number
}

export function ReportThumbnail({ id, attempt, intensity, size = 88 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { geometry } = generateReport(id, attempt, intensity)
    const bbox = regionBBox(id)
    const scale = size / (bbox.x1 - bbox.x0)
    ctx.fillStyle = PALETTE.sea
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = PALETTE.land
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const ring of geometry) {
      ring.forEach((p, i) => {
        const x = (p[0] - bbox.x0) * scale
        const y = (bbox.y1 - p[1]) * scale
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
    }
    ctx.fill()
    ctx.stroke()
  }, [id, attempt, intensity, size])

  return <canvas ref={canvasRef} width={size} height={size} className="report-thumbnail" />
}
