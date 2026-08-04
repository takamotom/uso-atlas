// 開発用: 海域ごとの報告バリエーションを並べて嘘の見た目をチューニングする画面
import { useEffect, useMemo, useRef, useState } from 'react'
import { ALL_REGIONS, regionBBox } from '../map/regions'
import type { RegionId } from '../map/regions'
import { CAPTAIN_PROFILES } from '../report/config'
import type { LieIntensity } from '../report/config'
import { generateReport } from '../report/generate'
import { PALETTE } from '../render/parchment'

const CELL_PX = 220

interface ThumbProps {
  id: RegionId
  attempt: number
  intensity: LieIntensity
}

function ReportThumb({ id, attempt, intensity }: ThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const report = useMemo(() => generateReport(id, attempt, intensity), [id, attempt, intensity])

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
  const [intensity, setIntensity] = useState<LieIntensity>('standard')
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
      <label>
        船長:
        <select value={intensity} onChange={(e) => setIntensity(e.target.value as LieIntensity)}>
          {(Object.keys(CAPTAIN_PROFILES) as LieIntensity[]).map((value) => (
            <option key={value} value={value}>
              {CAPTAIN_PROFILES[value].name}
            </option>
          ))}
        </select>
      </label>
      <div className="gallery-grid">
        {Array.from({ length: 12 }, (_, attempt) => (
          <ReportThumb
            key={`${region}-${intensity}-${attempt}`}
            id={region}
            attempt={attempt}
            intensity={intensity}
          />
        ))}
      </div>
    </div>
  )
}
