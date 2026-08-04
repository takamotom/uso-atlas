// 報告生成のチューニングパラメータ。ホラ吹きレベル（嘘の濃さ）ごとのプリセットに集約。
// 注意: プリセット値や生成アルゴリズムを変更すると同じセーブデータから再現される
// 地形が変わるため、変更時は game/save.ts の SAVE_VERSION を上げること。

/**
 * 船長のタイプ（＝報告の性質）。航海開始時に固定され、途中変更は新しい航海になる。
 * 内部値はセーブ互換のため据え置き（mild/standard/wild）。
 */
export type LieIntensity = 'mild' | 'standard' | 'wild'

export interface CaptainProfile {
  icon: string
  name: string
  /** ドロップダウンに出す一言説明 */
  description: string
}

export const CAPTAIN_PROFILES: Record<LieIntensity, CaptainProfile> = {
  mild: {
    icon: '🧭',
    name: '実直な船長',
    description: '見たままを正確に描く熟練の航海士。報告はほぼ真実。',
  },
  standard: {
    icon: '⚓',
    name: '気まぐれな船長',
    description: '腕は確かだが、酒と想像がほどよく混じる。',
  },
  wild: {
    icon: '🌋',
    name: '夢見る船長',
    description: '幻の大陸を追うロマンの人。報告は壮大で、大陸が浮かび、沈む。',
  },
}

export interface LiePreset {
  /** 船長の報告が真実である確率 */
  truthProbability: number
  /** 境界帯の幅（セル幅比）。帯の内側半分では嘘変換が恒等＝継ぎ目保証 */
  marginRatio: number
  /** 歪み変換の頂点リサンプル間隔（セル幅比） */
  resampleRatio: number
  /** 歪み変位の振幅範囲（セル幅比） */
  distortAmp: { min: number; max: number }
  /** 歪みノイズの波長（セル幅比） */
  distortWavelengthRatio: number
  /** 捏造する島の個数範囲 */
  fabricateCount: { min: number; max: number }
  /** 捏造島の基本半径範囲（セル幅比） */
  islandRadius: { min: number; max: number }
  /** 大陸級の捏造（ムー大陸・アトランティス）が起きる確率とその半径（セル幅比） */
  continentProbability: number
  continentRadius: number
  /** ブロブ半径の最大倍率（大陸はセルに収めるため控えめにする） */
  continentClamp: number
  /** 大陸盤（海域をほぼ埋め尽くす超巨大大陸）が起きる確率。隣接海域と海峡1本で繋がって見える */
  megaContinentProbability: number
  /** 消失変換で内陸リングが削除される確率 */
  vanishProbability: number
  /** 境界接続の大陸が「沈没」する（境界の残骸だけ残して消える）確率 */
  totalVanishProbability: number
  /** 消失変換で境界接続リングを痩せさせる強さの範囲 */
  erodeStrength: { min: number; max: number }
  /** 嘘に含まれる変換の個数範囲 */
  lieOpCount: { min: number; max: number }
}

export const INTENSITY_PRESETS: Record<LieIntensity, LiePreset> = {
  // 控えめ: ほぼ本物の地図。歪みも小さく、大陸消失なし
  mild: {
    truthProbability: 0.55,
    marginRatio: 0.1,
    resampleRatio: 0.015,
    distortAmp: { min: 0.03, max: 0.09 },
    distortWavelengthRatio: 0.33,
    fabricateCount: { min: 1, max: 2 },
    islandRadius: { min: 0.03, max: 0.1 },
    continentProbability: 0.04,
    continentRadius: 0.18,
    continentClamp: 1.4,
    megaContinentProbability: 0,
    vanishProbability: 0.5,
    totalVanishProbability: 0,
    erodeStrength: { min: 0.2, max: 0.4 },
    lieOpCount: { min: 1, max: 1 },
  },
  // 標準: v1の挙動
  standard: {
    truthProbability: 0.4,
    marginRatio: 0.1,
    resampleRatio: 0.015,
    distortAmp: { min: 0.08, max: 0.22 },
    distortWavelengthRatio: 0.33,
    fabricateCount: { min: 1, max: 4 },
    islandRadius: { min: 0.04, max: 0.16 },
    continentProbability: 0.15,
    continentRadius: 0.24,
    continentClamp: 1.4,
    megaContinentProbability: 0,
    vanishProbability: 0.8,
    totalVanishProbability: 0,
    erodeStrength: { min: 0.3, max: 0.6 },
    lieOpCount: { min: 1, max: 2 },
  },
  // 夢見る船長: ムー大陸が浮上し、オーストラリアが沈む世界。
  // 境界帯を細くして、隣接海域の大陸盤同士が狭い海峡だけで隔てられて「繋がって」見えるようにする
  wild: {
    truthProbability: 0.25,
    marginRatio: 0.035,
    resampleRatio: 0.015,
    distortAmp: { min: 0.15, max: 0.35 },
    distortWavelengthRatio: 0.4,
    fabricateCount: { min: 2, max: 6 },
    islandRadius: { min: 0.07, max: 0.22 },
    continentProbability: 0.25,
    continentRadius: 0.3,
    continentClamp: 1.3,
    megaContinentProbability: 0.3,
    vanishProbability: 0.9,
    totalVanishProbability: 0.5,
    erodeStrength: { min: 0.5, max: 0.9 },
    lieOpCount: { min: 1, max: 2 },
  },
}

export const DEFAULT_INTENSITY: LieIntensity = 'standard'

export function isLieIntensity(value: unknown): value is LieIntensity {
  return value === 'mild' || value === 'standard' || value === 'wild'
}
