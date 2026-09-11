import type {
  DecisionReduction,
  EffortCostChoice,
  EffortCostOverlay,
} from "./types";

export const EFFORT_COST_COPY: Readonly<
  Record<EffortCostChoice, { label: string; description: string }>
> = {
  too_many_choices: {
    label: "候補が多く、1つに決めにくい",
    description: "正解を選ぶ前に止まってしまう",
  },
  too_many_steps: {
    label: "することが多く、全部が同時に見える",
    description: "今の1動作だけに絞りたい",
  },
  setup_heavy: {
    label: "始める前の準備が多い",
    description: "道具・画面・場所をそろえるところが重い",
  },
  sequence_unclear: {
    label: "順番を決めるところで止まる",
    description: "どれからでもよいのに選べない",
  },
  defer: {
    label: "今は決めずに進む",
    description: "この調整は保留し、通常の開始プランを見る",
  },
};

const DECISION_REDUCTIONS: Readonly<
  Record<Exclude<EffortCostChoice, "defer">, DecisionReduction>
> = {
  too_many_choices: {
    kind: "too_many_choices",
    label: "候補を1つだけ仮置きする",
    action: "いちばん目に入る候補を1つだけ仮置きし、残りは保留にする",
    explanation: "最善を決めるのではなく、今だけ使う候補を仮置きします。",
  },
  too_many_steps: {
    kind: "too_many_steps",
    label: "今の1動作だけを残す",
    action: "することの一覧を閉じ、いちばん上の1動作だけを表示する",
    explanation: "全部を保持せず、次の判断はこの1動作の後まで保留します。",
  },
  setup_heavy: {
    kind: "setup_heavy",
    label: "準備を1つにする",
    action: "始めるために必要そうな物を1つだけ手元に置く",
    explanation: "準備を完了させず、入口になる物を1つだけ置きます。",
  },
  sequence_unclear: {
    kind: "sequence_unclear",
    label: "順番を決めない",
    action: "順番を決めず、最初に目に入った対象を1つだけ手に取る",
    explanation: "正しい順番は後で見直せます。今は次の判断を1つ消します。",
  },
};

export function createEffortCostOverlay(
  selected?: EffortCostChoice,
): EffortCostOverlay {
  return selected === undefined
    ? { status: "not_assessed", selected: null }
    : { status: "answered", selected };
}

/** Returns either one intervention or none; categories are never combined or inferred. */
export function selectDecisionReduction(
  selected?: EffortCostChoice,
): DecisionReduction | null {
  if (!selected || selected === "defer") return null;
  return { ...DECISION_REDUCTIONS[selected] };
}
