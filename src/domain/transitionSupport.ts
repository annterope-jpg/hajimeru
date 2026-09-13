import type { TaskBottleneck, TaskCategory } from './types';

export interface AdjacentTransitionSupport {
  switchBridge: string | null;
  returnBridge: string | null;
}

export interface AdjacentTransitionSupportInput {
  category: TaskCategory;
  bottlenecks: readonly TaskBottleneck[];
}

/**
 * Creates only the smallest support adjacent to starting: a brief bridge away
 * from a competing activity and/or a visible way back after attention drifts.
 * It does not infer causes, block apps, measure productivity, or create a task list.
 */
export function createAdjacentTransitionSupport({
  category,
  bottlenecks,
}: AdjacentTransitionSupportInput): AdjacentTransitionSupport {
  const needsSwitchBridge =
    category === 'transition' || bottlenecks.includes('competingReward');
  const needsReturnBridge = bottlenecks.includes('cueWeakness');

  return {
    switchBridge: needsSwitchBridge
      ? '今していることを10秒だけ止め、次に使う物か画面へ手を移す。続けるかは、その後に決める'
      : null,
    returnBridge: needsReturnBridge
      ? '離れる前に、戻る場所を1つだけ見える形で残す（開いた画面・付箋・道具のどれか1つ）'
      : null,
  };
}
