/** A user-entered rating. Runtime values should be checked with isScore0To10. */
export type Score0To10 = number;

export type ISODate = string;
export type ISODateTime = string;

export const TIMER_MINUTES = [1, 3, 5] as const;
export type TimerMinutes = (typeof TIMER_MINUTES)[number];

/**
 * The seven assessment axes. Numeric answers are difficulty-oriented: a higher
 * value means that the axis is making it harder to start.
 */
export const ASSESSMENT_AXES = [
  "taskClarity",
  "aversion",
  "lowActivation",
  "rewardDistance",
  "timeAmbiguity",
  "cueWeakness",
  "competingReward",
] as const;

export type AssessmentAxis = (typeof ASSESSMENT_AXES)[number];
export type Bottleneck = AssessmentAxis;

export interface AssessmentAnswers {
  /** true when the first physical action is already clear */
  taskClarity: boolean | null;
  aversion: Score0To10 | null;
  lowActivation: Score0To10 | null;
  rewardDistance: Score0To10 | null;
  timeAmbiguity: Score0To10 | null;
  cueWeakness: Score0To10 | null;
  competingReward: Score0To10 | null;
}

export interface BottleneckScore {
  axis: AssessmentAxis;
  bottleneck: Bottleneck;
  score: Score0To10;
  thresholdMet: boolean;
}

export interface Assessment {
  answers: AssessmentAnswers;
  unansweredAxes: AssessmentAxis[];
  /** Scores for answered axes only. Unanswered axes never appear here. */
  axisScores: BottleneckScore[];
  /** Ordered by score and deterministic tie priority; never more than two. */
  primaryBottlenecks: Bottleneck[];
}

/** Daily ratings are state-oriented: a higher value means more of the label. */
export interface DailyState {
  id: string;
  date: ISODate;
  sleepRestfulness: Score0To10;
  mood: Score0To10;
  activation: Score0To10;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export const TASK_CATEGORIES = [
  "tidying",
  "email",
  "paperwork",
  "bathing",
  "studying",
  "transition",
  "other",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const SUGGESTION_RATIONALE_TAGS = [
  "make_concrete",
  "reduce_friction",
  "bring_reward_closer",
  "externalize_cue",
  "activate_body",
  "accept_discomfort",
  "interrupt_competition",
] as const;

export type SuggestionRationaleTag =
  (typeof SUGGESTION_RATIONALE_TAGS)[number];

export interface ActionSuggestion {
  /** A physical action intended to take no longer than 30 seconds. */
  action: string;
  rationaleTag: SuggestionRationaleTag;
}

export interface InterventionPlan {
  firstAction: string;
  durationMinutes: TimerMinutes;
  startCue: string;
  activationRitual: string | null;
  distractionFriction: string | null;
  microReward: string | null;
  /** An optional reminder of why this small action matters right now. */
  valueAnchor: string | null;
  /** An external way back when attention is likely to drift or the task is lost. */
  returnCue: string | null;
  /** A way to set down worry about forgetting without holding it in mind. */
  reassuranceAction: string | null;
  /** Optional support chosen from the person's description of anxiety or freezing. */
  emotionSupport: string | null;
  supportiveMessage: string;
  bottlenecks: Bottleneck[];
  source: "local" | "ai";
  createdAt: ISODateTime;
}

export type RoadmapStepKind = "now" | "next" | "later";

export interface RoadmapStep {
  id: string;
  kind: RoadmapStepKind;
  title: string;
  description: string;
}

export const ROADMAP_CONCERNS = [
  "entry",
  "scope",
  "information",
  "decisions",
  "endPoint",
] as const;

export type RoadmapConcern = (typeof ROADMAP_CONCERNS)[number];

export const EMOTIONAL_RESPONSES = [
  "anxiety",
  "boredom",
  "shame",
  "pressure",
  "unclear",
] as const;

export type EmotionalResponse = (typeof EMOTIONAL_RESPONSES)[number];

export const ANXIETY_RELIEF_PREFERENCES = ["yes", "unsure", "no"] as const;
export type AnxietyReliefPreference = (typeof ANXIETY_RELIEF_PREFERENCES)[number];

export const ACTIVATION_SOURCES = ["fatigue", "freeze", "both", "unclear"] as const;
export type ActivationSource = (typeof ACTIVATION_SOURCES)[number];

/**
 * A brief, user-selected description of what is unclear about a large task.
 * It is used to adapt the orientation steps; it is not a diagnostic label.
 */
export interface RoadmapConsultation {
  /** New roadmaps keep up to three concerns in the person's chosen priority order. */
  concerns?: RoadmapConcern[];
  /** Backward-compatible field for roadmaps created before multi-selection. */
  concern?: RoadmapConcern;
  knownContext: string | null;
}

/**
 * A low-detail orientation aid for a large or ambiguous task. It is deliberately
 * not a completion checklist: only the `now` step is treated as an action.
 */
export interface TaskRoadmap {
  taskText: string;
  category: TaskCategory;
  goalState: string;
  framing: string;
  steps: RoadmapStep[];
  /** Optional so roadmaps created before the consultation flow remain readable. */
  consultation?: RoadmapConsultation;
  createdAt: ISODateTime;
}

export const ATTEMPT_OUTCOMES = [
  "stopped_success",
  "continued",
  "stuck",
] as const;

export type AttemptOutcome = (typeof ATTEMPT_OUTCOMES)[number];

export interface AttemptReflection {
  aversionBefore: Score0To10 | null;
  aversionAfter: Score0To10 | null;
  actualDifficulty: Score0To10 | null;
  wantsToContinue: boolean | null;
}

export interface TaskAttempt {
  id: string;
  taskText: string;
  category: TaskCategory;
  assessment: Assessment;
  plan: InterventionPlan;
  /** Optional because attempts created before roadmap support remain readable. */
  roadmap?: TaskRoadmap | null;
  createdAt: ISODateTime;
  /** Presence of this timestamp is the success signal; completion is not required. */
  startedAt: ISODateTime | null;
  endedAt: ISODateTime | null;
  outcome: AttemptOutcome | null;
  reflection: AttemptReflection;
  updatedAt: ISODateTime;
  /** Tombstone timestamp used by optional last-write-wins sync. */
  deletedAt: ISODateTime | null;
}

export interface AccessibilityPreferences {
  reduceMotion: boolean;
  largeText: boolean;
  screenReaderOptimized: boolean;
}

export interface UserPreferences {
  notificationsEnabled: boolean;
  aiConsentGranted: boolean;
  syncEnabled: boolean;
  accessibility: AccessibilityPreferences;
  updatedAt: ISODateTime;
}

export const SAFETY_FLAGS = [
  "crisis",
  "medication",
  "diagnosis",
  "pii",
] as const;

export type SafetyFlag = (typeof SAFETY_FLAGS)[number];
export type SafetyLevel = "safe" | "review" | "blocked" | "crisis";

export interface SafetyClassification {
  level: SafetyLevel;
  flags: SafetyFlag[];
  /** false means the text must stay on-device and must not be sent to AI. */
  allowsAi: boolean;
  guidance: string | null;
}
