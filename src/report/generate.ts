// 船長の報告の生成。同じ (regionId, attempt, intensity) からは常に同じ報告が得られる（決定的）。
import type { Ring } from '../map/geo'
import { regionBBox } from '../map/regions'
import type { RegionId } from '../map/regions'
import { truthGeometry } from '../map/world-data'
import { DEFAULT_INTENSITY, INTENSITY_PRESETS } from './config'
import type { LieIntensity, LiePreset } from './config'
import { createRng, rollInt } from './random'
import type { Rng } from './random'
import { distortRings, fabricateIslands, vanishRings } from './transforms'

/** game/state.ts の TRUTH_ATTEMPT と同値。循環importを避けるためここにも定義 */
export const FORCED_TRUTH_ATTEMPT = -1

export type LieOp = 'distort' | 'fabricate' | 'vanish'

export interface Report {
  kind: 'truth' | 'lie'
  lieOps: LieOp[]
  geometry: Ring[]
}

function chooseLieOps(rng: Rng, hasLand: boolean, preset: LiePreset): LieOp[] {
  // 陸地のない海域では歪み・消失に意味がないため捏造のみ
  if (!hasLand) return ['fabricate']
  const count = rollInt(rng, preset.lieOpCount.min, preset.lieOpCount.max)
  const pool: LieOp[] = ['distort', 'fabricate', 'vanish']
  const ops: LieOp[] = []
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * pool.length)
    ops.push(pool[idx])
    pool.splice(idx, 1)
  }
  // 適用順を固定（消失→歪み→捏造）して見た目を安定させる
  const order: LieOp[] = ['vanish', 'distort', 'fabricate']
  return order.filter((op) => ops.includes(op))
}

export function generateReport(
  id: RegionId,
  attempt: number,
  intensity: LieIntensity = DEFAULT_INTENSITY,
): Report {
  const truth = truthGeometry(id)
  if (attempt === FORCED_TRUTH_ATTEMPT) return { kind: 'truth', lieOps: [], geometry: truth }

  const preset = INTENSITY_PRESETS[intensity]
  const seed = `${intensity}:${id}:${attempt}`
  const rng = createRng(seed)
  if (rng() < preset.truthProbability) return { kind: 'truth', lieOps: [], geometry: truth }

  const bbox = regionBBox(id)
  const ops = chooseLieOps(rng, truth.length > 0, preset)
  let geometry = truth
  for (const op of ops) {
    if (op === 'vanish') geometry = vanishRings(geometry, bbox, rng, preset, seed)
    else if (op === 'distort') geometry = distortRings(geometry, bbox, rng, seed, preset)
    else geometry = fabricateIslands(geometry, bbox, rng, preset)
  }
  return { kind: 'lie', lieOps: ops, geometry }
}
