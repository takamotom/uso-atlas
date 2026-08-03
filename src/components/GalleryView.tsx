// 開発用: 海域ごとの報告バリエーションを並べて嘘の見た目をチューニングする画面
import { useEffect, useMemo, useRef, useState } from 'react'
import { ALL_REGIONS, regionBBox } from '../map/regions'
import type { RegionId } from '../map/regions'
import { generateReport } from '../report/generate'
import { PALETTE } from '../render/parchment'

const CELL_PX = 220

function ReportThumb({ id, attempt }: { id: RegionId; attempt: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const report = useMemo(() => generateReport(id, attempt), [id, attempt])

  useEffect(() => {
    const r = report
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const bbox = regionBBox(id)
    const scale = CELL_PX / (bbox.x1 - bbox.x0)
    ctx.fillStyle = PALETTE.sea
    ctx.fillRect(0, 0, CELL_PX, CELL_PX)
    ctx.fillStyle = PALETTE.land
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const ring of r.geometry) {
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
  }, [id, report])

  return (
    <figure className="gallery-thumb">
      <canvas ref={canvasRef} width={CELL_PX} height={CELL_PX} />
      <figcaption>
        #{attempt} {report?.kind === 'truth' ? '真実' : `嘘 (${report?.lieOps.join('+')})`}
      </figcaption>
    </figure>
  )
}

export function GalleryView() {
  const [region, setRegion] = useState<RegionId>('r5-1')
  return (
    <div className="gallery">
      <h1>報告ギャラリー（開発用）</h1>
      <label>
        海域:
        <select value={region} onChange={(e) => setRegion(e.target.value as RegionId)}>
          {ALL_REGIONS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <div className="gallery-grid">
        {Array.from({ length: 12 }, (_, attempt) => (
          <ReportThumb key={`${region}-${attempt}`} id={region} attempt={attempt} />
        ))}
      </div>
    </div>
  )
}
