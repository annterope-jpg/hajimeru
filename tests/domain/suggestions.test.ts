import { describe, expect, it } from "vitest";

import {
  assessBottlenecks,
  createLocalInterventionPlan,
  getLocalActionSuggestions,
  inferTaskCategory,
  type TaskCategory,
} from "../../src/domain";

describe("local Japanese task inference and suggestions", () => {
  it.each<{
    task: string;
    category: TaskCategory;
    expectedFirstAction: string;
  }>([
    {
      task: "散らかった部屋を片付けたい",
      category: "tidying",
      expectedFirstAction: "目の前の物を1つだけ手に取る",
    },
    {
      task: "仕事のメールに返信したい",
      category: "email",
      expectedFirstAction: "返信するメールを1通だけ開く",
    },
    {
      task: "役所の申請手続きをする",
      category: "paperwork",
      expectedFirstAction: "必要そうな書類を1枚だけ机に置く",
    },
    {
      task: "お風呂に入りたい",
      category: "bathing",
      expectedFirstAction: "タオルを1枚だけ用意する",
    },
    {
      task: "資格試験の勉強を始める",
      category: "studying",
      expectedFirstAction: "教材を1つだけ机に置く",
    },
    {
      task: "ゲームをやめて別の活動に切り替える",
      category: "transition",
      expectedFirstAction: "今見ている画面をいったん閉じる",
    },
  ])(
    "$category: $task",
    ({ task, category, expectedFirstAction }) => {
      expect(inferTaskCategory(task)).toBe(category);
      const suggestions = getLocalActionSuggestions(task);
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]?.action).toBe(expectedFirstAction);
      expect(
        suggestions.every(({ action, rationaleTag }) =>
          Boolean(action.trim() && rationaleTag),
        ),
      ).toBe(true);
    },
  );

  it("creates three task-aware fallbacks for an unknown category", () => {
    const suggestions = getLocalActionSuggestions("観葉植物の植え替え");

    expect(inferTaskCategory("観葉植物の植え替え")).toBe("other");
    expect(suggestions).toHaveLength(3);
    expect(suggestions.every(({ action }) => action.includes("観葉植物の植え替え"))).toBe(
      true,
    );
  });
});

describe("createLocalInterventionPlan", () => {
  it("maps the selected bottlenecks to an offline start plan", () => {
    const assessment = assessBottlenecks({
      rewardDistance: 9,
      competingReward: 8,
      cueWeakness: 7,
    });
    const plan = createLocalInterventionPlan({
      taskText: "部屋を片付ける",
      assessment,
      durationMinutes: 1,
      createdAt: "2026-08-13T12:00:00.000Z",
    });

    expect(plan).toMatchObject({
      firstAction: "目の前の物を1つだけ手に取る",
      durationMinutes: 1,
      startCue: "この画面を閉じたら",
      activationRitual: null,
      distractionFriction: "スマホの通知を切り、手の届かない所に置く",
      microReward: "タイマーが鳴ったら、チェックを1つ付ける",
      valueAnchor: null,
      returnCue: null,
      reassuranceAction: null,
      bottlenecks: ["rewardDistance", "competingReward"],
      source: "local",
      createdAt: "2026-08-13T12:00:00.000Z",
    });
  });

  it("uses event cues, activation, and acceptance language when selected", () => {
    const timePlan = createLocalInterventionPlan({
      taskText: "読書を始める",
      assessment: assessBottlenecks({ timeAmbiguity: 9 }),
      createdAt: "2026-08-13T12:00:00.000Z",
    });
    const activationAndAversionPlan = createLocalInterventionPlan({
      taskText: "シャワーを浴びる",
      assessment: assessBottlenecks({ lowActivation: 9, aversion: 8 }),
      createdAt: "2026-08-13T12:00:00.000Z",
    });

    expect(timePlan.startCue).toBe("次に立ち上がったら");
    expect(activationAndAversionPlan.activationRitual).toBe(
      "立って、水を一口飲む",
    );
    expect(activationAndAversionPlan.supportiveMessage).toContain("嫌なまま");
  });

  it("keeps a worry about forgetting separate from actual loss-of-track support", () => {
    const plan = createLocalInterventionPlan({
      taskText: "申請書類を進める",
      assessment: assessBottlenecks({ rewardDistance: 8 }),
      valueAnchor: "来週の手続きを安心して迎える",
      forgettingWorry: 8,
    });

    expect(plan.valueAnchor).toBe("来週の手続きを安心して迎える");
    expect(plan.microReward).toContain("来週の手続きを安心して迎える");
    expect(plan.reassuranceAction).toContain("頭で持ち続けず");
    expect(plan.returnCue).toBeNull();

    const cuePlan = createLocalInterventionPlan({
      taskText: "申請書類を進める",
      assessment: assessBottlenecks({ cueWeakness: 8 }),
    });
    expect(cuePlan.returnCue).toContain("戻るための目印");
    expect(cuePlan.reassuranceAction).toBeNull();
  });
});
