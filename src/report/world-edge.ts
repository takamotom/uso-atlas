// 世界の果てを跨ぐ航海の報告。地形ではなく「世界のかたち」についての主張が返る。
// 同じ試行回数からは常に同じ主張が得られる（決定的）
import { createRng } from './random'

export type EdgeClaim = 'falls' | 'passage'

/** 果ての報告が「滝（平面世界）」になる確率 */
export const FALLS_PROBABILITY = 0.5

export function edgeClaim(attempt: number): EdgeClaim {
  return createRng(`worldedge:${attempt}`)() < FALLS_PROBABILITY ? 'falls' : 'passage'
}

export const EDGE_CLAIM_TEXT: Record<EdgeClaim, { quote: string; hint: string }> = {
  falls: {
    quote:
      '世界の果てを見ました！海はそこで巨大な滝となり、底の見えない虚空へ流れ落ちています。この先へ進む術はありません！',
    hint: '信じると、この世界は「平面」と確定します。以後、東西の果てを越える航海はできません。',
  },
  passage: {
    quote:
      '果てなどありませんでした。海はどこまでも続き、水平線の先にはまだ見ぬ海域が広がっています。世界は丸いのです！',
    hint: '信じると、この世界は「球体」と確定します。以後、東西の果てを越えて地球を一周できます。',
  },
}

/** 地図の端に千切れた大地が既に確定している場合の専用台詞（滝の主張は成立しない） */
export const EDGE_FORCED_PASSAGE_TEXT = {
  quote:
    '果てと思われた場所には、千切れたはずのあの大地の続きがありました。大地が繋がっているなら、海も世界も繋がっています！',
  hint: '地図の端に描かれた大地が果ての先へ続いていました。信じると、この世界は「球体」と確定します。',
}
