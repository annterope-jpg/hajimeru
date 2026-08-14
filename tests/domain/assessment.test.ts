import { describe, expect, it } from "vitest";

import {
  ASSESSMENT_AXES,
  BOTTLENECK_THRESHOLD,
  assessBottlenecks,
  createEmptyAssessmentAnswers,
  isScore0To10,
} from "../../src/domain";

describe("assessBottlenecks", () => {
  it("uses six as the inclusive numeric threshold", () => {
    const assessment = assessBottlenecks({
      aversion: BOTTLENECK_THRESHOLD,
      lowActivation: BOTTLENECK_THRESHOLD - 0.01,
    });

    expect(assessment.primaryBottlenecks).toEqual(["aversion"]);
    expect(
      assessment.axisScores.find(({ axis }) => axis === "aversion")
        ?.thresholdMet,
    ).toBe(true);
    expect(
      assessment.axisScores.find(({ axis }) => axis === "lowActivation")
        ?.thresholdMet,
    ).toBe(false);
  });

  it("treats unclear as a bottleneck and clear as no clarity bottleneck", () => {
    const unclear = assessBottlenecks({ taskClarity: false });
    const clear = assessBottlenecks({ taskClarity: true });

    expect(unclear.primaryBottlenecks).toEqual(["taskClarity"]);
    expect(unclear.axisScores[0]?.score).toBe(10);
    expect(clear.primaryBottlenecks).toEqual([]);
    expect(clear.axisScores[0]?.score).toBe(0);
  });

  it("uses the specified priority when scores tie", () => {
    const numericTie = assessBottlenecks({
      lowActivation: 8,
      aversion: 8,
      cueWeakness: 8,
      competingReward: 8,
      rewardDistance: 8,
    });
    const clarityTie = assessBottlenecks({
      taskClarity: false,
      lowActivation: 10,
      aversion: 10,
    });

    expect(numericTie.primaryBottlenecks).toEqual([
      "lowActivation",
      "aversion",
    ]);
    expect(clarityTie.primaryBottlenecks).toEqual([
      "taskClarity",
      "lowActivation",
    ]);
  });

  it("never returns more than two primary bottlenecks", () => {
    const assessment = assessBottlenecks({
      taskClarity: false,
      aversion: 10,
      lowActivation: 10,
      rewardDistance: 10,
      timeAmbiguity: 10,
      cueWeakness: 10,
      competingReward: 10,
    });

    expect(assessment.primaryBottlenecks).toHaveLength(2);
  });

  it("does not score or infer unanswered and invalid fields", () => {
    const runtimeInvalidInput = {
      taskClarity: null,
      aversion: undefined,
      lowActivation: Number.NaN,
      rewardDistance: 11,
      timeAmbiguity: -1,
      cueWeakness: null,
      competingReward: 7,
    } as never;
    const assessment = assessBottlenecks(runtimeInvalidInput);

    expect(assessment.primaryBottlenecks).toEqual(["competingReward"]);
    expect(assessment.axisScores).toEqual([
      {
        axis: "competingReward",
        bottleneck: "competingReward",
        score: 7,
        thresholdMet: true,
      },
    ]);
    expect(assessment.unansweredAxes).toEqual([
      "taskClarity",
      "aversion",
      "lowActivation",
      "rewardDistance",
      "timeAmbiguity",
      "cueWeakness",
    ]);
  });

  it("can select time ambiguity while leaving all omitted axes unanswered", () => {
    const assessment = assessBottlenecks({ timeAmbiguity: 9 });

    expect(assessment.primaryBottlenecks).toEqual(["timeAmbiguity"]);
    expect(assessment.unansweredAxes).not.toContain("timeAmbiguity");
    expect(assessment.unansweredAxes).toHaveLength(ASSESSMENT_AXES.length - 1);
  });
});

describe("assessment helpers", () => {
  it("creates a fresh seven-axis empty answer object", () => {
    const first = createEmptyAssessmentAnswers();
    const second = createEmptyAssessmentAnswers();

    expect(first).toEqual({
      taskClarity: null,
      aversion: null,
      lowActivation: null,
      rewardDistance: null,
      timeAmbiguity: null,
      cueWeakness: null,
      competingReward: null,
    });
    expect(first).not.toBe(second);
  });

  it("accepts finite ratings from zero through ten", () => {
    expect(isScore0To10(0)).toBe(true);
    expect(isScore0To10(4.5)).toBe(true);
    expect(isScore0To10(10)).toBe(true);
    expect(isScore0To10(-0.1)).toBe(false);
    expect(isScore0To10(10.1)).toBe(false);
    expect(isScore0To10(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isScore0To10("7")).toBe(false);
  });
});
