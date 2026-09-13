import { describe, expect, it } from "vitest";

import { createReentrySupport, type InterventionPlan } from "../../src/domain";

const plan: InterventionPlan = {
  firstAction: "書類を1枚、机に置く",
  durationMinutes: 1,
  startCue: "朝食後",
  activationRitual: null,
  distractionFriction: "スマホを伏せて、書類に手を置く",
  microReward: null,
  valueAnchor: null,
  returnCue: "青い付箋を見る",
  reassuranceAction: null,
  emotionSupport: null,
  supportiveMessage: "30秒だけで大丈夫です",
  bottlenecks: ["cueWeakness", "competingReward"],
  source: "local",
  createdAt: "2026-09-13T00:00:00.000Z",
};

describe("createReentrySupport", () => {
  it("uses the accepted return cue without changing the plan", () => {
    const before = structuredClone(plan);
    expect(createReentrySupport(plan, "return_marker").action).toBe("青い付箋を見る");
    expect(plan).toEqual(before);
  });

  it("falls back to the accepted first action when no return cue exists", () => {
    const support = createReentrySupport({ ...plan, returnCue: null }, "return_marker");
    expect(support.action).toContain(plan.firstAction);
  });

  it("shows only the current single action and does not generate a queue", () => {
    expect(createReentrySupport(plan, "next_action")).toMatchObject({
      mode: "next_action",
      action: plan.firstAction,
    });
  });

  it("uses one existing friction action as the transition bridge", () => {
    const support = createReentrySupport(plan, "transition_bridge");
    expect(support.action).toBe(plan.distractionFriction);
    expect(Object.keys(support)).toEqual(["mode", "title", "action", "explanation"]);
  });
});
