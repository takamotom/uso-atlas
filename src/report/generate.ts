// 船長の報告の生成。同じ (regionId, attempt, intensity) からは常に同じ報告が得られる（決定的）。
// 陸橋（隣セルへ跨ぐ大陸）だけは探索状況に依存するため BridgeContext を受け取り、
// 信じた時点の陸橋セットをセーブに記録して再現する。
import { cellEdges } from '../map/edges'
import type { EdgeId } from '../map/edges'
import type { Ring } from '../map/geo'
import { regionBBox } from '../map/regions'
import type { RegionId } from '../map/regions'
import { landRatio, truthGeometry } from '../map/world-data'
import { applyBridges } from './bridges'
import { DEFAULT_INTENSITY, INLAND_LAND_RATIO, INTENSITY_PRESETS } from './config'
import type { LieIntensity, LiePreset } from './config'
import { marginOf } from './transforms'
import { createRng, rollInt } from './random'
import type { Rng } from './random'
import { carveLakes, distortRings, fabricateIslands, vanishRings } from './transforms'

/** game/state.ts の TRUTH_ATTEMPT と同値。循環importを避けるためここにも定義 */
export const FORCED_TRUTH_ATTEMPT = -1

export type LieOp = 'distort' | 'fabricate' | 'vanish' | 'lake'

export interface Report {
  kind: 'truth' | 'lie'
  lieOps: LieOp[]
  geometry: Ring[]
  /** この報告に含まれる陸橋（信じるとセーブに記録され、隣セルの報告に続きが現れる） */
  bridges: EdgeId[]
}

export interface BridgeContext {
  /** 隣セルが陸橋つきで確定済みの辺。すべての報告（真実含む）に続きの陸が必ず含まれる */
  required: EdgeId[]
  /** 隣セルが未確定で、新たに陸橋をロールできる辺 */
  allowed: EdgeId[]
}

/** ギャラリー等、探索状況と無関係に生成する場合の既定コンテキスト */
function defaultContext(id: RegionId): BridgeContext {
  return { required: [], allowed: cellEdges(id) }
}

/** 辺ごとに独立したシードで陸橋をロールする（allowedの構成に依存しない＝再現可能） */
function rollBridges(
  id: RegionId,
  attempt: number,
  intensity: LieIntensity,
  allowed: EdgeId[],
): EdgeId[] {
  const prob = INTENSITY_PRESETS[intensity].bridgeProbability
  return allowed.filter(
    (edge) => createRng(`${intensity}:${id}:${attempt}:bridge:${edge}`)() < prob,
  )
}

/** 確定済み海域の再現用: 記録された陸橋セットからジオメトリを組み立てる */
export function reportGeometryWithBridges(
  id: RegionId,
  attempt: number,
  intensity: LieIntensity,
  bridges: EdgeId[],
): Ring[] {
  const base = generateBaseReport(id, attempt, intensity)
  const preset = INTENSITY_PRESETS[intensity]
  const margin = marginOf(regionBBox(id), preset)
  return applyBridges(base.geometry, id, bridges, margin, `${intensity}:${id}:${attempt}`)
}

function chooseLieOps(rng: Rng, hasLand: boolean, inland: boolean, preset: LiePreset): LieOp[] {
  // 陸地のない海域では歪み・消失に意味がないため捏造のみ
  if (!hasLand) return ['fabricate']
  // 内陸セルで消失・沈没を使うとセル境界沿いの四角い海ができるため、湖を穿つ嘘に切り替える
  if (inland) return ['lake']
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

/** 陸橋を除いた基本報告（従来の決定的生成そのまま） */
function generateBaseReport(
  id: RegionId,
  attempt: number,
  intensity: LieIntensity,
): Omit<Report, 'bridges'> {
  const truth = truthGeometry(id)
  if (attempt === FORCED_TRUTH_ATTEMPT) return { kind: 'truth', lieOps: [], geometry: truth }

  const preset = INTENSITY_PRESETS[intensity]
  const seed = `${intensity}:${id}:${attempt}`
  const rng = createRng(seed)
  if (rng() < preset.truthProbability) return { kind: 'truth', lieOps: [], geometry: truth }

  const bbox = regionBBox(id)
  const ops = chooseLieOps(rng, truth.length > 0, landRatio(id) > INLAND_LAND_RATIO, preset)
  let geometry = truth
  for (const op of ops) {
    if (op === 'vanish') geometry = vanishRings(geometry, bbox, rng, preset, seed)
    else if (op === 'distort') geometry = distortRings(geometry, bbox, rng, seed, preset)
    else if (op === 'lake') geometry = carveLakes(geometry, bbox, rng, preset)
    else geometry = fabricateIslands(geometry, bbox, rng, preset)
  }
  return { kind: 'lie', lieOps: ops, geometry }
}

export function generateReport(
  id: RegionId,
  attempt: number,
  intensity: LieIntensity = DEFAULT_INTENSITY,
  ctx?: BridgeContext,
): Report {
  const context = ctx ?? defaultContext(id)
  const base = generateBaseReport(id, attempt, intensity)
  // 嘘のみ新しい陸橋をロールできる。隣が既に陸橋つきで確定した辺は真実の報告にも必ず現れる
  const rolled = base.kind === 'lie' ? rollBridges(id, attempt, intensity, context.allowed) : []
  const bridges = [...new Set([...context.required, ...rolled])]
  const preset = INTENSITY_PRESETS[intensity]
  const margin = marginOf(regionBBox(id), preset)
  const geometry = applyBridges(
    base.geometry,
    id,
    bridges,
    margin,
    `${intensity}:${id}:${attempt}`,
  )
  return { ...base, bridges, geometry }
}
