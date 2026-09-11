import { describe, expect, it } from "vitest";

import {
  EFFORT_COST_CHOICES,
  assessBottlenecks,
  createEffortCostOverlay,
  createLocalInterventionPlan,
  selectDecisionReduction,
} from "../../src/domain";

describe("effort cost and decision reduction", () => {
  it("keeps unanswered distinct from an explicit decision to defer", () => {
    expect(createEffortCostOverlay()).toEqual({
      status: "not_assessed",
      selected: null,
    });
    expect(createEffortCostOverlay("defer")).toEqual({
      status: "answered",
      selected: "defer",
    });
    expect(selectDecisionReduction("defer")).toBeNull();
  });

  it.each(EFFORT_COST_CHOICES.filter((choice) => choice !== "defer"))(
    "maps %s to exactly one bounded intervention",
    (choice) => {
      const reduction = selectDecisionReduction(choice);
      expect(reduction).toMatchObject({ kind: choice });
      expect(reduction?.action).not.toBe("");
      expect(Array.isArray(reduction)).toBe(false);
    },
  );

  it("does not infer effort cost from high aversion", () => {
    const plan = createLocalInterventionPlan({
      taskText: "メールを返信する",
      assessment: assessBottlenecks({ aversion: 10 }),
    });

    expect(plan.effortCost).toEqual({ status: "not_assessed", selected: null });
    expect(plan.decisionReduction).toBeNull();
    expect(plan.firstActionRationaleTag).toBe("accept_discomfort");
  });

  it("adds one separate intervention only after the person selects it", () => {
    const plan = createLocalInterventionPlan({
      taskText: "申請の準備をする",
      assessment: assessBottlenecks({ aversion: 9 }),
      effortCostChoice: "setup_heavy",
    });

    expect(plan.bottlenecks).toEqual(["aversion"]);
    expect(plan.effortCost).toEqual({ status: "answered", selected: "setup_heavy" });
    expect(plan.decisionReduction?.kind).toBe("setup_heavy");
    expect(plan.firstActionRationaleTag).toBe("accept_discomfort");
  });
});
