// 海域の和名を決定的に生成する（古地図の趣を出す）。
// 方角は母港（日本）から見た向き、海の名は海域IDから決定的に選ぶ。
import { seedToInt } from '../report/random'
import { COLS, START_REGION, parseRegionId } from './regions'
import type { RegionId } from './regions'

const SEA_NOUNS = [
  '波濤の海',
  '凪の大洋',
  '霧の海',
  '鯨の海',
  '珊瑚の海',
  '嵐の海',
  '星降る海',
  '竜骨の海',
  '硝子の海',
  '真珠の海',
  '渦潮の海',
  '黒潮の海',
] as const

export function regionName(id: RegionId): string {
  if (id === START_REGION) return '母港の海'
  const { col, row } = parseRegionId(id)
  const start = parseRegionId(START_REGION)
  // 東西は地球一周ラップを考慮して最短方向で判定
  const dx = ((((col - start.col) % COLS) + COLS + COLS / 2) % COLS) - COLS / 2
  const dy = row - start.row
  const ns = dy < 0 ? '北' : dy > 0 ? '南' : ''
  const ew = dx > 0 ? '東' : dx < 0 ? '西' : ''
  const dir = `${ns}${ew}`
  const noun = SEA_NOUNS[seedToInt(`name:${id}`) % SEA_NOUNS.length]
  return dir ? `${dir}・${noun}` : noun
}
