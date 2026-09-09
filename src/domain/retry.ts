import type { InterventionPlan } from "./types";

export const RETRY_REASONS = [
  "action_too_large",
  "decision_remains",
  "freeze_or_tension",
  "low_activation",
  "not_choose_now",
] as const;
export type RetryReason = (typeof RETRY_REASONS)[number];

export const RETRY_REASON_COPY: Readonly<
  Record<RetryReason, { label: string; description: string }>
> = {
  action_too_large: { label: "まだ大きかった", description: "最初の身体動作をもう一段だけ小さくする" },
  decision_remains: { label: "決めることが残った", description: "判断を1つ減らすか、あとへ移す" },
  freeze_or_tension: { label: "不安・緊張で固まった", description: "急がせず、緊張を少し下げる" },
  low_activation: { label: "眠さ・頭の霧が強かった", description: "身体準備、時間変更、休息から選ぶ" },
  not_choose_now: { label: "今は選ばない", description: "理由を決めず、ここで終える" },
};

export interface RetryAdjustment {
  reason: RetryReason;
  heading: string;
  message: string;
  adjustedPlan: InterventionPlan | null;
  choices: readonly ("retry" | "change_time" | "rest" | "end")[];
}

function shortAction(action: string) {
  return Array.from(action.trim()).slice(0, 48).join("");
}

export function createRetryAdjustment(
  plan: InterventionPlan,
  reason: RetryReason,
): RetryAdjustment {
  if (reason === "not_choose_now") {
    return {
      reason,
      heading: "ここで終えて大丈夫です",
      message: "理由を説明したり、次を決めたりする必要はありません。",
      adjustedPlan: null,
      choices: ["end"],
    };
  }

  if (reason === "action_too_large") {
    return {
      reason,
      heading: "一歩を、もう一段だけ小さくしました",
      message: "この案も正解ではありません。合わなければ試さずに終えられます。",
      adjustedPlan: {
        ...plan,
        firstAction: `「${shortAction(plan.firstAction)}」の対象を1つ、指で示す`,
        firstActionRationaleTag: "make_concrete",
        supportiveMessage: "動かす前に、対象を1つ見つけるだけで終えても大丈夫です。",
        source: "local",
        createdAt: new Date().toISOString(),
      },
      choices: ["retry", "change_time", "end"],
    };
  }

  if (reason === "decision_remains") {
    return {
      reason,
      heading: "決めることを1つ、あとへ移します",
      message: "判断を完成させず、候補を1つ外へ出すところまでにします。",
      adjustedPlan: {
        ...plan,
        firstAction: "候補を1つだけ目の前に置き、決めるのはあとにする",
        firstActionRationaleTag: "reduce_friction",
        supportiveMessage: "選び切らなくて大丈夫です。残りは保留のままにできます。",
        source: "local",
        createdAt: new Date().toISOString(),
      },
      choices: ["retry", "change_time", "end"],
    };
  }

  if (reason === "freeze_or_tension") {
    return {
      reason,
      heading: "急がせず、緊張を下げる準備を先にします",
      message: "不安をなくすことは求めません。今は接近しない選択もできます。",
      adjustedPlan: {
        ...plan,
        activationRitual: "息を長めに1回吐き、目の前の1点を見る",
        supportiveMessage: "緊張が残っていても、見るだけで終えて大丈夫です。",
        stateOverlay: {
          status: "answered",
          selected: "freeze_or_tension",
          allowedChoices: ["continue", "make_smaller", "change_time", "rest"],
        },
        source: "local",
        createdAt: new Date().toISOString(),
      },
      choices: ["retry", "change_time", "rest", "end"],
    };
  }

  return {
    reason,
    heading: "身体の状態を、課題とは別に扱います",
    message: "今すぐ進めることを前提にせず、身体準備・時間変更・休息から選べます。",
    adjustedPlan: {
      ...plan,
      activationRitual: "水を一口飲むか、姿勢を1回変える",
      supportiveMessage: "身体の準備だけで終えても大丈夫です。",
      stateOverlay: {
        status: "answered",
        selected: "low_activation",
        allowedChoices: ["continue", "make_smaller", "change_time", "rest"],
      },
      source: "local",
      createdAt: new Date().toISOString(),
    },
    choices: ["retry", "change_time", "rest"],
  };
}
