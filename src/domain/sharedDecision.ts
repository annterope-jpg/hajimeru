export const HYPOTHESIS_FIT_OPTIONS = [
  { value: 'close', label: '近い' },
  { value: 'different', label: '違う' },
  { value: 'unsure', label: 'まだ分からない' },
] as const;

export type HypothesisFit = (typeof HYPOTHESIS_FIT_OPTIONS)[number]['value'];

export interface HypothesisFitGuidance {
  heading: string;
  message: string;
  startLabel: string;
}

export function getHypothesisFitGuidance(fit: HypothesisFit): HypothesisFitGuidance {
  switch (fit) {
    case 'close':
      return {
        heading: '近いと感じた仮説で、小さく試せます',
        message: '正解と決める必要はありません。試したあとに、合っていたかを見直せます。',
        startLabel: 'この一歩を試す',
      };
    case 'different':
      return {
        heading: 'この案を使わなくて大丈夫です',
        message: '回答を見直す、このまま試す、今日は見送る。どれを選んでも記録上の失敗にはなりません。',
        startLabel: 'それでも、この一歩を試す',
      };
    case 'unsure':
      return {
        heading: '今は決めなくて大丈夫です',
        message: '短く試してから考えることも、時間を変えることも、休むことも選べます。',
        startLabel: '決めずに、この一歩を試す',
      };
  }
}
