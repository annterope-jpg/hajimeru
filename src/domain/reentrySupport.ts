import type { InterventionPlan } from "./types";

export const REENTRY_SUPPORT_MODES = [
  "return_marker",
  "next_action",
  "transition_bridge",
] as const;

export type ReentrySupportMode = (typeof REENTRY_SUPPORT_MODES)[number];

export interface ReentrySupport {
  mode: ReentrySupportMode;
  title: string;
  action: string;
  explanation: string;
}

/**
 * Builds one live, device-only prompt from the already accepted plan.
 * It never mutates the plan, advances later steps, or creates an attempt.
 */
export function createReentrySupport(
  plan: InterventionPlan,
  mode: ReentrySupportMode,
): ReentrySupport {
  if (mode === "return_marker") {
    return {
      mode,
      title: "戻る目印",
      action: plan.returnCue?.trim() || `「${plan.firstAction}」が戻る場所です`,
      explanation: "元の計画を作り直さず、目印と今の1動作だけを見ます。",
    };
  }

  if (mode === "next_action") {
    return {
      mode,
      title: "次の1動作",
      action: plan.firstAction,
      explanation: "先の順番は決めません。今はこの1動作だけで大丈夫です。",
    };
  }

  return {
    mode,
    title: "切替の橋",
    action:
      plan.distractionFriction?.trim() ||
      `今していることをいったん置き、「${plan.firstAction}」へ移る`,
    explanation: "好きな活動を悪者にせず、今は橋を1つだけ選びます。切り替えない選択もできます。",
  };
}
