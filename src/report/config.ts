// 報告生成のチューニングパラメータ集約。嘘の見た目の質はここで調整する。
// 注意: ここを変更すると同じセーブデータから再現される地形が変わるため、
// 変更時は game/save.ts の SAVE_VERSION を上げること。

/** 船長の報告が真実である確率 */
export const TRUTH_PROBABILITY = 0.4

/** 境界帯の幅（セル幅比）。この帯の内側半分では嘘変換が恒等になる＝継ぎ目保証 */
export const MARGIN_RATIO = 0.1

/** 歪み変換の頂点リサンプル間隔（セル幅比） */
export const RESAMPLE_RATIO = 0.015

/** 歪み変位の振幅範囲（セル幅比） */
export const DISTORT_AMP = { min: 0.08, max: 0.22 }

/** 歪みノイズの波長（セル幅比） */
export const DISTORT_WAVELENGTH_RATIO = 0.33

/** 捏造する島の個数範囲 */
export const FABRICATE_COUNT = { min: 1, max: 4 }

/** 捏造島の基本半径範囲（セル幅比） */
export const ISLAND_RADIUS = { min: 0.04, max: 0.16 }

/** 大陸級の捏造が起きる確率とその半径（セル幅比） */
export const CONTINENT_PROBABILITY = 0.15
export const CONTINENT_RADIUS = 0.24

/** 消失変換で内陸リングが削除される確率 */
export const VANISH_PROBABILITY = 0.8

/** 消失変換で境界接続リングを痩せさせる強さの範囲 */
export const ERODE_STRENGTH = { min: 0.3, max: 0.6 }

/** 嘘に含まれる変換の個数範囲 */
export const LIE_OP_COUNT = { min: 1, max: 2 }
