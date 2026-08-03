// 派遣中の船の位置をrAFで補間する。到着したらonArrivedを1回だけ呼ぶ。
import { useEffect, useRef, useState } from 'react'
import type { Point } from '../map/geo'
import { HOME_PORT, regionCenter } from '../map/regions'
import type { RegionId } from '../map/regions'
import type { Phase } from '../game/state'

const SAIL_MS = 2200

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t)
}

export function useShipAnimation(phase: Phase, onArrived: () => void): Point | null {
  const [entry, setEntry] = useState<{ target: RegionId; pos: Point } | null>(null)
  const onArrivedRef = useRef(onArrived)
  useEffect(() => {
    onArrivedRef.current = onArrived
  })

  const sailing = phase.type === 'sailing'
  const target = sailing ? phase.target : null

  useEffect(() => {
    if (!target) return
    const dest = regionCenter(target)
    const start = performance.now()
    let raf = 0
    let arrived = false
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SAIL_MS)
      const e = easeInOut(t)
      setEntry({
        target,
        pos: [
          HOME_PORT[0] + (dest[0] - HOME_PORT[0]) * e,
          HOME_PORT[1] + (dest[1] - HOME_PORT[1]) * e,
        ],
      })
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else if (!arrived) {
        arrived = true
        onArrivedRef.current()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  if (!sailing || !target) return null
  return entry?.target === target ? entry.pos : HOME_PORT
}
