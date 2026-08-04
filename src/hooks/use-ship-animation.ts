// 派遣中の船の位置をrAFで補間する。到着したらonArrivedを1回だけ呼ぶ。
import { useEffect, useRef, useState } from 'react'
import type { Point } from '../map/geo'
import { HOME_PORT, regionCenter } from '../map/regions'
import type { RegionId } from '../map/regions'
import type { Phase } from '../game/state'

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t)
}

/** 航海時間は距離に応じて伸びるが、遠くても冗長にならないよう上限を設ける */
export function sailDurationMs(from: Point, to: Point): number {
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1])
  return Math.min(1200, 400 + dist * 4)
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
    const duration = sailDurationMs(HOME_PORT, dest)
    const start = performance.now()
    let raf = 0
    let arrived = false
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
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
