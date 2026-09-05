import {
  ASSESSMENT_AXES,
  type Assessment,
  type AssessmentAnswers,
  type AssessmentAxis,
  type Bottleneck,
  type TaskBottleneck,
  type BottleneckScore,
  type Score0To10,
} from "./types";

export const BOTTLENECK_THRESHOLD = 6;
export const MAX_PRIMARY_BOTTLENECKS = 2;
export const TASK_BOTTLENECK_AXES = ASSESSMENT_AXES.filter(
  (axis): axis is TaskBottleneck => axis !== "lowActivation",
);

/** Deterministic tie order for the six task-side hypotheses. */
export const BOTTLENECK_TIE_PRIORITY = [
  "taskClarity",
  "aversion",
  "cueWeakness",
  "competingReward",
  "rewardDistance",
  "timeAmbiguity",
] as const satisfies readonly TaskBottleneck[];

const PRIORITY_INDEX = new Map<TaskBottleneck, number>(
  BOTTLENECK_TIE_PRIORITY.map((axis, index) => [axis, index] as const),
);

export const BOTTLENECK_LABELS: Readonly<Record<Bottleneck, string>> = {
  taskClarity: "最初の行動が曖昧",
  lowActivation: "眠さ・ぼんやり・身体の重さ",
  aversion: "嫌悪・面倒さ",
  cueWeakness: "思い出すきっかけが弱い",
  competingReward: "スマホなど別の行動が強い",
  rewardDistance: "開始直後の変化が見えにくい",
  timeAmbiguity: "始めるタイミングが曖昧",
};

export function isScore0To10(value: unknown): value is Score0To10 {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 10
  );
}

export function createEmptyAssessmentAnswers(): AssessmentAnswers {
  return {
    taskClarity: null,
    aversion: null,
    lowActivation: null,
    rewardDistance: null,
    timeAmbiguity: null,
    cueWeakness: null,
    competingReward: null,
  };
}

function normalizeScore(value: unknown): Score0To10 | null {
  return isScore0To10(value) ? value : null;
}

function normalizeAnswers(
  input: Partial<AssessmentAnswers>,
): AssessmentAnswers {
  return {
    taskClarity:
      typeof input.taskClarity === "boolean" ? input.taskClarity : null,
    aversion: normalizeScore(input.aversion),
    lowActivation: normalizeScore(input.lowActivation),
    rewardDistance: normalizeScore(input.rewardDistance),
    timeAmbiguity: normalizeScore(input.timeAmbiguity),
    cueWeakness: normalizeScore(input.cueWeakness),
    competingReward: normalizeScore(input.competingReward),
  };
}

function scoreAxis(
  axis: AssessmentAxis,
  answers: AssessmentAnswers,
): BottleneckScore | null {
  // Clarity is the sole positively worded answer. False means maximum friction.
  if (axis === "taskClarity") {
    if (answers.taskClarity === null) {
      return null;
    }

    const clarityScore = answers.taskClarity ? 0 : 10;
    return {
      axis,
      bottleneck: axis,
      score: clarityScore,
      thresholdMet: clarityScore >= BOTTLENECK_THRESHOLD,
    };
  }

  // After the taskClarity branch, all remaining axes are numeric by contract.
  const score = answers[axis] as Score0To10 | null;
  if (score === null) {
    return null;
  }

  return {
    axis,
    bottleneck: axis,
    score,
    thresholdMet: score >= BOTTLENECK_THRESHOLD,
  };
}

/**
 * Scores only fields that were explicitly answered and selects no more than two
 * bottlenecks. Invalid runtime values are treated as unanswered, never inferred.
 */
export function assessBottlenecks(
  input: Partial<AssessmentAnswers>,
): Assessment {
  const answers = normalizeAnswers(input);
  const unansweredAxes = ASSESSMENT_AXES.filter(
    (axis) => answers[axis] === null,
  );
  const axisScores = ASSESSMENT_AXES.map((axis) => scoreAxis(axis, answers)).filter(
    (score): score is BottleneckScore => score !== null,
  );

  const primaryBottlenecks = axisScores
    .filter(
      (score): score is BottleneckScore & { bottleneck: TaskBottleneck } =>
        score.thresholdMet && score.bottleneck !== "lowActivation",
    )
    .sort((left, right) => {
      const scoreDifference = right.score - left.score;
      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return (
        (PRIORITY_INDEX.get(left.bottleneck) ?? Number.MAX_SAFE_INTEGER) -
        (PRIORITY_INDEX.get(right.bottleneck) ?? Number.MAX_SAFE_INTEGER)
      );
    })
    .slice(0, MAX_PRIMARY_BOTTLENECKS)
    .map(({ bottleneck }) => bottleneck);

  return {
    answers,
    unansweredAxes,
    axisScores,
    primaryBottlenecks,
    stateOverlay:
      answers.lowActivation === null
        ? { status: "not_assessed", selected: null, allowedChoices: [] }
        : answers.lowActivation >= BOTTLENECK_THRESHOLD
          ? {
              status: "answered",
              selected: "low_activation",
              allowedChoices: ["continue", "make_smaller", "change_time", "rest"],
            }
          : {
              status: "answered",
              selected: "none",
              allowedChoices: ["continue"],
            },
  };
}
