import type {
  ActivationSource,
  AnxietyReliefPreference,
  EmotionalResponse,
  EmotionSupportKind,
} from './types';

export interface EmotionSupportSelection {
  kind: EmotionSupportKind;
  label: string;
  action: string;
  message: string;
  reliefRequested: boolean;
}

const THREAT_RESPONSES: readonly EmotionalResponse[] = [
  'uncertainty',
  'self_evaluation',
  'anxiety',
  'shame',
  'pressure',
];

export function needsEmotionReliefChoice(
  responses: readonly EmotionalResponse[],
  activationSource?: ActivationSource,
): boolean {
  return (
    responses.some((response) => THREAT_RESPONSES.includes(response)) ||
    activationSource === 'freeze' ||
    activationSource === 'both'
  );
}

function threatSupport(response: EmotionalResponse): EmotionSupportSelection | null {
  if (response === 'uncertainty' || response === 'anxiety') {
    return {
      kind: 'uncertainty',
      label: '分からなさを1つ減らす',
      action: '不確かなことを1つだけ書き、確認できる最初の一歩にする',
      message: '全部を見通すのではなく、今確認できることを1つだけ外に出します。',
      reliefRequested: true,
    };
  }
  if (response === 'self_evaluation') {
    return {
      kind: 'self_evaluation',
      label: '評価から距離をとる',
      action: '人に見せない下書き・仮置きとして、最初の1つだけ作る',
      message: '完成度を判断する前の、見せない一歩として扱います。',
      reliefRequested: true,
    };
  }
  if (response === 'shame') {
    return {
      kind: 'shame_self_blame',
      label: '取り戻そうとしない',
      action: '遅れの説明や埋め合わせは今決めず、対象を1つ開くだけにする',
      message: '遅れを評価せず、今触れられる対象だけに範囲を戻します。',
      reliefRequested: true,
    };
  }
  if (response === 'pressure') {
    return {
      kind: 'pressure',
      label: '自分で決めた範囲に戻す',
      action: '急ぎや締切を強めず、自分で選んだ30秒だけ試す',
      message: '圧力を動機づけに足さず、自分で終えられる範囲に戻します。',
      reliefRequested: true,
    };
  }
  return null;
}

/**
 * Returns at most one person-selected support. Threat-reduction support is
 * returned only after an explicit `yes`; unanswered and unsure remain null.
 */
export function selectEmotionSupport(input: {
  responses?: readonly EmotionalResponse[];
  preference?: AnxietyReliefPreference;
  activationSource?: ActivationSource;
}): EmotionSupportSelection | null {
  const responses = input.responses ?? [];

  for (const response of responses) {
    if (response === 'boredom') {
      return {
        kind: 'boredom',
        label: '退屈には短さと見える変化',
        action: '1分を選び、動かした物や書いた1行を見える状態にする',
        message: '退屈さを意欲不足とせず、短さと目に見える変化を足します。',
        reliefRequested: false,
      };
    }
    if (input.preference === 'yes') {
      const selected = threatSupport(response);
      if (selected) return selected;
    }
  }

  if (
    input.preference === 'yes' &&
    (input.activationSource === 'freeze' || input.activationSource === 'both')
  ) {
    return {
      kind: 'freeze_tension',
      label: '緊張を少し下げる',
      action: '肩を少し下げ、息を長めに1回吐き、目の前の1点を見る',
      message: '覚醒を上げる前に、選んだ範囲で緊張を少し下げます。',
      reliefRequested: true,
    };
  }

  return null;
}
