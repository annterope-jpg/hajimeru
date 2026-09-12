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
export type TaskBottleneck = Exclude<AssessmentAxis, "lowActivation">;

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
  /** Task-side hypotheses ordered by score and tie priority; never more than two. */
  primaryBottlenecks: TaskBottleneck[];
  /** Present on new assessments; absent on records created before Phase 5. */
  stateOverlay?: StateOverlay;
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

export const EFFORT_COST_CHOICES = [
  "too_many_choices",
  "too_many_steps",
  "setup_heavy",
  "sequence_unclear",
  "defer",
] as const;

/** A person-selected description of decision/preparation load, separate from aversion. */
export type EffortCostChoice = (typeof EFFORT_COST_CHOICES)[number];

export interface EffortCostOverlay {
  status: "not_assessed" | "answered";
  selected: EffortCostChoice | null;
}

export interface DecisionReduction {
  /** Never `defer`: deferring produces no intervention. */
  kind: Exclude<EffortCostChoice, "defer">;
  label: string;
  /** The single concrete action that replaces an open decision point. */
  action: string;
  explanation: string;
}

/**
 * A person-authored, positive near-future scene used as an optional EFT cue.
 * It is device-local current-flow data and is deliberately not part of a plan
 * or attempt, so sync/export/AI boundaries cannot pick up its free text.
 */
export interface EpisodicFutureScene {
  focus: "outcome" | "process";
  whenWhere: string | null;
  scene: string | null;
  feeling: string | null;
}

export const SOCIAL_SUPPORT_MODES = [
  "solo",
  "quiet_presence",
  "announce_start",
  "report_start",
] as const;
export type SocialSupportMode = (typeof SOCIAL_SUPPORT_MODES)[number];

export const SOCIAL_SUPPORT_COMFORTS = [
  "comfortable",
  "pressure",
  "unsure",
] as const;
export type SocialSupportComfort = (typeof SOCIAL_SUPPORT_COMFORTS)[number];

/** Enum-only, current-flow selection. It contains no recipient or task data. */
export interface SocialSupportSelection {
  mode: SocialSupportMode;
  comfort: SocialSupportComfort | null;
}

export interface InterventionPlan {
  firstAction: string;
  /** Why this first action was selected; absent on records before Phase 5. */
  firstActionRationaleTag?: SuggestionRationaleTag;
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
  /** Person-facing label for the selected emotional support; absent on older records. */
  emotionSupportLabel?: string | null;
  /** Working category, never a diagnosis or inferred cause. */
  emotionSupportKind?: EmotionSupportKind | null;
  supportiveMessage: string;
  /** New plans contain task hypotheses only; legacy records may include lowActivation. */
  bottlenecks: Bottleneck[];
  /** State support is not counted toward the maximum two task hypotheses. */
  stateOverlay?: StateOverlay;
  /** Optional qualitative overlay; it is never inferred from aversion or task text. */
  effortCost?: EffortCostOverlay;
  /** At most one person-selected decision-reduction intervention. */
  decisionReduction?: DecisionReduction | null;
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
  "uncertainty",
  "self_evaluation",
  "anxiety",
  "boredom",
  "shame",
  "pressure",
  "unclear",
] as const;

export type EmotionalResponse = (typeof EMOTIONAL_RESPONSES)[number];

export const EMOTION_SUPPORT_KINDS = [
  "uncertainty",
  "self_evaluation",
  "shame_self_blame",
  "pressure",
  "boredom",
  "freeze_tension",
] as const;

export type EmotionSupportKind = (typeof EMOTION_SUPPORT_KINDS)[number];

export const ANXIETY_RELIEF_PREFERENCES = ["yes", "unsure", "no"] as const;
export type AnxietyReliefPreference = (typeof ANXIETY_RELIEF_PREFERENCES)[number];

export const ACTIVATION_SOURCES = ["fatigue", "freeze", "both", "unclear"] as const;
export type ActivationSource = (typeof ACTIVATION_SOURCES)[number];

export const STATE_EXPERIENCES = [
  "sleepiness",
  "fatigue",
  "brain_fog",
  "body_heaviness",
  "freeze",
  "mixed",
  "unclear",
  "none",
] as const;
export type StateExperience = (typeof STATE_EXPERIENCES)[number];

/** Capture-time context. Offset is minutes east of UTC (Tokyo is +540). */
export interface LocalTimeContext {
  observedAt: ISODateTime;
  localDate: ISODate;
  localHour: number;
  localMinute: number;
  timeZone: string | null;
  timeZoneOffsetMinutes: number;
}

export type StateSupportChoice =
  | "continue"
  | "make_smaller"
  | "change_time"
  | "rest"
  | "seek_support";

export interface StateSupport {
  heading: string;
  message: string;
  /** Null means no physical preparation is prescribed. */
  action: string | null;
  choices: readonly StateSupportChoice[];
  consultationGuidance: string;
}

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
  /** Optional one-line clarification for each selected concern. */
  details?: Partial<Record<RoadmapConcern, string>>;
  /** A person-entered marker for where to return; absent on older roadmaps. */
  restartCue?: string | null;
}

/** Short, person-entered boundaries. These are orientation notes, not checklist steps. */
export interface RoadmapBoundaries {
  todayScope: string | null;
  stoppingPoint: string | null;
  holdBox: string | null;
  restartCue: string | null;
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
  /** Optional so older roadmaps remain unchanged rather than receiving inferred answers. */
  boundaries?: RoadmapBoundaries;
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

/**
 * A temporary state consideration that can alter how an experiment is offered.
 * It is not a symptom, diagnosis, or inferred cause. `not_assessed` must remain
 * distinct from an answered state.
 */
export interface StateOverlay {
  status: "not_assessed" | "answered";
  selected: "low_activation" | "freeze_or_tension" | "both" | "none" | null;
  allowedChoices: readonly (
    | "continue"
    | "make_smaller"
    | "change_time"
    | "rest"
    | "seek_support"
  )[];
  /** Self-described state on new plans; missing on legacy plans is not inferred. */
  experience?: StateExperience;
  /** Snapshot from when this state was described; never recomputed on restore. */
  localTimeContext?: LocalTimeContext;
  /** Non-diagnostic choices matched to the self-described state. */
  support?: StateSupport;
}

/** A deterministic, inspectable rule; never a diagnostic or causal conclusion. */
export interface DecisionRule {
  id: string;
  input:
    | AssessmentAxis
    | EmotionalResponse
    | ActivationSource
    | RoadmapConcern;
  requiresAnsweredInput: true;
  interventionTag: SuggestionRationaleTag;
  explanation: string;
  evidenceStatus: "implemented" | "hypothesis" | "expert_review_required";
}

/** A user-chosen way back to an experiment. It must not contain a task body. */
export interface FutureCue {
  kind: "event" | "clock" | "visible_marker";
  label: string;
  localTime: { hour: number; minute: number } | null;
  timeZoneOffsetMinutes: number | null;
}

export const SUPPORTED_USE_SECTIONS = [
  "task_label",
  "working_hypotheses",
  "chosen_experiment",
  "return_cue",
  "reflection",
] as const;
export type SupportedUseSection = (typeof SUPPORTED_USE_SECTIONS)[number];

/**
 * Metadata for a summary the person may choose to show in supported use.
 * Recipient identity and hidden clinician-only fields are deliberately absent.
 */
export interface SupportedUseSummary {
  mode: "solo" | "together_on_persons_device";
  selectedSections: SupportedUseSection[];
  generatedAt: ISODateTime;
  userInitiatedShareOnly: true;
  containsHiddenAssessment: false;
}

export const SUPPORTED_USE_FOCI = ["start", "roadmap", "retry", "reflection"] as const;
export type SupportedUseFocus = (typeof SUPPORTED_USE_FOCI)[number];

export const SUPPORTED_USE_END_POINTS = [
  "overview",
  "choice",
  "experiment",
] as const;
export type SupportedUseEndPoint = (typeof SUPPORTED_USE_END_POINTS)[number];

/**
 * In-memory state for one person-initiated, same-device supported-use session.
 * It is deliberately excluded from persisted and synchronized records.
 */
export interface SupportedUseSession {
  focus: SupportedUseFocus;
  endPoint: SupportedUseEndPoint;
  startedAt: ISODateTime;
  personInitiated: true;
  sameDeviceOnly: true;
}
